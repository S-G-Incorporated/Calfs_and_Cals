import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { CategoryPicker } from '@/components/category-picker';
import { Button, Card, Field, Muted, Toggle } from '@/components/ui';
import { type DateKey, isDateKey, todayKey } from '@/lib/dates';
import { type LookupResult, lookupBarcode, portion, type Product } from '@/lib/food-lookup';
import { findSavedFood, parseNumber, useStore } from '@/lib/store';
import { useTheme } from '@/lib/theme';

/** Scan a food barcode, type the grams eaten, and log the calories and macros for that portion. */
export default function ScanScreen() {
  const t = useTheme();
  const params = useLocalSearchParams<{ date: string }>();
  const date = isDateKey(params.date) ? params.date : todayKey();
  const { data } = useStore();

  const [permission, requestPermission] = useCameraPermissions();
  const [barcode, setBarcode] = useState<string | null>(null);
  const [result, setResult] = useState<LookupResult | null>(null);

  // A barcode the user saved before is used straight away, with no network lookup.
  const saved = barcode === null ? undefined : findSavedFood(data.savedFoods, { barcode });

  useEffect(() => {
    if (barcode === null || saved) return;
    const controller = new AbortController();
    lookupBarcode(barcode, controller.signal).then((r) => {
      if (!controller.signal.aborted) setResult(r);
    });
    return () => controller.abort();
  }, [barcode, saved]);

  const rescan = () => {
    setBarcode(null);
    setResult(null);
  };

  if (!permission) return <View style={styles.center} />;

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={[styles.message, { color: t.text }]}>
          Camera access is needed to scan barcodes.
        </Text>
        {permission.canAskAgain ? (
          <Button label="Allow camera" color={t.calories} onPress={requestPermission} />
        ) : (
          <Button label="Open settings" color={t.calories} onPress={() => Linking.openSettings()} />
        )}
      </View>
    );
  }

  // The camera is unmounted as soon as a code is read, so it stops scanning and frees the session.
  if (barcode === null) {
    return (
      <View style={styles.flex}>
        <CameraView
          style={styles.flex}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
          onBarcodeScanned={({ data }) => setBarcode((current) => current ?? data)}
        />
        <View style={styles.overlay} pointerEvents="none">
          <View style={styles.frame} />
          <Text style={styles.hint}>Point the camera at the barcode on the packaging</Text>
        </View>
      </View>
    );
  }

  if (saved) {
    return <PortionForm product={{ ...saved, barcode }} date={date} onRescan={rescan} />;
  }

  if (result === null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={t.calories} />
        <Muted>Looking up {barcode}…</Muted>
      </View>
    );
  }

  if (result.status !== 'found') {
    return (
      <View style={styles.center}>
        <Text style={[styles.message, { color: t.text }]}>
          {result.status === 'missing'
            ? `No nutrition data found for barcode ${barcode}.`
            : 'Could not reach the food database. Check your connection and try again.'}
        </Text>
        <Button label="Scan again" color={t.calories} onPress={rescan} />
      </View>
    );
  }

  return <PortionForm product={result.product} date={date} onRescan={rescan} />;
}

function PortionForm({
  product,
  date,
  onRescan,
}: {
  product: Product;
  date: DateKey;
  onRescan: () => void;
}) {
  const t = useTheme();
  const { data, addFood, saveFood } = useStore();
  const [gramsText, setGramsText] = useState('');
  const [save, setSave] = useState(false);
  const [category, setCategory] = useState<string | null>(null);

  const alreadySaved = findSavedFood(data.savedFoods, { barcode: product.barcode }) !== undefined;

  const grams = parseNumber(gramsText);
  const eaten = portion(product, grams ?? 0);

  const submit = () => {
    if (grams === null) return;
    const { kcal, ...macros } = eaten;
    addFood(date, kcal, product.name, macros);
    if (save && !alreadySaved) {
      const { name, barcode, kcal: per100, protein, fat, carbs } = product;
      saveFood({ name, category, barcode, kcal: per100, protein, fat, carbs });
    }
    router.back();
  };

  const per100 = (value: number | null) => (value === null ? '–' : `${value} g`);
  const amount = (value: number | undefined) =>
    value === undefined ? '–' : grams === null ? '0 g' : `${value} g`;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Card title={product.name}>
          <Muted>
            Per 100 g: {Math.round(product.kcal)} kcal  ·  Protein {per100(product.protein)}  ·  Fat{' '}
            {per100(product.fat)}  ·  Carbs {per100(product.carbs)}
          </Muted>
        </Card>

        <Card title="How much did you eat?">
          <View style={styles.row}>
            <Field
              flex={1}
              autoFocus
              value={gramsText}
              onChangeText={setGramsText}
              placeholder="grams"
              keyboardType="decimal-pad"
              returnKeyType="done"
              onSubmitEditing={submit}
              accessibilityLabel="Grams eaten"
            />
            <Button label="Add" color={t.calories} disabled={grams === null} onPress={submit} />
          </View>
          <View style={styles.totals}>
            <Total label="kcal" value={eaten.kcal.toLocaleString()} color={t.calories} />
            <Total label="Protein" value={amount(eaten.protein)} color={t.text} />
            <Total label="Fat" value={amount(eaten.fat)} color={t.text} />
            <Total label="Carbs" value={amount(eaten.carbs)} color={t.text} />
          </View>
          {alreadySaved ? (
            <Muted>This product is in your saved foods.</Muted>
          ) : (
            <>
              <Toggle label="Save to my foods" value={save} color={t.calories} onChange={setSave} />
              {save ? <CategoryPicker value={category} onChange={setCategory} /> : null}
            </>
          )}
        </Card>

        <Button label="Scan another barcode" color={t.textSecondary} onPress={onRescan} />
        <Muted style={styles.credit}>Nutrition data from Open Food Facts.</Muted>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Total({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.total}>
      <Text style={[styles.totalValue, { color }]}>{value}</Text>
      <Muted>{label}</Muted>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  message: { fontSize: 17, textAlign: 'center' },
  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    padding: 24,
  },
  frame: {
    width: '85%',
    aspectRatio: 1.7,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  hint: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    textShadowColor: '#000000',
    textShadowRadius: 6,
  },
  content: { padding: 16, gap: 16, paddingBottom: 32 },
  row: { flexDirection: 'row', gap: 8 },
  totals: { flexDirection: 'row', justifyContent: 'space-between' },
  total: { alignItems: 'center', gap: 2, flex: 1 },
  totalValue: { fontSize: 20, fontWeight: '800', fontVariant: ['tabular-nums'] },
  credit: { textAlign: 'center' },
});
