import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function PrivacyScreen() {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: Math.max(insets.top + 28, 40),
          paddingBottom: Math.max(insets.bottom + 28, 40),
        },
      ]}
      style={styles.page}>
      <View style={styles.card}>
        <Text style={styles.eyebrow}>Ownly</Text>
        <Text style={styles.title}>Privacy Policy</Text>
        <Text style={styles.updated}>Last updated: March 15, 2026</Text>

        <Text style={styles.sectionTitle}>Overview</Text>
        <Text style={styles.body}>
          Ownly helps users manage tasks, routines, and personal productivity. This policy explains what data we collect,
          how we use it, and what choices users have.
        </Text>

        <Text style={styles.sectionTitle}>Information We Collect</Text>
        <Text style={styles.body}>
          We may collect account information such as name, email address, and authentication provider details. We also
          store user-created content like tasks, categories, schedules, preferences, and theme settings.
        </Text>

        <Text style={styles.sectionTitle}>How We Use Information</Text>
        <Text style={styles.body}>
          We use information to provide sign-in, sync data across devices, personalize the app experience, maintain
          account security, and improve the product.
        </Text>

        <Text style={styles.sectionTitle}>Third-Party Services</Text>
        <Text style={styles.body}>
          Ownly uses third-party identity providers such as Google, Apple, Microsoft, and Facebook when users choose
          those sign-in methods. Ownly also uses Firebase to support authentication and cloud data storage.
        </Text>

        <Text style={styles.sectionTitle}>Data Sharing</Text>
        <Text style={styles.body}>
          We do not sell personal information. We only share data with service providers needed to operate Ownly or
          when required by law.
        </Text>

        <Text style={styles.sectionTitle}>Data Retention</Text>
        <Text style={styles.body}>
          We keep account data for as long as the user maintains an account or as needed to provide the service,
          resolve disputes, enforce agreements, and meet legal obligations.
        </Text>

        <Text style={styles.sectionTitle}>User Choices</Text>
        <Text style={styles.body}>
          Users may request deletion of their account data by following the data deletion instructions published by
          Ownly. Users may also stop using a third-party sign-in provider at any time.
        </Text>

        <Text style={styles.sectionTitle}>Contact</Text>
        <Text style={styles.body}>
          For privacy questions, contact: shphfranksun@gmail.com
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#F3F5F8',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  card: {
    width: '100%',
    maxWidth: 860,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    paddingHorizontal: 28,
    paddingVertical: 30,
    borderWidth: 1,
    borderColor: '#E4E8EE',
    gap: 10,
  },
  eyebrow: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: '#58708A',
  },
  title: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '800',
    color: '#111827',
  },
  updated: {
    fontSize: 14,
    lineHeight: 20,
    color: '#64748B',
    marginBottom: 6,
  },
  sectionTitle: {
    marginTop: 10,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
    color: '#0F172A',
  },
  body: {
    fontSize: 15,
    lineHeight: 24,
    color: '#334155',
  },
});
