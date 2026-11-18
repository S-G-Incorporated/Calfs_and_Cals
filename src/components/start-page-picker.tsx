import { StyleSheet, View } from 'react-native';

import type { Mode } from '@/lib/mode';
import { useStore } from '@/lib/store';
import { useTheme } from '@/lib/theme';

import { Chip, Muted } from './ui';

const START_PAGES: { value: Mode | null; label: string }[] = [
  { value: null, label: 'Both' },
  { value: 'train', label: 'Training' },
  { value: 'calories', label: 'Calories' },
];

/** Chips for which section the app opens on at launch, with a line explaining the choice. */
export function StartPagePicker() {
  const t = useTheme();
  const { data, setProfile } = useStore();
  const current = data.profile.startPage;

  return (
    <>
      <View style={styles.chips}>
        {START_PAGES.map((page) => (
          <Chip
            key={page.label}
            label={page.label}
            color={
              page.value === 'train' ? t.workout : page.value === 'calories' ? t.calories : t.textSecondary
            }
            selected={current === page.value}
            onPress={() => setProfile({ startPage: page.value })}
          />
        ))}
      </View>
      <Muted>
        {current === null
          ? 'The app opens on the start screen, where you choose between training and calories.'
          : `The app opens straight on ${current === 'train' ? 'training' : 'calories'}. The start screen is still one tap away from the grid icon in the header, and you can change this in your profile.`}
      </Muted>
    </>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
