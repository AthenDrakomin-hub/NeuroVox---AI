import React, { useEffect, useRef } from 'react';
import { Video, AlertCircle } from 'lucide-react';

// Add type definition for the global Jitsi API
declare global {
  interface Window {
    JitsiMeetExternalAPI: any;
  }
}

const MeetingRoom: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current || !window.JitsiMeetExternalAPI) return;

    // Clean up existing instance if any
    if (apiRef.current) {
      apiRef.current.dispose();
    }

    const domain = "8x8.vc";
    const options = {
      roomName: "vpaas-magic-cookie-89d4ba9435a143898b38944732fd14c0/SampleAppInnocentEmergenciesDefineConsequently",
      parentNode: containerRef.current,
      lang: 'zh-CN',
      width: '100%',
      height: '100%',
      configOverwrite: {
        prejoinPageEnabled: false, // Skip prejoin for faster testing
        startWithAudioMuted: true, // Prevent feedback loop initially
      },
      interfaceConfigOverwrite: {
        TOOLBAR_BUTTONS: [
          'microphone', 'camera', 'desktop', 'fullscreen',
          'fodeviceselection', 'hangup', 'profile', 'chat',
          'settings', 'raisehand', 'videoquality', 'filmstrip',
          'tileview'
        ],
        // Attempt to hide branding details
        SHOW_JITSI_WATERMARK: false,
        SHOW_WATERMARK_FOR_GUESTS: false,
        DEFAULT_REMOTE_DISPLAY_NAME: '远程用户',
      }
    };

    apiRef.current = new window.JitsiMeetExternalAPI(domain, options);

    // Event listeners could be added here
    // apiRef.current.addEventListener('videoConferenceJoined', () => {});

    return () => {
      if (apiRef.current) {
        apiRef.current.dispose();
        apiRef.current = null;
      }
    };
  }, []);

  return (
    <div className="flex flex-col h-full bg-cyber-800 border border-cyber-700 rounded-xl overflow-hidden shadow-lg shadow-cyber-900/50">
      <div className="bg-cyber-900/80 p-3 border-b border-cyber-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
            <Video className="w-5 h-5 text-cyber-accent" />
            <span className="font-bold text-white">实时通话测试</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-yellow-400 bg-yellow-400/10 px-3 py-1 rounded-full border border-yellow-400/20 animate-pulse">
            <AlertCircle className="w-3 h-3" />
            <span>务必在会议设置中选择 "CABLE Output" 麦克风</span>
        </div>
      </div>
      <div className="flex-1 bg-black relative">
         <div ref={containerRef} className="w-full h-full" />
      </div>
    </div>
  );
};

export default MeetingRoom;