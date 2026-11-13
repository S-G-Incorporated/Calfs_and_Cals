import { useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line, Polyline, Rect, Text as SvgText } from 'react-native-svg';

import { useTheme } from '@/lib/theme';

const PAD = { left: 40, right: 10, top: 10, bottom: 22 };

export type ChartPoint = { label: string; value: number | null };

/** Indices of up to four evenly spread x-axis labels. */
function labelIndices(count: number): number[] {
  if (count <= 7) return Array.from({ length: count }, (_, i) => i);
  return [...new Set([0, 1, 2, 3].map((i) => Math.round((i * (count - 1)) / 3)))];
}

function niceMax(value: number, integer: boolean): number {
  if (integer) return Math.max(2, Math.ceil(value / 2) * 2);
  if (value <= 0) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(value)));
  const n = value / pow;
  return ([1, 1.5, 2, 2.5, 3, 4, 5, 6, 8].find((step) => n <= step) ?? 10) * pow;
}

function useWidth() {
  const [width, setWidth] = useState(0);
  return { width, onLayout: (e: { nativeEvent: { layout: { width: number } } }) => setWidth(e.nativeEvent.layout.width) };
}

type Props = {
  data: ChartPoint[];
  color: string;
  /** Drawn as a dashed horizontal line. */
  goal?: number | null;
  height?: number;
};

/** Bars from zero. Bars above `goal` are drawn in `overColor` when given. */
export function BarChart({
  data,
  color,
  goal,
  overColor,
  integer = false,
  height = 170,
}: Props & { overColor?: string; integer?: boolean }) {
  const t = useTheme();
  const { width, onLayout } = useWidth();
  const plotW = width - PAD.left - PAD.right;
  const plotH = height - PAD.top - PAD.bottom;
  const max = niceMax(Math.max(goal ?? 0, ...data.map((d) => d.value ?? 0)), integer);
  const y = (v: number) => PAD.top + plotH * (1 - v / max);
  const slot = plotW / Math.max(1, data.length);
  const barW = Math.max(1, slot * 0.7);
  const labels = labelIndices(data.length);

  return (
    <View onLayout={onLayout} style={{ height }}>
      {width > 0 ? (
        <Svg width={width} height={height}>
          {[0, max / 2, max].map((tick) => (
            <YTick key={tick} y={y(tick)} width={width} label={formatTick(tick)} />
          ))}
          {data.map((d, i) =>
            d.value ? (
              <Rect
                key={i}
                x={PAD.left + slot * i + (slot - barW) / 2}
                y={y(d.value)}
                width={barW}
                height={y(0) - y(d.value)}
                rx={Math.min(3, barW / 2)}
                fill={overColor && goal != null && d.value > goal ? overColor : color}
              />
            ) : null,
          )}
          {goal != null ? <GoalLine y={y(goal)} width={width} /> : null}
          {labels.map((i) => (
            <SvgText
              key={i}
              x={PAD.left + slot * (i + 0.5)}
              y={height - 6}
              fontSize={11}
              fill={t.textSecondary}
              textAnchor={data.length > 7 && i === data.length - 1 ? 'end' : 'middle'}>
              {data[i].label}
            </SvgText>
          ))}
        </Svg>
      ) : null}
    </View>
  );
}

/** Line through the non-null points; the y-axis is fitted to the data rather than starting at zero. */
export function LineChart({ data, color, goal, height = 170 }: Props) {
  const t = useTheme();
  const { width, onLayout } = useWidth();
  const plotW = width - PAD.left - PAD.right;
  const plotH = height - PAD.top - PAD.bottom;

  const values = data.flatMap((d) => (d.value === null ? [] : [d.value]));
  const all = goal != null ? [...values, goal] : values;
  const lo = Math.min(...all);
  const hi = Math.max(...all);
  const margin = (hi - lo) * 0.15 || 1;
  const min = lo - margin;
  const max = hi + margin;

  const x = (i: number) => PAD.left + (data.length > 1 ? (plotW * i) / (data.length - 1) : plotW / 2);
  const y = (v: number) => PAD.top + plotH * (1 - (v - min) / (max - min));
  const points = data.flatMap((d, i) => (d.value === null ? [] : [{ x: x(i), y: y(d.value) }]));
  const labels = labelIndices(data.length);

  return (
    <View onLayout={onLayout} style={{ height }}>
      {width > 0 && values.length > 0 ? (
        <Svg width={width} height={height}>
          {[min, (min + max) / 2, max].map((tick) => (
            <YTick key={tick} y={y(tick)} width={width} label={tick.toFixed(1)} />
          ))}
          {goal != null ? <GoalLine y={y(goal)} width={width} /> : null}
          <Polyline
            points={points.map((p) => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke={color}
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {points.length <= 31
            ? points.map((p, i) => <Circle key={i} cx={p.x} cy={p.y} r={3.5} fill={color} />)
            : null}
          {labels.map((i) => (
            <SvgText
              key={i}
              x={x(i)}
              y={height - 6}
              fontSize={11}
              fill={t.textSecondary}
              textAnchor={i === 0 ? 'start' : i === data.length - 1 ? 'end' : 'middle'}>
              {data[i].label}
            </SvgText>
          ))}
        </Svg>
      ) : null}
    </View>
  );
}

function formatTick(value: number): string {
  if (value >= 10000) return `${Math.round(value / 1000)}k`;
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function YTick({ y, width, label }: { y: number; width: number; label: string }) {
  const t = useTheme();
  return (
    <>
      <Line x1={PAD.left} x2={width - PAD.right} y1={y} y2={y} stroke={t.border} strokeWidth={1} />
      <SvgText x={PAD.left - 6} y={y + 4} fontSize={11} fill={t.textSecondary} textAnchor="end">
        {label}
      </SvgText>
    </>
  );
}

function GoalLine({ y, width }: { y: number; width: number }) {
  const t = useTheme();
  return (
    <Line
      x1={PAD.left}
      x2={width - PAD.right}
      y1={y}
      y2={y}
      stroke={t.good}
      strokeWidth={1.5}
      strokeDasharray="5 4"
    />
  );
}
