import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Alert,
  ScrollView,
  PermissionsAndroid,
  TextInput,
  Keyboard,
} from 'react-native';
import { ElevenLabsProvider, useConversation } from '@elevenlabs/react-native';
import type {
  ConversationStatus,
  ConversationEvent,
  Role,
} from '@elevenlabs/react-native';
import { StatusBar } from 'expo-status-bar';
import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { getBatteryLevel, changeBrightness, flashScreen } from './utils/deviceTools';
import { askGemini } from './utils/geminiService';
// Voice features disabled - needs app rebuild to work
// import {
//   startVoiceRecognition,
//   stopVoiceRecognition,
//   speakText,
//   stopSpeaking,
// } from './utils/voiceService';

const ConversationScreen = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [permissionsGranted, setPermissionsGranted] = useState(false);

  // Initialize audio permissions
  useEffect(() => {
    const setupAudio = async () => {
      try {
        // Set audio mode for voice recording and playback - Fixed for WebRTC
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: false,
          playThroughEarpieceAndroid: false,
          staysActiveInBackground: true,
          interruptionModeIOS: InterruptionModeIOS.MixWithOthers,
          interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
        });

        // Force audio to play through speakers, not earpiece
        if (Platform.OS === 'ios') {
          await Audio.setAudioModeAsync({
            allowsRecordingIOS: true,
            playsInSilentModeIOS: true,
            interruptionModeIOS: InterruptionModeIOS.MixWithOthers,
            staysActiveInBackground: true,
          });
        }

        console.log('🎵 Audio session configured successfully');

        // Keep audio session active and check volume
        if (Platform.OS === 'ios') {
          try {
            await Audio.requestPermissionsAsync();
            console.log('🎵 iOS audio permissions granted');

            // Audio permissions and setup complete
            console.log('🎵 iOS audio setup complete - ready for WebRTC audio');
          } catch (error) {
            console.error('🎵 iOS audio permission error:', error);
          }
        }

        // Request permissions
        if (Platform.OS === 'android') {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
            {
              title: 'Microphone Permission',
              message: 'This app needs access to your microphone to enable voice conversations.',
              buttonNeutral: 'Ask Me Later',
              buttonNegative: 'Cancel',
              buttonPositive: 'OK',
            }
          );
          setPermissionsGranted(granted === PermissionsAndroid.RESULTS.GRANTED);
        } else {
          // iOS permissions are handled by Info.plist
          setPermissionsGranted(true);
        }

        setIsInitialized(true);
      } catch (error) {
        console.error('Audio setup failed:', error);
        Alert.alert('Audio Setup Failed', 'Unable to initialize audio system');
      }
    };

    setupAudio();
  }, []);

  const conversation = useConversation({
    clientTools: {
      getBatteryLevel,
      changeBrightness,
      flashScreen,
    },
    onConnect: ({ conversationId }: { conversationId: string }) => {
      console.log('✅ Connected to conversation:', conversationId);
      // Removed alert - user can see connection status visually
      setLastActivity(Date.now());
    },
    onDisconnect: (details: string) => {
      console.log('❌ Disconnected from conversation:', details);
      // Only alert if unexpected disconnection (not user-initiated)
      if (!details.includes('User ended')) {
        console.log('⚠️ Unexpected disconnection');
      }

      // Clear speaking timeout on disconnect
      if (speakingTimeout) {
        clearTimeout(speakingTimeout);
        setSpeakingTimeout(null);
      }
    },
    onError: (message: string, context?: Record<string, unknown>) => {
      console.error('❌ Conversation error:', message, context);

      // Only show alert for critical errors
      const isCriticalError = message.includes('authentication') ||
                             message.includes('permission') ||
                             message.includes('microphone');

      if (isCriticalError) {
        Alert.alert('Error', `Voice AI error: ${message}`);
      } else {
        console.log('ℹ️ Non-critical error logged (no alert shown)');
      }

      // Auto-recovery for connection issues (but don't alert)
      if (message.includes('connection') || message.includes('audio')) {
        console.log('🔄 Attempting auto-recovery...');
        setTimeout(() => {
          if (conversation.status === 'connected') {
            console.log('🔄 Restarting conversation session...');
            conversation.endSession().then(() => {
              setTimeout(() => startConversation(), 1000);
            }).catch(console.error);
          }
        }, 2000);
      }
    },
    onMessage: ({
      message,
      source,
    }: {
      message: ConversationEvent;
      source: Role;
    }) => {
      console.log(`💬 Message from ${source}:`, message);

      // Enhanced logging for user messages
      if (source === 'user') {
        console.log(`🎙️ USER SPOKE: Processing user input...`);
        console.log(`🎙️ Message type: ${message.type}`);
        if (message.type === 'user_transcript') {
          console.log(`🎙️ User transcript: ${JSON.stringify(message)}`);
          setLastUserMessage(new Date());
          setWaitingForResponse(true);

          // Set timeout to detect if AI doesn't respond
          setTimeout(() => {
            if (waitingForResponse) {
              console.log(`⚠️ NO AI RESPONSE DETECTED - User spoke but AI didn't respond within 5 seconds`);
              console.log(`⚠️ Conversation status: ${conversation.status}`);
              console.log(`⚠️ Last activity: ${new Date(lastActivity).toISOString()}`);
            }
          }, 5000);
        }
      } else if (source === 'ai') {
        console.log(`🤖 AI RESPONSE: ${message.type}`);
        if (message.type === 'agent_response') {
          console.log(`🤖 AI Response content: ${JSON.stringify(message)}`);
          setWaitingForResponse(false);
        }
      }
    },
    onModeChange: ({ mode }: { mode: 'speaking' | 'listening' }) => {
      console.log(`🔊 Mode changed to: ${mode}`);
      console.log(`🎵 Audio session active: ${mode === 'speaking' ? 'AI is speaking' : 'Listening for user'}`);

      // Clear any existing timeout
      if (speakingTimeout) {
        clearTimeout(speakingTimeout);
        setSpeakingTimeout(null);
      }

      setIsAISpeaking(mode === 'speaking');
      setIsUserSpeaking(mode === 'listening');
      setLastActivity(Date.now());

      // Force audio session update on mode change
      if (mode === 'listening') {
        console.log('🎙️ Forcing transition to listening mode');
        setTimeout(() => {
          if (conversation.status === 'connected') {
            setIsAISpeaking(false);
            setIsUserSpeaking(true);
          }
        }, 100);
      } else if (mode === 'speaking') {
        console.log('🎵 AI STARTING TO SPEAK - Check audio output!');
        console.log('🎵 Make sure device volume is up and not on silent mode');

        // Set timeout to force transition if stuck in speaking mode
        const timeout = setTimeout(() => {
          // Only log if still connected (avoid false warnings after disconnect)
          if (conversation.status === 'connected') {
            console.log('⚠️ Speaking timeout - forcing transition to listening');
            setIsAISpeaking(false);
            setIsUserSpeaking(true);
          }
        }, 30000); // 30 second timeout (increased for longer responses)
        setSpeakingTimeout(timeout);
      }
    },
    onStatusChange: ({ status }: { status: ConversationStatus }) => {
      console.log(`📡 Status changed to: ${status}`);

      // Clear timeout when disconnecting
      if (status === 'disconnected' && speakingTimeout) {
        clearTimeout(speakingTimeout);
        setSpeakingTimeout(null);
      }
    },
    onCanSendFeedbackChange: ({
      canSendFeedback,
    }: {
      canSendFeedback: boolean;
    }) => {
      console.log(`🔊 Can send feedback: ${canSendFeedback}`);
    },
  });

  const [isStarting, setIsStarting] = useState(false);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [lastActivity, setLastActivity] = useState<number>(Date.now());
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [speakingTimeout, setSpeakingTimeout] = useState<NodeJS.Timeout | null>(null);
  const [lastUserMessage, setLastUserMessage] = useState<Date | null>(null);
  const [waitingForResponse, setWaitingForResponse] = useState(false);
  const [showBottomBar, setShowBottomBar] = useState(true);
  const [textInput, setTextInput] = useState('');
  const [geminiResponse, setGeminiResponse] = useState<string | null>(null);
  const [isGeminiLoading, setIsGeminiLoading] = useState(false);
  // Voice features disabled - needs app rebuild
  // const [isListening, setIsListening] = useState(false);
  // const [isSpeaking, setIsSpeaking] = useState(false);

  // Cleanup speaking timeout on component unmount
  useEffect(() => {
    return () => {
      if (speakingTimeout) {
        clearTimeout(speakingTimeout);
      }
    };
  }, [speakingTimeout]);

  const startConversation = async () => {
    if (isStarting || !isInitialized || !permissionsGranted) {
      if (!permissionsGranted) {
        Alert.alert('Permission Required', 'Microphone permission is required for voice conversations');
      }
      return;
    }

    setIsStarting(true);
    try {
      await conversation.startSession({
        agentId: process.env.EXPO_PUBLIC_AGENT_ID,
        ...(process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY && {
          apiKey: process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY
        }),
        dynamicVariables: {
          platform: Platform.OS,
          deviceType: Platform.OS === 'ios' && Platform.constants?.interfaceIdiom === 'pad' ? 'tablet' : 'phone',
          appName: 'Simple Conversational AI',
          buildType: 'custom-dev-build',
          conversationMode: 'continuous',
          microphoneMode: 'always-listening',
        },
      });

      // Start with a small delay to ensure connection is stable
      setTimeout(() => {
        setLastActivity(Date.now());
        console.log('🎙️ Continuous conversation started - you can speak anytime');
      }, 1000);

    } catch (error) {
      console.error('Failed to start conversation:', error);
      Alert.alert('Error', 'Failed to start voice conversation. Please check your agent ID and internet connection.');
    } finally {
      setIsStarting(false);
    }
  };

  const endConversation = async () => {
    try {
      // Clear any pending timeouts
      if (speakingTimeout) {
        clearTimeout(speakingTimeout);
        setSpeakingTimeout(null);
      }

      await conversation.endSession();
    } catch (error) {
      console.error('Failed to end conversation:', error);
      Alert.alert('Error', 'Failed to end conversation properly');
    }
  };

  const handleAskGemini = async () => {
    if (!textInput.trim()) {
      Alert.alert('Empty Question', 'Please type a question first');
      return;
    }

    setIsGeminiLoading(true);
    setGeminiResponse(null);
    Keyboard.dismiss();

    try {
      const response = await askGemini(textInput);
      setGeminiResponse(response);
      setTextInput('');
    } catch (error) {
      console.error('Error asking Gemini:', error);
      Alert.alert('Error', 'Failed to get response from Gemini AI');
    } finally {
      setIsGeminiLoading(false);
    }
  };

  // Voice features disabled - needs app rebuild to work
  const handleAskGeminiGreeting = async () => {
    setIsGeminiLoading(true);
    setGeminiResponse(null);
    try {
      const response = await askGemini('Act as a helpful AI assistant. Greet the user in a friendly way and ask them: "Aapko kya help chahiye?" (What help do you need?). Keep it short and welcoming.');
      setGeminiResponse(response);
    } catch (error) {
      console.error('Error asking Gemini:', error);
      Alert.alert('Error', 'Failed to get response from Gemini AI');
    } finally {
      setIsGeminiLoading(false);
    }
  };


  if (!isInitialized) {
    return (
      <LinearGradient
        colors={['#E8E4F3', '#D4E4F7', '#E0F0FF']}
        style={styles.container}
      >
        <View style={styles.centeredContainer}>
          <Text style={styles.initText}>🎙️ Initializing...</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#E8DEF8', '#D4E4F7', '#E0F0FF', '#F5E8F7']}
      locations={[0, 0.3, 0.7, 1]}
      style={styles.container}
    >
      <StatusBar style="dark" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={(event) => {
          const scrollY = event.nativeEvent.contentOffset.y;
          if (scrollY > 50) {
            setShowBottomBar(false);
          } else {
            setShowBottomBar(true);
          }
        }}
        scrollEventThrottle={16}
      >
        {/* Greeting Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>Hello, Friend!</Text>
          <Text style={styles.subtitle}>How can I help you today?</Text>
        </View>

        {/* Gemini Response Display */}
        {geminiResponse && (
          <View style={styles.geminiResponseContainer}>
            <View style={styles.geminiHeader}>
              <Text style={styles.geminiTitle}>🤖 Gemini AI Response</Text>
              <TouchableOpacity
                onPress={() => setGeminiResponse(null)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.geminiResponseScroll}>
              <Text style={styles.geminiResponseText}>{geminiResponse}</Text>
            </ScrollView>
          </View>
        )}

        {/* Central Avatar with Glowing Ring */}
        <View style={styles.avatarContainer}>
          {/* Outer Glow Ring */}
          <View style={styles.glowRing}>
            {/* Inner Avatar */}
            <LinearGradient
              colors={['#C084FC', '#A78BFA', '#818CF8', '#60A5FA']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.avatarCircle}
            >
              <View style={styles.face}>
                <View style={styles.eyesContainer}>
                  <View style={styles.eye} />
                  <View style={styles.eye} />
                </View>
              </View>
            </LinearGradient>
          </View>
          <Text style={styles.statusText}>
            {conversation.status === 'connected'
              ? (isAISpeaking ? 'Speaking...' : 'Listening...')
              : ''}
          </Text>
        </View>

        {/* Action Cards Grid */}
        <View style={styles.cardsGrid}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={async () => {
              if (conversation.status === 'disconnected') {
                await startConversation();
                // Wait for connection and then send contextual prompt
                setTimeout(() => {
                  conversation.sendContextualUpdate('User wants creative ideas. Ask them what kind of ideas they need.');
                }, 1500);
              } else {
                conversation.sendContextualUpdate('User wants creative ideas. Ask them what kind of ideas they need.');
              }
            }}
          >
            <Text style={styles.cardIcon}>💡</Text>
            <Text style={styles.cardText}>Give me ideas</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={async () => {
              if (conversation.status === 'disconnected') {
                await startConversation();
                setTimeout(() => {
                  conversation.sendContextualUpdate('User wants task management help. Ask them: "What kind of task would you like help with? I can help you create a to-do list, set time-based reminders, track your tasks, or notify you when tasks are completed. What would you prefer?"');
                }, 1500);
              } else {
                conversation.sendContextualUpdate('User wants task management help. Ask them: "What kind of task would you like help with? I can help you create a to-do list, set time-based reminders, track your tasks, or notify you when tasks are completed. What would you prefer?"');
              }
            }}
          >
            <Text style={styles.cardIcon}>📋</Text>
            <Text style={styles.cardText}>Do the task</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Bottom Input Bar - Hidden on scroll */}
      {showBottomBar && (
        <View style={styles.bottomBar}>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInputFull}
              placeholder="conversations"
              placeholderTextColor="#9CA3AF"
              value={textInput}
              onChangeText={setTextInput}
              onSubmitEditing={handleAskGemini}
              returnKeyType="send"
            />
            <TouchableOpacity
              style={styles.micButton}
              onPress={conversation.status === 'connected' ? endConversation : startConversation}
              disabled={isStarting || !permissionsGranted}
            >
              <LinearGradient
                colors={['#60A5FA', '#3B82F6']}
                style={styles.micGradient}
              >
                <Text style={styles.micIcon}>
                  {conversation.status === 'connected' ? '⏹️' : '🎤'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Version Footer */}
      <View style={styles.versionFooter}>
        <Text style={styles.versionText}>v1.1 - {new Date().toLocaleDateString()}</Text>
      </View>
    </LinearGradient>
  );
};

