import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { bmi, bmiCategory, healthyWeightRange } from '@/lib/body';
import { formatRelative, useToday } from '@/lib/dates';
import { latestWeight, useStore } from '@/lib/store';
import { useTheme } from '@/lib/theme';

import { Card, Muted, NumberField } from './ui';

/** Height, current weight, target weight and the BMI they give. */
export function ProfileScreen() {
  const t = useTheme();
  const today = useToday();
  const { data, resetCount, setProfile, setWeight, setGoals } = useStore();

  const height = data.profile.heightCm;
  const weight = latestWeight(data.weights, today);
  const target = data.goals.targetWeight;

  // The date the shown weight was logged, when it is not from today.
  const weightDate = Object.keys(data.weights)
    .filter((d) => d <= today)
    .sort()
    .pop();

  const current = height !== null && weight !== null ? bmi(weight, height) : null;
  const atTarget = height !== null && target !== null ? bmi(target, height) : null;
  const range = height !== null ? healthyWeightRange(height) : null;

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
        <Card title="Height">
          <NumberField
            value={height}
            unit="cm"
            accessibilityLabel="Height in centimetres"
            onChange={(v) => setProfile({ heightCm: v === null ? null : Math.round(v) })}
          />
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

        <Card title="Target weight">
          <NumberField
            value={target}
            unit="kg"
            decimal
            placeholder="No target"
            accessibilityLabel="Target weight in kilograms"
            onChange={(v) => setGoals({ targetWeight: v })}
          />
          {target !== null && weight !== null ? (
            <Muted>
              {Math.abs(weight - target) < 0.05
                ? 'You are at your target.'
                : `${Math.abs(weight - target).toFixed(1)} kg to ${weight > target ? 'lose' : 'gain'}`}
            </Muted>
          ) : null}
        </Card>

        <Card title="BMI">
          {current !== null ? (
            <>
              <View style={styles.bmiRow}>
                <Text style={[styles.bmi, { color: t.text }]}>{current.toFixed(1)}</Text>
                <Text style={[styles.bmiClass, { color: t.weight }]}>{bmiCategory(current)}</Text>
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

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 16, gap: 16, paddingBottom: 32 },
  bmiRow: { flexDirection: 'row', alignItems: 'baseline', gap: 12 },
  bmi: { fontSize: 34, fontWeight: '800', fontVariant: ['tabular-nums'] },
  bmiClass: { fontSize: 17, fontWeight: '700' },
});
