import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useAuth } from '@/components/app/auth-context';
import { useAppTheme } from '@/components/app/theme-context';

type AuthMode = 'signin' | 'signup';

export default function LoginScreen() {
  const router = useRouter();
  const { signIn, signUp } = useAuth();
  const { theme } = useAppTheme();

  const [mode, setMode] = useState<AuthMode>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async () => {
    setIsSubmitting(true);
    setError('');
    setMessage('');

    const result =
      mode === 'signin' ? await signIn(email, password) : await signUp(name, email, password);

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

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setError('');
    setMessage('');
  };

  return (
    <View style={[styles.page, { backgroundColor: theme.pageBackground }]}>
      <View style={[styles.orb, styles.orbA, { backgroundColor: theme.orbA }]} />
      <View style={[styles.orb, styles.orbB, { backgroundColor: theme.orbB }]} />

      <View style={styles.card}>
        <Text style={styles.title}>{mode === 'signin' ? 'Sign In' : 'Create Account'}</Text>
        <Text style={styles.subtitle}>
          {mode === 'signin'
            ? 'Log in to access your personal app workspace.'
            : 'Create an account to store your own tasks and events.'}
        </Text>

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
            value={name}
            onChangeText={setName}
            placeholder="Name"
            placeholderTextColor="#8A93A9"
            style={styles.input}
          />
        ) : null}
        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="Email"
          placeholderTextColor="#8A93A9"
          style={styles.input}
        />
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="Password"
          placeholderTextColor="#8A93A9"
          style={styles.input}
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {message ? <Text style={styles.messageText}>{message}</Text> : null}

        <Pressable
          onPress={submit}
          style={[styles.primaryButton, { backgroundColor: theme.primary }]}
          disabled={isSubmitting}>
          <Text style={styles.primaryButtonText}>
            {isSubmitting ? 'Please wait...' : mode === 'signin' ? 'Log In' : 'Create Account'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  orb: {
    position: 'absolute',
    borderRadius: 999,
  },
  orbA: {
    width: 260,
    height: 260,
    top: -120,
    right: -90,
  },
  orbB: {
    width: 240,
    height: 240,
    bottom: -110,
    left: -80,
  },
  card: {
    borderRadius: 24,
    padding: 20,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.75)',
    gap: 12,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: '#182031',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#5B6274',
    lineHeight: 20,
    marginBottom: 4,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  modeButton: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: '#EDF2FF',
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
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D6DEEE',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#1A2133',
    backgroundColor: '#FFFFFF',
  },
  errorText: {
    fontSize: 13,
    color: '#D63652',
    marginTop: -2,
  },
  messageText: {
    fontSize: 13,
    color: '#1C7B4F',
    marginTop: -2,
  },
  primaryButton: {
    marginTop: 4,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#2F52D0',
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
