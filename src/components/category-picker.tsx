import { FOOD_CATEGORIES } from '@/lib/foods';
import { useStore } from '@/lib/store';
import { useTheme } from '@/lib/theme';

import { Dropdown } from './dropdown';

const NONE = 'No category';

/** Dropdown of food categories, built-in and custom, with the option to add a new one. */
export function CategoryPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (category: string | null) => void;
}) {
  const t = useTheme();
  const { data, addCategory, removeCategory } = useStore();

  const options = [
    { label: NONE },
    ...FOOD_CATEGORIES.map((label) => ({ label })),
    ...[...data.customCategories].sort().map((label) => ({ label, custom: true })),
  ];

  return (
    <Dropdown
      value={value ?? NONE}
      options={options}
      placeholder={NONE}
      color={t.calories}
      accessibilityLabel="Category"
      addPlaceholder="Category name"
      onSelect={(label) => onChange(label === NONE ? null : label)}
      onAdd={addCategory}
      onRemove={(name) => {
        removeCategory(name);
        if (value === name) onChange(null);
      }}
    />
  );
}
