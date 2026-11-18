import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { type CaloriePlan, minimumCalories } from '@/lib/body';
import { addDays, type DateKey, formatDate, monthStart, useToday } from '@/lib/dates';
import { useStore } from '@/lib/store';
import { describeDaysLeft, listWords, targetStatus } from '@/lib/target';
import { useTheme } from '@/lib/theme';

import { Calendar } from './calendar';
import { Button, Card, Muted, NumberField } from './ui';

/** Target weight, the date to reach it by, and the daily calorie budget that implies. */
export function TargetPlanScreen() {
  const t = useTheme();
  const today = useToday();
  const { data, resetCount, setProfile, setGoals } = useStore();
  const { targetDate } = data.profile;
  const status = targetStatus(data, today);

  const setDate = (date: DateKey | null) => setProfile({ targetDate: date });

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
        <Card title="Target weight">
          <NumberField
            value={status.target}
            unit="kg"
            decimal
            placeholder="No target"
            accessibilityLabel="Target weight in kilograms"
            onChange={(v) => setGoals({ targetWeight: v })}
          />
          {status.kgToChange !== null ? (
            <Muted>
              {Math.abs(status.kgToChange) < 0.05
                ? `You are at your target. Now ${status.weight} kg.`
                : `Now ${status.weight} kg · ${Math.abs(status.kgToChange).toFixed(1)} kg to ${status.kgToChange > 0 ? 'lose' : 'gain'}`}
            </Muted>
          ) : status.weight === null ? (
            <Muted>Log your weight in the profile or on the calories page to see how far you are from it.</Muted>
          ) : null}
        </Card>

        <Card
          title="Target date"
          right={
            targetDate !== null ? (
              <Pressable
                onPress={() => setDate(null)}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Clear target date"
                style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}>
                <Text style={[styles.clear, { color: t.textSecondary }]}>Clear</Text>
              </Pressable>
            ) : null
          }>
          <Text style={[styles.dateLabel, { color: targetDate !== null ? t.text : t.textSecondary }]}>
            {targetDate !== null ? formatDate(targetDate) : 'Pick a day in the calendar'}
          </Text>
          {status.daysLeft !== null ? <Muted>{describeDaysLeft(status.daysLeft)}</Muted> : null}
          <Calendar
            // Jump to the right month when the date is changed from outside the calendar.
            key={targetDate !== null ? monthStart(targetDate) : 'none'}
            value={targetDate}
            min={addDays(today, 1)}
            color={t.weight}
            onChange={setDate}
          />
        </Card>

        <Card title="Calorie plan">
          {status.plan !== null && data.profile.sex !== null ? (
            <CaloriePlanView
              plan={status.plan}
              minimum={minimumCalories(data.profile.sex)}
              daysLeft={status.daysLeft ?? 0}
              currentGoal={data.goals.dailyCalories}
              onUse={() => status.plan && setGoals({ dailyCalories: status.plan.dailyCalories })}
              onUseDays={(days) => setDate(addDays(today, days))}
            />
          ) : (
            <>
              {status.maintenance !== null ? (
                <Muted>
                  Your body uses about {status.maintenance.toLocaleString()} kcal a day at your current weight.
                </Muted>
              ) : null}
              {status.daysLeft !== null && status.daysLeft <= 0 ? (
                <Text style={[styles.warningText, { color: t.bad }]}>
                  The target date has passed. Pick a new date to get a fresh plan.
                </Text>
              ) : status.missing.length > 0 ? (
                <Muted>
                  To work out how much you can eat per day, fill in your {listWords(status.missing)}
                  {status.missing.some((m) => m === 'sex' || m === 'birth date' || m === 'height' || m === 'activity level')
                    ? ' in your profile'
                    : ''}
                  .
                </Muted>
              ) : null}
            </>
          )}
          <Muted>
            Estimates use the Mifflin-St Jeor formula and 7,700 kcal per kg of body weight. The budget
            is recalculated from your latest weight and the days that remain, so it shifts as you go.
          </Muted>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function CaloriePlanView({
  plan,
  minimum,
  daysLeft,
  currentGoal,
  onUse,
  onUseDays,
}: {
  plan: CaloriePlan;
  minimum: number;
  daysLeft: number;
  currentGoal: number | null;
  onUse: () => void;
  onUseDays: (days: number) => void;
}) {
  const t = useTheme();
  const today = useToday();
  const losing = plan.kgToChange > 0;
  const perWeek = Math.abs(plan.kgPerWeek);
  const atTarget = Math.abs(plan.kgToChange) < 0.05;
  const inUse = currentGoal === plan.dailyCalories;
  const useLabel = inUse ? 'This is your daily calorie goal' : 'Set as daily calorie goal';

  if (atTarget) {
    return (
      <>
        <Headline
          value={`${plan.maintenance.toLocaleString()} kcal`}
          caption="per day keeps you at your target weight"
        />
        <Button label={useLabel} color={t.calories} disabled={inUse} onPress={onUse} />
      </>
    );
  }

  return (
    <>
      <Headline
        value={`${plan.dailyCalories.toLocaleString()} kcal`}
        caption={`per day to ${losing ? 'lose' : 'gain'} ${Math.abs(plan.kgToChange).toFixed(1)} kg in the ${describeDaysLeft(daysLeft).replace(' left', '')} left`}
      />
      <Muted>
        Your body uses about {plan.maintenance.toLocaleString()} kcal a day. That is{' '}
        {Math.abs(plan.dailyChange).toLocaleString()} kcal {losing ? 'less' : 'more'}, or{' '}
        {perWeek.toFixed(2)} kg per week.
      </Muted>
      {plan.warning ? (
        <View style={[styles.warning, { backgroundColor: t.field }]}>
          <Text style={[styles.warningText, { color: t.bad }]}>
            {plan.warning.reason === 'belowMinimum'
              ? `That is below ${minimum.toLocaleString()} kcal a day, which is not advised without medical supervision.`
              : 'Changing more than 1 kg a week is hard to keep up and not advised.'}
          </Text>
          <Muted>
            Aim for {formatDate(addDays(today, plan.warning.suggestedDays))} or later
            ({describeDaysLeft(plan.warning.suggestedDays).replace(' left', '')} from today).
          </Muted>
          <Button
            label="Move the date there"
            color={t.textSecondary}
            onPress={() => onUseDays(plan.warning?.suggestedDays ?? 7)}
          />
        </View>
      ) : null}
      <Button
        label={useLabel}
        color={t.calories}
        disabled={inUse || plan.warning?.reason === 'belowMinimum'}
        onPress={onUse}
      />
    </>
  );
}

function Headline({ value, caption }: { value: string; caption: string }) {
  const t = useTheme();
  return (
    <View>
      <Text style={[styles.big, { color: t.text }]}>{value}</Text>
      <Muted>{caption}</Muted>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 16, gap: 16, paddingBottom: 32 },
  big: { fontSize: 34, fontWeight: '800', fontVariant: ['tabular-nums'] },
  warning: { borderRadius: 12, padding: 12, gap: 8 },
  warningText: { fontSize: 14, fontWeight: '600' },
  dateLabel: { fontSize: 20, fontWeight: '700' },
  clear: { fontSize: 15, fontWeight: '600' },
});
