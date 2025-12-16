import React, { useState } from 'react';
import { Bot, Mic, Activity, Github } from 'lucide-react';
import VoiceClonePanel from './components/VoiceClonePanel';
import DeviceSettings from './components/DeviceSettings';
import LiveTransmitter from './components/LiveTransmitter';

function App() {
  const [systemInstruction, setSystemInstruction] = useState('');
  const [recommendedVoice, setRecommendedVoice] = useState('Zephyr');
  const [inputDeviceId, setInputDeviceId] = useState('');
  const [outputDeviceId, setOutputDeviceId] = useState('');

  const handleModelGenerated = (instruction: string, voice: string) => {
    // We modify the instruction to enforce the repeater/translator role for voice changing
    const operationalInstruction = `
      ${instruction}
      
      ================================================================================
      🚨 CRITICAL OPERATIONAL PROTOCOL: VOICE REPEATER MODE 🚨
      ================================================================================

      OBJECTIVE:
      You are a passive audio conduit. Your ONLY function is to REPEAT the user's input audio exactly, using the voice persona defined above.
      你是一个被动音频导管。你的唯一功能是使用上面定义的声音人设，准确复述用户的输入音频。

      ⛔️ PROHIBITED ACTIONS (ABSOLUTELY FORBIDDEN):
      1. DO NOT Answer questions. (不要回答问题)
      2. DO NOT Engage in conversation. (不要进行对话)
      3. DO NOT Say "Okay" or "I understand" before starting. (不要说“好的”或“我明白了”)
      4. DO NOT Translate (unless the user specifically asks to repeat a translation). (不要翻译)
      5. DO NOT Add conversational fillers (e.g., "Sure", "Here is", "Let me say"). (不要添加对话填充词)

      ✅ MANDATORY BEHAVIOR:
      - INPUT: "What is the weather?"
      - YOUR OUTPUT: "What is the weather?" (DO NOT answer it!)
      
      - INPUT: "I am testing this system."
      - YOUR OUTPUT: "I am testing this system."

      - INPUT: "你好"
      - YOUR OUTPUT: "你好"

      CRITICAL:
      If the user speaks a question, you REPEAT the question. You do NOT answer it.
      If the user pauses, you wait.
      You are an ECHO.

      INTELLIGENCE OVERRIDE: ACTIVE.
      CREATIVITY: DISABLED.
      CONVERSATIONAL MODULE: OFF.
    `;
    
    setSystemInstruction(operationalInstruction);
    setRecommendedVoice(voice || 'Zephyr');
  };

  return (
    <div className="min-h-screen bg-cyber-900 text-white font-sans selection:bg-cyber-accent selection:text-black pb-10">
      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyber-500/10 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyber-accent/10 rounded-full blur-[100px]"></div>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150"></div>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 pt-8">
        {/* Header */}
        <header className="flex items-center justify-between mb-12 border-b border-cyber-700/50 pb-6">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-cyber-500 to-cyber-accent p-3 rounded-xl shadow-[0_0_15px_rgba(0,243,255,0.3)]">
              <Bot className="w-8 h-8 text-black" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tighter text-white uppercase italic">
                Neuro<span className="text-cyber-accent">Vox</span>
              </h1>
              <p className="text-sm text-gray-400 tracking-widest uppercase">实时 AI 语音身份系统</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-6 text-xs font-mono text-gray-500">
             <div className="flex items-center gap-2">
               <Activity className="w-4 h-4 text-green-500" />
               <span>系统：在线</span>
             </div>
             <div className="flex items-center gap-2">
               <span className="w-2 h-2 bg-cyber-accent rounded-full animate-pulse"></span>
               <span>GEMINI 2.5 FLASH</span>
             </div>
          </div>
        </header>

        {/* Setup Section */}
        <DeviceSettings 
          selectedInputId={inputDeviceId}
          selectedOutputId={outputDeviceId}
          onInputDeviceChange={setInputDeviceId}
          onOutputDeviceChange={setOutputDeviceId}
        />

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[600px]">
          {/* Left: Clone/Upload */}
          <div className="h-full">
            <VoiceClonePanel onModelGenerated={handleModelGenerated} />
          </div>

          {/* Right: Transmitter */}
          <div className="h-full">
            <LiveTransmitter 
              systemInstruction={systemInstruction}
              recommendedVoice={recommendedVoice}
              inputDeviceId={inputDeviceId}
              outputDeviceId={outputDeviceId}
            />
          </div>
        </div>
      </div>

      {/* Footer Instructions */}
      <div className="fixed bottom-0 w-full bg-cyber-800/80 backdrop-blur-md border-t border-cyber-700 py-3 text-center z-50">
         <p className="text-xs text-gray-400">
           <strong>配置指南：</strong> 上传 10-60秒 样本 &rarr; 设置输出为 VB-Cable &rarr; 在 微信/钉钉/Discord 中使用 “CABLE Output” 作为麦克风。
         </p>
      </div>
    </div>
  );
}

export default App;