import * as AppleAuthentication from 'expo-apple-authentication';
import * as AuthSession from 'expo-auth-session';
import * as Facebook from 'expo-auth-session/providers/facebook';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Crypto from 'expo-crypto';
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
import { AppIcon } from '@/components/ui/app-icon';

type AuthMode = 'signin' | 'signup';
type OAuthProvider = 'google' | 'facebook' | 'apple' | 'azure';
type NativeProvider = 'Apple' | 'Google' | 'Facebook' | 'Microsoft';

WebBrowser.maybeCompleteAuthSession();

const NONCE_CHARSET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-._';

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

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signIn, signInWithGoogleIdToken, signInWithOAuthTokens, signInWithProvider, signUp } = useAuth();
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
  const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? 'ownly-web-popup-auth';
  const facebookAppId = process.env.EXPO_PUBLIC_FACEBOOK_APP_ID ?? '';
  const microsoftClientId = process.env.EXPO_PUBLIC_MICROSOFT_CLIENT_ID ?? '';
  const microsoftTenantId = process.env.EXPO_PUBLIC_MICROSOFT_TENANT_ID ?? 'common';
  const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
  const [isAppleAuthAvailable, setIsAppleAuthAvailable] = useState(!isIos);
  const nativeApplePendingRef = useRef(false);
  const nativeGooglePendingRef = useRef(false);
  const nativeFacebookPendingRef = useRef(false);
  const nativeMicrosoftPendingRef = useRef(false);
  const webPopupAttemptRef = useRef(0);
  const [nativeGoogleRequest, nativeGoogleResponse, promptNativeGoogleAsync] = Google.useIdTokenAuthRequest(
    {
      iosClientId: googleIosClientId || undefined,
      webClientId: googleWebClientId || undefined,
      selectAccount: true,
    },
    {
      scheme: 'ownly',
      path: 'oauthredirect',
    }
  );
  const [facebookRequest, facebookResponse, promptNativeFacebookAsync] = Facebook.useAuthRequest(
    {
      clientId: facebookAppId || 'missing-facebook-app-id',
      iosClientId: facebookAppId || undefined,
      androidClientId: facebookAppId || undefined,
      webClientId: facebookAppId || 'ownly-facebook-web-popup',
      scopes: ['public_profile', 'email'],
    },
    facebookAppId
      ? {
          native: `fb${facebookAppId}://authorize`,
        }
      : undefined
  );
  const microsoftIssuer = `https://login.microsoftonline.com/${microsoftTenantId || 'common'}/v2.0`;
  const microsoftDiscovery = AuthSession.useAutoDiscovery(microsoftIssuer);
  const microsoftRedirectUri = AuthSession.makeRedirectUri({
    native: 'ownly://oauthredirect',
    scheme: 'ownly',
    path: 'oauthredirect',
  });
  const [microsoftRequest, microsoftResponse, promptMicrosoftAsync] = AuthSession.useAuthRequest(
    {
      clientId: microsoftClientId || 'missing-microsoft-client-id',
      redirectUri: microsoftRedirectUri,
      responseType: AuthSession.ResponseType.Code,
      prompt: AuthSession.Prompt.SelectAccount,
      usePKCE: true,
      scopes: ['openid', 'profile', 'email'],
    },
    microsoftDiscovery
  );
  const canUseNativeApple = isIos && !isExpoGo && isAppleAuthAvailable;
  const canUseNativeGoogle = isIos && !isExpoGo && Boolean(googleIosClientId);
  const canUseNativeFacebook = Platform.OS !== 'web' && !isExpoGo && Boolean(facebookAppId);
  const canUseNativeMicrosoft = Platform.OS !== 'web' && !isExpoGo && Boolean(microsoftClientId);

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
      router.replace('/(tabs)/tasks');
    })();
  }, [nativeGoogleResponse, router, signInWithGoogleIdToken]);

  useEffect(() => {
    if (!nativeMicrosoftPendingRef.current || !microsoftResponse) {
      return;
    }

    if (microsoftResponse.type === 'cancel' || microsoftResponse.type === 'dismiss') {
      nativeMicrosoftPendingRef.current = false;
      setMessage('');
      setError('Microsoft sign-in was canceled.');
      setIsSubmitting(false);
      return;
    }

    if (microsoftResponse.type === 'error') {
      nativeMicrosoftPendingRef.current = false;
      setMessage('');
      setError(microsoftResponse.error?.message || 'Microsoft sign-in failed. Please try again.');
      setIsSubmitting(false);
      return;
    }

    if (microsoftResponse.type !== 'success') {
      return;
    }

    const authorizationCode = microsoftResponse.params.code;
    if (!authorizationCode) {
      nativeMicrosoftPendingRef.current = false;
      setMessage('');
      setError('Microsoft sign-in completed without an authorization code.');
      setIsSubmitting(false);
      return;
    }

    if (!microsoftDiscovery?.tokenEndpoint) {
      setMessage('Preparing Microsoft sign-in...');
      return;
    }

    if (!microsoftRequest?.codeVerifier) {
      nativeMicrosoftPendingRef.current = false;
      setMessage('');
      setError('Microsoft sign-in could not verify the auth code. Please try again.');
      setIsSubmitting(false);
      return;
    }

    setMessage('Finishing Microsoft sign-in...');

    void (async () => {
      try {
        const tokenResponse = await AuthSession.exchangeCodeAsync(
          {
            clientId: microsoftClientId,
            code: authorizationCode,
            redirectUri: microsoftRedirectUri,
            extraParams: {
              code_verifier: microsoftRequest.codeVerifier || '',
            },
          },
          {
            tokenEndpoint: microsoftDiscovery.tokenEndpoint,
          }
        );

        const result = await signInWithOAuthTokens('microsoft.com', tokenResponse.idToken, tokenResponse.accessToken);
        nativeMicrosoftPendingRef.current = false;

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
      } catch (error) {
        nativeMicrosoftPendingRef.current = false;
        setMessage('');
        setError(error instanceof Error ? error.message : 'Microsoft sign-in failed. Please try again.');
        setIsSubmitting(false);
      }
    })();
  }, [
    microsoftClientId,
    microsoftDiscovery,
    microsoftRedirectUri,
    microsoftRequest?.codeVerifier,
    microsoftResponse,
    router,
    signInWithOAuthTokens,
  ]);

  useEffect(() => {
    if (!nativeFacebookPendingRef.current || !facebookResponse) {
      return;
    }

    if (facebookResponse.type === 'cancel' || facebookResponse.type === 'dismiss') {
      nativeFacebookPendingRef.current = false;
      setMessage('');
      setError('Facebook sign-in was canceled.');
      setIsSubmitting(false);
      return;
    }

    if (facebookResponse.type === 'error') {
      nativeFacebookPendingRef.current = false;
      setMessage('');
      setError(facebookResponse.error?.message || 'Facebook sign-in failed. Please try again.');
      setIsSubmitting(false);
      return;
    }

    if (facebookResponse.type !== 'success') {
      return;
    }

    const accessToken =
      facebookResponse.params.access_token ?? facebookResponse.authentication?.accessToken;

    if (!accessToken) {
      nativeFacebookPendingRef.current = false;
      setMessage('');
      setError('Facebook sign-in completed without an access token. Check the Facebook app setup and try again.');
      setIsSubmitting(false);
      return;
    }

    nativeFacebookPendingRef.current = false;
    setMessage('Finishing Facebook sign-in...');

    void (async () => {
      const result = await signInWithOAuthTokens('facebook.com', undefined, accessToken);
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
  }, [facebookResponse, router, signInWithOAuthTokens]);

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
    setError('');
    setMessage('');

    const attemptId = webPopupAttemptRef.current + 1;
    webPopupAttemptRef.current = attemptId;

    if (!isWeb) {
      setIsSubmitting(true);
    }

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
      router.replace('/(tabs)/tasks');
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
      router.replace('/(tabs)/tasks');
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

  const submitNativeFacebook = async () => {
    setIsSubmitting(true);
    setError('');
    setMessage('');

    if (isExpoGo) {
      setError('Facebook sign-in on mobile needs a development build or production app. Expo Go cannot complete this native redirect.');
      setIsSubmitting(false);
      return;
    }

    if (!facebookAppId) {
      setError('Facebook sign-in is not configured on this device build yet.');
      setIsSubmitting(false);
      return;
    }

    if (!facebookRequest) {
      setMessage('Preparing Facebook sign-in...');
      setIsSubmitting(false);
      return;
    }

    nativeFacebookPendingRef.current = true;

    try {
      const response = await promptNativeFacebookAsync();
      if (response.type === 'cancel' || response.type === 'dismiss') {
        nativeFacebookPendingRef.current = false;
        setMessage('');
        setError('Facebook sign-in was canceled.');
        setIsSubmitting(false);
        return;
      }

      if (response.type === 'error') {
        nativeFacebookPendingRef.current = false;
        setMessage('');
        setError(mapNativeAuthError('Facebook', response.error));
        setIsSubmitting(false);
        return;
      }

      setMessage('Finishing Facebook sign-in...');
    } catch (error) {
      nativeFacebookPendingRef.current = false;
      setMessage('');
      setError(mapNativeAuthError('Facebook', error));
      setIsSubmitting(false);
    }
  };

  const submitNativeMicrosoft = async () => {
    setIsSubmitting(true);
    setError('');
    setMessage('');

    if (isExpoGo) {
      setError('Microsoft sign-in on mobile needs a development build or production app. Expo Go cannot complete this native redirect.');
      setIsSubmitting(false);
      return;
    }

    if (!microsoftClientId) {
      setError('Microsoft sign-in is not configured on this device build yet.');
      setIsSubmitting(false);
      return;
    }

    if (!microsoftDiscovery || !microsoftRequest) {
      setMessage('Preparing Microsoft sign-in...');
      setIsSubmitting(false);
      return;
    }

    nativeMicrosoftPendingRef.current = true;

    try {
      const response = await promptMicrosoftAsync();
      if (response.type === 'cancel' || response.type === 'dismiss') {
        nativeMicrosoftPendingRef.current = false;
        setMessage('');
        setError('Microsoft sign-in was canceled.');
        setIsSubmitting(false);
        return;
      }

      if (response.type === 'error') {
        nativeMicrosoftPendingRef.current = false;
        setMessage('');
        setError(mapNativeAuthError('Microsoft', response.error));
        setIsSubmitting(false);
        return;
      }

      setMessage('Finishing Microsoft sign-in...');
    } catch (error) {
      nativeMicrosoftPendingRef.current = false;
      setMessage('');
      setError(mapNativeAuthError('Microsoft', error));
      setIsSubmitting(false);
    }
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

            <Text style={[styles.headline, !isWeb ? styles.headlinePhone : null]}>Your AI workspace.</Text>
            <Text style={[styles.subheadline, !isWeb ? styles.subheadlinePhone : null]}>Log in to your account</Text>

            {isWeb ? (
              <>
                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>Log in with</Text>
                  <View style={styles.dividerLine} />
                </View>

                <View style={[styles.providerGroup, styles.providerGroupWeb]}>
                  <Pressable
                    disabled={false}
                    onPress={() => submitProvider('google')}
                    style={[styles.providerButton, styles.providerButtonWeb]}>
                    <AppIcon color="#4285F4" family="community" name="google" size={24} />
                    <Text style={[styles.providerText, styles.providerTextWeb]}>Google</Text>
                  </Pressable>

                  <Pressable
                    disabled={false}
                    onPress={() => submitProvider('facebook')}
                    style={[styles.providerButton, styles.providerButtonWeb]}>
                    <AppIcon color="#1877F2" family="community" name="facebook" size={24} />
                    <Text style={[styles.providerText, styles.providerTextWeb]}>Facebook</Text>
                  </Pressable>

                  <Pressable
                    disabled={false}
                    onPress={() => submitProvider('apple')}
                    style={[styles.providerButton, styles.providerButtonWeb]}>
                    <AppIcon color="#151515" family="community" name="apple" size={24} />
                    <Text style={[styles.providerText, styles.providerTextWeb]}>Apple</Text>
                  </Pressable>

                  <Pressable
                    disabled={false}
                    onPress={() => submitProvider('azure')}
                    style={[styles.providerButton, styles.providerButtonWeb]}>
                    <AppIcon color="#00A4EF" family="community" name="microsoft" size={24} />
                    <Text style={[styles.providerText, styles.providerTextWeb]}>Microsoft</Text>
                  </Pressable>

                  <Pressable
                    disabled={isSubmitting}
                    onPress={showPasskeyNotice}
                    style={[styles.providerButton, styles.providerButtonWeb]}>
                    <AppIcon color="#232323" family="community" name="key-chain-variant" size={22} />
                    <Text style={[styles.providerText, styles.providerTextWeb]}>Passkey</Text>
                  </Pressable>

                  <Pressable
                    disabled={isSubmitting}
                    onPress={showSSONotice}
                    style={[styles.providerButton, styles.providerButtonWeb]}>
                    <AppIcon color="#232323" family="community" name="office-building-outline" size={22} />
                    <Text style={[styles.providerText, styles.providerTextWeb]}>SSO</Text>
                  </Pressable>
                </View>

                {!webFirebaseAuthSupport.isSupported ? (
                  <Text style={styles.providerHintText}>{webFirebaseAuthSupport.message}</Text>
                ) : null}
              </>
            ) : isIos ? (
              <>
                {canUseNativeApple || canUseNativeGoogle || canUseNativeFacebook || canUseNativeMicrosoft ? (
                  <>
                    <View style={styles.dividerRow}>
                      <View style={styles.dividerLine} />
                      <Text style={styles.dividerText}>Continue with</Text>
                      <View style={styles.dividerLine} />
                    </View>

                    <View style={[styles.providerGroup, styles.providerGroupPhone]}>
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
                            <AppIcon color="#4285F4" family="community" name="google" size={26} />
                          </View>
                          <Text style={[styles.providerText, styles.providerTextPhone]}>Continue with Google</Text>
                        </Pressable>
                      ) : null}

                      {canUseNativeFacebook ? (
                        <Pressable
                          disabled={isSubmitting}
                          onPress={submitNativeFacebook}
                          style={[
                            styles.providerButton,
                            styles.providerButtonPhone,
                            isSubmitting ? styles.providerButtonDisabled : null,
                          ]}>
                          <View style={styles.providerIconWrap}>
                            <AppIcon color="#1877F2" family="community" name="facebook" size={26} />
                          </View>
                          <Text style={[styles.providerText, styles.providerTextPhone]}>Continue with Facebook</Text>
                        </Pressable>
                      ) : null}

                      {canUseNativeMicrosoft ? (
                        <Pressable
                          disabled={isSubmitting}
                          onPress={submitNativeMicrosoft}
                          style={[
                            styles.providerButton,
                            styles.providerButtonPhone,
                            isSubmitting ? styles.providerButtonDisabled : null,
                          ]}>
                          <View style={styles.providerIconWrap}>
                            <AppIcon color="#00A4EF" family="community" name="microsoft" size={26} />
                          </View>
                          <Text style={[styles.providerText, styles.providerTextPhone]}>Continue with Microsoft</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  </>
                ) : null}

                <Text style={styles.mobileSupportText}>
                  {isExpoGo
                    ? 'Social sign-in needs the Ownly development build or production app. Email/password still works in Expo Go.'
                    : canUseNativeApple || canUseNativeGoogle || canUseNativeFacebook || canUseNativeMicrosoft
                      ? 'Apple, Google, Facebook, and Microsoft sign-in are available here after provider setup. Email/password also works here.'
                      : 'Email/password works here now. Social sign-in will appear after native provider setup is added to this build.'}
                </Text>
              </>
            ) : Platform.OS === 'android' ? (
              <>
                {canUseNativeFacebook || canUseNativeMicrosoft ? (
                  <>
                    <View style={styles.dividerRow}>
                      <View style={styles.dividerLine} />
                      <Text style={styles.dividerText}>Continue with</Text>
                      <View style={styles.dividerLine} />
                    </View>

                    <View style={[styles.providerGroup, styles.providerGroupPhone]}>
                      {canUseNativeFacebook ? (
                        <Pressable
                          disabled={isSubmitting}
                          onPress={submitNativeFacebook}
                          style={[
                            styles.providerButton,
                            styles.providerButtonPhone,
                            isSubmitting ? styles.providerButtonDisabled : null,
                          ]}>
                          <View style={styles.providerIconWrap}>
                            <AppIcon color="#1877F2" family="community" name="facebook" size={26} />
                          </View>
                          <Text style={[styles.providerText, styles.providerTextPhone]}>Continue with Facebook</Text>
                        </Pressable>
                      ) : null}

                      {canUseNativeMicrosoft ? (
                        <Pressable
                          disabled={isSubmitting}
                          onPress={submitNativeMicrosoft}
                          style={[
                            styles.providerButton,
                            styles.providerButtonPhone,
                            isSubmitting ? styles.providerButtonDisabled : null,
                          ]}>
                          <View style={styles.providerIconWrap}>
                            <AppIcon color="#00A4EF" family="community" name="microsoft" size={26} />
                          </View>
                          <Text style={[styles.providerText, styles.providerTextPhone]}>Continue with Microsoft</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  </>
                ) : null}

                <Text style={styles.mobileSupportText}>
                  {isExpoGo
                    ? 'Social sign-in needs the Ownly development build or production app. Email/password still works in Expo Go.'
                    : canUseNativeFacebook || canUseNativeMicrosoft
                      ? 'Facebook and Microsoft sign-in are available on Android after provider setup. Apple sign-in is iOS only. Email/password also works here.'
                      : 'Email/password works here now. Facebook and Microsoft sign-in will appear after the Android build includes their provider setup. Apple sign-in is iOS only.'}
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
    maxWidth: 540,
    paddingHorizontal: 8,
    paddingVertical: 8,
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
  headlinePhone: {
    fontSize: 22,
    lineHeight: 28,
    marginTop: 2,
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
    marginTop: -4,
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
    fontSize: 12,
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
