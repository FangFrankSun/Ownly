import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function DataDeletionScreen() {
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
        <Text style={styles.title}>User Data Deletion</Text>
        <Text style={styles.updated}>Last updated: March 15, 2026</Text>

        <Text style={styles.body}>
          Users may request deletion of their Ownly account data by emailing shphfranksun@gmail.com from the email
          address connected to their Ownly account.
        </Text>

        <Text style={styles.sectionTitle}>What to Include</Text>
        <Text style={styles.body}>
          Please include the subject line “Ownly Data Deletion Request” and identify the account email address you want
          deleted.
        </Text>

        <Text style={styles.sectionTitle}>What Happens Next</Text>
        <Text style={styles.body}>
          Once the request is confirmed, Ownly will delete the account profile and associated app data stored for that
          account, unless retention is required for security, fraud prevention, or legal compliance.
        </Text>

        <Text style={styles.sectionTitle}>Third-Party Sign-In</Text>
        <Text style={styles.body}>
          Deleting your Ownly account does not automatically delete your Google, Apple, Microsoft, or Facebook account.
          Those accounts must be managed directly with the provider.
        </Text>

        <Text style={styles.sectionTitle}>Support Contact</Text>
        <Text style={styles.body}>
          Email: shphfranksun@gmail.com
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
