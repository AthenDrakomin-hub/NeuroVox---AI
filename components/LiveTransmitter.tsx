import React, { useEffect, useRef, useState } from 'react';
import { Mic, Radio, Power, Volume2, AlertTriangle, Lock, ShieldCheck, Zap } from 'lucide-react';
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
  const [isSecure, setIsSecure] = useState(false);
  
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
  const sessionRef = useRef<Promise<any> | null>(null); 
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  const addLog = (msg: string) => {
    setLogs(prev => [msg, ...prev].slice(0, 5));
  };

  const cleanupAudio = () => {
    if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
    }
    analyserRef.current = null;

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (scriptProcessorRef.current) scriptProcessorRef.current.disconnect();
    if (sourceRef.current) sourceRef.current.disconnect();
    
    sourcesRef.current.forEach(source => {
      try { source.stop(); } catch (e) {}
    });
    sourcesRef.current.clear();

    if (inputContextRef.current) inputContextRef.current.close();
    if (outputContextRef.current) outputContextRef.current.close();
    
    if (sessionRef.current) {
      sessionRef.current.then((session: any) => {
          try { session.close(); } catch(e) {}
      }).catch(() => {}); // Ignore errors on cleanup
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
          if (!analyserRef.current) return;
          animationFrameRef.current = requestAnimationFrame(draw);
          
          analyser.getByteFrequencyData(dataArray);
          
          ctx.clearRect(0, 0, width, height);
          
          const barWidth = (width / bufferLength) * 0.6;
          let barHeight;
          let x = 0;
          
          for (let i = 0; i < bufferLength; i++) {
              const value = dataArray[i];
              const percent = value / 255;
              barHeight = percent * height * 0.8;

              ctx.shadowBlur = 10;
              ctx.shadowColor = "rgba(0, 243, 255, 0.5)";
              ctx.fillStyle = `rgba(0, 243, 255, ${percent + 0.3})`;
              
              ctx.fillRect(x + (width / bufferLength - barWidth) / 2, (height - barHeight) / 2, barWidth, barHeight);
              x += width / bufferLength;
          }
      };
      draw();
  };

  const fetchEphemeralToken = async () => {
      try {
          // Short timeout for token fetch to avoid blocking if the endpoint is missing
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 1500);
          const response = await fetch('/api/token', { signal: controller.signal });
          clearTimeout(timeoutId);
          if (!response.ok) return null;
          const data = await response.json();
          return data.token;
      } catch (e) {
          return null;
      }
  };

  const startSession = async () => {
    let authToken = process.env.API_KEY;
    let usingEphemeral = false;

    addLog("正在初始化安全连接...");
    const ephemeralToken = await fetchEphemeralToken();
    if (ephemeralToken) {
        authToken = ephemeralToken;
        usingEphemeral = true;
        setIsSecure(true);
        addLog("已获取临时安全令牌。");
    } else {
        setIsSecure(false);
        if (!authToken) {
            addLog("错误：缺少 Gemini API 密钥");
            setErrorMessage("缺少 Gemini API 密钥");
            return;
        }
    }

    setIsActive(true);
    setConnectionStatus('connecting');
    setErrorMessage(null);

    try {
      inputContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

      outputDestinationRef.current = outputContextRef.current.createMediaStreamDestination();
      
      if (audioOutputElRef.current) {
        audioOutputElRef.current.srcObject = outputDestinationRef.current.stream;
        audioOutputElRef.current.play();
        
        // @ts-ignore
        if (outputDeviceId && typeof audioOutputElRef.current.setSinkId === 'function') {
           try {
             // @ts-ignore
             await audioOutputElRef.current.setSinkId(outputDeviceId);
             addLog(`输出已路由: ${outputDeviceId}`);
           } catch (e) {}
        }
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: inputDeviceId ? { exact: inputDeviceId } : undefined,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      streamRef.current = stream;

      const source = inputContextRef.current.createMediaStreamSource(stream);
      sourceRef.current = source;
      
      const analyser = inputContextRef.current.createAnalyser();
      analyser.fftSize = 64; 
      analyser.smoothingTimeConstant = 0.6;
      source.connect(analyser);
      analyserRef.current = analyser;
      startVisualizer();

      const BUFFER_SIZE = 512;
      const processor = inputContextRef.current.createScriptProcessor(BUFFER_SIZE, 1, 1);
      scriptProcessorRef.current = processor;

      source.connect(processor);
      processor.connect(inputContextRef.current.destination);

      addLog("正在连接 Gemini Live...");
      const ai = new GoogleGenAI({ 
          apiKey: authToken,
          baseUrl: process.env.API_BASE_URL || undefined
      });
      
      const config = {
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO], // Exclusively use Audio modality
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
            addLog(`已连接 (Gemini Voice)`);
            if (outputContextRef.current) {
                nextStartTimeRef.current = outputContextRef.current.currentTime;
            }
          },
          onmessage: async (message: LiveServerMessage) => {
             // Handle Native Gemini Audio
             const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
             if (base64Audio && outputContextRef.current && outputDestinationRef.current) {
                try {
                  const audioCtx = outputContextRef.current;
                  const audioBytes = decodeBase64(base64Audio);
                  const audioBuffer = await decodeAudioData(audioBytes, audioCtx);
                  
                  const source = audioCtx.createBufferSource();
                  source.buffer = audioBuffer;
                  source.connect(outputDestinationRef.current);
                  
                  const currentTime = audioCtx.currentTime;
                  const SCHEDULE_LOOKAHEAD = 0.020; // Slightly increased lookahead for stability
                  if (nextStartTimeRef.current < currentTime) {
                      nextStartTimeRef.current = currentTime + SCHEDULE_LOOKAHEAD;
                  }
                  
                  source.start(nextStartTimeRef.current);
                  nextStartTimeRef.current += audioBuffer.duration;
                  sourcesRef.current.add(source);
                  source.onended = () => sourcesRef.current.delete(source);
                } catch (e) {
                  console.error("Audio Decode Error", e);
                }
             }

             if (message.serverContent?.interrupted) {
                addLog("检测到中断。");
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

      // Handle initial connection failures (e.g. Network Error)
      sessionPromise.catch((err: any) => {
          console.error("Connection failed:", err);
          setErrorMessage(err.message || "Network Error: Cannot connect to Gemini Live API");
          setConnectionStatus('error');
          setIsActive(false);
          cleanupAudio();
      });

      sessionRef.current = sessionPromise;

      processor.onaudioprocess = (e) => {
        if (!inputContextRef.current) return;
        const inputData = e.inputBuffer.getChannelData(0);
        const pcmBlob = createPcmBlob(inputData);
        
        if (sessionRef.current) {
            sessionRef.current
                .then(session => {
                    try {
                        session.sendRealtimeInput({ media: pcmBlob });
                    } catch (err) {
                        // Session might be closed or closing
                    }
                })
                .catch(() => {
                    // Suppress errors if sessionPromise failed (handled above)
                });
        }
      };

    } catch (error: any) {
      console.error("Init Error", error);
      setErrorMessage(error.message);
      setConnectionStatus('error');
      setIsActive(false);
      cleanupAudio();
    }
  };

  const stopSession = () => {
    setIsActive(false);
    setConnectionStatus('disconnected');
    setIsSecure(false);
    cleanupAudio();
    addLog("会话已结束。");
  };

  useEffect(() => {
    return () => {
        cleanupAudio();
    }
  }, []);

  return (
    <div className="bg-cyber-800 border border-cyber-700 rounded-xl p-6 shadow-lg shadow-cyber-900/50 flex flex-col h-full">
        <audio ref={audioOutputElRef} className="hidden" />

        <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
                <Radio className={`w-6 h-6 ${isActive ? 'text-red-500 animate-pulse' : 'text-gray-500'}`} />
                <h3 className="text-xl font-bold text-white">实时传输</h3>
            </div>
            
            <div className="flex items-center gap-2">
                {isActive && (
                    <div 
                        className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border transition-all ${isSecure ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-gray-700/50 text-gray-500 border-gray-600'}`}
                    >
                        {isSecure ? <ShieldCheck className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                        {isSecure ? "SECURE" : "KEY"}
                    </div>
                )}
                
                {/* Engine Indicator */}
                <div className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border bg-green-500/20 text-green-400 border-green-500/30">
                    <Zap className="w-3 h-3" />
                    GEMINI LIVE
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
        </div>

        <div className="flex-1 bg-cyber-900/50 rounded-lg p-4 mb-6 border border-cyber-700/50 relative overflow-hidden flex items-center justify-center">
             <canvas 
                ref={canvasRef} 
                className="absolute inset-0 w-full h-full opacity-60"
             />
             
             <div className="absolute top-2 left-2 z-10 text-xs text-gray-400 font-mono pointer-events-none">
                <div className="flex items-center gap-2">
                    <Mic className="w-3 h-3" /> 输入: {inputDeviceId ? '自定义' : '默认'}
                </div>
                <div className="flex items-center gap-2 mt-1">
                    <Volume2 className="w-3 h-3" /> 输出: {outputDeviceId ? '自定义' : '默认'}
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
                * 尚未激活。请先在左侧选择一个声线。
            </p>
        )}
    </div>
  );
};

export default LiveTransmitter;