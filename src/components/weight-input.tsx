import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import type { DateKey } from '@/lib/dates';
import { parseNumber, useStore } from '@/lib/store';
import { useTheme } from '@/lib/theme';

import { Button, Card, Field, Muted } from './ui';

/** Body weight for one day. The same value appears in the profile, and edits there show up here. */
export function WeightInputCard({ date, title = 'Weight' }: { date: DateKey; title?: string }) {
  const t = useTheme();
  const { data, setWeight } = useStore();
  const savedWeight = data.weights[date] ?? null;
  const [weightText, setWeightText] = useState(savedWeight === null ? '' : String(savedWeight));

  // Re-read the stored value when the screen comes back into view, e.g. after the profile changed it.
  const latest = useRef(savedWeight);
  useEffect(() => {
    latest.current = savedWeight;
  }, [savedWeight]);
  useFocusEffect(
    useCallback(() => {
      setWeightText(latest.current === null ? '' : String(latest.current));
    }, []),
  );

  const weight = parseNumber(weightText);
  const weightChanged = weight !== savedWeight;
  const submitWeight = () => {
    if (weightText.trim() === '') setWeight(date, null);
    else if (weight !== null) setWeight(date, weight);
  };

  return (
    <Card title={title}>
      <View style={styles.row}>
        <Field
          flex={1}
          value={weightText}
          onChangeText={setWeightText}
          placeholder="kg"
          keyboardType="decimal-pad"
          returnKeyType="done"
          onSubmitEditing={submitWeight}
          accessibilityLabel="Weight in kilograms"
        />
        <Button
          label={weightChanged ? 'Save' : 'Saved'}
          color={t.weight}
          disabled={!weightChanged || (weight === null && weightText.trim() !== '')}
          onPress={submitWeight}
        />
      </View>
      <Muted>Also shown in your profile, where your BMI is calculated.</Muted>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
});
