import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { addDays, useToday, weekStart } from '@/lib/dates';
import { sumKcal, useStore } from '@/lib/store';
import { useTheme } from '@/lib/theme';
import { trainingDays } from '@/lib/workouts';

/** First screen on launch: pick whether to train or track calories. */
export default function ChooseScreen() {
  const t = useTheme();
  const today = useToday();
  const { data } = useStore();

  const monday = weekStart(today);
  const weekDays = trainingDays(data.workouts, monday, addDays(monday, 6));
  const workoutGoal = data.goals.weeklyWorkouts;
  const trainHint =
    workoutGoal !== null
      ? `${weekDays} of ${workoutGoal} training days this week`
      : `${weekDays} training ${weekDays === 1 ? 'day' : 'days'} this week`;

  const eaten = sumKcal(data.foods.filter((f) => f.date === today));
  const calorieGoal = data.goals.dailyCalories;
  const calorieHint =
    calorieGoal !== null
      ? `${eaten.toLocaleString()} of ${calorieGoal.toLocaleString()} kcal today`
      : `${eaten.toLocaleString()} kcal today`;

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: t.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: t.text }]}>Calfs & Cals</Text>
        <Text style={[styles.question, { color: t.textSecondary }]}>What do you want to do?</Text>
      </View>

      <View style={styles.choices}>
        <Choice
          icon="barbell"
          label="Train"
          hint={trainHint}
          color={t.workout}
          onPress={() => router.push('/train')}
        />
        <Choice
          icon="restaurant"
          label="Track calories"
          hint={calorieHint}
          color={t.calories}
          onPress={() => router.push('/calories')}
        />
      </View>
    </SafeAreaView>
  );
}

function Choice({
  icon,
  label,
  hint,
  color,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  hint: string;
  color: string;
  onPress: () => void;
}) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      onPress={onPress}
      style={({ pressed }) => [
        styles.choice,
        { backgroundColor: color, opacity: pressed ? 0.8 : 1 },
      ]}>
      <Ionicons name={icon} size={44} color={t.onAccent} />
      <View style={styles.choiceText}>
        <Text style={[styles.choiceLabel, { color: t.onAccent }]}>{label}</Text>
        <Text style={[styles.choiceHint, { color: t.onAccent }]}>{hint}</Text>
      </View>
      <Ionicons name="chevron-forward" size={26} color={t.onAccent} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 24, gap: 32, justifyContent: 'center' },
  header: { gap: 6 },
  title: { fontSize: 34, fontWeight: '800' },
  question: { fontSize: 17 },
  choices: { gap: 16 },
  choice: {
    borderRadius: 24,
    padding: 24,
    minHeight: 120,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
  },
  choiceText: { flex: 1, gap: 4 },
  choiceLabel: { fontSize: 24, fontWeight: '800' },
  choiceHint: { fontSize: 14, opacity: 0.9 },
});
