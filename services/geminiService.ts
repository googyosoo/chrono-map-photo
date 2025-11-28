import { GoogleGenAI } from "@google/genai";
import { LocationContext, TimeEra } from "../types";

// Helper to convert Blob to Base64
export const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove data url prefix (e.g. "data:image/jpeg;base64,")
      const base64Data = base64String.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Analyzes the coordinates to provide context.
 * Now accepts apiKey explicitly to support web deployment.
 */
export const analyzeLocation = async (lat: number, lng: number, apiKey: string): Promise<LocationContext> => {
  if (!apiKey) throw new Error("API Key is required");

  const ai = new GoogleGenAI({ apiKey });
  
  const prompt = `
    I am at coordinates: Latitude ${lat}, Longitude ${lng}.
    
    Task 1: Use Google Maps to identify the exact location.
    Task 2: Determine if this location is "Specific" (a named landmark, city, building, park) or "Vague" (middle of the ocean, generic unnamed road, vast desert, generic field).
    
    Task 3: Create a JSON object with the following structure.
    
    Structure:
    {
      "name": "The specific location name found via Maps",
      "isVague": boolean, // true if the location is generic/unclear, false if it is a specific place
      "nearbyPOIs": [ // Only populate if isVague is true. Find up to 3 interesting landmarks/cities within 50km.
         { "name": "Name of landmark", "lat": 0.00, "lng": 0.00 } 
      ],
      "weather": {
        "temp": "Estimated typical temperature for right now (e.g. 25°C)",
        "condition": "Estimated typical condition (e.g. Sunny)"
      },
      "description": "A short, interesting historical or geographical fact about this specific place (max 2 sentences).",
      "clothingRecommendation": "Appropriate clothing suggestion for a tourist here right now."
    }

    Output ONLY the JSON code block. Do not output any other text.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleMaps: {} }], 
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as LocationContext;
    } else {
        throw new Error("Failed to parse location JSON");
    }

  } catch (error) {
    console.error("Error analyzing location:", error);
    return {
      name: "Unknown Location",
      description: "Could not retrieve exact location details.",
      weather: { temp: "--", condition: "Unknown" },
      clothingRecommendation: "Casual wear",
      isVague: false
    };
  }
};

/**
 * Generates the travel photo.
 * Supports B.C. years, apiKey injection, and shot variations.
 */
export const generateTravelPhoto = async (
  apiKey: string,
  lat: number,
  lng: number,
  locationName: string,
  era: TimeEra,
  userImageBase64: string,
  weatherCondition: string,
  year?: string,
  customPrompt?: string,
  style: string = 'Realistic',
  variation: string = 'Standard Shot'
): Promise<string> => {
    if (!apiKey) throw new Error("API Key is required");
  
    const ai = new GoogleGenAI({ apiKey });

    // Handle Year logic for B.C. / A.D.
    let timeDescription = era as string;
    let historicInstruction = "";

    if (year) {
      // Check if it's B.C. (negative or formatted)
      const yearNum = parseInt(year);
      if (!isNaN(yearNum) && yearNum < 0) {
          const absYear = Math.abs(yearNum);
          timeDescription += ` (Specifically ${absYear} B.C.)`;
          historicInstruction = `
            CRITICAL HISTORICAL ACCURACY (B.C. ERA):
            The year is ${absYear} B.C. (Before Christ/Common Era).
            - MODERN CITIES DO NOT EXIST. Do NOT show modern buildings, roads, or ruins.
            - Show the NATURAL LANDSCAPE (pristine forests, rivers, deserts, terrain) exactly as it would have looked at these coordinates (${lat}, ${lng}) in ${absYear} B.C.
            - If early human settlements (Neolithic, Bronze Age, Indigenous tribes) were historically present in this specific region at that time, depict them accurately (huts, primitive tools, campfires).
            - Clothing MUST be primitive and accurate to the region and era (e.g., animal skins, simple woven tunics).
          `;
      } else {
          timeDescription += ` (Specifically the year ${year})`;
          historicInstruction = `
            HISTORICAL ACCURACY: The year is ${year}.
            - Ensure architecture, street signs, technology, and background details match this year.
            - If Future, use grounded sci-fi aesthetics suitable for ${year}.
          `;
      }
    }

    const textPrompt = `
      Create a highly realistic and historically accurate travel photo.

      CONTEXT:
      - Location: ${locationName} (Lat: ${lat}, Lng: ${lng}).
      - Era/Year: ${timeDescription}.
      - Weather: ${weatherCondition}.
      - Shot Variation: ${variation} (Ensure this image has a distinct composition).

      USER INSTRUCTIONS:
      "${customPrompt || "No specific scene instructions provided."}"

      REQUIREMENTS:
      1. ${historicInstruction}
      
      2. SUBJECT: Insert the person from the reference image.
         - Maintain facial identity strictly.
         - CHANGE CLOTHING: The subject MUST wear clothing accurate to ${timeDescription} and ${weatherCondition}.
         - Pose: Natural travel pose.

      3. AESTHETICS:
         - Visual Style: ${style}. 
         - Photorealistic, 8k resolution, cinematic lighting.
         - No text, borders, or frames.
    `;

    const makeRequest = async (retryCount = 0): Promise<any> => {
        try {
            return await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: {
                    parts: [
                        { text: textPrompt },
                        {
                            inlineData: {
                                mimeType: 'image/jpeg',
                                data: userImageBase64
                            }
                        }
                    ],
                },
                config: {
                    imageConfig: { aspectRatio: "1:1" }
                },
            });
        } catch (error: any) {
            if (error.message?.includes('429') || error.status === 429) {
                if (retryCount < 2) {
                    console.log(`Quota exceeded. Retrying...`);
                    let delay = 3000 * Math.pow(2, retryCount);
                    const match = error.message?.match(/retry in ([0-9.]+)s/);
                    if (match) delay = Math.ceil(parseFloat(match[1])) * 1000 + 2000;
                    
                    if (delay < 70000) {
                        await wait(delay);
                        return makeRequest(retryCount + 1);
                    }
                }
            }
            throw error;
        }
    };

    const response = await makeRequest();
    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
            return `data:image/png;base64,${part.inlineData.data}`;
        }
    }
    throw new Error("No image generated");
};