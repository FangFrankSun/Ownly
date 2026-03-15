import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Google from 'expo-auth-session/providers/google';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/components/app/auth-context';
import { getWebFirebaseAuthSupport } from '@/components/app/firebase-client';
import { useAppTheme } from '@/components/app/theme-context';

type AuthMode = 'signin' | 'signup';
type OAuthProvider = 'google' | 'apple' | 'azure';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signIn, signInWithGoogleIdToken, signInWithProvider, signUp } = useAuth();
  const { theme } = useAppTheme();

  const [mode, setMode] = useState<AuthMode>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isWeb = Platform.OS === 'web';
  const isIos = Platform.OS === 'ios';
  const webFirebaseAuthSupport = getWebFirebaseAuthSupport();
  const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '';
  const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
  const nativeGooglePendingRef = useRef(false);
  const [nativeGoogleRequest, nativeGoogleResponse, promptNativeGoogleAsync] = Google.useIdTokenAuthRequest(
    {
      iosClientId: googleIosClientId || undefined,
      selectAccount: true,
    },
    {
      scheme: 'ownly',
      path: 'oauthredirect',
    }
  );

  useEffect(() => {
    if (!nativeGooglePendingRef.current || !nativeGoogleResponse) {
      return;
    }

    if (nativeGoogleResponse.type === 'cancel' || nativeGoogleResponse.type === 'dismiss') {
      nativeGooglePendingRef.current = false;
      setMessage('');
      setError('Google sign-in was canceled.');
      setIsSubmitting(false);
      return;
    }

    if (nativeGoogleResponse.type === 'error') {
      nativeGooglePendingRef.current = false;
      setMessage('');
      setError(nativeGoogleResponse.error?.message || 'Google sign-in failed. Please try again.');
      setIsSubmitting(false);
      return;
    }

    if (nativeGoogleResponse.type !== 'success') {
      return;
    }

    const idToken = nativeGoogleResponse.params.id_token ?? nativeGoogleResponse.authentication?.idToken;
    const accessToken =
      nativeGoogleResponse.params.access_token ?? nativeGoogleResponse.authentication?.accessToken;

    if (!idToken) {
      if (nativeGoogleResponse.params.code) {
        setMessage('Finishing Google sign-in...');
        return;
      }

      nativeGooglePendingRef.current = false;
      setMessage('');
      setError('Google sign-in completed without an ID token. Check the iOS Google OAuth client configuration.');
      setIsSubmitting(false);
      return;
    }

    nativeGooglePendingRef.current = false;
    setMessage('Finishing Google sign-in...');

    void (async () => {
      const result = await signInWithGoogleIdToken(idToken, accessToken);
      if (!result.ok) {
        setMessage('');
        setError(result.error);
        setIsSubmitting(false);
        return;
      }

      setMessage('');
      setError('');
      setIsSubmitting(false);
      router.replace('/(tabs)/tasks');
    })();
  }, [nativeGoogleResponse, router, signInWithGoogleIdToken]);

  const submitEmailAuth = async () => {
    setIsSubmitting(true);
    setError('');
    setMessage('');

    const result = mode === 'signin' ? await signIn(email, password) : await signUp(name, email, password);
    if (!result.ok) {
      setError(result.error);
      setIsSubmitting(false);
      return;
    }

    if (result.message) {
      setMessage(result.message);
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
    router.replace('/(tabs)/tasks');
  };

  const submitProvider = async (provider: OAuthProvider) => {
    setIsSubmitting(true);
    setError('');
    setMessage('');

    const result = await signInWithProvider(provider);
    if (!result.ok) {
      setError(result.error);
      setIsSubmitting(false);
      return;
    }

    if (result.message) {
      setMessage(result.message);
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
    router.replace('/(tabs)/tasks');
  };

  const submitNativeGoogle = async () => {
    setIsSubmitting(true);
    setError('');
    setMessage('');

    if (!isIos) {
      setError('Native Google sign-in is currently configured for iOS.');
      setIsSubmitting(false);
      return;
    }

    if (isExpoGo) {
      setError('Google sign-in on iOS needs a development build or production app. Expo Go cannot complete this native Google redirect.');
      setIsSubmitting(false);
      return;
    }

    if (!googleIosClientId) {
      setError('Google sign-in is not configured for iOS yet.');
      setIsSubmitting(false);
      return;
    }

    if (!nativeGoogleRequest) {
      setMessage('Preparing Google sign-in...');
      setIsSubmitting(false);
      return;
    }

    nativeGooglePendingRef.current = true;

    const response = await promptNativeGoogleAsync();
    if (response.type === 'cancel' || response.type === 'dismiss') {
      nativeGooglePendingRef.current = false;
      setError('Google sign-in was canceled.');
      setIsSubmitting(false);
      return;
    }

    if (response.type === 'error') {
      nativeGooglePendingRef.current = false;
      const errorMessage =
        response.error?.message || 'Google sign-in failed. Please try again.';
      setError(errorMessage);
      setIsSubmitting(false);
      return;
    }

    setMessage('Finishing Google sign-in...');
  };

  const showPasskeyNotice = () => {
    setError('');
    setMessage('Passkey login will be available after provider setup.');
  };

  const showSSONotice = () => {
    setError('');
    setMessage('SSO login will be available after enterprise provider setup.');
  };

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setError('');
    setMessage('');
  };

  const shouldShowEmailForm = true;

  return (
    <View style={[styles.page, { backgroundColor: '#F7F7F7' }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 8 : 0}
        style={styles.keyboardAvoiding}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: Math.max(insets.top + 24, 36),
              paddingBottom: Math.max(insets.bottom + 24, 28),
            },
          ]}
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          keyboardShouldPersistTaps="handled"
          onScrollBeginDrag={Keyboard.dismiss}
          showsVerticalScrollIndicator={false}>
          <View style={[styles.panel, Platform.OS === 'web' ? styles.panelWeb : styles.panelPhone]}>
            <View style={styles.brandMark}>
              <Text style={styles.brandMarkText}>Me</Text>
            </View>

            <Text style={styles.headline}>Your AI workspace.</Text>
            <Text style={styles.subheadline}>Log in to your account</Text>

            {isWeb ? (
              <>
                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>Log in with</Text>
                  <View style={styles.dividerLine} />
                </View>

                <View style={[styles.providerGroup, styles.providerGroupWeb]}>
                  <Pressable
                    disabled={isSubmitting}
                    onPress={() => submitProvider('google')}
                    style={[styles.providerButton, styles.providerButtonWeb]}>
                    <MaterialCommunityIcons color="#4285F4" name="google" size={24} />
                    <Text style={[styles.providerText, styles.providerTextWeb]}>Google</Text>
                  </Pressable>

                  <Pressable
                    disabled={isSubmitting}
                    onPress={() => submitProvider('apple')}
                    style={[styles.providerButton, styles.providerButtonWeb]}>
                    <MaterialCommunityIcons color="#151515" name="apple" size={24} />
                    <Text style={[styles.providerText, styles.providerTextWeb]}>Apple</Text>
                  </Pressable>

                  <Pressable
                    disabled={isSubmitting}
                    onPress={() => submitProvider('azure')}
                    style={[styles.providerButton, styles.providerButtonWeb]}>
                    <MaterialCommunityIcons color="#00A4EF" name="microsoft" size={24} />
                    <Text style={[styles.providerText, styles.providerTextWeb]}>Microsoft</Text>
                  </Pressable>

                  <Pressable
                    disabled={isSubmitting}
                    onPress={showPasskeyNotice}
                    style={[styles.providerButton, styles.providerButtonWeb]}>
                    <MaterialCommunityIcons color="#232323" name="key-chain-variant" size={22} />
                    <Text style={[styles.providerText, styles.providerTextWeb]}>Passkey</Text>
                  </Pressable>

                  <Pressable
                    disabled={isSubmitting}
                    onPress={showSSONotice}
                    style={[styles.providerButton, styles.providerButtonWeb]}>
                    <MaterialCommunityIcons color="#232323" name="office-building-outline" size={22} />
                    <Text style={[styles.providerText, styles.providerTextWeb]}>SSO</Text>
                  </Pressable>
                </View>

                {!webFirebaseAuthSupport.isSupported ? (
                  <Text style={styles.providerHintText}>{webFirebaseAuthSupport.message}</Text>
                ) : null}
              </>
            ) : isIos ? (
              <>
                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>Continue with</Text>
                  <View style={styles.dividerLine} />
                </View>

                <View style={[styles.providerGroup, styles.providerGroupPhone]}>
                  <Pressable
                    disabled={isSubmitting}
                    onPress={submitNativeGoogle}
                    style={[styles.providerButton, styles.providerButtonPhone]}>
                    <MaterialCommunityIcons color="#4285F4" name="google" size={26} />
                    <Text style={[styles.providerText, styles.providerTextPhone]}>Continue with Google</Text>
                  </Pressable>
                </View>

                <Text style={styles.mobileSupportText}>
                  Google sign-in is available on iOS development builds and the production app. Email/password also works here.
                </Text>
              </>
            ) : (
              <Text style={styles.mobileSupportText}>Mobile currently supports email/password sign-in.</Text>
            )}

            {shouldShowEmailForm ? (
              <View style={styles.emailBlock}>
                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>or continue with email</Text>
                  <View style={styles.dividerLine} />
                </View>

                <View style={styles.modeRow}>
                  <Pressable
                    onPress={() => switchMode('signin')}
                    style={[
                      styles.modeButton,
                      mode === 'signin' && styles.modeButtonActive,
                      mode === 'signin' && { backgroundColor: theme.secondary },
                    ]}>
                    <Text style={[styles.modeText, mode === 'signin' && styles.modeTextActive]}>Sign In</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => switchMode('signup')}
                    style={[
                      styles.modeButton,
                      mode === 'signup' && styles.modeButtonActive,
                      mode === 'signup' && { backgroundColor: theme.secondary },
                    ]}>
                    <Text style={[styles.modeText, mode === 'signup' && styles.modeTextActive]}>Sign Up</Text>
                  </Pressable>
                </View>

                {mode === 'signup' ? (
                  <TextInput
                    autoCapitalize="words"
                    onChangeText={setName}
                    placeholder="Name"
                    placeholderTextColor="#8A93A9"
                    returnKeyType="next"
                    style={styles.input}
                    value={name}
                  />
                ) : null}
                <TextInput
                  autoCapitalize="none"
                  keyboardType="email-address"
                  onChangeText={setEmail}
                  placeholder="Enter your email address..."
                  placeholderTextColor="#8A93A9"
                  returnKeyType="next"
                  style={styles.input}
                  value={email}
                />
                <TextInput
                  onChangeText={setPassword}
                  onSubmitEditing={submitEmailAuth}
                  placeholder="Password"
                  placeholderTextColor="#8A93A9"
                  returnKeyType="done"
                  secureTextEntry
                  style={styles.input}
                  value={password}
                />

                <Pressable
                  disabled={isSubmitting}
                  onPress={submitEmailAuth}
                  style={[styles.primaryButton, { backgroundColor: theme.primary }]}>
                  <Text style={styles.primaryButtonText}>
                    {isSubmitting ? 'Please wait...' : mode === 'signin' ? 'Continue' : 'Create Account'}
                  </Text>
                </Pressable>
              </View>
            ) : null}

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            {message ? <Text style={styles.messageText}>{message}</Text> : null}

            <Text style={[styles.termsCopy, Platform.OS === 'web' && styles.termsCopyWeb]}>
              By continuing, you acknowledge that you understand and agree to the Terms & Conditions and Privacy
              Policy.
            </Text>

            {Platform.OS !== 'web' ? (
              <View style={styles.mobileFooterLinks}>
                <Text style={styles.footerLink}>Privacy & terms</Text>
                <Text style={styles.footerLink}>Need help?</Text>
              </View>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },
  keyboardAvoiding: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  panel: {
    width: '100%',
    alignSelf: 'center',
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderColor: 'transparent',
    borderRadius: 0,
    paddingHorizontal: 18,
    paddingVertical: 18,
    gap: 12,
  },
  panelWeb: {
    maxWidth: 360,
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  panelPhone: {
    maxWidth: 780,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  brandMark: {
    width: 42,
    height: 42,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#212121',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandMarkText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111111',
  },
  headline: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    color: '#212121',
    marginTop: 6,
  },
  subheadline: {
    fontSize: 18,
    lineHeight: 24,
    color: '#979797',
    fontWeight: '600',
    marginTop: -2,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E5E5',
  },
  dividerText: {
    fontSize: 13,
    color: '#9B9B9B',
    fontWeight: '500',
  },
  providerGroup: {
    gap: 10,
  },
  providerGroupWeb: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  providerGroupPhone: {
    flexDirection: 'column',
  },
  providerButton: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DFDFDF',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  providerButtonWeb: {
    width: 102,
    minHeight: 72,
    paddingHorizontal: 8,
    paddingVertical: 10,
    gap: 6,
  },
  providerButtonPhone: {
    flexDirection: 'row',
    height: 62,
    paddingHorizontal: 18,
    gap: 14,
    justifyContent: 'flex-start',
  },
  providerText: {
    color: '#2A2A2A',
    fontWeight: '500',
  },
  providerTextWeb: {
    fontSize: 12,
  },
  providerTextPhone: {
    fontSize: 15,
  },
  emailBlock: {
    gap: 10,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  modeButton: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: '#F1F3F7',
    paddingVertical: 8,
    alignItems: 'center',
  },
  modeButtonActive: {
    backgroundColor: '#2F52D0',
  },
  modeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4A5879',
  },
  modeTextActive: {
    color: '#FFFFFF',
  },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D6DEEE',
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 15,
    color: '#1A2133',
    backgroundColor: '#FFFFFF',
  },
  primaryButton: {
    marginTop: 2,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  errorText: {
    fontSize: 13,
    color: '#D63652',
    fontWeight: '600',
    lineHeight: 18,
  },
  messageText: {
    fontSize: 13,
    color: '#1C7B4F',
    fontWeight: '600',
    lineHeight: 18,
  },
  providerHintText: {
    fontSize: 12,
    lineHeight: 17,
    color: '#6B7280',
  },
  mobileSupportText: {
    fontSize: 13,
    lineHeight: 19,
    color: '#6B7280',
  },
  termsCopy: {
    fontSize: 12,
    lineHeight: 18,
    color: '#7B7B7B',
    marginTop: 4,
  },
  termsCopyWeb: {
    textAlign: 'center',
  },
  mobileFooterLinks: {
    flexDirection: 'row',
    gap: 26,
    marginTop: 6,
  },
  footerLink: {
    fontSize: 13,
    color: '#777777',
    textDecorationLine: 'underline',
  },
});
