import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Keyboard,
  TouchableWithoutFeedback,
  Platform,
  Alert,
  ScrollView,
  PermissionsAndroid,
} from 'react-native';
import { TextInput } from 'react-native';
import { ElevenLabsProvider, useConversation } from '@elevenlabs/react-native';
import type {
  ConversationStatus,
  ConversationEvent,
  Role,
} from '@elevenlabs/react-native';
import { StatusBar } from 'expo-status-bar';
import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';
import { getBatteryLevel, changeBrightness, flashScreen } from './utils/deviceTools';

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
      Alert.alert('Connected', 'Voice conversation started! You can speak now.');
      setLastActivity(Date.now());
    },
    onDisconnect: (details: string) => {
      console.log('❌ Disconnected from conversation:', details);
      Alert.alert('Disconnected', 'Voice conversation ended');
    },
    onError: (message: string, context?: Record<string, unknown>) => {
      console.error('❌ Conversation error:', message, context);
      Alert.alert('Error', `Voice AI error: ${message}`);

      // Auto-recovery for connection issues
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
          console.log('⚠️ Speaking timeout - forcing transition to listening');
          if (conversation.status === 'connected') {
            setIsAISpeaking(false);
            setIsUserSpeaking(true);
          }
        }, 10000); // 10 second timeout
        setSpeakingTimeout(timeout);
      }
    },
    onStatusChange: ({ status }: { status: ConversationStatus }) => {
      console.log(`📡 Status changed to: ${status}`);
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
  const [textInput, setTextInput] = useState('');
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [lastActivity, setLastActivity] = useState<number>(Date.now());
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [speakingTimeout, setSpeakingTimeout] = useState<NodeJS.Timeout | null>(null);
  const [lastUserMessage, setLastUserMessage] = useState<Date | null>(null);
  const [waitingForResponse, setWaitingForResponse] = useState(false);

  const handleSubmitText = () => {
    if (textInput.trim()) {
      conversation.sendUserMessage(textInput.trim());
      setTextInput('');
      Keyboard.dismiss();
    }
  };

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
      await conversation.endSession();
    } catch (error) {
      console.error('Failed to end conversation:', error);
      Alert.alert('Error', 'Failed to end conversation properly');
    }
  };

  const getStatusColor = (status: ConversationStatus): string => {
    switch (status) {
      case 'connected':
        return '#10B981'; // Green
      case 'connecting':
        return '#F59E0B'; // Orange
      case 'disconnected':
        return '#EF4444'; // Red
      default:
        return '#6B7280'; // Gray
    }
  };

  const getStatusText = (status: ConversationStatus): string => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const canStart = conversation.status === 'disconnected' && !isStarting && isInitialized && permissionsGranted;
  const canEnd = conversation.status === 'connected';
  const isUnresponsive = conversation.status === 'connected' && (Date.now() - lastActivity) > 15000; // 15 seconds

  const resetConnection = async () => {
    try {
      console.log('🔄 Resetting connection due to unresponsive AI...');
      await conversation.endSession();
      setTimeout(() => startConversation(), 1000);
    } catch (error) {
      console.error('Failed to reset connection:', error);
    }
  };

  if (!isInitialized) {
    return (
      <View style={[styles.container, styles.centeredContainer]}>
        <Text style={styles.title}>🎙️ Initializing Audio...</Text>
        <Text style={styles.subtitle}>Setting up voice system</Text>
      </View>
    );
  }

  return (
    <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
      <ScrollView contentContainerStyle={styles.container}>
        <StatusBar style="auto" />

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>🎙️ Voice AI Assistant</Text>
          <Text style={styles.subtitle}>
            Production Ready • Custom Dev Build
          </Text>
        </View>

        {/* Status Indicator */}
        <View style={styles.statusContainer}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: getStatusColor(conversation.status) },
            ]}
          />
          <Text style={styles.statusText}>
            {getStatusText(conversation.status)}
          </Text>
        </View>

        {/* Permission Status */}
        <View style={styles.statusContainer}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: permissionsGranted ? '#10B981' : '#EF4444' },
            ]}
          />
          <Text style={styles.statusText}>
            Microphone: {permissionsGranted ? 'Granted' : 'Denied'}
          </Text>
        </View>

        {/* Speaking/Listening Indicator */}
        {conversation.status === 'connected' && (
          <View style={styles.speakingContainer}>
            <View
              style={[
                styles.speakingDot,
                {
                  backgroundColor: isAISpeaking ? '#8B5CF6' : isUserSpeaking ? '#10B981' : '#D1D5DB',
                },
              ]}
            />
            <Text
              style={[
                styles.speakingText,
                { color: isAISpeaking ? '#8B5CF6' : isUserSpeaking ? '#10B981' : '#9CA3AF' },
              ]}
            >
              {isAISpeaking ? '🗣️ AI Speaking' : isUserSpeaking ? '🎙️ You can speak' : '👂 Ready to listen'}
            </Text>
          </View>
        )}

        {/* Conversation Mode Info */}
        <View style={styles.toolsContainer}>
          <Text style={styles.toolsTitle}>🎙️ Conversation Mode:</Text>
          <Text style={styles.toolItem}>✅ Continuous listening enabled for natural conversation</Text>
          <Text style={styles.toolItem}>🔄 Two-way communication with instant response</Text>
        </View>

        {/* Available Tools Info */}
        <View style={styles.toolsContainer}>
          <Text style={styles.toolsTitle}>📱 Available Device Tools:</Text>
          <Text style={styles.toolItem}>• getBatteryLevel() - Check battery status</Text>
          <Text style={styles.toolItem}>• changeBrightness(level) - Adjust screen brightness</Text>
          <Text style={styles.toolItem}>• flashScreen() - Flash the screen</Text>
        </View>

        {/* Main Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.button,
              styles.startButton,
              !canStart && styles.disabledButton,
            ]}
            onPress={startConversation}
            disabled={!canStart}
          >
            <Text style={styles.buttonText}>
              {isStarting ? '🔄 Starting...' : '▶️ Start Voice Conversation'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button,
              styles.endButton,
              !canEnd && styles.disabledButton,
            ]}
            onPress={endConversation}
            disabled={!canEnd}
          >
            <Text style={styles.buttonText}>⏹️ End Conversation</Text>
          </TouchableOpacity>

          {isUnresponsive && (
            <TouchableOpacity
              style={[styles.button, styles.resetButton]}
              onPress={resetConnection}
            >
              <Text style={styles.buttonText}>🔄 Reset Connection</Text>
            </TouchableOpacity>
          )}

        </View>

        {/* Feedback Section */}
        {conversation.status === 'connected' && conversation.canSendFeedback && (
          <View style={styles.feedbackContainer}>
            <Text style={styles.feedbackLabel}>How was that response?</Text>
            <View style={styles.feedbackButtons}>
              <TouchableOpacity
                style={[styles.button, styles.likeButton]}
                onPress={() => conversation.sendFeedback(true)}
              >
                <Text style={styles.buttonText}>👍 Like</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.dislikeButton]}
                onPress={() => conversation.sendFeedback(false)}
              >
                <Text style={styles.buttonText}>👎 Dislike</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Text Input Section */}
        {conversation.status === 'connected' && (
          <View style={styles.messagingContainer}>
            <Text style={styles.messagingLabel}>💬 Send Text Message</Text>
            <TextInput
              style={styles.textInput}
              value={textInput}
              onChangeText={(text) => {
                setTextInput(text);
                // Prevent agent from interrupting while user is typing
                if (text.length > 0) {
                  conversation.sendUserActivity();
                }
              }}
              placeholder="Type your message here... (Press Enter to send)"
              multiline
              onSubmitEditing={handleSubmitText}
              returnKeyType="send"
              blurOnSubmit={true}
            />
            <View style={styles.messageButtons}>
              <TouchableOpacity
                style={[styles.button, styles.messageButton]}
                onPress={handleSubmitText}
                disabled={!textInput.trim()}
              >
                <Text style={styles.buttonText}>💬 Send Message</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.contextButton]}
                onPress={() => {
                  if (textInput.trim()) {
                    conversation.sendContextualUpdate(textInput.trim());
                    setTextInput('');
                    Keyboard.dismiss();
                  }
                }}
                disabled={!textInput.trim()}
              >
                <Text style={styles.buttonText}>📝 Send Context</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Instructions */}
        <Text style={styles.instructions}>
          💡 Try saying: "Check my battery level", "Flash the screen", or "Change brightness to 50%"
          {'\n\n'}🎙️ Continuous conversation enabled - just speak naturally, no buttons needed!
          {'\n\n'}🚀 Running on Custom Development Build with full voice AI integration
        </Text>
      </ScrollView>
    </TouchableWithoutFeedback>
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
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 20,
    paddingTop: 60,
  },
  centeredContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1F2937',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  speakingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  speakingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  speakingText: {
    fontSize: 14,
    fontWeight: '500',
  },
  toolsContainer: {
    backgroundColor: '#E0F2FE',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    width: '100%',
  },
  toolsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 8,
  },
  toolItem: {
    fontSize: 14,
    color: '#475569',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 4,
  },
  buttonContainer: {
    width: '100%',
    gap: 16,
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  startButton: {
    backgroundColor: '#10B981',
  },
  endButton: {
    backgroundColor: '#EF4444',
  },
  resetButton: {
    backgroundColor: '#F59E0B',
  },
  disabledButton: {
    backgroundColor: '#9CA3AF',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  feedbackContainer: {
    marginBottom: 24,
    alignItems: 'center',
    width: '100%',
  },
  feedbackLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 12,
  },
  feedbackButtons: {
    flexDirection: 'row',
    gap: 16,
  },
  likeButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 24,
  },
  dislikeButton: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 24,
  },
  messagingContainer: {
    marginBottom: 24,
    width: '100%',
  },
  messagingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    minHeight: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
    fontSize: 16,
  },
  messageButtons: {
    flexDirection: 'row',
    gap: 16,
  },
  messageButton: {
    backgroundColor: '#3B82F6',
    flex: 1,
  },
  contextButton: {
    backgroundColor: '#4F46E5',
    flex: 1,
  },
  instructions: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    fontStyle: 'italic',
    marginTop: 16,
  },
});