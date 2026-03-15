import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TermsScreen() {
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
        <Text style={styles.title}>Terms of Service</Text>
        <Text style={styles.updated}>Last updated: March 15, 2026</Text>

        <Text style={styles.sectionTitle}>Acceptance</Text>
        <Text style={styles.body}>
          By creating or using an Ownly account, you agree to these Terms of Service and to the Ownly Privacy Policy.
        </Text>

        <Text style={styles.sectionTitle}>Service Description</Text>
        <Text style={styles.body}>
          Ownly is a productivity application that helps users organize tasks, schedules, categories, and personal
          planning data.
        </Text>

        <Text style={styles.sectionTitle}>Account Responsibility</Text>
        <Text style={styles.body}>
          You are responsible for maintaining the confidentiality of your account and for the activity that occurs
          under it. You agree to provide accurate information when using sign-in providers or email registration.
        </Text>

        <Text style={styles.sectionTitle}>Acceptable Use</Text>
        <Text style={styles.body}>
          You agree not to misuse Ownly, attempt unauthorized access, interfere with the service, or use the app in a
          way that violates applicable law.
        </Text>

        <Text style={styles.sectionTitle}>Third-Party Sign-In</Text>
        <Text style={styles.body}>
          Ownly may allow sign-in through providers such as Google, Apple, Microsoft, and Facebook. Your use of those
          providers is also subject to their separate terms and policies.
        </Text>

        <Text style={styles.sectionTitle}>Termination</Text>
        <Text style={styles.body}>
          Ownly may suspend or terminate access to the service if these terms are violated or if continued access would
          create security, legal, or operational risk.
        </Text>

        <Text style={styles.sectionTitle}>Disclaimer</Text>
        <Text style={styles.body}>
          Ownly is provided on an “as is” and “as available” basis without warranties of any kind, to the extent
          permitted by law.
        </Text>

        <Text style={styles.sectionTitle}>Contact</Text>
        <Text style={styles.body}>
          For questions about these terms, contact: shphfranksun@gmail.com
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
