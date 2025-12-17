import React, { useState } from 'react';
import { Bot, Activity, AlertTriangle, BookOpen, Mic2, Video } from 'lucide-react';
import VoiceClonePanel from './components/VoiceClonePanel';
import DeviceSettings from './components/DeviceSettings';
import LiveTransmitter from './components/LiveTransmitter';
import UserGuideModal from './components/UserGuideModal';
import MeetingRoom from './components/MeetingRoom';

function App() {
  const [systemInstruction, setSystemInstruction] = useState('');
  const [recommendedVoice, setRecommendedVoice] = useState('Zephyr');
  const [inputDeviceId, setInputDeviceId] = useState('');
  const [outputDeviceId, setOutputDeviceId] = useState('');
  
  // Tab State
  const [activeTab, setActiveTab] = useState<'changer' | 'meeting'>('changer');
  
  // Modal State
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  // Check for API Key immediately
  const apiKeyMissing = !process.env.API_KEY;

  const handleVoiceSelected = (instruction: string, voice: string) => {
    // We modify the instruction to enforce the repeater/translator role for voice changing
    const operationalInstruction = `
      ${instruction}
      
      ================================================================================
      🚨 CRITICAL OPERATIONAL PROTOCOL: VOICE CHANGER MODE 🚨
      ================================================================================

      OBJECTIVE:
      You are a REAL-TIME VOICE CHANGER. 
      Your ONLY function is to REPEAT the user's input audio using the specific persona defined above.
      
      ⛔️ PROHIBITED ACTIONS (ABSOLUTELY FORBIDDEN):
      1. DO NOT Answer questions. (不要回答问题)
      2. DO NOT Engage in conversation. (不要进行对话)
      3. DO NOT Say "Okay", "I understand", or "Repeating". (不要说废话)
      4. DO NOT Translate (unless specifically asked).
      
      ✅ MANDATORY BEHAVIOR:
      - If user says "Hello", you say "Hello" (in the persona's voice).
      - If user says "What is the weather?", you say "What is the weather?" (DO NOT answer it).
      - If user speaks Chinese, repeat in Chinese.
      - If user speaks English, repeat in English (or Chinese if your persona strictly requires it).

      You are a Parrot. You are an Echo.
      INTELLIGENCE: OFF.
      PERSONALITY: ON (Voice Tone Only).
    `;
    
    setSystemInstruction(operationalInstruction);
    setRecommendedVoice(voice || 'Zephyr');
  };

  return (
    <div className="min-h-screen bg-cyber-900 text-white font-sans selection:bg-cyber-accent selection:text-black pb-10 relative">
      {/* API Key Missing Alert Banner */}
      {apiKeyMissing && (
        <div className="bg-red-600/90 text-white px-4 py-3 text-center border-b border-red-500 backdrop-blur-md sticky top-0 z-50 flex items-center justify-center gap-2 shadow-lg animate-pulse">
          <AlertTriangle className="w-5 h-5" />
          <span className="font-bold text-sm">
            系统未检测到 API Key！功能将无法使用。请在项目根目录创建 .env 文件并设置 API_KEY，或在部署平台配置环境变量。
          </span>
        </div>
      )}

      {/* Guide Modal */}
      <UserGuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />

      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyber-500/10 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyber-accent/10 rounded-full blur-[100px]"></div>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150"></div>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 pt-8">
        {/* Header */}
        <header className="flex items-center justify-between mb-8 border-b border-cyber-700/50 pb-6">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-cyber-500 to-cyber-accent p-3 rounded-xl shadow-[0_0_15px_rgba(0,243,255,0.3)]">
              <Bot className="w-8 h-8 text-black" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tighter text-white uppercase italic">
                Neuro<span className="text-cyber-accent">Vox</span>
              </h1>
              <p className="text-sm text-gray-400 tracking-widest uppercase">AI 实时变声控制台</p>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
              <button 
                onClick={() => setIsGuideOpen(true)}
                className="flex items-center gap-2 bg-cyber-800 hover:bg-cyber-700 border border-cyber-600 text-gray-300 hover:text-white px-4 py-2 rounded-lg transition-all text-xs font-bold uppercase tracking-wider group"
              >
                  <BookOpen className="w-4 h-4 group-hover:text-cyber-accent" />
                  <span className="hidden sm:inline">使用指南</span>
              </button>

              <div className="hidden md:flex items-center gap-6 text-xs font-mono text-gray-500 border-l border-cyber-700 pl-6">
                 <div className="flex items-center gap-2">
                   <Activity className={`w-4 h-4 ${apiKeyMissing ? 'text-red-500' : 'text-green-500'}`} />
                   <span>系统：{apiKeyMissing ? '未就绪' : '在线'}</span>
                 </div>
                 <div className="flex items-center gap-2">
                   <span className={`w-2 h-2 rounded-full ${apiKeyMissing ? 'bg-red-500' : 'bg-cyber-accent animate-pulse'}`}></span>
                   <span>GEMINI 2.5</span>
                 </div>
              </div>
          </div>
        </header>

        {/* Device Settings - Always Visible but compact */}
        <DeviceSettings 
          selectedInputId={inputDeviceId}
          selectedOutputId={outputDeviceId}
          onInputDeviceChange={setInputDeviceId}
          onOutputDeviceChange={setOutputDeviceId}
        />

        {/* Tab Navigation */}
        <div className="flex gap-4 mb-6">
            <button 
                onClick={() => setActiveTab('changer')}
                className={`flex-1 py-3 rounded-xl font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all border ${
                    activeTab === 'changer' 
                    ? 'bg-cyber-accent text-black border-cyber-accent shadow-[0_0_15px_rgba(0,243,255,0.3)]' 
                    : 'bg-cyber-800 text-gray-400 border-cyber-700 hover:bg-cyber-700'
                }`}
            >
                <Mic2 className="w-5 h-5" />
                变声控制台
            </button>
            <button 
                onClick={() => setActiveTab('meeting')}
                className={`flex-1 py-3 rounded-xl font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all border ${
                    activeTab === 'meeting' 
                    ? 'bg-purple-500 text-white border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.3)]' 
                    : 'bg-cyber-800 text-gray-400 border-cyber-700 hover:bg-cyber-700'
                }`}
            >
                <Video className="w-5 h-5" />
                视频会议室
            </button>
        </div>

        {/* Content Area */}
        <div className="h-[600px] relative">
            
            {/* 
               CRITICAL: We use 'hidden' vs 'grid' to toggle visibility instead of conditional rendering.
               This ensures the LiveTransmitter component stays MOUNTED and running (WebSockets active)
               even when the user switches to the Meeting tab.
            */}
            
            {/* Tab 1: Voice Changer */}
            <div 
              className={`grid grid-cols-1 lg:grid-cols-2 gap-8 h-full transition-opacity duration-300 ${activeTab === 'changer' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none absolute inset-0'}`}
              style={{ display: activeTab === 'changer' ? 'grid' : 'none' }} 
            >
                <div className="h-full">
                    <VoiceClonePanel onVoiceSelected={handleVoiceSelected} />
                </div>
                <div className="h-full">
                    <LiveTransmitter 
                        systemInstruction={systemInstruction}
                        recommendedVoice={recommendedVoice}
                        inputDeviceId={inputDeviceId}
                        outputDeviceId={outputDeviceId}
                    />
                </div>
            </div>

            {/* Tab 2: Meeting Room */}
            {activeTab === 'meeting' && (
                <div className="h-full w-full animate-in fade-in zoom-in-95 duration-300">
                    <MeetingRoom />
                </div>
            )}
        </div>
      </div>

      {/* Footer Instructions */}
      <div className="fixed bottom-0 w-full bg-cyber-800/80 backdrop-blur-md border-t border-cyber-700 py-3 text-center z-50">
         <button 
           onClick={() => setIsGuideOpen(true)}
           className="text-xs text-gray-400 hover:text-cyber-accent transition-colors"
         >
           <strong>配置指南：</strong> 选择左侧声线 &rarr; 启动 NeuroVox &rarr; 切换到会议室 &rarr; 麦克风选 <strong>CABLE Output</strong>
         </button>
      </div>
    </div>
  );
}

export default App;