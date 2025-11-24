import { GoogleGenAI, Type } from "@google/genai";
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
 * Analyzes the coordinates to provide context (Weather, Location Name, Description).
 * Uses gemini-2.5-flash with Google Maps Grounding for high accuracy.
 */
export const analyzeLocation = async (lat: number, lng: number): Promise<LocationContext> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key not found");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Prompt explicitly asks for Google Maps usage to ensure accuracy
  const prompt = `
    I am at coordinates: Latitude ${lat}, Longitude ${lng}.
    
    Step 1: Use Google Maps to identify the exact location name (Specific Landmark, City, Region, Country).
    Step 2: Create a JSON object with the following structure based on that location.
    
    Structure:
    {
      "name": "The specific location name found via Maps",
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
        // use googleMaps tool for accuracy
        tools: [{ googleMaps: {} }], 
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    // Clean up markdown formatting to extract JSON
    // Matches ```json ... ``` or just { ... }
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as LocationContext;
    } else {
        throw new Error("Failed to parse location JSON");
    }

  } catch (error) {
    console.error("Error analyzing location:", error);
    // Fallback for demo purposes if API fails or quota limited
    return {
      name: "Unknown Location",
      description: "Could not retrieve exact location details. Please try again.",
      weather: { temp: "--", condition: "Unknown" },
      clothingRecommendation: "Casual wear"
    };
  }
};

/**
 * Generates the travel photo.
 * Uses Nano Banana (gemini-2.5-flash-image) exclusively as requested.
 * This model is more efficient and has better availability than the Pro model.
 */
export const generateTravelPhoto = async (
  lat: number,
  lng: number,
  locationName: string,
  era: TimeEra,
  userImageBase64: string,
  weatherCondition: string,
  year?: string,
  customPrompt?: string
): Promise<string> => {
    if (!process.env.API_KEY) {
        throw new Error("API Key not found");
    }
  
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    // Construct detailed time description
    let timeDescription = era as string;
    if (year) {
      timeDescription += ` (Specifically the year ${year})`;
    }

    // Construct a rich prompt for the image model
    const textPrompt = `
      Create a highly realistic and historically accurate travel photo.

      CONTEXT:
      - Location: ${locationName} (Lat: ${lat}, Lng: ${lng}).
      - Era/Year: ${timeDescription}.
      - Weather: ${weatherCondition}.

      USER INSTRUCTIONS (Integrate these strictly):
      "${customPrompt || "No specific scene instructions provided."}"

      REQUIREMENTS:
      1. HISTORICAL ACCURACY: You must verify the historical context of ${locationName} in the year ${year || "of the era"}.
         - If the year is past, ensure architecture, clothing, and background objects (cars, signs, technology) perfectly match that specific year.
         - If the year is future, extrapolate based on the location's current geography but with advanced sci-fi aesthetics suitable for ${year}.
      
      2. SUBJECT: Insert the person from the reference image.
         - Maintain facial identity strictly.
         - CHANGE CLOTHING: The subject MUST wear clothing that is historically/futuristically accurate for ${timeDescription} and suitable for ${weatherCondition} weather.
         - Pose: Natural travel photo pose, interacting with the environment if described in User Instructions.

      3. AESTHETICS:
         - Photorealistic, 8k resolution, cinematic lighting.
         - No text, no frames, no borders.
    `;

    const makeRequest = async (retryCount = 0): Promise<any> => {
        try {
            return await ai.models.generateContent({
                model: 'gemini-2.5-flash-image', // Nano Banana
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
                    imageConfig: {
                        aspectRatio: "1:1",
                    }
                },
            });
        } catch (error: any) {
            // Check for Rate Limit (429)
            if (error.message?.includes('429') || error.status === 429) {
                // We will retry up to 2 times (total 3 attempts)
                if (retryCount < 2) {
                    console.log(`Quota exceeded. Retrying attempt ${retryCount + 1}...`);
                    
                    let delay = 3000 * Math.pow(2, retryCount); // Default backoff
                    
                    // Attempt to parse specific retry time from error message
                    const match = error.message?.match(/retry in ([0-9.]+)s/);
                    if (match) {
                        // Use the server's suggested delay + 2s buffer
                        delay = Math.ceil(parseFloat(match[1])) * 1000 + 2000;
                    }

                    // If delay is under 70s, it's worth waiting automatically. 
                    // Otherwise, user might think app crashed.
                    if (delay < 70000) {
                        console.log(`Waiting ${delay}ms before retry...`);
                        await wait(delay);
                        return makeRequest(retryCount + 1);
                    }
                }
            }
            throw error;
        }
    };

    try {
        const response = await makeRequest();

        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                return `data:image/png;base64,${part.inlineData.data}`;
            }
        }
      
        throw new Error("No image generated");

    } catch (error) {
      console.error("Error generating image:", error);
      throw error;
    }
};