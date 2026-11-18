import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  type DateKey,
  daysInMonth,
  fromKey,
  MONTH_NAMES,
  toKey,
  useToday,
  yearsBetween,
} from '@/lib/dates';
import { useTheme } from '@/lib/theme';

import { Dropdown } from './dropdown';
import { Muted } from './ui';

type Draft = { day: number | null; month: number | null; year: number | null };

function toDraft(value: DateKey | null): Draft {
  if (value === null) return { day: null, month: null, year: null };
  const d = fromKey(value);
  return { day: d.getDate(), month: d.getMonth(), year: d.getFullYear() };
}

/**
 * The user's age, worked out from their birth date so it updates by itself on each birthday.
 * The edit button opens day, month and year dropdowns; the date is saved once all three are
 * picked. Without a birth date the dropdowns show straight away.
 */
export function BirthDateField({
  value,
  onChange,
}: {
  value: DateKey | null;
  onChange: (date: DateKey) => void;
}) {
  const t = useTheme();
  const today = useToday();
  const [draft, setDraft] = useState<Draft>(() => toDraft(value));
  // With a birth date saved, only the age shows until the edit button is tapped.
  const [editing, setEditing] = useState(value === null);

  if (!editing && value !== null) {
    return (
      <View style={styles.ageLine}>
        <View style={[styles.ageBox, { backgroundColor: t.field }]}>
          <Text style={[styles.age, { color: t.text }]}>{yearsBetween(value, today)}</Text>
          <Pressable
            onPress={() => {
              setDraft(toDraft(value));
              setEditing(true);
            }}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Edit birth date"
            style={({ pressed }) => [styles.edit, { opacity: pressed ? 0.5 : 1 }]}>
            <Ionicons name="pencil" size={18} color={t.textSecondary} />
          </Pressable>
        </View>
        <Text style={[styles.unit, { color: t.textSecondary }]}>years</Text>
      </View>
    );
  }

  const thisYear = fromKey(today).getFullYear();
  // Ages 13 to 100, newest year first.
  const years = Array.from({ length: 88 }, (_, i) => thisYear - 13 - i);
  const dayCount =
    draft.month !== null ? daysInMonth(draft.year ?? 2000, draft.month) : 31;
  const days = Array.from({ length: dayCount }, (_, i) => i + 1);

  const update = (patch: Partial<Draft>) => {
    const next = { ...draft, ...patch };
    // Keep the day valid when the month or year changes, e.g. 31 March -> February.
    if (next.day !== null && next.month !== null) {
      next.day = Math.min(next.day, daysInMonth(next.year ?? 2000, next.month));
    }
    setDraft(next);
    if (next.day !== null && next.month !== null && next.year !== null) {
      onChange(toKey(new Date(next.year, next.month, next.day)));
    }
  };

  return (
    <>
      <View style={styles.row}>
        <View style={styles.day}>
          <Dropdown
            value={draft.day !== null ? String(draft.day) : null}
            options={days.map((d) => ({ label: String(d) }))}
            placeholder="Day"
            color={t.weight}
            accessibilityLabel="Birth day"
            onSelect={(label) => update({ day: Number(label) })}
          />
        </View>
        <View style={styles.month}>
          <Dropdown
            value={draft.month !== null ? MONTH_NAMES[draft.month] : null}
            options={MONTH_NAMES.map((m) => ({ label: m }))}
            placeholder="Month"
            color={t.weight}
            accessibilityLabel="Birth month"
            onSelect={(label) => update({ month: MONTH_NAMES.indexOf(label) })}
          />
        </View>
        <View style={styles.year}>
          <Dropdown
            value={draft.year !== null ? String(draft.year) : null}
            options={years.map((y) => ({ label: String(y) }))}
            placeholder="Year"
            color={t.weight}
            accessibilityLabel="Birth year"
            onSelect={(label) => update({ year: Number(label) })}
          />
        </View>
      </View>
      <View style={styles.footer}>
        <Muted style={styles.hint}>
          {value !== null
            ? `${yearsBetween(value, today)} years old. Your age updates by itself on your birthday.`
            : 'Your birth date, so your age stays up to date by itself.'}
        </Muted>
        {value !== null ? (
          <Pressable
            onPress={() => setEditing(false)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Done editing birth date"
            style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}>
            <Text style={[styles.done, { color: t.weight }]}>Done</Text>
          </Pressable>
        ) : null}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  day: { flex: 2 },
  month: { flex: 4 },
  year: { flex: 3 },
  // Lined up with the number fields below it: a box, then the unit.
  ageLine: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  unit: { fontSize: 16, minWidth: 70 },
  ageBox: {
    flex: 1,
    borderRadius: 12,
    height: 48,
    paddingLeft: 14,
    paddingRight: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  age: { flex: 1, fontSize: 17 },
  edit: { padding: 8 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  hint: { flex: 1 },
  done: { fontSize: 15, fontWeight: '700' },
});
