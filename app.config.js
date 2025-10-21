export default {
  expo: {
    name: "Simple Conversational AI",
    slug: "simple-conversational-ai-rn",
    version: "1.0.0",
    orientation: "portrait",
    userInterfaceStyle: "light",
    platforms: ["ios", "android"],
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.drmurali.simple-conversational-ai-rn",
      bitcode: false,
      infoPlist: {
        NSMicrophoneUsageDescription: "This app needs microphone access for voice conversations with AI.",
        NSCameraUsageDescription: "This app may use camera for video calls if enabled.",
        NSLocalNetworkUsageDescription: "This app uses local network for WebRTC communication.",
        RTCConfiguration: {
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" }
          ],
          iceCandidatePoolSize: 10
        },
        UIBackgroundModes: ["audio"]
      }
    },
    android: {
      package: "com.drmurali.simpleconversationalairn",
      permissions: [
        "android.permission.RECORD_AUDIO",
        "android.permission.MODIFY_AUDIO_SETTINGS",
        "android.permission.VIBRATE",
        "android.permission.WAKE_LOCK",
        "android.permission.ACCESS_NETWORK_STATE",
        "android.permission.INTERNET"
      ]
    },
    plugins: [
      "@livekit/react-native-expo-plugin",
      [
        "@config-plugins/react-native-webrtc",
        {
          cameraPermission: "Allow access to camera for video calls.",
          microphonePermission: "Allow access to microphone for voice conversations."
        }
      ]
    ]
  }
};