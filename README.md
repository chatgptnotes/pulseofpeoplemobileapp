# 🎙️ Simple Conversational AI React Native App

A streamlined React Native application demonstrating voice conversations with ElevenLabs Conversational AI, featuring custom device interaction tools.

## ✨ Features

- **🗣️ Voice Conversations**: Real-time voice chat with AI agents
- **📱 Device Integration**: Control device features (battery, brightness, vibration)
- **💬 Text Messaging**: Send text messages and contextual updates
- **👍 Feedback System**: Like/dislike feedback for AI responses
- **📊 Status Indicators**: Visual connection and speaking/listening states
- **🔧 Custom Tools**: Battery level, brightness control, screen flash, vibration

## 📋 Prerequisites

- **Node.js** 18+
- **Expo CLI** (`npm install -g @expo/cli`)
- **iOS Simulator** or **Android Emulator**
- **ElevenLabs Account** with a Conversational AI agent

## 🚀 Quick Start

### 1. Clone and Setup
```bash
# Navigate to the project directory
cd simple-conversational-ai-rn

# Install dependencies
npm install

# Create environment file
cp .env.example .env
```

### 2. Configure Your Agent
1. Create an agent at [ElevenLabs Conversational AI](https://elevenlabs.io/app/conversational-ai/agents)
2. Copy your Agent ID to `.env`:
   ```
   EXPO_PUBLIC_AGENT_ID=your_agent_id_here
   ```

### 3. Prebuild for Native Dependencies
```bash
# Required for WebRTC and native modules
npx expo prebuild
```

### 4. Run the App
```bash
# Start development server
npx expo start

# Run on iOS
npx expo run:ios

# Run on Android
npx expo run:android
```

## 🛠️ Custom Device Tools

The app includes these custom tools that the AI can use:

### 🔋 Battery Level
```typescript
// AI can ask: "What's my battery level?"
getBatteryLevel() // Returns: "Battery level is 85%"
```

### 💡 Brightness Control
```typescript
// AI can say: "Set brightness to 75%"
changeBrightness({ brightness: 75 }) // Sets screen brightness
```

### ⚡ Screen Flash
```typescript
// AI can say: "Flash the screen"
flashScreen() // Briefly flashes screen to full brightness
```

### 📳 Device Vibration
```typescript
// AI can say: "Vibrate the device"
vibrate({ pattern: 'medium' }) // Vibrates with specified intensity
```

## 🎯 Usage Examples

Try these voice commands with your AI agent:

- 🔋 **"Check my battery level"**
- 💡 **"Change brightness to 50%"**
- ⚡ **"Flash the screen"**
- 📳 **"Vibrate the device"**
- 📱 **"What's my device status?"**

## 📁 Project Structure

```
simple-conversational-ai-rn/
├── App.tsx                 # Main app component with conversation UI
├── utils/
│   └── deviceTools.ts      # Custom device interaction tools
├── .env.example           # Environment variables template
├── app.config.js          # Expo configuration
├── package.json           # Dependencies and scripts
├── tsconfig.json          # TypeScript configuration
└── README.md              # This file
```

## 🔧 Configuration

### Agent Setup
Configure your ElevenLabs agent with these client tools:

1. **getBatteryLevel**
   - Description: "Get the current device battery level"
   - No parameters required

2. **changeBrightness**
   - Description: "Change the screen brightness"
   - Parameter: `brightness` (number, 0-100)

3. **flashScreen**
   - Description: "Flash the screen briefly"
   - No parameters required

4. **vibrate**
   - Description: "Vibrate the device"
   - Parameter: `pattern` (string, optional: 'light', 'medium', 'heavy')

### Environment Variables
```bash
# Required: Your ElevenLabs agent ID
EXPO_PUBLIC_AGENT_ID=your_agent_id_here

# Optional: API key for private agents
EXPO_PUBLIC_ELEVENLABS_API_KEY=your_api_key_here
```

## 📱 Platform Support

- ✅ **iOS**: Full support with development build
- ✅ **Android**: Full support with development build
- ❌ **Web**: Not supported (WebRTC limitations)
- ❌ **Expo Go**: Not supported (requires development build)

## 🐛 Troubleshooting

### Common Issues

**1. "Failed to start conversation"**
- Verify your `EXPO_PUBLIC_AGENT_ID` in `.env`
- Ensure agent is configured correctly in ElevenLabs dashboard

**2. "Microphone permission denied"**
- Check device microphone permissions
- For simulators, configure audio input in settings

**3. "Native module errors"**
- Run `npx expo prebuild` to generate native code
- Clear cache: `npx expo start --clear`

### iOS Simulator Audio
1. Open **Device > Audio > Input**
2. Select **Microphone**
3. Increase **Volume** (defaults to 0)

### Android Emulator Audio
1. Open **Extended Controls** (⋯)
2. Go to **Microphone**
3. Enable **Virtual microphone uses host audio input**

## 📚 Learn More

- [ElevenLabs Conversational AI Docs](https://elevenlabs.io/docs/conversational-ai/quickstart)
- [ElevenLabs React Native SDK](https://elevenlabs.io/docs/libraries/conversational-ai-sdk-react-native)
- [Expo Development Builds](https://docs.expo.dev/development/build/)

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

**Built with ❤️ using ElevenLabs Conversational AI**