export default function App() {
  return (
    <ElevenLabsProvider>
      <ConversationScreen />
    </ElevenLabsProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#6B46C1',
  },

  // Scroll Content
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 40 : 50,
    paddingBottom: 100,
  },

  // Header
  header: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 30,
  },
  greeting: {
    fontSize: 32,
    fontWeight: '700',
    color: '#6B46C1',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#7C3AED',
    fontWeight: '500',
  },

  // Avatar
  avatarContainer: {
    alignItems: 'center',
    marginVertical: 40,
  },
  glowRing: {
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 30,
    elevation: 20,
  },
  avatarCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.6,
    shadowRadius: 25,
    elevation: 18,
  },
  face: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  eyesContainer: {
    flexDirection: 'row',
    gap: 30,
    marginTop: 20,
  },
  eye: {
    width: 20,
    height: 36,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
  },
  statusText: {
    marginTop: 20,
    fontSize: 16,
    color: '#8B5CF6',
    fontWeight: '500',
  },

  // Cards Grid
  cardsGrid: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 30,
    paddingHorizontal: 10,
  },
  actionCard: {
    flex: 1,
    maxWidth: 180,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 8,
    minHeight: 160,
  },
  cardIcon: {
    fontSize: 40,
    marginBottom: 16,
  },
  cardText: {
    fontSize: 16,
    color: '#6B46C1',
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.2,
  },

  // Bottom Input Bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'android' ? 24 : 34,
    paddingTop: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 35,
    paddingHorizontal: 20,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 10,
  },
  plusButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E0E7FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  plusIcon: {
    fontSize: 28,
    color: '#7C3AED',
    fontWeight: '300',
  },
  textInput: {
    flex: 1,
    fontSize: 17,
    color: '#9CA3AF',
    paddingVertical: 0,
  },
  textInputFull: {
    flex: 1,
    fontSize: 17,
    color: '#374151',
    paddingVertical: 0,
  },
  voiceButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  voiceIcon: {
    fontSize: 24,
  },
  micButton: {
    marginLeft: 14,
  },
  micGradient: {
    width: 58,
    height: 58,
    borderRadius: 29,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  micIcon: {
    fontSize: 26,
  },

  // Gemini Response
  geminiResponseContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginVertical: 20,
    marginHorizontal: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    maxHeight: 300,
  },
  geminiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  geminiTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#7C3AED',
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#6B7280',
    fontWeight: '600',
  },
  geminiResponseScroll: {
    maxHeight: 220,
  },
  geminiResponseText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#374151',
  },

  // Version Footer
  versionFooter: {
    position: 'absolute',
    bottom: Platform.OS === 'android' ? 80 : 90,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingVertical: 4,
  },
  versionText: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: '400',
  },
});