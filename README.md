# Calfs & Cals

An offline calorie and workout tracker built with Expo (React Native). No login and no server: all data is stored on the phone with AsyncStorage.

## Run

```bash
npm install
npx expo start
```

Scan the QR code with Expo Go, or press `a` / `i` for an Android emulator / iOS simulator.

## Screens

- **Today** opens first. Type calories and tap Add, tap a saved food to add it again, or tap a workout to log it with the selected duration. Weight is logged here too.
- **History** lists every day back to the first entry. Tap a day to view or edit it.
- **Progress** shows calories per day, weight, and workouts per week over 7, 30 or 90 days, with goal lines.
- **Goals** sets a max calories per day, workouts per week, and a target weight. Leave a field empty to turn that goal off.

## Code

- `src/app/` — routes (Expo Router): the four tabs and `day/[date]`
- `src/components/day-view.tsx` — the tracking screen used by Today and past days
- `src/components/charts.tsx` — bar and line charts drawn with `react-native-svg`
- `src/lib/store.tsx` — data model and on-device persistence
- `src/lib/dates.ts` — date helpers (days are `YYYY-MM-DD` keys in local time)

Check changes with `npx tsc --noEmit` and `npx expo lint`.
