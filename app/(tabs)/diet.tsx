import { StyleSheet, Text, View } from 'react-native';

import { AppCard, CardTitle, ScreenShell, SectionLabel } from '@/components/app/screen-shell';

const meals = [
  { label: 'Breakfast', item: 'Greek yogurt, berries, oats' },
  { label: 'Lunch', item: 'Chicken bowl, avocado, brown rice' },
  { label: 'Dinner', item: 'Salmon, greens, sweet potato' },
];

export default function DietScreen() {
  return (
    <ScreenShell title="Diet" subtitle="Simple food tracking that stays useful.">
      <AppCard delay={90}>
        <SectionLabel text="Daily Intake" />
        <CardTitle accent="#36B37E" icon="eco" title="Nutrition Summary" />
        <Text style={styles.kcal}>1,620 / 2,100 kcal</Text>
        <View style={styles.grid}>
          <MacroBox color="#36B37E" label="Protein" value="96g" />
          <MacroBox color="#3A86FF" label="Carbs" value="182g" />
          <MacroBox color="#FF9F1C" label="Fat" value="54g" />
        </View>
      </AppCard>

      <AppCard delay={160}>
        <SectionLabel text="Meals" />
        {meals.map((meal) => (
          <View key={meal.label} style={styles.mealRow}>
            <Text style={styles.mealLabel}>{meal.label}</Text>
            <Text style={styles.mealItem}>{meal.item}</Text>
          </View>
        ))}
      </AppCard>
    </ScreenShell>
  );
}

function MacroBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={[styles.macroBox, { borderColor: color }]}>
      <Text style={styles.macroLabel}>{label}</Text>
      <Text style={styles.macroValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  kcal: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.6,
    color: '#1A2133',
  },
  grid: {
    flexDirection: 'row',
    gap: 8,
  },
  macroBox: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 10,
    backgroundColor: '#FAFCFF',
    gap: 2,
  },
  macroLabel: {
    fontSize: 12,
    color: '#5D6780',
    fontWeight: '600',
  },
  macroValue: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1A2133',
  },
  mealRow: {
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#F7F9FE',
    gap: 4,
  },
  mealLabel: {
    fontSize: 13,
    color: '#67718B',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  mealItem: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A2133',
  },
});
