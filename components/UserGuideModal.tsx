import React from 'react';
import { X, Download, Settings, Play, Mic, ExternalLink, AlertTriangle } from 'lucide-react';

interface UserGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const UserGuideModal: React.FC<UserGuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-cyber-900 border border-cyber-500/50 w-full max-w-3xl max-h-[90vh] rounded-2xl shadow-[0_0_50px_rgba(0,243,255,0.15)] flex flex-col overflow-hidden relative">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-cyber-800 bg-cyber-900/95 sticky top-0 z-10">
          <div className="flex items-center gap-3">
             <div className="bg-cyber-accent/10 p-2 rounded-lg">
                <Settings className="w-6 h-6 text-cyber-accent" />
             </div>
             <div>
                <h2 className="text-xl font-bold text-white tracking-wide">NeuroVox 使用说明书</h2>
                <p className="text-xs text-gray-400">系统配置与操作指南</p>
             </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-red-500/20 text-gray-400 hover:text-red-400 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="overflow-y-auto p-6 space-y-8 text-gray-300 custom-scrollbar">
          
          {/* Section 1: Downloads */}
          <section className="bg-cyber-800/50 p-5 rounded-xl border border-cyber-700">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Download className="w-5 h-5 text-blue-400" />
              第一步：下载必要组件 (必做)
            </h3>
            <div className="space-y-4">
              <div className="bg-black/40 p-4 rounded-lg border border-cyber-700/50">
                <div className="flex justify-between items-start">
                    <div>
                        <h4 className="font-bold text-white text-sm">VB-Audio Virtual Cable (虚拟音频线)</h4>
                        <p className="text-xs text-gray-400 mt-1">
                            这是让 AI 声音传输到 Discord、微信、游戏的关键驱动。
                        </p>
                    </div>
                    <a 
                        href="https://vb-audio.com/Cable/" 
                        target="_blank" 
                        rel="noreferrer"
                        className="flex items-center gap-1 text-xs bg-cyber-500 hover:bg-cyber-400 text-white px-3 py-1.5 rounded transition-colors"
                    >
                        去官网下载 <ExternalLink className="w-3 h-3" />
                    </a>
                </div>
                <div className="mt-3 text-xs space-y-1 text-gray-400 border-t border-gray-700 pt-2">
                    <p className="font-bold text-yellow-500 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> 安装注意：
                    </p>
                    <ol className="list-decimal list-inside space-y-1 ml-1">
                        <li>下载并解压 ZIP 压缩包。</li>
                        <li>找到 <span className="text-white bg-gray-700 px-1 rounded">VBCABLE_Setup_x64.exe</span>。</li>
                        <li><span className="text-red-400 font-bold">必须右键点击 &rarr; 选择“以管理员身份运行”</span>。</li>
                        <li>安装完成后，<strong>重启电脑</strong>。</li>
                    </ol>
                </div>
              </div>
            </div>
          </section>

          {/* Section 2: Usage Steps */}
          <section>
             <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Play className="w-5 h-5 text-green-400" />
              第二步：开始使用
            </h3>
            
            <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-cyber-800/30 p-4 rounded-lg border border-cyber-700/50">
                    <div className="text-cyber-accent font-bold mb-2">1. 网页设置</div>
                    <ul className="text-sm space-y-2 list-disc list-inside">
                        <li>
                            <strong>输入源:</strong> 选择你的真实麦克风。
                        </li>
                        <li>
                            <strong>输出目标:</strong> 选择 <span className="text-white">CABLE Input (VB-Audio Virtual Cable)</span>。
                        </li>
                    </ul>
                </div>
                
                <div className="bg-cyber-800/30 p-4 rounded-lg border border-cyber-700/50">
                    <div className="text-cyber-accent font-bold mb-2">2. 克隆声音</div>
                    <ul className="text-sm space-y-2 list-disc list-inside">
                        <li>上传 10-60秒 目标人物音频，或直接录音。</li>
                        <li>点击“生成模型”等待分析完成。</li>
                        <li>点击右侧红色的“启动 NeuroVox”按钮。</li>
                    </ul>
                </div>
            </div>
          </section>

          {/* Section 3: App Configuration */}
          <section className="bg-cyber-800/50 p-5 rounded-xl border border-cyber-700">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Mic className="w-5 h-5 text-purple-400" />
              第三步：在软件中设置 (微信/Discord/游戏)
            </h3>
            <p className="text-sm text-gray-400 mb-4">
                要让别人听到变声后的声音，你需要修改目标软件的麦克风设置。
            </p>
            
            <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-black/40 rounded border border-gray-800">
                    <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold">D</div>
                    <div className="flex-1">
                        <div className="text-sm font-bold text-white">Discord / YY / Zoom</div>
                        <div className="text-xs text-gray-500">设置 &gt; 语音与视频 &gt; 输入设备 &gt; 选择 <strong>CABLE Output</strong></div>
                    </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-black/40 rounded border border-gray-800">
                    <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 font-bold">W</div>
                    <div className="flex-1">
                        <div className="text-sm font-bold text-white">微信 (PC版)</div>
                        <div className="text-xs text-gray-500">左下角菜单 &gt; 设置 &gt; 音视频通话 &gt; 麦克风 &gt; 选择 <strong>CABLE Output</strong></div>
                    </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-black/40 rounded border border-gray-800">
                    <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold">T</div>
                    <div className="flex-1">
                        <div className="text-sm font-bold text-white">腾讯会议 / 钉钉</div>
                        <div className="text-xs text-gray-500">设置 &gt; 音频 &gt; 麦克风 &gt; 选择 <strong>CABLE Output</strong></div>
                    </div>
                </div>
            </div>
          </section>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-cyber-800 bg-cyber-900/95 flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-cyber-700 hover:bg-cyber-600 text-white rounded-lg transition-colors font-medium text-sm"
          >
            我明白了
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserGuideModal;