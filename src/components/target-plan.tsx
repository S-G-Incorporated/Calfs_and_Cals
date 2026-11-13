import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { type CaloriePlan, minimumCalories } from '@/lib/body';
import { useToday } from '@/lib/dates';
import { useStore } from '@/lib/store';
import { describeDaysLeft, listWords, targetStatus } from '@/lib/target';
import { useTheme } from '@/lib/theme';

import { Button, Card, Muted, NumberField } from './ui';

/** Target weight, how many weeks to get there, and the daily calorie budget that implies. */
export function TargetPlanScreen() {
  const t = useTheme();
  const today = useToday();
  const { data, resetCount, setProfile, setGoals } = useStore();
  const { weeksToGoal } = data.profile;
  const status = targetStatus(data, today);

  // Changing the timeline restarts the countdown from today.
  const setWeeks = (weeks: number | null) =>
    setProfile({ weeksToGoal: weeks, targetStart: weeks === null ? null : today });

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

        <Card title="Timeline">
          <NumberField
            value={weeksToGoal}
            unit="weeks"
            placeholder="How many weeks?"
            accessibilityLabel="Weeks to reach the target"
            onChange={(v) => setWeeks(v === null ? null : Math.round(v))}
          />
          <Muted>
            {status.daysLeft === null
              ? 'The countdown starts the day you set the weeks.'
              : `${describeDaysLeft(status.daysLeft)}. Changing the number restarts the countdown from today.`}
          </Muted>
        </Card>

        <Card title="Calorie plan">
          {status.plan !== null && data.profile.sex !== null ? (
            <CaloriePlanView
              plan={status.plan}
              minimum={minimumCalories(data.profile.sex)}
              daysLeft={status.daysLeft ?? 0}
              currentGoal={data.goals.dailyCalories}
              onUse={() => status.plan && setGoals({ dailyCalories: status.plan.dailyCalories })}
              onUseWeeks={setWeeks}
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
                  The timeline has run out. Set a new number of weeks to get a fresh plan.
                </Text>
              ) : status.missing.length > 0 ? (
                <Muted>
                  To work out how much you can eat per day, fill in your {listWords(status.missing)}
                  {status.missing.some((m) => m === 'sex' || m === 'age' || m === 'height' || m === 'activity level')
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
  onUseWeeks,
}: {
  plan: CaloriePlan;
  minimum: number;
  daysLeft: number;
  currentGoal: number | null;
  onUse: () => void;
  onUseWeeks: (weeks: number) => void;
}) {
  const t = useTheme();
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
            Give yourself at least {plan.warning.suggestedWeeks}{' '}
            {plan.warning.suggestedWeeks === 1 ? 'week' : 'weeks'} from today.
          </Muted>
          <Button
            label={`Use ${plan.warning.suggestedWeeks} weeks`}
            color={t.textSecondary}
            onPress={() => onUseWeeks(plan.warning?.suggestedWeeks ?? 1)}
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
});
