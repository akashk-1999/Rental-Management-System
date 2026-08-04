import { useEffect, useRef, useState } from "react";

export interface TrendLineSeries {
  key: string;
  label: string;
  color: string;
  values: number[];
  formatValue: (value: number) => string;
  /** Renders a translucent fill under this series' line, from the baseline up. Use for at most
   * one of two overlapping series — when two normalized shapes coincide exactly (a common case
   * here, since revenue is largely driven by rentals being created), the area wash stays visible
   * as a distinct region even where the two line strokes sit on identical pixels. */
  area?: boolean;
}

interface TrendLineChartProps {
  title: string;
  caption?: string;
  labels: string[];
  series: TrendLineSeries[];
  emptyMessage?: string;
}

const LEFT_AXIS_WIDTH = 34;
const MIN_POINT_SPACING = 28;
const FALLBACK_POINT_SPACING = 44;
const PLOT_HEIGHT = 160;
const AXIS_BAND_HEIGHT = 22;
const SVG_HEIGHT = PLOT_HEIGHT + AXIS_BAND_HEIGHT;

/** Dash pattern per series index so two lines stay visually distinct even when their normalized
 * shapes coincide exactly (e.g. a revenue spike driven by the same bucket as a rentals spike) —
 * without a dash, the later-drawn series would fully paint over the earlier one. */
const DASH_PATTERNS: (string | undefined)[] = [undefined, "6 4", "2 3"];
const MARKER_RADII = [5, 3.5, 3];

function normalize(values: number[]): number[] {
  const max = Math.max(...values, 0);
  if (max <= 0) return values.map(() => 0);
  return values.map((value) => value / max);
}

function LineSwatch({ color, dash }: { color: string; dash?: string }) {
  return (
    <svg width={16} height={4} aria-hidden="true">
      <line x1={0} y1={2} x2={16} y2={2} stroke={color} strokeWidth={2} strokeDasharray={dash} strokeLinecap="round" />
    </svg>
  );
}

export default function TrendLineChart({ title, caption, labels, series, emptyMessage }: TrendLineChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setContainerWidth(entry.contentRect.width);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const hasActivity = series.some((s) => s.values.some((value) => value > 0));
  const labelStride = labels.length > 10 ? Math.ceil(labels.length / 8) : 1;

  const pointCount = Math.max(labels.length - 1, 1);
  const availablePlotWidth = Math.max(containerWidth - LEFT_AXIS_WIDTH, 0);
  const pointSpacing =
    containerWidth === 0 ? FALLBACK_POINT_SPACING : Math.max(MIN_POINT_SPACING, availablePlotWidth / pointCount);
  const plotWidth = pointCount * pointSpacing;
  const chartWidth = LEFT_AXIS_WIDTH + plotWidth;

  const x = (index: number) => LEFT_AXIS_WIDTH + index * pointSpacing;
  const y = (normalizedValue: number) => PLOT_HEIGHT - normalizedValue * PLOT_HEIGHT;

  const normalizedSeries = series.map((s, seriesIndex) => ({
    ...s,
    normalized: normalize(s.values),
    dash: DASH_PATTERNS[seriesIndex % DASH_PATTERNS.length],
    markerRadius: MARKER_RADII[seriesIndex % MARKER_RADII.length]
  }));

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-700/80 dark:bg-slate-900">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">{title}</h3>
        {normalizedSeries.length > 1 && (
          <div className="flex items-center gap-3">
            {normalizedSeries.map((s) => (
              <span key={s.key} className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <LineSwatch color={s.color} dash={s.dash} />
                {s.label}
              </span>
            ))}
          </div>
        )}
      </div>
      {caption && <p className="mb-3 text-[11px] text-slate-400 dark:text-slate-500">{caption}</p>}

      {!hasActivity ? (
        <div className="flex h-[182px] items-center justify-center text-sm text-slate-400 dark:text-slate-500">
          {emptyMessage ?? "No activity for this period."}
        </div>
      ) : (
        <div ref={containerRef} className="relative w-full overflow-x-auto">
          <div className="relative inline-block" style={{ width: chartWidth, height: SVG_HEIGHT }}>
            <svg width={chartWidth} height={SVG_HEIGHT} role="img" aria-label={title}>
              {[0, 0.25, 0.5, 0.75, 1].map((fraction) => {
                const lineY = PLOT_HEIGHT - fraction * PLOT_HEIGHT;
                return (
                  <line
                    key={fraction}
                    x1={LEFT_AXIS_WIDTH}
                    y1={lineY}
                    x2={chartWidth}
                    y2={lineY}
                    className="stroke-slate-100 dark:stroke-slate-800"
                    strokeWidth={1}
                  />
                );
              })}

              {[0, 0.5, 1].map((fraction) => (
                <text
                  key={fraction}
                  x={LEFT_AXIS_WIDTH - 6}
                  y={PLOT_HEIGHT - fraction * PLOT_HEIGHT + 3}
                  textAnchor="end"
                  fontSize={10}
                  className="fill-slate-400 dark:fill-slate-500"
                >
                  {Math.round(fraction * 100)}%
                </text>
              ))}

              <line
                x1={LEFT_AXIS_WIDTH}
                y1={PLOT_HEIGHT}
                x2={chartWidth}
                y2={PLOT_HEIGHT}
                className="stroke-slate-300 dark:stroke-slate-600"
                strokeWidth={1}
              />

              {normalizedSeries
                .filter((s) => s.area)
                .map((s) => {
                  const linePoints = s.normalized.map((value, index) => `${x(index)},${y(value)}`).join(" ");
                  const areaPoints = `${x(0)},${PLOT_HEIGHT} ${linePoints} ${x(s.normalized.length - 1)},${PLOT_HEIGHT}`;
                  return <polygon key={`${s.key}-area`} points={areaPoints} fill={s.color} opacity={0.14} />;
                })}

              {normalizedSeries
                .filter((s) => !s.area)
                .map((s) => (
                  <polyline
                    key={s.key}
                    points={s.normalized.map((value, index) => `${x(index)},${y(value)}`).join(" ")}
                    fill="none"
                    stroke={s.color}
                    strokeWidth={2}
                    strokeDasharray={s.dash}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                ))}

              {normalizedSeries
                .filter((s) => s.area)
                .map((s) => (
                  <polyline
                    key={s.key}
                    points={s.normalized.map((value, index) => `${x(index)},${y(value)}`).join(" ")}
                    fill="none"
                    stroke={s.color}
                    strokeWidth={2}
                    strokeDasharray={s.dash}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                ))}

              {normalizedSeries.map((s) =>
                s.normalized.map((value, index) => (
                  <circle
                    key={`${s.key}-${index}`}
                    cx={x(index)}
                    cy={y(value)}
                    r={activeIndex === index ? s.markerRadius + 1 : s.markerRadius}
                    fill={s.color}
                    stroke="currentColor"
                    strokeWidth={2}
                    className="text-white dark:text-slate-900"
                  />
                ))
              )}

              {/* Crosshair + per-point hit targets, keyboard-focusable for parity with hover */}
              {labels.map((label, index) => (
                <g key={index}>
                  {activeIndex === index && (
                    <line
                      x1={x(index)}
                      y1={0}
                      x2={x(index)}
                      y2={PLOT_HEIGHT}
                      className="stroke-slate-300 dark:stroke-slate-600"
                      strokeWidth={1}
                    />
                  )}
                  <rect
                    x={x(index) - pointSpacing / 2}
                    y={0}
                    width={pointSpacing}
                    height={PLOT_HEIGHT}
                    fill="transparent"
                    tabIndex={0}
                    role="img"
                    aria-label={`${label}: ${series.map((s) => `${s.label} ${s.formatValue(s.values[index])}`).join(", ")}`}
                    className="cursor-pointer outline-none"
                    onMouseEnter={() => setActiveIndex(index)}
                    onMouseLeave={() => setActiveIndex(null)}
                    onFocus={() => setActiveIndex(index)}
                    onBlur={() => setActiveIndex(null)}
                  />
                </g>
              ))}

              {labels.map((label, index) =>
                index % labelStride === 0 ? (
                  <text
                    key={index}
                    x={x(index)}
                    y={PLOT_HEIGHT + 16}
                    textAnchor="middle"
                    fontSize={10}
                    className="fill-slate-400 dark:fill-slate-500"
                  >
                    {label}
                  </text>
                ) : null
              )}
            </svg>

            {activeIndex !== null && (
              <div
                className="pointer-events-none absolute top-1 -translate-x-1/2 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs shadow-lg dark:border-slate-700 dark:bg-slate-800"
                style={{ left: x(activeIndex) }}
              >
                <p className="mb-1 font-medium text-slate-500 dark:text-slate-400">{labels[activeIndex]}</p>
                {normalizedSeries.map((s) => (
                  <div key={s.key} className="flex items-center gap-1.5">
                    <LineSwatch color={s.color} dash={s.dash} />
                    <span className="font-semibold text-slate-900 dark:text-slate-100">{s.formatValue(s.values[activeIndex])}</span>
                    <span className="text-slate-400 dark:text-slate-500">{s.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
