import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { ACTIVITY_LEVELS, bmi, bmiCategory, healthyWeightRange } from '@/lib/body';
import { formatRelative, useToday } from '@/lib/dates';
import { useStore } from '@/lib/store';
import { describeDaysLeft, targetStatus } from '@/lib/target';
import { useTheme } from '@/lib/theme';

import { Card, Chip, Muted, NumberField } from './ui';

const START_PAGES = [
  { value: null, label: 'Ask every time' },
  { value: 'calories', label: 'Calories' },
  { value: 'train', label: 'Training' },
] as const;

/** Launch preference, body details, current weight, BMI, and a link to the target weight plan. */
export function ProfileScreen() {
  const t = useTheme();
  const today = useToday();
  const { data, resetCount, setProfile, setWeight } = useStore();

  const { heightCm: height, sex, age, activity } = data.profile;
  const status = targetStatus(data, today);
  const weight = status.weight;

  // The date the shown weight was logged, when it is not from today.
  const weightDate = Object.keys(data.weights)
    .filter((d) => d <= today)
    .sort()
    .pop();

  const current = height !== null && weight !== null ? bmi(weight, height) : null;
  const atTarget = height !== null && status.target !== null ? bmi(status.target, height) : null;
  const range = height !== null ? healthyWeightRange(height) : null;
  const activityLevel = ACTIVITY_LEVELS.find((a) => a.value === activity);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}>
      <ScrollView
        key={resetCount}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag">
        <Card title="Open on launch">
          <View style={styles.chips}>
            {START_PAGES.map((page) => (
              <Chip
                key={page.label}
                label={page.label}
                color={page.value === 'train' ? t.workout : page.value === 'calories' ? t.calories : t.textSecondary}
                selected={data.profile.startPage === page.value}
                onPress={() => setProfile({ startPage: page.value })}
              />
            ))}
          </View>
          <Muted>
            {data.profile.startPage === null
              ? 'The app starts on the screen where you choose between training and calories.'
              : 'The app skips the choice screen. You can still reach it from the grid icon in the header.'}
          </Muted>
        </Card>

        <TargetCard status={status} />

        <Card title="About you">
          <View style={styles.chips}>
            <Chip label="Male" color={t.weight} selected={sex === 'male'} onPress={() => setProfile({ sex: 'male' })} />
            <Chip label="Female" color={t.weight} selected={sex === 'female'} onPress={() => setProfile({ sex: 'female' })} />
          </View>
          <NumberField
            value={age}
            unit="years"
            accessibilityLabel="Age in years"
            onChange={(v) => setProfile({ age: v === null ? null : Math.round(v) })}
          />
          <NumberField
            value={height}
            unit="cm"
            accessibilityLabel="Height in centimetres"
            onChange={(v) => setProfile({ heightCm: v === null ? null : Math.round(v) })}
          />
          <Muted>Used only to estimate how many calories your body uses in a day.</Muted>
        </Card>

        <Card title="Activity level">
          <View style={styles.chips}>
            {ACTIVITY_LEVELS.map((level) => (
              <Chip
                key={level.value}
                label={level.label}
                color={t.weight}
                selected={activity === level.value}
                onPress={() => setProfile({ activity: level.value })}
              />
            ))}
          </View>
          <Muted>{activityLevel ? activityLevel.hint : 'How much you move in a normal week, training included.'}</Muted>
        </Card>

        <Card title="Weight">
          <NumberField
            value={weight}
            unit="kg"
            decimal
            accessibilityLabel="Current weight in kilograms"
            onChange={(v) => setWeight(today, v)}
          />
          <Muted>
            {weight === null
              ? 'Saved as today’s weight and shown on the calories page as well.'
              : weightDate === today
                ? 'Logged today. Changing it here also changes it on the calories page.'
                : `Last logged ${formatRelative(weightDate ?? today, today).toLowerCase()}. Typing a new value logs it for today.`}
          </Muted>
        </Card>

        <Card title="BMI">
          {current !== null ? (
            <>
              <View style={styles.bmiRow}>
                <Text style={[styles.big, { color: t.text }]}>{current.toFixed(1)}</Text>
                <Text style={[styles.bigClass, { color: t.weight }]}>{bmiCategory(current)}</Text>
              </View>
              {range ? (
                <Muted>
                  A healthy range for your height is {range.min}–{range.max} kg.
                </Muted>
              ) : null}
              {atTarget !== null ? (
                <Muted>
                  Your target weight gives a BMI of {atTarget.toFixed(1)} ({bmiCategory(atTarget).toLowerCase()}).
                </Muted>
              ) : null}
            </>
          ) : (
            <Muted>Enter your height and weight to see your BMI.</Muted>
          )}
          <Muted>
            BMI is a rough indicator for adults and does not account for muscle mass or build.
          </Muted>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/** Summary of the target weight plan; tapping it opens the screen where it is set. */
function TargetCard({ status }: { status: ReturnType<typeof targetStatus> }) {
  const t = useTheme();
  const { data } = useStore();
  const { target, kgToChange, daysLeft, plan } = status;
  const goalInUse = plan !== null && data.goals.dailyCalories === plan.dailyCalories;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Target weight"
      onPress={() => router.push('/target')}
      style={({ pressed }) => [styles.targetCard, { backgroundColor: t.card, opacity: pressed ? 0.7 : 1 }]}>
      <View style={styles.targetHeader}>
        <Text style={[styles.cardTitle, { color: t.text }]}>Target weight</Text>
        <Ionicons name="chevron-forward" size={20} color={t.textSecondary} />
      </View>
      {target === null ? (
        <Muted>No target yet. Tap to set a target weight and how many weeks you want to take.</Muted>
      ) : (
        <>
          <View style={styles.bmiRow}>
            <Text style={[styles.big, { color: t.text }]}>{target} kg</Text>
            {kgToChange !== null && Math.abs(kgToChange) >= 0.05 ? (
              <Text style={[styles.bigClass, { color: t.weight }]}>
                {Math.abs(kgToChange).toFixed(1)} kg to {kgToChange > 0 ? 'lose' : 'gain'}
              </Text>
            ) : kgToChange !== null ? (
              <Text style={[styles.bigClass, { color: t.good }]}>Reached</Text>
            ) : null}
          </View>
          {daysLeft !== null ? (
            <Muted>{describeDaysLeft(daysLeft)}</Muted>
          ) : (
            <Muted>No timeline yet. Tap to choose how many weeks.</Muted>
          )}
          {plan !== null ? (
            <View style={[styles.budget, { backgroundColor: t.field }]}>
              <Ionicons name="restaurant" size={18} color={t.calories} />
              <Text style={[styles.budgetText, { color: t.text }]}>
                Up to {plan.dailyCalories.toLocaleString()} kcal a day
                {goalInUse ? ' · your daily goal' : ''}
              </Text>
            </View>
          ) : daysLeft !== null && daysLeft <= 0 ? (
            <Muted>Tap to set a new timeline.</Muted>
          ) : null}
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 16, gap: 16, paddingBottom: 32 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  bmiRow: { flexDirection: 'row', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' },
  big: { fontSize: 34, fontWeight: '800', fontVariant: ['tabular-nums'] },
  bigClass: { fontSize: 17, fontWeight: '700' },
  targetCard: { borderRadius: 16, padding: 16, gap: 12 },
  targetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontSize: 17, fontWeight: '700' },
  budget: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    padding: 12,
  },
  budgetText: { fontSize: 15, fontWeight: '600', flex: 1 },
});
