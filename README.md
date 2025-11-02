# Cherri Pic Voice Agent

A production-ready React Native mobile application featuring AI-powered voice conversations with ElevenLabs and Gemini AI integration, complete with device control capabilities.

**Template for building 6 apps - Nov 2, 2025**

## Platform Support Summary

1. **Expo Go**: Not Supported
   - Cannot run because app uses native modules (WebRTC, LiveKit, ElevenLabs SDK)

2. **iOS Simulator**: Working (Except Audio)
   - App runs perfectly
   - AI connects and works
   - Audio output doesn't work (simulator limitation with WebRTC)

3. **Physical iPhone/iPad**: Full Support
   - Requires Apple Developer account configuration
   - Needs team ID and provisioning profile
   - Best option for testing voice features

## Features

- Real-time voice conversations with ElevenLabs AI agents
- Google Gemini AI text-based chat integration
- Device control tools (battery monitoring, brightness, screen flash)
- Beautiful gradient UI with responsive design
- Continuous listening mode for seamless conversations
- Cross-platform support (iOS & Android)
- Version tracking with automatic footer display

## Quick Start

### Prerequisites

- Node.js 18+
- Expo CLI (`npm install -g @expo/cli`)
- iOS Simulator or Android Emulator
- ElevenLabs account with Conversational AI agent
- Google Gemini API key

### Installation

```bash
# Install dependencies
npm install

# Create environment file from example
cp .env.example .env
```

### Environment Variables

Create a `.env` file with the following configuration:

```bash
# ElevenLabs Configuration
EXPO_PUBLIC_AGENT_ID=your_agent_id_here
EXPO_PUBLIC_ELEVENLABS_API_KEY=your_api_key_here

# Google Gemini AI Configuration
EXPO_PUBLIC_GEMINI_API_KEY=your_gemini_key_here
```

Get your credentials:
- ElevenLabs Agent ID: https://elevenlabs.io/app/conversational-ai/agents
- ElevenLabs API Key: https://elevenlabs.io/app/settings/api-keys
- Gemini API Key: https://aistudio.google.com/app/apikey

### Development

```bash
# Prebuild native dependencies (required for first run)
npx expo prebuild

# Start development server
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android
```

### Building for Production

```bash
# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android
```

## Available Commands

| Command | Description |
|---------|-------------|
| `npm start` | Start Expo development server |
| `npm run ios` | Run app on iOS simulator/device |
| `npm run android` | Run app on Android emulator/device |
| `npm run prebuild` | Generate native project files |
| `npm run lint` | Check code quality with ESLint |
| `npm run type-check` | Run TypeScript type checking |

## Project Structure

```
Cherri_pic_voiceagent/
├── App.tsx                          # Main application component
├── utils/
│   ├── deviceTools.ts               # Device control utilities
│   ├── geminiService.ts             # Google Gemini AI integration
│   └── voiceService.ts              # Voice recognition/synthesis
├── assets/                          # App icons and images
├── android/                         # Android native code
├── ios/                             # iOS native code
├── .env                             # Environment variables (not in git)
├── .env.example                     # Environment template
├── app.config.js                    # Expo configuration
├── eas.json                         # EAS Build configuration
├── package.json                     # Dependencies and scripts
├── VERSION                          # Current version number
├── CHANGELOG.md                     # Version history
└── README.md                        # This file
```

## Custom Device Tools

The AI agent can interact with these device tools:

### Battery Level
```typescript
getBatteryLevel() // Returns current battery percentage
```

### Brightness Control
```typescript
changeBrightness({ brightness: 75 }) // Set screen brightness (0-100)
```

### Screen Flash
```typescript
flashScreen() // Flash screen to full brightness briefly
```

## Voice Commands Examples

Try these commands with the voice agent:
- "What's my battery level?"
- "Set brightness to 50%"
- "Flash the screen"
- "Give me some creative ideas"
- "Help me with my tasks"

## Platform Support

- iOS: Full support (requires development build)
- Android: Full support (requires development build)
- Web: Not supported (WebRTC limitations)
- Expo Go: Not supported (requires native modules)

## Testing

After completing development tasks, test the app:

**Local Development:**
- iOS: Run on simulator via Expo Dev Client
- Android: Run on emulator or physical device
- Metro bundler: http://localhost:8081

**Production Testing:**
- Use EAS Build for testing production builds
- TestFlight for iOS beta testing
- Google Play Internal Testing for Android

## Troubleshooting

### Common Issues

**"Failed to start conversation"**
- Verify EXPO_PUBLIC_AGENT_ID in .env file
- Check ElevenLabs agent configuration
- Ensure internet connection is stable

**"Microphone permission denied"**
- Grant microphone permissions in device settings
- For iOS: Check Info.plist NSMicrophoneUsageDescription
- For Android: Check AndroidManifest.xml permissions

**"Native module errors"**
- Run `npx expo prebuild --clean`
- Clear cache: `npx expo start --clear`
- Reinstall dependencies: `rm -rf node_modules && npm install`

### iOS Simulator Setup
1. Device > Audio > Input > Microphone
2. Increase volume (defaults to 0)
3. Enable audio input in simulator settings

### Android Emulator Setup
1. Extended Controls (⋯) > Microphone
2. Enable "Virtual microphone uses host audio input"
3. Check system audio permissions

## Security Notes

- Never commit .env file to version control
- Keep API keys secure and rotate regularly
- Use environment-specific configurations
- Validate all user inputs
- Rate-limit API calls to prevent abuse

## Version History

See [CHANGELOG.md](CHANGELOG.md) for detailed version history.

Current version: **1.1**

## FAQ

**Q: Why do I need a development build?**
A: The app uses native modules (WebRTC, voice) that aren't available in Expo Go.

**Q: Can I use this with other AI providers?**
A: The architecture supports multiple AI providers. Extend the services in `/utils` directory.

**Q: How do I customize the UI?**
A: Edit styles in App.tsx. The app uses Material Design principles.

**Q: What's the cost of using this app?**
A: ElevenLabs and Gemini have usage-based pricing. Check their pricing pages.

**Q: Can I deploy this to app stores?**
A: Yes, use EAS Build to create production builds for App Store and Play Store.

## Learn More

- [ElevenLabs Conversational AI](https://elevenlabs.io/docs/conversational-ai/quickstart)
- [Google Gemini AI](https://ai.google.dev/docs)
- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/docs/getting-started)
- [EAS Build](https://docs.expo.dev/build/introduction/)

## License

MIT License

## Support

For issues and questions:
- Open an issue on GitHub
- Check existing documentation
- Review troubleshooting section

---

**v1.1 - Built with Claude Code Autonomous Agent using ElevenLabs Conversational AI & Google Gemini**
