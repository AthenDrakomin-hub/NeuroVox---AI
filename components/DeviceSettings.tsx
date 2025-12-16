import React, { useEffect, useState } from 'react';
import { Mic, Speaker, Settings2, RefreshCw, Volume2 } from 'lucide-react';

interface DeviceSettingsProps {
  onInputDeviceChange: (deviceId: string) => void;
  onOutputDeviceChange: (deviceId: string) => void;
  selectedInputId: string;
  selectedOutputId: string;
}

const DeviceSettings: React.FC<DeviceSettingsProps> = ({
  onInputDeviceChange,
  onOutputDeviceChange,
  selectedInputId,
  selectedOutputId,
}) => {
  const [inputDevices, setInputDevices] = useState<MediaDeviceInfo[]>([]);
  const [outputDevices, setOutputDevices] = useState<MediaDeviceInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [isPlayingTest, setIsPlayingTest] = useState(false);

  const fetchDevices = async () => {
    setLoading(true);
    try {
      // Request permission first to get labels
      await navigator.mediaDevices.getUserMedia({ audio: true });
      const devices = await navigator.mediaDevices.enumerateDevices();
      
      const inputs = devices.filter((d) => d.kind === 'audioinput');
      const outputs = devices.filter((d) => d.kind === 'audiooutput');

      setInputDevices(inputs);
      setOutputDevices(outputs);

      // Auto-select VB-Cable if found and not set
      if (!selectedOutputId) {
        const vbCable = outputs.find(d => {
            const label = d.label.toLowerCase();
            return label.includes('vb-audio virtual cable') || label.includes('cable input');
        });
        if (vbCable) onOutputDeviceChange(vbCable.deviceId);
      }
    } catch (err) {
      console.error("Error fetching devices:", err);
    } finally {
      setLoading(false);
    }
  };

  const playTestSound = async () => {
    if (isPlayingTest) return;
    setIsPlayingTest(true);

    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime); // A4
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);
      
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

      osc.connect(gain);
      
      const dest = ctx.createMediaStreamDestination();
      gain.connect(dest);

      // Create a temporary audio element to use setSinkId
      const audio = new Audio();
      audio.srcObject = dest.stream;

      // @ts-ignore - setSinkId is experimental
      if (selectedOutputId && typeof audio.setSinkId === 'function') {
        // @ts-ignore
        await audio.setSinkId(selectedOutputId);
      }

      osc.start();
      await audio.play();

      setTimeout(() => {
        osc.stop();
        ctx.close();
        setIsPlayingTest(false);
      }, 500);

    } catch (err) {
      console.error("Test sound error:", err);
      setIsPlayingTest(false);
    }
  };

  useEffect(() => {
    fetchDevices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="bg-cyber-800 border border-cyber-700 rounded-xl p-6 mb-6 shadow-lg shadow-cyber-900/50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-cyber-accent flex items-center gap-2">
          <Settings2 className="w-5 h-5" />
          硬件配置
        </h3>
        <button 
          onClick={fetchDevices} 
          disabled={loading}
          className="p-2 hover:bg-cyber-700 rounded-full transition-colors text-gray-400 hover:text-white"
          title="刷新设备列表"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Input Device */}
        <div className="space-y-2">
          <label className="text-sm text-gray-400 flex items-center gap-2">
            <Mic className="w-4 h-4 text-blue-400" />
            输入源 (麦克风)
          </label>
          <select
            value={selectedInputId}
            onChange={(e) => onInputDeviceChange(e.target.value)}
            className="w-full bg-cyber-900 border border-cyber-700 text-white rounded-lg p-3 focus:ring-2 focus:ring-cyber-accent focus:border-transparent outline-none transition-all"
          >
            <option value="">默认麦克风</option>
            {inputDevices.map((device) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label || `Microphone ${device.deviceId.slice(0, 5)}...`}
              </option>
            ))}
          </select>
        </div>

        {/* Output Device */}
        <div className="space-y-2">
          <label className="text-sm text-gray-400 flex items-center gap-2">
            <Speaker className="w-4 h-4 text-green-400" />
            输出目标 (如 VB-Cable)
          </label>
          <div className="flex gap-2">
            <select
                value={selectedOutputId}
                onChange={(e) => onOutputDeviceChange(e.target.value)}
                className="flex-1 bg-cyber-900 border border-cyber-700 text-white rounded-lg p-3 focus:ring-2 focus:ring-cyber-accent focus:border-transparent outline-none transition-all"
            >
                <option value="">默认扬声器</option>
                {outputDevices.map((device) => (
                <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `Speaker ${device.deviceId.slice(0, 5)}...`}
                </option>
                ))}
            </select>
            <button
                onClick={playTestSound}
                disabled={isPlayingTest}
                className="bg-cyber-700 hover:bg-cyber-600 text-white p-3 rounded-lg border border-cyber-600 transition-colors"
                title="播放测试音效以验证输出"
            >
                <Volume2 className={`w-5 h-5 ${isPlayingTest ? 'text-cyber-accent animate-pulse' : ''}`} />
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            * 选择 <strong>CABLE Input (VB-Audio Virtual Cable)</strong> 以将音频路由到其他应用。
          </p>
        </div>
      </div>
    </div>
  );
};

export default DeviceSettings;