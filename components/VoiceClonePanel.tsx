import React, { useState, useRef, useEffect } from 'react';
import { Upload, FileAudio, CheckCircle2, AlertCircle, Wand2, Mic, Monitor, Square, Play, Timer, Fingerprint, Volume2, Loader2, Save, Trash2, Library, BookOpen } from 'lucide-react';
import { GoogleGenAI, Modality } from "@google/genai";
import { decodeBase64, decodeAudioData } from '../utils/audioUtils';

interface VoiceClonePanelProps {
  onModelGenerated: (instruction: string, voiceName: string) => void;
}

interface SavedModel {
  id: string;
  name: string;
  instruction: string;
  voice: string;
  date: string;
}

const VoiceClonePanel: React.FC<VoiceClonePanelProps> = ({ onModelGenerated }) => {
  const [mode, setMode] = useState<'upload' | 'record' | 'library'>('upload');
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [status, setStatus] = useState<'idle' | 'analyzing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  
  // Model Data
  const [generatedData, setGeneratedData] = useState<{ instruction: string, voice: string } | null>(null);
  const [activeModelName, setActiveModelName] = useState<string>('');
  
  // Model Management
  const [savedModels, setSavedModels] = useState<SavedModel[]>([]);
  const [modelNameInput, setModelNameInput] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  // Test State
  const [testStatus, setTestStatus] = useState<'idle' | 'recording' | 'processing' | 'playing'>('idle');
  
  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Mic Test State
  const [isTestRecording, setIsTestRecording] = useState(false);
  const [testAudioUrl, setTestAudioUrl] = useState<string | null>(null);
  const testMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const testChunksRef = useRef<Blob[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Load saved models
    const saved = localStorage.getItem('neurovox_models');
    if (saved) {
      try {
        setSavedModels(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse saved models", e);
      }
    }

    return () => {
      stopMediaTracks();
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, []);

  // Cleanup test audio URL
  useEffect(() => {
      return () => {
          if (testAudioUrl) URL.revokeObjectURL(testAudioUrl);
      }
  }, [testAudioUrl]);

  const stopMediaTracks = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const saveModel = () => {
    if (!generatedData || !modelNameInput.trim()) return;

    const newModel: SavedModel = {
      id: Date.now().toString(),
      name: modelNameInput.trim(),
      instruction: generatedData.instruction,
      voice: generatedData.voice,
      date: new Date().toLocaleDateString()
    };

    const updated = [newModel, ...savedModels];
    setSavedModels(updated);
    localStorage.setItem('neurovox_models', JSON.stringify(updated));
    
    setIsSaved(true);
    setActiveModelName(newModel.name);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const deleteModel = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedModels.filter(m => m.id !== id);
    setSavedModels(updated);
    localStorage.setItem('neurovox_models', JSON.stringify(updated));
  };

  const loadModel = (model: SavedModel) => {
    setGeneratedData({ instruction: model.instruction, voice: model.voice });
    setActiveModelName(model.name);
    onModelGenerated(model.instruction, model.voice);
    
    // Switch to upload view to show success state (reusing the success UI)
    setStatus('success');
    setFile(null); // Clear file since we are using a saved model
    setMode('upload');
    setErrorMessage('');
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (mode === 'upload') setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (mode === 'upload' && e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (file: File) => {
    if (!file.type.startsWith('audio/') && !file.type.startsWith('video/')) {
      setErrorMessage('请上传音频或视频文件。');
      setStatus('error');
      return;
    }
    
    if (file.size > 50 * 1024 * 1024) {
      setErrorMessage('文件过大，请保持在 50MB 以内。');
      setStatus('error');
      return;
    }

    setFile(file);
    setStatus('idle');
    setErrorMessage('');
    setGeneratedData(null);
    setActiveModelName('');
  };

  // Mic Test Logic
  const handleMicTest = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isTestRecording || isRecording) return;
    
    if (testAudioUrl) {
        URL.revokeObjectURL(testAudioUrl);
        setTestAudioUrl(null);
    }

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        testMediaRecorderRef.current = recorder;
        testChunksRef.current = [];

        recorder.ondataavailable = (e) => {
            if (e.data.size > 0) testChunksRef.current.push(e.data);
        };

        recorder.onstop = () => {
            const blob = new Blob(testChunksRef.current, { type: 'audio/webm' });
            const url = URL.createObjectURL(blob);
            setTestAudioUrl(url);
            setIsTestRecording(false);
            
            stream.getTracks().forEach(t => t.stop());
        };

        recorder.start();
        setIsTestRecording(true);

        setTimeout(() => {
            if (recorder.state === 'recording') {
                recorder.stop();
            }
        }, 5000);

    } catch (err) {
        console.error("Mic test error", err);
        setErrorMessage("麦克风测试失败: " + (err as Error).message);
    }
  };

  const playTestRecording = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!testAudioUrl) return;
      const audio = new Audio(testAudioUrl);
      audio.play();
  };

  // Cloned Voice Test Logic
  const runVoiceTest = async (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!generatedData || !process.env.API_KEY) return;
      setTestStatus('recording');
      setErrorMessage('');

      try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const recorder = new MediaRecorder(stream);
          const chunks: Blob[] = [];

          recorder.ondataavailable = (e) => chunks.push(e.data);
          
          recorder.onstop = async () => {
              stream.getTracks().forEach(t => t.stop());
              setTestStatus('processing');

              try {
                  const blob = new Blob(chunks, { type: recorder.mimeType });
                  const base64Audio = await new Promise<string>((resolve) => {
                      const reader = new FileReader();
                      reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
                      reader.readAsDataURL(blob);
                  });

                  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                  const response = await ai.models.generateContent({
                      model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                      contents: {
                          parts: [
                              { inlineData: { mimeType: recorder.mimeType, data: base64Audio } },
                              { text: "Repeat exactly what I said in the voice." }
                          ]
                      },
                      config: {
                          systemInstruction: generatedData.instruction,
                          responseModalities: [Modality.AUDIO],
                          speechConfig: {
                              voiceConfig: { prebuiltVoiceConfig: { voiceName: generatedData.voice } }
                          }
                      }
                  });

                  const responseAudioBase64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
                  
                  if (responseAudioBase64) {
                      setTestStatus('playing');
                      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
                      const audioBytes = decodeBase64(responseAudioBase64);
                      const audioBuffer = await decodeAudioData(audioBytes, ctx);
                      
                      const source = ctx.createBufferSource();
                      source.buffer = audioBuffer;
                      source.connect(ctx.destination);
                      source.onended = () => {
                          setTestStatus('idle');
                          ctx.close();
                      };
                      source.start();
                  } else {
                      throw new Error("模型未返回音频数据");
                  }

              } catch (err: any) {
                  console.error("Voice test failed", err);
                  setErrorMessage("测试失败: " + (err.message || "未知错误"));
                  setTestStatus('idle');
              }
          };

          recorder.start();
          setTimeout(() => {
              if (recorder.state === 'recording') recorder.stop();
          }, 3000);

      } catch (err: any) {
          setErrorMessage("无法启动录音: " + err.message);
          setTestStatus('idle');
      }
  };


  // Recording Logic
  const startRecording = async (source: 'mic' | 'system') => {
    try {
      setErrorMessage('');
      let stream: MediaStream;

      if (source === 'mic') {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } else {
        try {
            stream = await navigator.mediaDevices.getDisplayMedia({ 
                video: true, 
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false,
                } 
            });
        } catch (err: any) {
            if (err.name === 'NotAllowedError') return;
            throw new Error(`无法捕获系统音频: ${err.message}`);
        }
        
        if (stream.getAudioTracks().length === 0) {
            stream.getTracks().forEach(t => t.stop());
            throw new Error("未检测到音频轨道，请勾选“分享音频”。");
        }
      }

      const audioTrack = stream.getAudioTracks()[0];
      const audioStream = new MediaStream([audioTrack]);
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
          ? 'audio/webm;codecs=opus' 
          : 'audio/webm';

      const recorder = new MediaRecorder(audioStream, { mimeType });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const recordedFile = new File([blob], `recorded_sample_${Date.now()}.webm`, { type: mimeType });
        validateAndSetFile(recordedFile);
        stopMediaTracks();
        setIsRecording(false);
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        setRecordingTime(0);
      };

      audioTrack.onended = () => {
          if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
              stopRecording();
          }
      };

      recorder.start();
      setIsRecording(true);
      
      setRecordingTime(0);
      timerIntervalRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error(err);
      setErrorMessage((err as Error).message || '无法启动录制，请检查权限。');
      setStatus('error');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
      reader.readAsDataURL(file);
    });
  };

  const processFile = async () => {
    if (!file || !process.env.API_KEY) return;
    
    setAnalyzing(true);
    setStatus('analyzing');
    setGeneratedData(null);
    setActiveModelName('');

    try {
      const base64Data = await convertFileToBase64(file);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const prompt = `
        Analyze the voice in this audio file. 
        Describe the speaker's personality, tone, cadence, speed, and emotional characteristics in detail.
        Also, identify the gender and suggested pitch.
        
        Based on this, create a concise "Persona System Instruction" that I can give to an AI model so it acts EXACTLY like this person.
        Start the instruction with: "You are [Name/Role], speaking with a [adjectives] tone..."
        
        Finally, recommend which standard Gemini voice (Puck, Charon, Kore, Fenrir, Zephyr) matches best.
        
        Output JSON format:
        {
          "analysis": "string",
          "systemInstruction": "string",
          "recommendedVoice": "string" 
        }
      `;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: {
          parts: [
            { inlineData: { mimeType: file.type, data: base64Data } },
            { text: prompt }
          ]
        },
        config: {
          responseMimeType: "application/json"
        }
      });

      const resultText = response.text;
      if (!resultText) throw new Error("No response from AI");

      const result = JSON.parse(resultText);
      
      setGeneratedData({ instruction: result.systemInstruction, voice: result.recommendedVoice });
      onModelGenerated(result.systemInstruction, result.recommendedVoice);
      setStatus('success');
      setModelNameInput(''); // Reset save input
    } catch (error) {
      console.error(error);
      setErrorMessage('分析音频失败，请重试。');
      setStatus('error');
    } finally {
      setAnalyzing(false);
    }
  };

  const handlePrimaryAction = () => {
    if (mode === 'library') {
        // No primary action button in library
    } else if (mode === 'upload') {
        fileInputRef.current?.click();
    } else {
        if (isRecording) {
            stopRecording();
        } else if (file) {
            processFile();
        } else {
            startRecording('mic');
        }
    }
  };

  return (
    <div className="bg-cyber-800 border border-cyber-700 rounded-xl p-6 shadow-lg shadow-cyber-900/50 h-full flex flex-col">
      
      {/* Primary Action Button (Hidden in Library mode unless we want something else) */}
      {mode !== 'library' && (
        <button 
            onClick={handlePrimaryAction}
            disabled={isTestRecording || testStatus !== 'idle'}
            className={`w-full mb-6 bg-gradient-to-r from-cyber-500 to-cyber-accent hover:from-cyber-400 hover:to-cyan-300 text-black font-bold py-4 px-4 rounded-xl shadow-[0_0_20px_rgba(0,243,255,0.3)] transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2 group ${(isTestRecording || testStatus !== 'idle') ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
            {isRecording ? (
                <>
                    <Square className="w-6 h-6 fill-current" />
                    <span className="text-lg tracking-wide uppercase">停止录制</span>
                </>
            ) : (
                <>
                    <Fingerprint className="w-6 h-6 group-hover:scale-110 transition-transform" />
                    <span className="text-lg tracking-wide uppercase">
                        {mode === 'upload' ? '选择文件分析' : '克隆我的声音'}
                    </span>
                </>
            )}
        </button>
      )}

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
            <div className="bg-cyber-500/20 p-2 rounded-lg text-cyber-400">
                <Wand2 className="w-6 h-6" />
            </div>
            <div>
                <h3 className="text-xl font-bold text-white">语音克隆</h3>
                <div className="flex items-center gap-3">
                    <p className="text-xs text-gray-400">选择素材来源</p>
                    {/* Mic Test Button */}
                    <div className="flex items-center gap-1">
                        <button
                            onClick={handleMicTest}
                            disabled={isRecording || isTestRecording || testStatus !== 'idle'}
                            className={`
                                text-[10px] px-2 py-0.5 rounded border transition-all flex items-center gap-1
                                ${isTestRecording 
                                    ? 'bg-red-500/20 border-red-500 text-red-400' 
                                    : 'bg-cyber-900 border-cyber-600 text-gray-400 hover:text-white hover:border-gray-400'
                                }
                            `}
                            title={isTestRecording ? "录制中..." : "测试麦克风 (5秒)"}
                        >
                            <Mic className={`w-3 h-3 ${isTestRecording ? 'animate-pulse' : ''}`} />
                            {isTestRecording ? '...' : '测试麦克'}
                        </button>
                        
                        {testAudioUrl && !isTestRecording && (
                            <button
                                onClick={playTestRecording}
                                className="p-0.5 bg-green-500/20 border border-green-500/50 rounded text-green-400 hover:bg-green-500/40 transition-colors"
                                title="播放测试录音"
                            >
                                <Play className="w-3 h-3 fill-current" />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
        
        {/* Toggle Mode */}
        <div className="flex bg-cyber-900 rounded-lg p-1 border border-cyber-700">
            <button
                onClick={() => { setMode('upload'); setStatus('idle'); setFile(null); setGeneratedData(null); }}
                className={`px-3 py-2 text-xs font-medium rounded-md transition-all ${mode === 'upload' ? 'bg-cyber-700 text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}
                title="上传模式"
            >
                <Upload className="w-4 h-4" />
            </button>
            <button
                onClick={() => { setMode('record'); setStatus('idle'); setFile(null); setGeneratedData(null); }}
                className={`px-3 py-2 text-xs font-medium rounded-md transition-all ${mode === 'record' ? 'bg-cyber-700 text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}
                title="录音模式"
            >
                <Mic className="w-4 h-4" />
            </button>
            <button
                onClick={() => { setMode('library'); }}
                className={`px-3 py-2 text-xs font-medium rounded-md transition-all ${mode === 'library' ? 'bg-cyber-700 text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}
                title="已存模型"
            >
                <BookOpen className="w-4 h-4" />
            </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {mode === 'library' ? (
            <div className="flex-1 overflow-y-auto pr-2 space-y-3">
                {savedModels.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-4">
                        <Library className="w-12 h-12 opacity-20" />
                        <p>暂无已保存的模型</p>
                    </div>
                ) : (
                    savedModels.map(model => (
                        <div key={model.id} className="bg-cyber-900/50 border border-cyber-700 hover:border-cyber-500 rounded-lg p-4 transition-all group">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h4 className="font-bold text-white text-sm">{model.name}</h4>
                                    <p className="text-[10px] text-gray-500">{model.voice} • {model.date}</p>
                                </div>
                                <button 
                                    onClick={(e) => deleteModel(model.id, e)}
                                    className="text-gray-600 hover:text-red-400 transition-colors p-1"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                            <button 
                                onClick={() => loadModel(model)}
                                className="w-full mt-2 bg-cyber-700 hover:bg-cyber-accent hover:text-black text-xs py-2 rounded transition-colors font-medium"
                            >
                                加载模型
                            </button>
                        </div>
                    ))
                )}
            </div>
        ) : mode === 'upload' ? (
            <div 
                className={`
                flex-1 border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-6 text-center transition-all cursor-pointer overflow-y-auto
                ${isDragging ? 'border-cyber-accent bg-cyber-accent/10' : 'border-cyber-700 hover:border-cyber-500 hover:bg-cyber-700/30'}
                ${status === 'success' ? 'border-green-500/50 bg-green-500/5 cursor-default' : ''}
                `}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => status !== 'success' && fileInputRef.current?.click()}
            >
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="audio/*,video/*"
                    onChange={handleFileChange}
                />
                
                {status === 'analyzing' ? (
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-16 h-16 border-4 border-cyber-500 border-t-cyber-accent rounded-full animate-spin"></div>
                        <p className="text-cyber-accent animate-pulse">正在分析声纹...</p>
                    </div>
                ) : status === 'success' ? (
                    <div className="flex flex-col items-center gap-3 w-full animate-in fade-in duration-500">
                        <CheckCircle2 className="w-16 h-16 text-green-500" />
                        <h4 className="text-lg font-bold text-green-400">模型就绪</h4>
                        <p className="text-sm text-gray-400 max-w-[200px] truncate">
                            {file?.name || activeModelName || "Loaded Model"}
                        </p>
                        
                        {/* Voice Test Section */}
                        <div className="mt-2 p-3 bg-cyber-900/80 rounded-lg border border-cyber-700 w-full max-w-xs">
                           <div className="flex items-center justify-between mb-2">
                               <h5 className="text-xs font-bold text-white flex items-center gap-1">
                                   <Volume2 className="w-3 h-3 text-cyber-accent" />
                                   测试变声效果
                               </h5>
                               {testStatus !== 'idle' && <span className="text-[10px] text-cyber-accent animate-pulse">处理中...</span>}
                           </div>
                           <button 
                             onClick={runVoiceTest}
                             disabled={testStatus !== 'idle'}
                             className={`
                                w-full py-2 rounded text-xs font-bold flex items-center justify-center gap-2 transition-all
                                ${testStatus === 'recording' ? 'bg-red-500 text-white animate-pulse' : 
                                  testStatus === 'processing' ? 'bg-yellow-600 text-white cursor-wait' :
                                  testStatus === 'playing' ? 'bg-green-600 text-white animate-pulse' :
                                  'bg-cyber-700 hover:bg-cyber-600 text-white'}
                             `}
                           >
                             {testStatus === 'recording' ? <><Mic className="w-3 h-3" /> 正在录音 (3s)</> :
                              testStatus === 'processing' ? <><Loader2 className="w-3 h-3 animate-spin" /> 生成中</> :
                              testStatus === 'playing' ? <><Volume2 className="w-3 h-3" /> 正在播放</> :
                              <><Mic className="w-3 h-3" /> 点击录制测试 (3s)</>}
                           </button>
                        </div>

                        {/* Save Model Section */}
                        <div className="w-full max-w-xs mt-2 pt-3 border-t border-cyber-700/50">
                            <div className="flex gap-2">
                                <input 
                                    type="text"
                                    placeholder="给模型命名..."
                                    value={modelNameInput}
                                    onChange={(e) => setModelNameInput(e.target.value)}
                                    className="bg-cyber-900/50 border border-cyber-600 rounded px-2 py-1 text-xs text-white w-full focus:border-cyber-accent outline-none"
                                />
                                <button 
                                    onClick={saveModel}
                                    disabled={isSaved || !modelNameInput.trim()}
                                    className={`p-1.5 rounded transition-all ${isSaved ? 'bg-green-500 text-white' : 'bg-cyber-700 text-gray-300 hover:text-white hover:bg-cyber-600'}`}
                                    title="保存到库"
                                >
                                    {isSaved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        <button 
                            onClick={(e) => { e.stopPropagation(); setStatus('idle'); setFile(null); setGeneratedData(null); setActiveModelName(''); }}
                            className="mt-2 text-xs text-cyber-400 hover:text-white underline"
                        >
                            重置 / 上传新文件
                        </button>
                    </div>
                ) : file ? (
                    <div className="flex flex-col items-center gap-3">
                        <FileAudio className="w-12 h-12 text-cyber-400" />
                        <p className="font-medium text-white max-w-[200px] truncate">{file.name}</p>
                        <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                        <button 
                            onClick={(e) => { e.stopPropagation(); processFile(); }}
                            className="mt-4 bg-cyber-500 hover:bg-cyber-400 text-white font-bold py-2 px-6 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.5)] transition-all transform hover:scale-105"
                        >
                            创建模型
                        </button>
                    </div>
                ) : (
                    <>
                        <Upload className="w-10 h-10 text-gray-500 mb-3" />
                        <p className="text-gray-300 font-medium">拖放或点击上传</p>
                        <p className="text-xs text-gray-500 mt-2">支持 MP3, WAV, MP4, WEBM</p>
                    </>
                )}
            </div>
        ) : (
            <div className="flex-1 border border-cyber-700 rounded-xl bg-cyber-900/30 p-6 flex flex-col items-center justify-center relative overflow-hidden">
                {isRecording ? (
                    <div className="flex flex-col items-center gap-6 z-10">
                        <div className="relative">
                            <div className="w-24 h-24 rounded-full bg-red-500/20 animate-pulse absolute inset-0"></div>
                            <div className="w-24 h-24 rounded-full border-2 border-red-500 flex items-center justify-center text-red-500">
                                <Timer className="w-10 h-10" />
                            </div>
                        </div>
                        <div className="text-center">
                            <div className="text-3xl font-mono font-bold text-white mb-2">{formatTime(recordingTime)}</div>
                            <p className="text-xs text-gray-400 animate-pulse">正在录制...</p>
                        </div>
                    </div>
                ) : file ? (
                     // Show recorded file ready to process
                     <div className="flex flex-col items-center gap-4 z-10 w-full animate-in fade-in">
                        {status === 'analyzing' ? (
                            <div className="flex flex-col items-center gap-4">
                                <div className="w-16 h-16 border-4 border-cyber-500 border-t-cyber-accent rounded-full animate-spin"></div>
                                <p className="text-cyber-accent animate-pulse">正在分析录音...</p>
                            </div>
                        ) : status === 'success' ? (
                            <div className="flex flex-col items-center gap-3 w-full">
                                <CheckCircle2 className="w-16 h-16 text-green-500" />
                                <h4 className="text-lg font-bold text-green-400">录音模型就绪</h4>
                                
                                {/* Voice Test Section - DUPLICATED FOR RECORD MODE SUCCESS */}
                                <div className="mt-2 p-3 bg-cyber-900/80 rounded-lg border border-cyber-700 w-full max-w-xs">
                                   <div className="flex items-center justify-between mb-2">
                                       <h5 className="text-xs font-bold text-white flex items-center gap-1">
                                           <Volume2 className="w-3 h-3 text-cyber-accent" />
                                           测试变声效果
                                       </h5>
                                       {testStatus !== 'idle' && <span className="text-[10px] text-cyber-accent animate-pulse">处理中...</span>}
                                   </div>
                                   <button 
                                     onClick={runVoiceTest}
                                     disabled={testStatus !== 'idle'}
                                     className={`
                                        w-full py-2 rounded text-xs font-bold flex items-center justify-center gap-2 transition-all
                                        ${testStatus === 'recording' ? 'bg-red-500 text-white animate-pulse' : 
                                          testStatus === 'processing' ? 'bg-yellow-600 text-white cursor-wait' :
                                          testStatus === 'playing' ? 'bg-green-600 text-white animate-pulse' :
                                          'bg-cyber-700 hover:bg-cyber-600 text-white'}
                                     `}
                                   >
                                     {testStatus === 'recording' ? <><Mic className="w-3 h-3" /> 正在录音 (3s)</> :
                                      testStatus === 'processing' ? <><Loader2 className="w-3 h-3 animate-spin" /> 生成中</> :
                                      testStatus === 'playing' ? <><Volume2 className="w-3 h-3" /> 正在播放</> :
                                      <><Mic className="w-3 h-3" /> 点击录制测试 (3s)</>}
                                   </button>
                                </div>

                                {/* Save Model Section - DUPLICATED */}
                                <div className="w-full max-w-xs mt-2 pt-3 border-t border-cyber-700/50">
                                    <div className="flex gap-2">
                                        <input 
                                            type="text"
                                            placeholder="给模型命名..."
                                            value={modelNameInput}
                                            onChange={(e) => setModelNameInput(e.target.value)}
                                            className="bg-cyber-900/50 border border-cyber-600 rounded px-2 py-1 text-xs text-white w-full focus:border-cyber-accent outline-none"
                                        />
                                        <button 
                                            onClick={saveModel}
                                            disabled={isSaved || !modelNameInput.trim()}
                                            className={`p-1.5 rounded transition-all ${isSaved ? 'bg-green-500 text-white' : 'bg-cyber-700 text-gray-300 hover:text-white hover:bg-cyber-600'}`}
                                            title="保存到库"
                                        >
                                            {isSaved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>

                                <button 
                                    onClick={() => { setStatus('idle'); setFile(null); setGeneratedData(null); setActiveModelName(''); }}
                                    className="mt-2 text-xs text-cyber-400 hover:text-white underline"
                                >
                                    重录
                                </button>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-4 w-full">
                                <div className="bg-cyber-700/50 p-4 rounded-xl w-full flex items-center justify-between border border-cyber-600">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-blue-500/20 rounded-lg">
                                            <FileAudio className="w-6 h-6 text-blue-400" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-white">已录制音频</p>
                                            <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(1)} KB</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setFile(null)} className="text-xs text-gray-400 hover:text-red-400">删除</button>
                                </div>
                                <button 
                                    onClick={processFile}
                                    className="w-full bg-cyber-500 hover:bg-cyber-400 text-white font-bold py-3 px-6 rounded-lg shadow-[0_0_15px_rgba(59,130,246,0.5)] transition-all flex items-center justify-center gap-2"
                                >
                                    <Wand2 className="w-4 h-4" /> 生成模型
                                </button>
                            </div>
                        )}
                     </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center z-10 gap-6">
                        {/* Mic Icon State */}
                        <div className="relative group cursor-pointer" onClick={() => startRecording('mic')}>
                             <div className="absolute inset-0 bg-cyber-500/20 rounded-full blur-xl group-hover:bg-cyber-500/30 transition-all"></div>
                             <div className="relative bg-cyber-800 border border-cyber-600 p-6 rounded-full group-hover:border-cyber-accent transition-colors">
                                <Mic className="w-10 h-10 text-gray-300 group-hover:text-cyber-accent transition-colors" />
                             </div>
                             <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity text-xs text-cyber-accent">
                                 点击上方按钮开始
                             </div>
                        </div>

                        <div>
                            <h4 className="text-lg font-bold text-white mb-2">准备录制</h4>
                            <p className="text-sm text-gray-400 max-w-xs mx-auto">
                                点击上方 <span className="text-cyber-accent font-bold">"克隆我的声音"</span> 按钮，使用麦克风捕捉您的声纹特征。
                            </p>
                        </div>

                        <div className="w-32 h-px bg-cyber-700/50"></div>
                        
                        {/* Secondary System Audio Option */}
                        <button 
                            onClick={() => startRecording('system')}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyber-800 hover:bg-cyber-700 border border-cyber-700 hover:border-gray-500 transition-all group"
                        >
                            <Monitor className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform" />
                            <div className="text-left">
                                <span className="block text-xs font-bold text-gray-300 group-hover:text-white">录制系统声音</span>
                                <span className="block text-[10px] text-gray-500 group-hover:text-gray-400">视频/游戏/网页</span>
                            </div>
                        </button>
                    </div>
                )}
                
                {/* Visualizer Background Effect */}
                {isRecording && (
                    <div className="absolute inset-0 pointer-events-none opacity-10 flex items-center justify-center gap-1">
                         {[...Array(20)].map((_, i) => (
                            <div 
                                key={i} 
                                className="w-2 bg-cyber-accent rounded-full animate-pulse-fast"
                                style={{ 
                                    height: `${Math.random() * 80 + 20}%`,
                                    animationDelay: `${Math.random()}s`,
                                    animationDuration: `${0.5 + Math.random()}s`
                                }}
                            ></div>
                         ))}
                    </div>
                )}
            </div>
        )}
      </div>

      {status === 'error' && (
        <div className="mt-4 bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-lg flex items-center gap-2 text-sm">
          <AlertCircle className="w-4 h-4" />
          {errorMessage}
        </div>
      )}
    </div>
  );
};

export default VoiceClonePanel;