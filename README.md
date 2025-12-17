# 🎙️ NeuroVox - AI 实时语音变声与传输系统

**NeuroVox** 是一个基于 Web 的实时语音转换与传输应用。它利用 Google Gemini Multimodal Live API (Gemini 2.5) 的强大能力，将用户的实时语音转换为预设的特定人设（Persona）声音，并能将转换后的音频实时路由到虚拟音频设备（如 VB-Cable），从而在 Discord、Zoom、游戏或其他语音软件中使用。

![License](https://img.shields.io/badge/license-Proprietary-red.svg)
![React](https://img.shields.io/badge/React-19.0-blue)
![Gemini API](https://img.shields.io/badge/Gemini-2.5%20Flash-orange)

## ✨ 主要功能

*   **🎭 多样化声线预设**: 内置沉稳男声、清甜女声、知性御姐等多种高品质声线预设，点击即用。
*   **⚡ 实时低延迟传输**: 使用 Gemini Live WebSocket API 进行流式音频处理，实现接近实时的语音转换。
*   **🎛️ 智能硬件路由**: 自动检测并适配 **VB-Audio Virtual Cable**，方便将音频输出到其他应用程序。
*   **📊 实时可视化**: 内置复古赛博朋克风格的音频频谱可视化效果。
*   **🎨 Cyberpunk UI**: 基于 Tailwind CSS 构建的沉浸式深色模式界面。

## 🛠️ 技术栈

*   **前端框架**: React 19 + Vite
*   **AI 核心**: Google GenAI SDK (`@google/genai`) - Model: `gemini-2.5-flash-native-audio-preview-09-2025`
*   **样式**: Tailwind CSS + Lucide React Icons
*   **音频处理**: Web Audio API (AudioContext, ScriptProcessor, AnalyserNode)

## 🔌 VB-Audio Cable 设置指南 (关键步骤)

为了将网页生成的 AI 声音传输到 Discord、微信、游戏或会议软件中，你需要一个虚拟音频驱动。我们推荐免费的 **VB-Audio Virtual Cable**。

### 1. 下载与安装
*   **官方下载地址**: [https://vb-audio.com/Cable/](https://vb-audio.com/Cable/)
*   **Windows 用户**:
    1.  点击页面上的 "Download VBCABLE_Driver_Pack43.zip" 按钮。
    2.  下载并解压压缩包。
    3.  在文件夹中找到 `VBCABLE_Setup_x64.exe`，**右键点击并选择 "以管理员身份运行"** (这一步非常重要，否则可能安装失败)。
    4.  点击 "Install Driver"。
    5.  安装完成后，**重启电脑**。
*   **macOS 用户**:
    1.  点击 "Download VB-CABLE for macOS" 按钮。
    2.  双击安装包 (`.dmg`) 并按照屏幕提示完成安装。
    3.  安装完成后建议重启电脑。

### 2. 验证安装
重启后，打开系统的声音设置：
*   在 **播放/输出** 设备列表中，你应该能看到 `CABLE Input (VB-Audio Virtual Cable)`。
*   在 **录制/输入** 设备列表中，你应该能看到 `CABLE Output (VB-Audio Virtual Cable)`。

### 3. 工作原理说明
*   **NeuroVox (本网页)** 将声音发送到 `CABLE Input`（就像发送给扬声器一样）。
*   VB-Cable 会在内部将声音“搬运”到 `CABLE Output`（模拟成一个麦克风）。
*   你在 Discord/Zoom 中选择 `CABLE Output` 作为你的麦克风，别人听到的就是经过 AI 变声后的声音了。

## 🚀 快速开始

### 1. 环境准备

*   Node.js (v18 或更高版本)
*   **VB-Audio Cable**: 按照上方指南安装并配置好。

### 2. 获取 Google API Key

本项目需要 Google Gemini API 密钥才能工作。

1.  访问 **[Google AI Studio](https://aistudio.google.com/app/apikey)**。
2.  登录你的 Google 账号。
3.  点击 **"Create API key"** 按钮。
4.  复制生成的密钥字符串 (以 `AIza` 开头)。

### 3. 安装项目与配置变量

```bash
# 克隆项目
git clone https://github.com/your-username/neurovox.git
cd neurovox

# 安装依赖
npm install
```

**配置环境变量**:

1.  在项目根目录创建一个名为 `.env` 的新文件。
2.  使用文本编辑器打开它，并粘贴你的 API 密钥，格式如下：

```env
API_KEY=你的_AIza开头的_API_KEY_粘贴在这里
```

> ⚠️ **注意**: `.env` 文件包含敏感信息，请勿将其提交到公开的代码仓库（Git）。

### 4. 启动开发服务器

```bash
npm run dev
```

打开浏览器访问 `http://localhost:5173`。

## 🎧 使用指南

### 第一步：硬件配置
1. 在网页顶部的 **硬件配置** 面板中，选择你的真实麦克风作为“输入源”。
2. 在“输出目标”中，选择 **CABLE Input (VB-Audio Virtual Cable)**。
   * *如果没有安装 VB-Cable，你可以选择默认扬声器进行测试，但声音不会传输到其他软件。*

### 第二步：选择声线 (关键)
1. 在左侧面板的 **声线选择** 中，点击选择一个你喜欢的人设（如：沉稳男声、清甜女声）。
2. 系统会自动配置 AI 指令和音色。

### 第三步：启动实时传输
1. 确保右侧面板显示“Ready”且选中了声线。
2. 点击 **启动 NeuroVox** 按钮。
3. 等待连接状态变为 **已连接**。
4. 现在对着麦克风说话，AI 将以目标声音复述你的话语。

### 第四步：在其他软件中使用 (包括微信/QQ/钉钉)
NeuroVox 配合 VB-Cable 可以支持任何允许选择麦克风输入的 Windows/macOS 软件。

**通用设置方法**：进入软件的“设置” -> “音频/视频” -> 将“麦克风”或“输入设备”修改为 **CABLE Output (VB-Audio Virtual Cable)**。

*   **微信 (PC版)**: 设置 -> 音视频通话 -> 麦克风 -> 选择 `CABLE Output`。
*   **钉钉 (PC版)**: 设置 -> 音视频 -> 麦克风 -> 选择 `CABLE Output`。
*   **QQ (PC版)**: 设置 -> 音视频通话 -> 麦克风 -> 选择 `CABLE Output`。
*   **腾讯会议**: 设置 -> 音频 -> 麦克风 -> 选择 `CABLE Output`。
*   **Discord / Zoom / OBS**: 同上。

## ☁️ 部署 (Vercel)

本项目已针对 Vercel 部署进行了优化。

1. 将代码推送到 GitHub。
2. 在 Vercel 面板中导入项目。
3. 在 **Settings** -> **Environment Variables** 中配置环境变量：
   * Key: `API_KEY`
   * Value: `你的_Google_API_Key`
4. 点击 **Deploy**。

## ⚖️ 版权与许可 (Copyright)

**Copyright © 2024 NeuroVox Team. All Rights Reserved.**

本项目为 **私有闭源软件**。保留所有权利。

*   严禁未经授权的复制、分发、修改、反编译或将源代码用于商业用途。
*   本软件仅供授权用户个人使用。
*   代码中包含的知识产权和技术机密受法律保护。

未经书面许可，不得擅自传播本项目代码。