import * as AppleAuthentication from 'expo-apple-authentication';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Crypto from 'expo-crypto';
import * as Google from 'expo-auth-session/providers/google';
import { useRouter } from 'expo-router';
import { Image as ExpoImage } from 'expo-image';
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
import { useLanguage } from '@/components/app/language-context';
import { useAppTheme } from '@/components/app/theme-context';
import { AppIcon } from '@/components/ui/app-icon';

type AuthMode = 'signin' | 'signup';
type OAuthProvider = 'google' | 'apple';
type NativeProvider = 'Apple' | 'Google' | 'Facebook' | 'Microsoft';

WebBrowser.maybeCompleteAuthSession();

const NONCE_CHARSET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-._';
const GOOGLE_G_SVG = encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/><path d="M1 1h22v22H1z" fill="none"/></svg>'
);

function createNonce(length = 32) {
  return Array.from(Crypto.getRandomBytes(length), (byte) => NONCE_CHARSET[byte % NONCE_CHARSET.length]).join('');
}

async function hashNonce(rawNonce: string) {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);
}

function formatAppleDisplayName(credential: AppleAuthentication.AppleAuthenticationCredential) {
  const parts = [
    credential.fullName?.givenName,
    credential.fullName?.middleName,
    credential.fullName?.familyName,
  ]
    .map((part) => part?.trim())
    .filter(Boolean);

  return parts.length > 0 ? parts.join(' ') : undefined;
}

function readErrorCode(error: unknown) {
  return typeof error === 'object' && error && 'code' in error ? String((error as { code: string }).code) : '';
}

function readErrorMessage(error: unknown) {
  return typeof error === 'object' && error && 'message' in error
    ? String((error as { message: string }).message)
    : '';
}

function mapNativeAuthError(provider: NativeProvider, error: unknown) {
  const code = readErrorCode(error);
  const message = readErrorMessage(error);
  const normalizedMessage = message.toLowerCase();

  if (code === 'ERR_REQUEST_CANCELED') {
    return `${provider} sign-in was canceled.`;
  }

  if (
    normalizedMessage.includes('authorization attempt failed for an unknown reason') ||
    normalizedMessage.includes('unknown reason')
  ) {
    if (provider === 'Apple') {
      return 'Apple sign-in could not start. Make sure the iPhone or simulator is signed into an Apple ID and the Ownly app was rebuilt after enabling Sign in with Apple.';
    }

    if (provider === 'Microsoft') {
      return 'Microsoft sign-in could not complete. Verify the Microsoft app has mobile redirect URI ownly://oauthredirect and Allow public client flows is enabled.';
    }

    if (provider === 'Facebook') {
      return 'Facebook sign-in could not complete. Verify the Facebook app ID is present in the build and the fb<App ID> redirect scheme is registered.';
    }

    return 'Google sign-in could not complete. Rebuild the iOS app after confirming the Google iOS client ID is present in the build environment.';
  }

  if (normalizedMessage.includes('redirect_uri') || normalizedMessage.includes('redirect uri')) {
    return `${provider} sign-in redirect is not configured correctly for this device build yet.`;
  }

  return message || `${provider} sign-in failed. Please try again.`;
}

