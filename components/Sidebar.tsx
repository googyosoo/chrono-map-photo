import React, { useRef, useState, useEffect } from 'react';
import { Coordinates, LocationContext, TimeEra, AppStatus, VisualStyle, PointOfInterest } from '../types';
import { Upload, Camera, Clock, Loader2, Download, MapPin, AlertCircle, Key, Calendar, PenTool, Palette, Navigation } from 'lucide-react';

interface SidebarProps {
  location: Coordinates | null;
  locationInfo: LocationContext | null;
  status: AppStatus;
  onGenerate: (image: File, era: TimeEra, year?: string, customPrompt?: string, style?: VisualStyle) => void;
  generatedImages: string[]; 
  onReset: () => void;
  errorMessage?: string | null;
  onChangeKey?: () => void;
  onPoiSelect: (poi: PointOfInterest) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  location,
  locationInfo,
  status,
  onGenerate,
  generatedImages,
  onReset,
  errorMessage,
  onChangeKey,
  onPoiSelect
}) => {
  const [selectedEra, setSelectedEra] = useState<TimeEra>(TimeEra.PRESENT);
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [selectedStyle, setSelectedStyle] = useState<VisualStyle>('Realistic');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [overrideVague, setOverrideVague] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const AVAILABLE_STYLES: VisualStyle[] = ['Realistic', 'Cinematic', 'Documentary'];

  useEffect(() => {
      setOverrideVague(false);
  }, [location]);

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
      onGenerate(selectedFile, selectedEra, selectedYear, customPrompt, selectedStyle);
    }
  };

  const formatYearDisplay = (valStr: string) => {
      const val = parseInt(valStr);
      if (isNaN(val)) return valStr;
      return val < 0 ? `${Math.abs(val)} B.C.` : `${val} A.D.`;
  };

  const isVagueState = locationInfo?.isVague && !overrideVague && generatedImages.length === 0;

  if (!location) {
    return (
      <div className="absolute top-4 right-4 w-96 bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl p-6 z-[1000] border border-white/50">
        <div className="text-center p-8 text-slate-500">
          <MapPin className="w-12 h-12 mx-auto mb-4 text-indigo-500 opacity-50" />
          <h2 className="text-xl font-semibold text-slate-800 mb-2">Start Your Journey</h2>
          <p className="text-sm">Click anywhere on the map to begin.</p>
        </div>
        <div className="border-t border-slate-200 mt-4 pt-4 text-center">
             <button onClick={onChangeKey} className="text-xs text-slate-400 hover:text-indigo-600 flex items-center justify-center gap-1 mx-auto">
                <Key className="w-3 h-3" /> Change API Key
            </button>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute top-4 right-4 w-[400px] max-h-[calc(100vh-32px)] overflow-y-auto bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl z-[1000] border border-white/50 flex flex-col font-sans transition-all duration-300">
      
      <div className="flex justify-between items-center p-6 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-indigo-600" />
          <h2 className="text-lg font-bold text-slate-800">World View</h2>
        </div>
        <button onClick={onReset} className="text-slate-400 hover:text-slate-600">✕</button>
      </div>

      <div className="p-6 space-y-6">
        
        {status === 'error' && errorMessage && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    <div className="space-y-2">
                        <p className="text-sm text-red-700 font-medium">{errorMessage}</p>
                        {onChangeKey && (
                            <button onClick={onChangeKey} className="text-xs bg-white border border-red-200 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors font-semibold">Change API Key</button>
                        )}
                    </div>
                </div>
            </div>
        )}

        {status === 'analyzing_location' && (
          <div className="flex flex-col items-center justify-center py-10 space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            <p className="text-sm text-slate-500">Analyzing location data...</p>
          </div>
        )}

        {isVagueState && locationInfo && (
            <div className="animate-fadeIn space-y-4">
                 <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl">
                    <div className="flex items-center gap-2 mb-2 text-amber-700 font-semibold">
                        <Navigation className="w-4 h-4" />
                        <h3>Precise Location Needed</h3>
                    </div>
                    <p className="text-sm text-amber-800/80 mb-3">
                        You clicked near <strong>{locationInfo.name}</strong>.
                    </p>
                    {locationInfo.nearbyPOIs?.map((poi, idx) => (
                        <button key={idx} onClick={() => onPoiSelect(poi)} className="w-full text-left p-3 bg-white hover:bg-amber-100 border border-amber-200 rounded-lg mb-2 text-sm transition-colors">
                            {poi.name}
                        </button>
                    ))}
                 </div>
                 <button onClick={() => setOverrideVague(true)} className="w-full text-xs text-slate-500 underline hover:text-slate-700">Use exact spot</button>
            </div>
        )}

        {locationInfo && !isVagueState && (
          <div className="space-y-4 animate-fadeIn">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-2">Location</p>
              <h3 className="text-xl font-bold text-slate-900 leading-tight">{locationInfo.name}</h3>
            </div>
            <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
              <p className="text-sm text-slate-600 italic">"{locationInfo.description}"</p>
            </div>
          </div>
        )}

        {locationInfo && !isVagueState && generatedImages.length === 0 && (
          <div className="space-y-6 border-t border-slate-100 pt-6">
            
            <div className="space-y-3">
              <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Clock className="w-4 h-4" /> Time Travel Mode
              </label>
              <div className="grid grid-cols-3 gap-2">
                {Object.values(TimeEra).map((era) => (
                    <button
                      key={era}
                      onClick={() => setSelectedEra(era)}
                      className={`py-2 px-1 rounded-lg text-sm font-medium transition-all ${
                        selectedEra === era 
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' 
                          : 'bg-white border border-slate-200 text-slate-600'
                      }`}
                    >
                      {era === TimeEra.PAST ? 'Past' : era === TimeEra.PRESENT ? 'Now' : 'Future'}
                    </button>
                ))}
              </div>

              {(selectedEra === TimeEra.PAST || selectedEra === TimeEra.FUTURE) && (
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 animate-fadeIn">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                         <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                         <label className="text-xs font-bold text-slate-600 uppercase">Target Year</label>
                    </div>
                    <span className="text-xs font-mono font-bold text-indigo-600">
                        {formatYearDisplay(selectedYear)}
                    </span>
                  </div>
                  
                  {selectedEra === TimeEra.PAST && (
                    <div className="mb-4 px-1">
                         <input 
                            type="range" 
                            min="-10000" // 10,000 BC
                            max="2020" 
                            step="10"
                            value={selectedYear || 1950} 
                            onChange={(e) => setSelectedYear(e.target.value)}
                            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                         />
                         <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
                            <span>10k B.C.</span>
                            <span>2020 A.D.</span>
                         </div>
                    </div>
                  )}

                  <input
                    type="number"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm font-mono text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="Enter Year"
                  />
                  <p className="text-[10px] text-slate-400 mt-1 pl-1">
                    {selectedEra === TimeEra.PAST && parseInt(selectedYear) < 0 
                        ? "Ancient era selected. Landscape will be natural." 
                        : "Select specific year."}
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Palette className="w-4 h-4" /> Visual Style
              </label>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_STYLES.map((style) => (
                  <button
                    key={style}
                    onClick={() => setSelectedStyle(style)}
                    className={`py-1.5 px-3 rounded-full text-xs font-medium transition-all ${
                      selectedStyle === style ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {style}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="space-y-3">
               <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <PenTool className="w-4 h-4" /> Scene Details (Optional)
              </label>
              <textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm resize-none focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="Describe scene..."
                rows={2}
              />
            </div>

            <div className="space-y-3">
              <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Camera className="w-4 h-4" /> Your Face
              </label>
              <div onClick={() => fileInputRef.current?.click()} className="relative group cursor-pointer border-2 border-dashed border-slate-300 rounded-xl p-4 text-center h-28 flex flex-col items-center justify-center overflow-hidden hover:bg-slate-50 transition-colors">
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                {previewUrl ? (
                  <img src={previewUrl} alt="Preview" className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <>
                    <Upload className="w-6 h-6 text-slate-400 mb-2 group-hover:text-indigo-500" />
                    <p className="text-xs text-slate-500">Upload Selfie</p>
                  </>
                )}
              </div>
            </div>

            <button
              onClick={handleGenerateClick}
              disabled={!selectedFile || status === 'generating_image'}
              className="w-full py-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 hover:shadow-xl hover:scale-[1.02] transition-all"
            >
              {status === 'generating_image' ? <><Loader2 className="w-5 h-5 animate-spin" /> Generating...</> : 'Generate 2 Travel Shots'}
            </button>
          </div>
        )}

        {(status === 'generating_image' || generatedImages.length > 0) && (
           <div className="space-y-4 pt-2">
             <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-indigo-500 uppercase tracking-wider">Nano Banana Vision</span>
                <span className="px-2 py-1 bg-violet-100 text-violet-700 text-[10px] font-bold rounded-full">{generatedImages.length}/2 Images</span>
             </div>
             <div className="grid grid-cols-2 gap-3">
                {generatedImages.map((imgUrl, index) => (
                  <div key={index} className="relative rounded-xl overflow-hidden shadow-lg group aspect-square">
                    <img src={imgUrl} alt={`Travel ${index}`} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <a href={imgUrl} download={`chrono-${index}.png`} className="p-2 bg-white/90 rounded-full hover:bg-white transition-transform hover:scale-110">
                        <Download className="w-4 h-4 text-slate-900" />
                      </a>
                    </div>
                  </div>
                ))}
                {status === 'generating_image' && generatedImages.length < 2 && (
                    <div className="bg-slate-100 rounded-xl aspect-square flex flex-col items-center justify-center text-slate-400 animate-pulse">
                        <Loader2 className="w-6 h-6 animate-spin mb-2" />
                        <span className="text-[10px]">Processing...</span>
                    </div>
                )}
             </div>
             {status === 'complete' && (
                <button onClick={() => { if (selectedFile) onGenerate(selectedFile, selectedEra, selectedYear, customPrompt, selectedStyle) }} className="w-full py-3 bg-slate-100 text-slate-700 font-semibold rounded-xl text-sm hover:bg-slate-200 transition-colors">
                  Regenerate
                </button>
             )}
           </div>
        )}
      </div>
    </div>
  );
};