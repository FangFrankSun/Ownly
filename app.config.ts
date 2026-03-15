import type { ExpoConfig } from 'expo/config';

const { expo } = require('./app.json') as { expo: ExpoConfig };

export default (): ExpoConfig => {
  const facebookAppId = process.env.EXPO_PUBLIC_FACEBOOK_APP_ID?.trim();
  const configuredSchemes = Array.isArray(expo.scheme)
    ? expo.scheme.filter(Boolean)
    : expo.scheme
      ? [expo.scheme]
      : [];

  return {
    ...expo,
    scheme: facebookAppId
      ? Array.from(new Set([...configuredSchemes, `fb${facebookAppId}`]))
      : configuredSchemes,
  };
};
