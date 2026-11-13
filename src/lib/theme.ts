import { useColorScheme } from 'react-native';

const light = {
  background: '#F4F5F7',
  card: '#FFFFFF',
  field: '#EEF0F3',
  border: '#E1E4E9',
  text: '#14171A',
  textSecondary: '#667080',
  calories: '#F2762E',
  workout: '#2F7DF6',
  weight: '#8B5CF6',
  good: '#1FA971',
  bad: '#E5484D',
  onAccent: '#FFFFFF',
};

const dark: typeof light = {
  background: '#0B0C0E',
  card: '#17191C',
  field: '#22252A',
  border: '#2C3036',
  text: '#F2F4F7',
  textSecondary: '#9AA3AF',
  calories: '#FF8A4C',
  workout: '#5B9BFF',
  weight: '#A78BFA',
  good: '#3DD68C',
  bad: '#FF6369',
  onAccent: '#FFFFFF',
};

export type Theme = typeof light;

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? dark : light;
}
