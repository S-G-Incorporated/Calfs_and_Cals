import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/lib/theme';

import { Button, Field, Muted } from './ui';

export type DropdownOption = {
  label: string;
  /** Options the user added themselves can be removed from the list. */
  custom?: boolean;
};

/**
 * A select control. Tapping it opens a full-height list of options; the list ends with a
 * field for adding a new option when `onAdd` is given.
 */
export function Dropdown({
  value,
  options,
  placeholder,
  color,
  accessibilityLabel,
  addPlaceholder = 'Name',
  onSelect,
  onAdd,
  onRemove,
}: {
  value: string | null;
  options: DropdownOption[];
  placeholder: string;
  color: string;
  accessibilityLabel: string;
  /** Placeholder of the field for adding a new option. */
  addPlaceholder?: string;
  onSelect: (label: string) => void;
  /** Returns false when the name could not be added, for example because it exists already. */
  onAdd?: (label: string) => boolean;
  onRemove?: (label: string) => void;
}) {
  const t = useTheme();
  const [open, setOpen] = useState(false);
  const [newText, setNewText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setOpen(false);
    setNewText('');
    setError(null);
  };

  const add = () => {
    const name = newText.trim();
    if (!onAdd || name === '') return;
    if (onAdd(name)) {
      onSelect(name);
      close();
    } else {
      setError('That name is already on the list.');
    }
  };

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityValue={{ text: value ?? placeholder }}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.trigger,
          { backgroundColor: t.field, opacity: pressed ? 0.6 : 1 },
        ]}>
        <Text
          style={[styles.triggerLabel, { color: value === null ? t.textSecondary : t.text }]}
          numberOfLines={1}>
          {value ?? placeholder}
        </Text>
        <Ionicons name="chevron-down" size={20} color={t.textSecondary} />
      </Pressable>

      <Modal visible={open} animationType="slide" onRequestClose={close}>
        <SafeAreaView style={[styles.sheet, { backgroundColor: t.background }]}>
          <View style={styles.sheetHeader}>
            <Text style={[styles.sheetTitle, { color: t.text }]}>{accessibilityLabel}</Text>
            <Pressable onPress={close} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close">
              <Ionicons name="close" size={26} color={t.text} />
            </Pressable>
          </View>
          <FlatList
            data={options}
            keyExtractor={(o) => o.label}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.list}
            ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: t.border }]} />}
            renderItem={({ item }) => {
              const selected = item.label === value;
              return (
                <View style={styles.optionRow}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => {
                      onSelect(item.label);
                      close();
                    }}
                    style={({ pressed }) => [styles.option, { opacity: pressed ? 0.6 : 1 }]}>
                    <Text style={[styles.optionLabel, { color: selected ? color : t.text }]}>
                      {item.label}
                    </Text>
                    {selected ? <Ionicons name="checkmark" size={22} color={color} /> : null}
                  </Pressable>
                  {item.custom && onRemove ? (
                    <Pressable
                      onPress={() => onRemove(item.label)}
                      hitSlop={10}
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${item.label}`}>
                      <Ionicons name="trash-outline" size={20} color={t.textSecondary} />
                    </Pressable>
                  ) : null}
                </View>
              );
            }}
            ListFooterComponent={
              onAdd ? (
                <View style={styles.addBox}>
                  <Muted>Not on the list? Add your own.</Muted>
                  <View style={styles.addRow}>
                    <Field
                      flex={1}
                      value={newText}
                      onChangeText={(text) => {
                        setNewText(text);
                        setError(null);
                      }}
                      placeholder={addPlaceholder}
                      returnKeyType="done"
                      onSubmitEditing={add}
                      accessibilityLabel={`New ${accessibilityLabel.toLowerCase()}`}
                    />
                    <Button label="Add" color={color} disabled={newText.trim() === ''} onPress={add} />
                  </View>
                  {error ? <Text style={[styles.error, { color: t.bad }]}>{error}</Text> : null}
                </View>
              ) : undefined
            }
          />
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    borderRadius: 12,
    height: 48,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  triggerLabel: { flex: 1, fontSize: 17, fontWeight: '600' },
  sheet: { flex: 1 },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  sheetTitle: { fontSize: 20, fontWeight: '800' },
  list: { paddingHorizontal: 20, paddingBottom: 32 },
  separator: { height: StyleSheet.hairlineWidth },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  option: {
    flex: 1,
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionLabel: { fontSize: 17 },
  addBox: { marginTop: 24, gap: 8 },
  addRow: { flexDirection: 'row', gap: 8 },
  error: { fontSize: 13 },
});
