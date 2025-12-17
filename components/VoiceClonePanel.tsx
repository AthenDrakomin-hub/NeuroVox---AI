import React, { useState } from 'react';
import { User, Zap, CheckCircle2, Music2, Briefcase } from 'lucide-react';

interface VoiceClonePanelProps {
  onVoiceSelected: (instruction: string, voiceName: string) => void;
}

interface VoicePreset {
  id: string;
  name: string;
  voiceId: string; // Gemini Voice Name
  description: string;
  icon: React.ElementType;
  color: string;
  instruction: string;
}

const PRESETS: VoicePreset[] = [
  {
    id: 'male_mature',
    name: '沉稳男声 (35-40岁)',
    voiceId: 'Fenrir', // Fenrir is deep/baritone
    description: '声音深沉、磁性、稳重。适合商务、旁白或成熟男性角色。',
    icon: Briefcase,
    color: 'from-blue-600 to-cyan-500',
    instruction: `
      You are a 38-year-old mature Chinese man. 
      Your voice is deep, steady, magnetic, and confident (Baritone).
      You speak with a calm, professional, and authoritative tone.
      You are NOT an AI assistant. You are a human voice actor.
      
      CRITICAL: You must speak ONLY in CHINESE unless the user speaks another language, but prefer Chinese.
      Maintain a masculine, mature cadence.
    `
  },
  {
    id: 'female_sweet',
    name: '清甜女声 (元气)',
    voiceId: 'Aoede', // Aoede is expressive/soprano
    description: '声音甜美、活泼、充满活力。适合二次元、聊天或年轻女性角色。',
    icon: Music2,
    color: 'from-pink-500 to-rose-400',
    instruction: `
      You are a 22-year-old energetic Chinese girl.
      Your voice is sweet, high-pitched, clear, and cheerful (Soprano).
      You speak with a lively, friendly, and enthusiastic tone ("Gen Z" vibe).
      
      CRITICAL: You must speak ONLY in CHINESE. Even if the user speaks English, try to reply in Chinese or repeat in a Chinese accent if requested.
      Maintain a feminine, cute, and energetic cadence.
    `
  },
  {
    id: 'female_mature',
    name: '知性女声 (御姐)',
    voiceId: 'Kore', // Kore is relaxed/alto
    description: '声音温柔、知性、优雅。适合电台、情感叙述或成熟女性角色。',
    icon: Music2,
    color: 'from-purple-600 to-indigo-400',
    instruction: `
      You are a 30-year-old elegant Chinese woman.
      Your voice is soft, warm, soothing, and intellectual (Alto).
      You speak with a gentle, slow-paced, and empathetic tone.
      
      CRITICAL: You must speak ONLY in CHINESE.
      Maintain a feminine, mature, and soothing cadence.
    `
  }
];

const VoiceClonePanel: React.FC<VoiceClonePanelProps> = ({ onVoiceSelected }) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleSelect = (preset: VoicePreset) => {
    setSelectedId(preset.id);
    onVoiceSelected(preset.instruction, preset.voiceId);
  };

  return (
    <div className="bg-cyber-800 border border-cyber-700 rounded-xl p-6 shadow-lg shadow-cyber-900/50 h-full flex flex-col">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-cyber-500/20 p-2 rounded-lg text-cyber-400">
          <User className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-white">声线选择</h3>
          <p className="text-xs text-gray-400">点击下方卡片选择变声对象</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
        {PRESETS.map((preset) => {
          const isSelected = selectedId === preset.id;
          const Icon = preset.icon;
          
          return (
            <div
              key={preset.id}
              onClick={() => handleSelect(preset)}
              className={`
                relative overflow-hidden rounded-xl border-2 transition-all cursor-pointer group
                ${isSelected 
                  ? 'border-cyber-accent bg-cyber-900/80 shadow-[0_0_20px_rgba(0,243,255,0.2)] scale-[1.02]' 
                  : 'border-cyber-700 bg-cyber-900/40 hover:border-cyber-500 hover:bg-cyber-800'
                }
              `}
            >
              {/* Background Gradient Splash */}
              <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${preset.color} opacity-10 rounded-bl-full transition-opacity group-hover:opacity-20`}></div>
              
              <div className="p-5 flex items-start gap-4 relative z-10">
                <div className={`
                  p-3 rounded-lg bg-gradient-to-br ${preset.color} text-white shadow-lg
                  ${isSelected ? 'shadow-cyber-accent/30' : ''}
                `}>
                  <Icon className="w-6 h-6" />
                </div>

                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <h4 className={`font-bold text-lg ${isSelected ? 'text-white' : 'text-gray-200'}`}>
                      {preset.name}
                    </h4>
                    {isSelected && (
                      <span className="bg-cyber-accent text-black text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> 激活
                      </span>
                    )}
                  </div>
                  
                  <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                    {preset.description}
                  </p>
                  
                  <div className="mt-3 flex items-center gap-2 text-[10px] text-gray-500 font-mono">
                    <span className="bg-black/30 px-2 py-1 rounded border border-white/5">
                      Model: {preset.voiceId}
                    </span>
                    {isSelected && (
                      <span className="text-cyber-accent flex items-center gap-1 animate-pulse">
                        <Zap className="w-3 h-3" /> Ready
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 pt-4 border-t border-cyber-700 text-center">
        <p className="text-xs text-gray-500 mb-2">
          {selectedId 
            ? "已选择声线，请点击右侧 '启动 NeuroVox' 开始变声。" 
            : "请先选择一个声线以继续..."}
        </p>
      </div>
    </div>
  );
};

export default VoiceClonePanel;