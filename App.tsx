import React, { useState, useEffect, useCallback } from 'react';
import { MapController } from './components/MapController';
import { Sidebar } from './components/Sidebar';
import { analyzeLocation, generateTravelPhoto, blobToBase64 } from './services/geminiService';
import { Coordinates, LocationContext, AppStatus, TimeEra, VisualStyle, PointOfInterest } from './types';
import { Key, MapPin } from 'lucide-react';

const App: React.FC = () => {
  const [apiKey, setApiKey] = useState<string>('');
  const [apiKeyReady, setApiKeyReady] = useState(false);
  
  const [selectedLocation, setSelectedLocation] = useState<Coordinates | null>(null);
  const [locationInfo, setLocationInfo] = useState<LocationContext | null>(null);
  const [status, setStatus] = useState<AppStatus>('idle');
  
  // Store array of images now
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize: Check for stored key or environment key
  useEffect(() => {
    const initApiKey = async () => {
      // 1. Check AI Studio (Dev env)
      const win = window as any;
      if (win.aistudio) {
        try {
            const hasKey = await win.aistudio.hasSelectedApiKey();
            if (hasKey) {
                // If AI Studio handles the key, we assume it's injected or managed
                // But specifically for this request, if env var exists we use it, otherwise prompts.
                if (process.env.API_KEY) {
                    setApiKey(process.env.API_KEY);
                    setApiKeyReady(true);
                    return;
                }
            }
        } catch(e) { console.error(e); }
      }

      // 2. Check process.env (Build env)
      if (process.env.API_KEY) {
        setApiKey(process.env.API_KEY);
        setApiKeyReady(true);
        return;
      }

      // 3. Check Local Storage (User persistence for web)
      const storedKey = localStorage.getItem('gemini_api_key');
      if (storedKey) {
          setApiKey(storedKey);
          setApiKeyReady(true);
      }
    };
    initApiKey();
  }, []);

  const handleManualKeySubmit = (e: React.FormEvent, keyInput: string) => {
      e.preventDefault();
      if (keyInput.trim().length > 0) {
          setApiKey(keyInput.trim());
          localStorage.setItem('gemini_api_key', keyInput.trim());
          setApiKeyReady(true);
      }
  };

  const clearApiKey = () => {
      setApiKey('');
      setApiKeyReady(false);
      localStorage.removeItem('gemini_api_key');
      // If in AI Studio, try to open selector
      const win = window as any;
      if (win.aistudio) {
           win.aistudio.openSelectKey();
      }
  };

  const handleError = async (error: any, defaultMsg: string) => {
    console.error(defaultMsg, error);
    setStatus('error');
    
    const msg = error.message || JSON.stringify(error);
    
    if (msg.includes("429") || msg.includes("Quota") || msg.includes("RESOURCE_EXHAUSTED")) {
        const retryMatch = msg.match(/retry in ([0-9.]+)s/);
        const retryTime = retryMatch ? retryMatch[1] : null;
        let displayMsg = "Quota/Rate limit exceeded.";
        if (retryTime) {
            displayMsg += ` Please wait ${Math.ceil(parseFloat(retryTime))} seconds before trying again.`;
        } else {
            displayMsg += " Please try again later or check your billing.";
        }
        setErrorMessage(displayMsg);
    } else if (msg.includes("400") || msg.includes("expired") || msg.includes("API_KEY_INVALID") || msg.includes("not found")) {
        setErrorMessage("Invalid API Key. Please update your key.");
        clearApiKey();
    } else {
        setErrorMessage(defaultMsg + ": " + (error.message || "Unknown error"));
    }
  };

  const handleLocationSelect = useCallback(async (coords: Coordinates) => {
    if (!apiKeyReady) return;

    setSelectedLocation(coords);
    setGeneratedImages([]); // Clear previous images
    setStatus('analyzing_location');
    setLocationInfo(null);
    setErrorMessage(null);

    try {
      const info = await analyzeLocation(coords.lat, coords.lng, apiKey);
      setLocationInfo(info);
      setStatus('ready_to_generate');
    } catch (error) {
      await handleError(error, "Failed to analyze location");
    }
  }, [apiKeyReady, apiKey]);

  const handlePoiSelect = useCallback((poi: PointOfInterest) => {
      handleLocationSelect({ lat: poi.lat, lng: poi.lng });
  }, [handleLocationSelect]);

  const handleGenerate = async (file: File, era: TimeEra, year?: string, customPrompt?: string, style: VisualStyle = 'Realistic') => {
    if (!selectedLocation || !locationInfo) return;

    setStatus('generating_image');
    setErrorMessage(null);
    setGeneratedImages([]);
    
    try {
      const base64Image = await blobToBase64(file);
      
      // Generate 2 distinct images
      const variations = [
          "Wide Angle Shot (Establishing Context)",
          "Medium Shot (Character Interaction)"
      ];

      for (const variation of variations) {
          const imageUrl = await generateTravelPhoto(
            apiKey,
            selectedLocation.lat,
            selectedLocation.lng,
            locationInfo.name,
            era,
            base64Image,
            locationInfo.weather.condition,
            year,
            customPrompt,
            style,
            variation
          );
          // Add to array
          setGeneratedImages(prev => [...prev, imageUrl]);
      }

      setStatus('complete');

    } catch (error) {
      await handleError(error, "Image generation failed");
    }
  };

  const handleReset = () => {
    setSelectedLocation(null);
    setLocationInfo(null);
    setGeneratedImages([]);
    setStatus('idle');
    setErrorMessage(null);
  };

  // --- WELCOME / API KEY SCREEN ---
  if (!apiKeyReady) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-100 p-4 font-sans">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center space-y-6">
            <div className="flex justify-center mb-4">
                 <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600">
                    <MapPin className="w-8 h-8" />
                 </div>
            </div>
            <div>
                <h1 className="text-3xl font-bold text-slate-800 mb-2">ChronoTravel AI</h1>
                <p className="text-slate-500 text-sm leading-relaxed">
                    Time travel to 10,000 B.C. or the distant future. 
                    <br/>Enter your Gemini API Key to begin.
                </p>
            </div>
            
            <form onSubmit={(e) => {
                const input = (document.getElementById('apiKeyInput') as HTMLInputElement).value;
                handleManualKeySubmit(e, input);
            }} className="space-y-4">
                <div className="relative">
                    <Key className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                    <input 
                        id="apiKeyInput"
                        type="password" 
                        placeholder="Paste your Gemini API Key here"
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 transition-all"
                    />
                </div>
                <button 
                    type="submit"
                    className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-transform active:scale-95 shadow-lg shadow-indigo-200"
                >
                    Start Journey
                </button>
            </form>

            <div className="text-xs text-slate-400 pt-4 border-t border-slate-100">
                Don't have a key? {' '}
                <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline font-semibold">
                    Get one from Google AI Studio
                </a>
            </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen relative overflow-hidden bg-slate-200">
      <MapController 
        onLocationSelect={handleLocationSelect} 
        selectedLocation={selectedLocation}
      />
      
      <Sidebar 
        location={selectedLocation}
        locationInfo={locationInfo}
        status={status}
        onGenerate={handleGenerate}
        generatedImages={generatedImages}
        onReset={handleReset}
        errorMessage={errorMessage}
        onChangeKey={clearApiKey}
        onPoiSelect={handlePoiSelect}
      />
    </div>
  );
};

export default App;