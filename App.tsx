import React, { useState, useEffect, useCallback } from 'react';
import { MapController } from './components/MapController';
import { Sidebar } from './components/Sidebar';
import { analyzeLocation, generateTravelPhoto, blobToBase64 } from './services/geminiService';
import { Coordinates, LocationContext, AppStatus, TimeEra } from './types';

const App: React.FC = () => {
  const [apiKeyReady, setApiKeyReady] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<Coordinates | null>(null);
  const [locationInfo, setLocationInfo] = useState<LocationContext | null>(null);
  const [status, setStatus] = useState<AppStatus>('idle');
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize API Key
  useEffect(() => {
    const initApiKey = async () => {
      try {
        const win = window as any;
        if (win.aistudio) {
          const hasKey = await win.aistudio.hasSelectedApiKey();
          if (!hasKey) {
            await win.aistudio.openSelectKey();
          }
          setApiKeyReady(true);
        } else {
          // Fallback if not running in the specific environment
           if (process.env.API_KEY) setApiKeyReady(true);
        }
      } catch (e) {
        console.error("API Key selection failed", e);
      }
    };
    initApiKey();
  }, []);

  const openKeySelection = async () => {
    const win = window as any;
    if (win.aistudio) {
      try {
        await win.aistudio.openSelectKey();
        setApiKeyReady(true);
      } catch (e) {
        console.error("Failed to open key selection", e);
      }
    }
  };

  const handleError = async (error: any, defaultMsg: string) => {
    console.error(defaultMsg, error);
    setStatus('error');
    
    const msg = error.message || JSON.stringify(error);
    
    if (msg.includes("429") || msg.includes("Quota") || msg.includes("RESOURCE_EXHAUSTED")) {
        // Try to extract retry time from message "Please retry in X s."
        const retryMatch = msg.match(/retry in ([0-9.]+)s/);
        const retryTime = retryMatch ? retryMatch[1] : null;
        
        let displayMsg = "Quota/Rate limit exceeded.";
        if (retryTime) {
            displayMsg += ` Please wait ${Math.ceil(parseFloat(retryTime))} seconds before trying again.`;
        } else {
            displayMsg += " Please try again later or check your billing.";
        }
        
        setErrorMessage(displayMsg);
        // Do NOT force openKeySelection automatically for rate limits as it might be temporary.
        // The sidebar will show a button to change key if needed.
    } else if (msg.includes("400") || msg.includes("expired") || msg.includes("API_KEY_INVALID")) {
        setErrorMessage("Your API Key has expired or is invalid. Please select a new API Key.");
        await openKeySelection();
    } else if (msg.includes("Requested entity was not found")) {
        setErrorMessage("API Key not found or invalid. Please select a new API Key.");
        await openKeySelection();
    } else {
        setErrorMessage(defaultMsg + ": " + (error.message || "Unknown error"));
    }
  };

  const handleLocationSelect = useCallback(async (coords: Coordinates) => {
    if (!apiKeyReady) return;

    setSelectedLocation(coords);
    setGeneratedImageUrl(null);
    setStatus('analyzing_location');
    setLocationInfo(null);
    setErrorMessage(null);

    try {
      const info = await analyzeLocation(coords.lat, coords.lng);
      setLocationInfo(info);
      setStatus('ready_to_generate');
    } catch (error) {
      await handleError(error, "Failed to analyze location");
    }
  }, [apiKeyReady]);

  const handleGenerate = async (file: File, era: TimeEra, year?: string, customPrompt?: string) => {
    if (!selectedLocation || !locationInfo) return;

    setStatus('generating_image');
    setErrorMessage(null);
    
    try {
      const base64Image = await blobToBase64(file);
      
      const imageUrl = await generateTravelPhoto(
        selectedLocation.lat,
        selectedLocation.lng,
        locationInfo.name,
        era,
        base64Image,
        locationInfo.weather.condition,
        year,
        customPrompt
      );

      setGeneratedImageUrl(imageUrl);
      setStatus('complete');

    } catch (error) {
      await handleError(error, "Image generation failed");
    }
  };

  const handleReset = () => {
    setSelectedLocation(null);
    setLocationInfo(null);
    setGeneratedImageUrl(null);
    setStatus('idle');
    setErrorMessage(null);
  };

  if (!apiKeyReady) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-4 p-8">
            <h1 className="text-2xl font-bold text-slate-800">ChronoTravel AI</h1>
            <p className="text-slate-600">Please select an API Key to continue.</p>
            <button 
                onClick={openKeySelection}
                className="px-6 py-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700"
            >
                Select Key
            </button>
            <div className="text-xs text-slate-400 mt-4">
                <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="underline hover:text-indigo-500">
                    Billing Documentation
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
        generatedImageUrl={generatedImageUrl}
        onReset={handleReset}
        errorMessage={errorMessage}
        onChangeKey={openKeySelection}
      />
    </div>
  );
};

export default App;