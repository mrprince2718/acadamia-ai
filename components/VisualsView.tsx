
import React, { useState } from 'react';
import { generateStudyVisual } from '../services/geminiService';
import { AspectRatio } from '../types';
import { ICONS } from '../constants';

const VisualsView: React.FC = () => {
  const [topic, setTopic] = useState('');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  const [image, setImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const ratios: AspectRatio[] = ['1:1', '4:3', '16:9', '9:16', '3:2', '21:9'];

  const handleGenerate = async () => {
    if (!topic.trim() || isLoading) return;
    setIsLoading(true);
    try {
      const url = await generateStudyVisual(topic, aspectRatio);
      setImage(url);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full bg-white rounded-3xl shadow-xl ring-1 ring-slate-200 overflow-hidden flex flex-col">
      <div className="p-8 border-b border-slate-100 bg-white/50 backdrop-blur-sm">
        <h2 className="text-2xl font-bold font-display text-slate-800">Visual Aid Generator</h2>
        <p className="text-slate-500">Create diagrams, flowcharts, or infographics for your studies</p>
      </div>

      <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="space-y-4">
            <label className="block text-sm font-semibold text-slate-700">What do you want to visualize?</label>
            <div className="flex gap-4">
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., Photosynthesis process, Hydrological cycle, etc."
                className="flex-1 bg-slate-50 border-none ring-1 ring-slate-200 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-800 shadow-sm"
              />
              <button
                onClick={handleGenerate}
                disabled={isLoading || !topic.trim()}
                className="bg-indigo-600 text-white px-8 rounded-2xl font-bold hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center gap-2 shadow-lg shadow-indigo-100"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <ICONS.Visuals className="w-5 h-5" />
                    Generate
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <span className="text-sm font-semibold text-slate-700">Aspect Ratio</span>
            <div className="flex flex-wrap gap-2">
              {ratios.map((r) => (
                <button
                  key={r}
                  onClick={() => setAspectRatio(r)}
                  className={`px-4 py-2 rounded-xl text-sm transition-all ${
                    aspectRatio === r 
                      ? 'bg-indigo-100 text-indigo-700 ring-2 ring-indigo-500 font-bold' 
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-center mt-8">
          {image ? (
            <div className="group relative max-w-4xl rounded-3xl overflow-hidden shadow-2xl ring-1 ring-slate-200 bg-slate-50 transition-transform duration-500 hover:scale-[1.01]">
              <img src={image} alt="Generated Study Aid" className="w-full h-auto block" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                <a 
                  href={image} 
                  download="study-aid.png" 
                  className="bg-white text-slate-900 px-6 py-2 rounded-full font-bold hover:bg-slate-100 transition-colors flex items-center gap-2"
                >
                  Download HD
                </a>
              </div>
            </div>
          ) : (
            !isLoading && (
              <div className="w-full max-w-2xl aspect-video rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 space-y-4">
                <ICONS.Visuals className="w-16 h-16 opacity-20" />
                <p className="font-medium">Enter a topic and click generate to see the visual aid</p>
              </div>
            )
          )}
          
          {isLoading && (
            <div className="w-full max-w-2xl aspect-video rounded-3xl bg-slate-50 flex flex-col items-center justify-center space-y-4 animate-pulse">
               <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
               <p className="text-slate-500 font-medium italic">Gemini is sketching your diagram...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VisualsView;
