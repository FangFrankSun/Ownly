import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';

export default function OAuthRedirectScreen() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/login');
  }, [router]);

  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Platform.OS === 'web' ? '#F7F7F7' : '#FFFFFF',
      }}>
      <ActivityIndicator color="#3655D0" size="large" />
    </View>
  );
}
