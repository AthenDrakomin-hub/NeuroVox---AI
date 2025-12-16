import React, { useEffect, useRef, useState } from 'react';
import { Mic, Radio, Power, Activity, Volume2, AlertTriangle } from 'lucide-react';
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { createPcmBlob, decodeAudioData, decodeBase64 } from '../utils/audioUtils';

interface LiveTransmitterProps {
  systemInstruction: string;
  recommendedVoice: string;
  inputDeviceId: string;
  outputDeviceId: string;
}

const LiveTransmitter: React.FC<LiveTransmitterProps> = ({
  systemInstruction,
  recommendedVoice,
  inputDeviceId,
  outputDeviceId,
}) => {
  const [isActive, setIsActive] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [logs, setLogs] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Refs for audio context and processing
  const inputContextRef = useRef<AudioContext | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioOutputElRef = useRef<HTMLAudioElement | null>(null);
  const outputDestinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);

  // Visualizer Refs
  const analyserRef = useRef<AnalyserNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Live API Session
  const sessionRef = useRef<any>(null); // keeping the session promise object
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  const addLog = (msg: string) => {
    setLogs(prev => [msg, ...prev].slice(0, 5));
  };

  const cleanupAudio = () => {
    // Stop visualizer
    if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
    }
    analyserRef.current = null;

    // Stop input stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    // Disconnect nodes
    if (scriptProcessorRef.current) scriptProcessorRef.current.disconnect();
    if (sourceRef.current) sourceRef.current.disconnect();
    
    // Stop all output sources
    sourcesRef.current.forEach(source => {
      try { source.stop(); } catch (e) {}
    });
    sourcesRef.current.clear();

    // Close contexts
    if (inputContextRef.current) inputContextRef.current.close();
    if (outputContextRef.current) outputContextRef.current.close();
    
    // Close session
    if (sessionRef.current) {
      sessionRef.current.then((session: any) => {
          try { session.close(); } catch(e) {}
      });
    }

    inputContextRef.current = null;
    outputContextRef.current = null;
    sessionRef.current = null;
  };

  const startVisualizer = () => {
      if (!canvasRef.current || !analyserRef.current) return;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const analyser = analyserRef.current;
      
      if (!ctx) return;

      // Handle Resize/DPI
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
      
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      const width = rect.width;
      const height = rect.height;

      const draw = () => {
          if (!analyserRef.current) return; // Stop if destroyed
          animationFrameRef.current = requestAnimationFrame(draw);
          
          analyser.getByteFrequencyData(dataArray);
          
          ctx.clearRect(0, 0, width, height);
          
          const barWidth = (width / bufferLength) * 0.6;
          let barHeight;
          let x = 0;
          
          for (let i = 0; i < bufferLength; i++) {
              const value = dataArray[i];
              const percent = value / 255;
              barHeight = percent * height * 0.8; // Scale height

              // Cyber Glow
              ctx.shadowBlur = 10;
              ctx.shadowColor = "rgba(0, 243, 255, 0.5)";
              ctx.fillStyle = `rgba(0, 243, 255, ${percent + 0.3})`;
              
              // Draw Bar
              ctx.fillRect(x + (width / bufferLength - barWidth) / 2, (height - barHeight) / 2, barWidth, barHeight);
              
              x += width / bufferLength;
          }
      };
      draw();
  };

  const startSession = async () => {
    if (!process.env.API_KEY) {
      addLog("错误：缺少 API 密钥");
      setErrorMessage("缺少 API 密钥");
      return;
    }

    setIsActive(true);
    setConnectionStatus('connecting');
    setErrorMessage(null);
    addLog("正在初始化音频上下文...");

    try {
      // 1. Setup Input Context (Force 16kHz for Gemini compatibility)
      // The browser will handle resampling from the hardware rate to this context rate.
      inputContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      
      // 2. Setup Output Context (24kHz for Gemini output)
      // Gemini usually sends 24kHz audio.
      outputContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

      // 3. Configure Output Routing (VB-Cable support)
      outputDestinationRef.current = outputContextRef.current.createMediaStreamDestination();
      
      if (audioOutputElRef.current) {
        audioOutputElRef.current.srcObject = outputDestinationRef.current.stream;
        audioOutputElRef.current.play();
        
        // @ts-ignore - setSinkId is experimental
        if (outputDeviceId && typeof audioOutputElRef.current.setSinkId === 'function') {
           try {
             // @ts-ignore
             await audioOutputElRef.current.setSinkId(outputDeviceId);
             addLog(`输出已路由到设备: ${outputDeviceId}`);
           } catch (e) {
             console.warn("SetSinkId failed", e);
             addLog("无法设置输出设备，使用默认。");
           }
        }
      }

      // 4. Get User Media
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: inputDeviceId ? { exact: inputDeviceId } : undefined,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      streamRef.current = stream;

      // 5. Connect Input Logic
      const source = inputContextRef.current.createMediaStreamSource(stream);
      sourceRef.current = source;
      
      // Setup Analyser for Visualizer
      const analyser = inputContextRef.current.createAnalyser();
      analyser.fftSize = 64; // Low FFT size for fewer, thicker bars (retro style)
      analyser.smoothingTimeConstant = 0.6;
      source.connect(analyser);
      analyserRef.current = analyser;
      startVisualizer();

      // OPTIMIZATION: Buffer Size
      // 1024 samples @ 16kHz = 64ms latency
      // 512 samples @ 16kHz = 32ms latency
      // 256 samples @ 16kHz = 16ms latency (Risk of audio glitches/crackling on slower CPUs)
      // We choose 512 as a safe sweet spot for low latency.
      const BUFFER_SIZE = 512;
      const processor = inputContextRef.current.createScriptProcessor(BUFFER_SIZE, 1, 1);
      scriptProcessorRef.current = processor;

      source.connect(processor);
      processor.connect(inputContextRef.current.destination);

      // 6. Connect to Gemini Live
      addLog("正在连接 Gemini Live...");
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const config = {
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: recommendedVoice || 'Zephyr' } }
          },
          systemInstruction: systemInstruction || "You are a helpful assistant. Repeat what I say."
        },
      };

      const sessionPromise = ai.live.connect({
        ...config,
        callbacks: {
          onopen: () => {
            setConnectionStatus('connected');
            addLog("已连接到 Gemini Live 网络。");
            nextStartTimeRef.current = outputContextRef.current?.currentTime || 0;
          },
          onmessage: async (message: LiveServerMessage) => {
             const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
             
             if (base64Audio && outputContextRef.current && outputDestinationRef.current) {
                try {
                  const audioCtx = outputContextRef.current;
                  const audioBytes = decodeBase64(base64Audio);
                  const audioBuffer = await decodeAudioData(audioBytes, audioCtx);
                  
                  const source = audioCtx.createBufferSource();
                  source.buffer = audioBuffer;
                  source.connect(outputDestinationRef.current);
                  
                  // OPTIMIZATION: Scheduling Logic
                  const currentTime = audioCtx.currentTime;
                  
                  // We use a small lookahead to prevent audio gaps if the main thread jitters.
                  // 0.010s (10ms) is tight enough to feel instant but safe enough for web browsers.
                  // Lowering this further (e.g. 0.005) increases risk of "glitchy" audio.
                  const SCHEDULE_LOOKAHEAD = 0.010; 

                  if (nextStartTimeRef.current < currentTime) {
                      // Buffer underrun (we ran out of audio to play).
                      // Schedule immediately at current time + lookahead.
                      nextStartTimeRef.current = currentTime + SCHEDULE_LOOKAHEAD;
                  }
                  
                  source.start(nextStartTimeRef.current);
                  nextStartTimeRef.current += audioBuffer.duration;
                  
                  sourcesRef.current.add(source);
                  source.onended = () => sourcesRef.current.delete(source);

                } catch (e) {
                  console.error("Error processing output audio", e);
                }
             }

             if (message.serverContent?.interrupted) {
                addLog("检测到中断。正在清除缓冲区。");
                sourcesRef.current.forEach(s => {
                    try { s.stop(); } catch(e){}
                });
                sourcesRef.current.clear();
                if(outputContextRef.current) nextStartTimeRef.current = outputContextRef.current.currentTime;
             }
          },
          onclose: () => {
            setConnectionStatus('disconnected');
            addLog("连接已关闭。");
          },
          onerror: (err) => {
            console.error(err);
            setConnectionStatus('error');
            addLog("连接错误。");
          }
        }
      });

      sessionRef.current = sessionPromise;

      processor.onaudioprocess = (e) => {
        if (!inputContextRef.current) return;
        const inputData = e.inputBuffer.getChannelData(0);
        const pcmBlob = createPcmBlob(inputData);
        sessionPromise.then(session => {
            session.sendRealtimeInput({ media: pcmBlob });
        });
      };

    } catch (error: any) {
      console.error("Initialization Error:", error);
      let msg = error.message;
      if (error.name === 'OverconstrainedError') {
        msg = "硬件参数冲突：设备不支持请求的配置。";
      } else if (error.name === 'NotReadableError') {
        msg = "硬件无法访问：可能被其他应用占用或发生系统冲突。";
      }
      addLog(`初始化失败: ${msg}`);
      setErrorMessage(msg);
      setConnectionStatus('error');
      setIsActive(false);
    }
  };

  const stopSession = () => {
    setIsActive(false);
    setConnectionStatus('disconnected');
    cleanupAudio();
    addLog("会话已结束。");
  };

  // Add cleanup on unmount
  useEffect(() => {
    return () => {
        cleanupAudio();
    }
  }, []);

  return (
    <div className="bg-cyber-800 border border-cyber-700 rounded-xl p-6 shadow-lg shadow-cyber-900/50 flex flex-col h-full">
        {/* Hidden audio element for sinking to VB-Cable */}
        <audio ref={audioOutputElRef} className="hidden" />

        <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
                <Radio className={`w-6 h-6 ${isActive ? 'text-red-500 animate-pulse' : 'text-gray-500'}`} />
                <h3 className="text-xl font-bold text-white">实时传输</h3>
            </div>
            <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                connectionStatus === 'connected' ? 'bg-green-500/20 text-green-400 border border-green-500/50' :
                connectionStatus === 'connecting' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50' :
                connectionStatus === 'error' ? 'bg-red-500/20 text-red-400 border border-red-500/50' :
                'bg-gray-700 text-gray-400'
            }`}>
                {connectionStatus === 'connected' ? '已连接' : 
                 connectionStatus === 'connecting' ? '连接中' : 
                 connectionStatus === 'error' ? '错误' : '未连接'}
            </div>
        </div>

        <div className="flex-1 bg-cyber-900/50 rounded-lg p-4 mb-6 border border-cyber-700/50 relative overflow-hidden flex items-center justify-center">
             {/* Real-time Visualizer Canvas */}
             <canvas 
                ref={canvasRef} 
                className="absolute inset-0 w-full h-full opacity-60"
             />
             
             {/* Overlay Content */}
             <div className="absolute top-2 left-2 z-10 text-xs text-gray-400 font-mono pointer-events-none">
                <div className="flex items-center gap-2">
                    <Mic className="w-3 h-3" /> 输入: {inputDeviceId ? '自定义' : '默认'}
                </div>
                <div className="flex items-center gap-2 mt-1">
                    <Volume2 className="w-3 h-3" /> 输出: {outputDeviceId ? '自定义 (VB-Cable)' : '默认'}
                </div>
             </div>

             {errorMessage && (
                 <div className="absolute inset-0 z-20 bg-black/80 flex items-center justify-center p-4">
                     <div className="text-red-400 text-center">
                         <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
                         <p className="font-bold text-sm">发生错误</p>
                         <p className="text-xs mt-1">{errorMessage}</p>
                     </div>
                 </div>
             )}
        </div>

        {/* Logs */}
        <div className="bg-black/40 rounded p-2 mb-4 h-24 overflow-y-auto font-mono text-xs text-green-400/80 border border-cyber-700/30">
            {logs.length === 0 && <span className="text-gray-600">系统就绪...</span>}
            {logs.map((log, i) => (
                <div key={i}>&gt; {log}</div>
            ))}
        </div>

        <button
            onClick={isActive ? stopSession : startSession}
            disabled={!systemInstruction}
            className={`
                w-full py-4 rounded-lg font-bold text-lg tracking-widest uppercase transition-all flex items-center justify-center gap-3 relative z-20
                ${isActive 
                    ? 'bg-cyber-danger hover:bg-red-600 text-white shadow-[0_0_20px_rgba(255,0,60,0.4)]' 
                    : !systemInstruction 
                        ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                        : 'bg-cyber-accent hover:bg-cyan-400 text-black shadow-[0_0_20px_rgba(0,243,255,0.4)]'
                }
            `}
        >
            <Power className="w-6 h-6" />
            {isActive ? '断开连接' : '启动 NeuroVox'}
        </button>
        {!systemInstruction && (
            <p className="text-xs text-center mt-2 text-red-400/80">
                * 需要语音模型。请先上传并处理样本。
            </p>
        )}
    </div>
  );
};

export default LiveTransmitter;