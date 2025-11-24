import React, { useRef, useState, useEffect } from 'react';
import { Coordinates, LocationContext, TimeEra, AppStatus } from '../types';
import { Upload, Camera, Clock, Loader2, Download, MapPin, AlertCircle, Key, Calendar, PenTool } from 'lucide-react';

interface SidebarProps {
  location: Coordinates | null;
  locationInfo: LocationContext | null;
  status: AppStatus;
  onGenerate: (image: File, era: TimeEra, year?: string, customPrompt?: string) => void;
  generatedImageUrl: string | null;
  onReset: () => void;
  errorMessage?: string | null;
  onChangeKey?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  location,
  locationInfo,
  status,
  onGenerate,
  generatedImageUrl,
  onReset,
  errorMessage,
  onChangeKey
}) => {
  const [selectedEra, setSelectedEra] = useState<TimeEra>(TimeEra.PRESENT);
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update default year when era changes
  useEffect(() => {
    if (selectedEra === TimeEra.PAST) {
      setSelectedYear('1950');
    } else if (selectedEra === TimeEra.FUTURE) {
      setSelectedYear('2077');
    } else {
      setSelectedYear('');
    }
  }, [selectedEra]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleGenerateClick = () => {
    if (selectedFile) {
      onGenerate(selectedFile, selectedEra, selectedYear, customPrompt);
    }
  };

  if (!location) {
    return (
      <div className="absolute top-4 right-4 w-96 bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl p-6 z-[1000] border border-white/50 transition-all duration-500 transform translate-x-0">
        <div className="text-center p-8 text-slate-500">
          <MapPin className="w-12 h-12 mx-auto mb-4 text-indigo-500 opacity-50" />
          <h2 className="text-xl font-semibold text-slate-800 mb-2">Start Your Journey</h2>
          <p className="text-sm">Click anywhere on the map to begin.</p>
        </div>
        <div className="border-t border-slate-200 mt-4 pt-4 text-center">
             <button 
                onClick={onChangeKey} 
                className="text-xs text-slate-400 hover:text-indigo-600 flex items-center justify-center gap-1 mx-auto"
            >
                <Key className="w-3 h-3" /> Change API Key
            </button>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute top-4 right-4 w-[400px] max-h-[calc(100vh-32px)] overflow-y-auto bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl z-[1000] border border-white/50 flex flex-col font-sans transition-all duration-300">
      
      {/* Header / Close (Reset) */}
      <div className="flex justify-between items-center p-6 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-indigo-600" />
          <h2 className="text-lg font-bold text-slate-800">World View</h2>
        </div>
        <button 
          onClick={onReset}
          className="text-slate-400 hover:text-slate-600 transition-colors"
        >
          ✕
        </button>
      </div>

      <div className="p-6 space-y-6">
        
        {/* Error Display */}
        {status === 'error' && errorMessage && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    <div className="space-y-2">
                        <p className="text-sm text-red-700 font-medium">{errorMessage}</p>
                        {onChangeKey && (
                            <button 
                                onClick={onChangeKey}
                                className="text-xs bg-white border border-red-200 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors font-semibold"
                            >
                                Change API Key
                            </button>
                        )}
                    </div>
                </div>
            </div>
        )}

        {/* Status: Loading Location */}
        {status === 'analyzing_location' && (
          <div className="flex flex-col items-center justify-center py-10 space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            <p className="text-sm text-slate-500">Analyzing location data...</p>
          </div>
        )}

        {/* Location Info */}
        {locationInfo && (
          <div className="space-y-4 animate-fadeIn">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-1">Coordinates</p>
                <p className="text-sm font-mono text-indigo-600 font-medium">{location.lat.toFixed(4)}</p>
                <p className="text-sm font-mono text-indigo-600 font-medium">{location.lng.toFixed(4)}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-1">Weather</p>
                <p className="text-sm font-semibold text-slate-800">{locationInfo.weather.temp}</p>
                <p className="text-xs text-slate-500">{locationInfo.weather.condition}</p>
              </div>
            </div>

            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-2">Location</p>
              <h3 className="text-xl font-bold text-slate-900 leading-tight">{locationInfo.name}</h3>
            </div>

            <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
              <p className="text-sm text-slate-600 leading-relaxed italic">
                "{locationInfo.description}"
              </p>
            </div>
          </div>
        )}

        {/* Controls Section */}
        {locationInfo && !generatedImageUrl && (
          <div className="space-y-6 border-t border-slate-100 pt-6">
            
            {/* Era Selection */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Clock className="w-4 h-4" /> Time Travel Mode
              </label>
              <div className="grid grid-cols-3 gap-2">
                {Object.values(TimeEra).map((era) => {
                  const label = era === TimeEra.PAST ? 'Past' : era === TimeEra.PRESENT ? 'Now' : 'Future';
                  return (
                    <button
                      key={era}
                      onClick={() => setSelectedEra(era)}
                      className={`py-2 px-1 rounded-lg text-sm font-medium transition-all ${
                        selectedEra === era 
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' 
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              {/* Year Input for Past/Future */}
              {(selectedEra === TimeEra.PAST || selectedEra === TimeEra.FUTURE) && (
                <div className="animate-in slide-in-from-top-2 fade-in bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Target Year</label>
                  </div>
                  <input
                    type="number"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-sm"
                    placeholder={selectedEra === TimeEra.PAST ? "e.g. 1920" : "e.g. 3000"}
                  />
                  <p className="text-[10px] text-slate-400 mt-2 leading-tight">
                    Enter a specific year to customize clothing and architecture.
                  </p>
                </div>
              )}
            </div>
            
            {/* Custom Prompt Input */}
            <div className="space-y-3">
               <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <PenTool className="w-4 h-4" /> Scene Details (Optional)
              </label>
              <textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-sm resize-none"
                placeholder="Describe specific details, actions, or historical elements you want to include..."
                rows={3}
              />
            </div>

            {/* Photo Upload */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Camera className="w-4 h-4" /> Your Face
              </label>
              
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="relative group cursor-pointer border-2 border-dashed border-slate-300 rounded-xl p-4 transition-all hover:border-indigo-400 hover:bg-indigo-50/30 text-center h-32 flex flex-col items-center justify-center overflow-hidden"
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*"
                  onChange={handleFileChange}
                />
                
                {previewUrl ? (
                  <img src={previewUrl} alt="Preview" className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-slate-400 mb-2 group-hover:text-indigo-500 transition-colors" />
                    <p className="text-xs text-slate-500">Click to upload selfie</p>
                  </>
                )}
              </div>
            </div>

            <button
              onClick={handleGenerateClick}
              disabled={!selectedFile || status === 'generating_image'}
              className="w-full py-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl font-bold text-lg shadow-lg shadow-indigo-200 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {status === 'generating_image' ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" /> Generating...
                </>
              ) : (
                'Generate Travel Shot'
              )}
            </button>
            <p className="text-center text-[10px] text-slate-400">Powered by Nano Banana</p>
          </div>
        )}

        {/* Result Section */}
        {generatedImageUrl && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-4 pt-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-indigo-500 tracking-wider uppercase">Nano Banana Vision</span>
              <span className="px-2 py-1 bg-violet-100 text-violet-700 text-[10px] font-bold rounded-full uppercase">AI Generated</span>
            </div>
            
            <div className="relative rounded-2xl overflow-hidden shadow-lg group">
              <img src={generatedImageUrl} alt="Generated Travel" className="w-full aspect-square object-cover" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <a 
                  href={generatedImageUrl} 
                  download={`chronotravel-${Date.now()}.png`}
                  className="bg-white/90 backdrop-blur text-slate-900 px-6 py-3 rounded-full font-bold flex items-center gap-2 hover:bg-white transition-transform hover:scale-105"
                >
                  <Download className="w-4 h-4" /> Download Image
                </a>
              </div>
            </div>

            <button 
              onClick={() => {
                  onGenerate(selectedFile!, selectedEra, selectedYear, customPrompt) 
              }}
              className="w-full py-3 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition-colors text-sm"
            >
              Regenerate
            </button>
          </div>
        )}

      </div>
    </div>
  );
};