function GoogleLogo({ size = 24 }: { size?: number }) {
  return (
    <ExpoImage
      contentFit="contain"
      source={{ uri: `data:image/svg+xml;utf8,${GOOGLE_G_SVG}` }}
      style={{ width: size, height: size }}
    />
  );
}

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isAuthenticated, signIn, signInWithGoogleIdToken, signInWithOAuthTokens, signInWithProvider, signUp } =
    useAuth();
  const { t } = useLanguage();
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
  const isAndroid = Platform.OS === 'android';
  const webFirebaseAuthSupport = getWebFirebaseAuthSupport();
  const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '';
  const googleAndroidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? '';
  const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? 'ownly-web-popup-auth';
  const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
  const [isAppleAuthAvailable, setIsAppleAuthAvailable] = useState(!isIos);
  const nativeApplePendingRef = useRef(false);
  const nativeGooglePendingRef = useRef(false);
  const webPopupAttemptRef = useRef(0);
  const [nativeGoogleRequest, nativeGoogleResponse, promptNativeGoogleAsync] = Google.useIdTokenAuthRequest(
    {
      iosClientId: googleIosClientId || undefined,
      androidClientId: googleAndroidClientId || undefined,
      webClientId: googleWebClientId || undefined,
      selectAccount: true,
    },
    {
      scheme: 'ownly',
      path: 'login',
    }
  );
  const canUseNativeApple = isIos && !isExpoGo && isAppleAuthAvailable;
  const canUseNativeGoogle =
    !isExpoGo && ((isIos && Boolean(googleIosClientId)) || (isAndroid && Boolean(googleAndroidClientId)));

  useEffect(() => {
    if (!isWeb || !isSubmitting || !isAuthenticated) {
      return;
    }

    setIsSubmitting(false);
    setError('');
    setMessage('');
    router.replace('/dashboard');
  }, [isAuthenticated, isSubmitting, isWeb, router]);

  useEffect(() => {
    if (!isWeb || !isAuthenticated) {
      return;
    }

    setIsSubmitting(false);
    setError('');
    setMessage('');
    router.replace('/dashboard');
  }, [isAuthenticated, isWeb, router]);

  useEffect(() => {
    if (!isIos) {
      setIsAppleAuthAvailable(false);
      return;
    }

    let isMounted = true;

    void (async () => {
      const isAvailable = await AppleAuthentication.isAvailableAsync();
      if (isMounted) {
        setIsAppleAuthAvailable(isAvailable);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [isIos]);

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
      router.replace('/dashboard');
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

    setMessage('');
    setError('');
    setIsSubmitting(false);
    router.replace('/dashboard');
  };

  const submitProvider = async (provider: OAuthProvider) => {
    setError('');
    setMessage('');

    const attemptId = webPopupAttemptRef.current + 1;
    webPopupAttemptRef.current = attemptId;
    setIsSubmitting(true);

    try {
      const result = await signInWithProvider(provider);
      if (webPopupAttemptRef.current !== attemptId) {
        return;
      }

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
      setMessage('');
      setError('');
      router.replace('/dashboard');
    } catch (error) {
      if (webPopupAttemptRef.current !== attemptId) {
        return;
      }

      setMessage('');
      setError(error instanceof Error ? error.message : 'Sign-in failed. Please try again.');
      setIsSubmitting(false);
    }
  };

  const submitNativeApple = async () => {
    setIsSubmitting(true);
    setError('');
    setMessage('');

    if (!isIos) {
      setError('Apple sign-in is only available on iOS.');
      setIsSubmitting(false);
      return;
    }

    if (isExpoGo) {
      setError('Apple sign-in on iOS needs a development build or production app so the Ownly bundle ID can carry the Apple capability.');
      setIsSubmitting(false);
      return;
    }

    if (!isAppleAuthAvailable) {
      setError('Apple sign-in is not available on this iPhone or simulator yet.');
      setIsSubmitting(false);
      return;
    }

    nativeApplePendingRef.current = true;
    setMessage('Opening Apple sign-in...');

    try {
      const rawNonce = createNonce();
      const hashedNonce = await hashNonce(rawNonce);
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });

      const identityToken = credential.identityToken ?? undefined;
      const displayName = formatAppleDisplayName(credential);
      const result = await signInWithOAuthTokens('apple.com', identityToken, undefined, rawNonce, displayName);
      nativeApplePendingRef.current = false;

      if (!result.ok) {
        setMessage('');
        setError(result.error);
        setIsSubmitting(false);
        return;
      }

      setMessage('');
      setError('');
      setIsSubmitting(false);
      router.replace('/dashboard');
    } catch (error) {
      nativeApplePendingRef.current = false;
      setMessage('');
      setError(mapNativeAuthError('Apple', error));
      setIsSubmitting(false);
    }
  };

  const submitNativeGoogle = async () => {
    setIsSubmitting(true);
    setError('');
    setMessage('');

    if (!isIos && !isAndroid) {
      setError('Native Google sign-in is only available on iOS and Android.');
      setIsSubmitting(false);
      return;
    }

    if (isExpoGo) {
      setError('Google sign-in needs a development build or production app. Expo Go cannot complete this native Google redirect.');
      setIsSubmitting(false);
      return;
    }

    if ((isIos && !googleIosClientId) || (isAndroid && !googleAndroidClientId)) {
      setError(isIos ? 'Google sign-in is not configured for iOS yet.' : 'Google sign-in is not configured for Android yet.');
      setIsSubmitting(false);
      return;
    }

    if (!nativeGoogleRequest) {
      setMessage('Preparing Google sign-in...');
      setIsSubmitting(false);
      return;
    }

    nativeGooglePendingRef.current = true;

    try {
      const response = await promptNativeGoogleAsync();
      if (response.type === 'cancel' || response.type === 'dismiss') {
        nativeGooglePendingRef.current = false;
        setMessage('');
        setError('Google sign-in was canceled.');
        setIsSubmitting(false);
        return;
      }

      if (response.type === 'error') {
        nativeGooglePendingRef.current = false;
        setMessage('');
        setError(mapNativeAuthError('Google', response.error));
        setIsSubmitting(false);
        return;
      }

      setMessage('Finishing Google sign-in...');
    } catch (error) {
      nativeGooglePendingRef.current = false;
      setMessage('');
      setError(mapNativeAuthError('Google', error));
      setIsSubmitting(false);
    }
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
              <Text style={styles.brandMarkText}>Ownly</Text>
            </View>

            <Text style={[styles.headline, !isWeb ? styles.headlinePhone : null]}>{t('login.title')}</Text>
            <Text style={[styles.subheadline, !isWeb ? styles.subheadlinePhone : null]}>{t('login.subtitle')}</Text>

            {isWeb ? (
              <>
                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>{t('login.with')}</Text>
                  <View style={styles.dividerLine} />
                </View>

                <View style={[styles.providerGroup, styles.providerGroupWeb]}>
                  <Pressable
                    disabled={isSubmitting}
                    onPress={() => submitProvider('google')}
                    style={[styles.providerButton, styles.providerButtonWeb, isSubmitting ? styles.providerButtonDisabled : null]}>
                    <GoogleLogo size={24} />
                    <Text style={[styles.providerText, styles.providerTextWeb]}>Continue with Google</Text>
                  </Pressable>

                  <Pressable
                    disabled={isSubmitting}
                    onPress={() => submitProvider('apple')}
                    style={[styles.providerButton, styles.providerButtonWeb, isSubmitting ? styles.providerButtonDisabled : null]}>
                    <AppIcon color="#151515" family="community" name="apple" size={24} />
                    <Text style={[styles.providerText, styles.providerTextWeb]}>Continue with Apple</Text>
                  </Pressable>
                </View>

                {!webFirebaseAuthSupport.isSupported ? (
                  <Text style={styles.providerHintText}>{webFirebaseAuthSupport.message}</Text>
                ) : null}
              </>
            ) : Platform.OS !== 'web' ? (
              <>
                {canUseNativeApple || canUseNativeGoogle ? (
                  <>
                    <View style={styles.dividerRow}>
                      <View style={styles.dividerLine} />
                      <Text style={styles.dividerText}>{t('login.with')}</Text>
                      <View style={styles.dividerLine} />
                    </View>

                    <View style={[styles.providerGroup, styles.providerGroupPhone]}>
                      {canUseNativeGoogle ? (
                        <Pressable
                          disabled={isSubmitting}
                          onPress={submitNativeGoogle}
                          style={[
                            styles.providerButton,
                            styles.providerButtonPhone,
                            isSubmitting ? styles.providerButtonDisabled : null,
                          ]}>
                          <View style={styles.providerIconWrap}>
                            <GoogleLogo size={24} />
                          </View>
                          <Text style={[styles.providerText, styles.providerTextPhone]}>Continue with Google</Text>
                        </Pressable>
                      ) : null}

                      {canUseNativeApple ? (
                        <Pressable
                          disabled={isSubmitting}
                          onPress={submitNativeApple}
                          style={[
                            styles.providerButton,
                            styles.providerButtonPhone,
                            isSubmitting ? styles.providerButtonDisabled : null,
                          ]}>
                          <View style={styles.providerIconWrap}>
                            <AppIcon color="#151515" family="community" name="apple" size={26} />
                          </View>
                          <Text style={[styles.providerText, styles.providerTextPhone]}>Continue with Apple</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  </>
                ) : null}

              </>
            ) : null}

            {shouldShowEmailForm ? (
              <View style={styles.emailBlock}>
                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>{t('login.emailSection')}</Text>
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
                    <Text style={[styles.modeText, mode === 'signin' && styles.modeTextActive]}>{t('login.signIn')}</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => switchMode('signup')}
                    style={[
                      styles.modeButton,
                      mode === 'signup' && styles.modeButtonActive,
                      mode === 'signup' && { backgroundColor: theme.secondary },
                    ]}>
                    <Text style={[styles.modeText, mode === 'signup' && styles.modeTextActive]}>{t('login.signUp')}</Text>
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
                  placeholder={t('login.email')}
                  placeholderTextColor="#8A93A9"
                  returnKeyType="next"
                  style={styles.input}
                  value={email}
                />
                <TextInput
                  onChangeText={setPassword}
                  onSubmitEditing={submitEmailAuth}
                  placeholder={t('login.password')}
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
                    {isSubmitting ? 'Please wait...' : mode === 'signin' ? t('login.continue') : t('login.signUp')}
                  </Text>
                </Pressable>
              </View>
            ) : null}

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            {message ? <Text style={styles.messageText}>{message}</Text> : null}

            <Text style={[styles.termsCopy, Platform.OS === 'web' && styles.termsCopyWeb]}>
              {t('login.terms')}
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
    maxWidth: 520,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    paddingHorizontal: 28,
    paddingVertical: 28,
    shadowColor: '#000000',
    shadowOpacity: 0.06,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  panelPhone: {
    maxWidth: 540,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  brandMark: {
    width: 74,
    height: 74,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#212121',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
  },
  brandMarkText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111111',
    letterSpacing: -0.15,
  },
  headline: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    color: '#212121',
    marginTop: 6,
  },
  headlinePhone: {
    fontSize: 22,
    lineHeight: 28,
    marginTop: 0,
  },
  subheadline: {
    fontSize: 18,
    lineHeight: 24,
    color: '#979797',
    fontWeight: '600',
    marginTop: -2,
  },
  subheadlinePhone: {
    fontSize: 15,
    lineHeight: 20,
    marginTop: -6,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
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
    width: '100%',
    flexDirection: 'column',
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
    width: '100%',
    minHeight: 56,
    paddingHorizontal: 18,
    paddingVertical: 12,
    flexDirection: 'row',
    gap: 12,
  },
  providerButtonPhone: {
    flexDirection: 'row',
    height: 58,
    paddingHorizontal: 18,
    gap: 12,
    justifyContent: 'flex-start',
  },
  providerButtonDisabled: {
    opacity: 0.7,
  },
  providerIconWrap: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  providerText: {
    color: '#2A2A2A',
    fontWeight: '500',
  },
  providerTextWeb: {
    fontSize: 15,
    fontWeight: '500',
  },
  providerTextPhone: {
    fontSize: 14,
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
  termsCopy: {
    fontSize: 12,
    lineHeight: 18,
    color: '#7B7B7B',
    marginTop: 4,
  },
  termsCopyWeb: {
    textAlign: 'left',
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
