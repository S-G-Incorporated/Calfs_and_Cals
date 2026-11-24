import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  addDays,
  type DateKey,
  formatDate,
  formatMonth,
  fromKey,
  monthStart,
  useToday,
} from '@/lib/dates';
import { useTheme } from '@/lib/theme';

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/**
 * A month calendar for picking one day. Days before `min` or after `max` can't be picked. Opens
 * on the month of the selected day, or of `min` when nothing is selected. `marks` puts a small
 * coloured dot under a day, e.g. to show that something was logged on it.
 */
export function Calendar({
  value,
  min,
  max,
  marks,
  color,
  onChange,
}: {
  value: DateKey | null;
  min?: DateKey;
  max?: DateKey;
  marks?: ReadonlyMap<DateKey, string>;
  color: string;
  onChange: (date: DateKey) => void;
}) {
  const t = useTheme();
  const today = useToday();
  const [month, setMonth] = useState(() => monthStart(value ?? min ?? today));

  // Monday-first grid: pad the start with the days of the previous month's last week.
  const first = fromKey(month);
  const lead = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const cells: (DateKey | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => addDays(month, i)),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const canGoBack = min === undefined || monthStart(min) < month;
  const canGoForward = max === undefined || month < monthStart(max);

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Pressable
          onPress={() => setMonth(monthStart(month, -1))}
          disabled={!canGoBack}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Previous month"
          style={({ pressed }) => [styles.arrow, { opacity: !canGoBack ? 0.25 : pressed ? 0.5 : 1 }]}>
          <Ionicons name="chevron-back" size={22} color={t.text} />
        </Pressable>
        <Text style={[styles.month, { color: t.text }]}>{formatMonth(month)}</Text>
        <Pressable
          onPress={() => setMonth(monthStart(month, 1))}
          disabled={!canGoForward}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Next month"
          style={({ pressed }) => [styles.arrow, { opacity: !canGoForward ? 0.25 : pressed ? 0.5 : 1 }]}>
          <Ionicons name="chevron-forward" size={22} color={t.text} />
        </Pressable>
      </View>

      <View style={styles.grid}>
        {WEEKDAYS.map((d, i) => (
          <View key={`h${i}`} style={styles.headCell}>
            <Text style={[styles.weekday, { color: t.textSecondary }]}>{d}</Text>
          </View>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <View key={`e${i}`} style={styles.cell} />;
          const disabled = (min !== undefined && day < min) || (max !== undefined && day > max);
          const mark = marks?.get(day);
          const selected = day === value;
          const isToday = day === today;
          return (
            <View key={day} style={styles.cell}>
              <Pressable
                onPress={() => onChange(day)}
                disabled={disabled}
                accessibilityRole="button"
                accessibilityLabel={formatDate(day)}
                accessibilityState={{ selected, disabled }}
                style={({ pressed }) => [
                  styles.day,
                  selected && { backgroundColor: color },
                  !selected && isToday && { borderWidth: 1.5, borderColor: t.textSecondary },
                  { opacity: disabled ? 0.3 : pressed ? 0.6 : 1 },
                ]}>
                <Text
                  style={[
                    styles.dayLabel,
                    { color: selected ? t.onAccent : t.text },
                    selected && styles.dayLabelSelected,
                  ]}>
                  {fromKey(day).getDate()}
                </Text>
                {mark ? (
                  <View style={[styles.dot, { backgroundColor: selected ? t.onAccent : mark }]} />
                ) : null}
              </Pressable>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  arrow: { padding: 4 },
  month: { fontSize: 16, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  headCell: { width: `${100 / 7}%`, height: 24, alignItems: 'center', justifyContent: 'center' },
  cell: { width: `${100 / 7}%`, height: 44, alignItems: 'center', justifyContent: 'center' },
  weekday: { fontSize: 12, fontWeight: '600' },
  day: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayLabel: { fontSize: 15, fontVariant: ['tabular-nums'] },
  dayLabelSelected: { fontWeight: '800' },
  dot: { position: 'absolute', bottom: 5, width: 5, height: 5, borderRadius: 2.5 },
});
