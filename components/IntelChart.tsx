"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useInView, useReducedMotion } from "framer-motion";

export interface DailyClose {
  date: string;
  close: number;
}

const BOUGHT_ON = "2026-01-27";
const SOLD_ON = "2026-04-21";
const EARNINGS_ON = "2026-04-23";
const PEAK_FROM = "2026-04-24";
const PEAK_TO = "2026-04-30";

// The trade prices are the real fills, not the closes, so these labels sit a
// few cents off the line they mark.
const BOUGHT_LABEL = "Bought $43.84";
const SOLD_LABEL = "Sold $65.72 · +50%";
const EARNINGS_LABEL = "Earnings";

const MONTHS = [
  { label: "Jan", start: "2026-01-01" },
  { label: "Feb", start: "2026-02-01" },
  { label: "Mar", start: "2026-03-01" },
  { label: "Apr", start: "2026-04-01" },
  { label: "May", start: "2026-05-01" },
];

const INK = "#1A1A1A";
const GREY = "#6B6B6B";
const GREEN = "#2D9E6B";
const CANARY = "#F5C842";
const RED = "#E03B3B";
const RULE = "#E8E4DC";
const PAPER = "#F7F5F0";

const PAD_TOP = 20;
const PAD_BOTTOM = 28;
const DRAW_MS = 1200;

const toTime = (date: string) => Date.parse(`${date}T00:00:00Z`);

function formatDay(date: string): string {
  return new Date(toTime(date)).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

function findStory(closes: DailyClose[]) {
  const on = (date: string) => closes.find((c) => c.date === date);
  const bought = on(BOUGHT_ON);
  const sold = on(SOLD_ON);
  const earnings = on(EARNINGS_ON);
  const week = closes.filter((c) => c.date >= PEAK_FROM && c.date <= PEAK_TO);
  if (!bought || !sold || !earnings || week.length === 0) return null;

  const peak = week.reduce((high, c) => (c.close > high.close ? c : high));
  return { bought, sold, earnings, peak };
}

function Dot({ color }: { color: string }) {
  return (
    <span
      className="block w-2 h-2 rounded-full mx-auto"
      style={{ backgroundColor: color }}
    />
  );
}

export default function IntelChart({ closes }: { closes: DailyClose[] }) {
  const reduce = useReducedMotion();
  const boxRef = useRef<HTMLDivElement>(null);
  const inView = useInView(boxRef, { once: true, amount: 0.4 });
  const [size, setSize] = useState<{ width: number; height: number } | null>(
    null
  );
  const [drawn, setDrawn] = useState(false);

  // Drawn at real pixel size rather than a scaled viewBox, so the stroke and
  // the labels stay the same size on every screen.
  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ width, height });
    });
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  // One frame after mount, so there's an undrawn state to transition from.
  useEffect(() => {
    if (!inView || !size) return;
    const frame = requestAnimationFrame(() => setDrawn(true));
    return () => cancelAnimationFrame(frame);
  }, [inView, size]);

  const story = findStory(closes);
  if (!story) return null;

  const { bought, sold, earnings, peak } = story;
  const peakPrice = `$${peak.close.toFixed(2)}`;
  const visible = drawn || Boolean(reduce);

  const legend = [
    { day: formatDay(bought.date), label: BOUGHT_LABEL, mark: <Dot color={GREEN} /> },
    { day: formatDay(sold.date), label: SOLD_LABEL, mark: <Dot color={CANARY} /> },
    {
      day: formatDay(earnings.date),
      label: EARNINGS_LABEL,
      mark: <span className="block w-px h-3 mx-auto bg-urgent" />,
    },
    {
      day: formatDay(peak.date),
      label: `${peakPrice} one week later`,
      mark: <Dot color={GREY} />,
    },
  ];

  function renderChart(width: number, height: number) {
    const prices = closes.map((c) => c.close);
    const low = Math.min(...prices) * 0.9;
    const high = Math.max(...prices);
    const start = toTime(closes[0].date);
    const end = toTime(closes[closes.length - 1].date);
    const baseline = height - PAD_BOTTOM;

    const x = (date: string) =>
      Math.max(0, ((toTime(date) - start) / (end - start)) * width);
    const y = (price: number) =>
      PAD_TOP + ((high - price) / (high - low)) * (baseline - PAD_TOP);
    // 1px lines land on a half pixel, or they blur across two.
    const crisp = (value: number) => Math.round(value) + 0.5;

    const line = closes
      .map((c, i) => `${i ? "L" : "M"}${x(c.date).toFixed(1)} ${y(c.close).toFixed(1)}`)
      .join("");

    const appear = (step: number): CSSProperties => ({
      opacity: visible ? 1 : 0,
      transition: reduce
        ? undefined
        : `opacity 300ms ease-out ${DRAW_MS + step * 120}ms`,
    });

    const earningsX = crisp(x(earnings.date));
    const soldX = x(sold.date);
    const soldY = y(sold.close);
    const peakX = x(peak.date);
    const peakY = y(peak.close);

    const dot = (cx: number, cy: number, fill: string) => (
      <circle cx={cx} cy={cy} r={4} fill={fill} stroke={PAPER} strokeWidth={2} />
    );

    return (
      <svg width={width} height={height} aria-hidden className="block">
        <line
          x1={0}
          x2={width}
          y1={crisp(baseline)}
          y2={crisp(baseline)}
          stroke={RULE}
        />
        {MONTHS.map((month) => (
          <text
            key={month.label}
            x={x(month.start)}
            y={height - 6}
            fontSize={11}
            fill={GREY}
            className="font-mono"
          >
            {month.label}
          </text>
        ))}

        {/* What selling early cost: from the sale up to the peak. */}
        <rect
          x={soldX}
          y={peakY}
          width={peakX - soldX}
          height={soldY - peakY}
          fill={RED}
          fillOpacity={0.08}
          style={appear(3)}
        />

        <line
          x1={earningsX}
          x2={earningsX}
          y1={0}
          y2={baseline}
          stroke={RED}
          style={appear(2)}
        />

        <path
          d={line}
          fill="none"
          stroke={INK}
          strokeWidth={1.5}
          strokeLinejoin="round"
          pathLength={1}
          strokeDasharray="1 2"
          strokeDashoffset={visible ? 0 : 1}
          style={{
            transition: reduce
              ? undefined
              : `stroke-dashoffset ${DRAW_MS}ms ease-in-out`,
          }}
        />

        <g style={appear(0)}>{dot(x(bought.date), y(bought.close), GREEN)}</g>
        <g style={appear(1)}>{dot(soldX, soldY, CANARY)}</g>
        <g style={appear(3)}>{dot(peakX, peakY, GREY)}</g>

        {/* Three of the markers sit within 8 days of each other, so on a phone
            these give way to the legend below the chart. */}
        <g
          fontSize={11}
          fill={INK}
          className="hidden sm:block font-mono tabular-nums"
        >
          <text x={x(bought.date) + 10} y={y(bought.close) + 18} style={appear(0)}>
            {BOUGHT_LABEL}
          </text>
          <text x={soldX - 8} y={soldY - 20} textAnchor="end" style={appear(1)}>
            {SOLD_LABEL}
          </text>
          <text
            x={earningsX - 6}
            y={12}
            textAnchor="end"
            fill={RED}
            style={appear(2)}
          >
            {EARNINGS_LABEL}
          </text>
          {/* The line keeps climbing through May, so the only clear space
              beside the peak is underneath it. */}
          <text x={peakX + 10} y={peakY + 18} style={appear(3)}>
            <tspan>{peakPrice}</tspan>
            <tspan x={peakX + 10} dy={14} fill={GREY}>
              one week later
            </tspan>
          </text>
        </g>
      </svg>
    );
  }

  return (
    <figure className="mt-12">
      <figcaption className="sr-only">
        Intel&apos;s daily closing price, January to May 2026.{" "}
        {legend.map((row) => `${row.day}: ${row.label}.`).join(" ")}
      </figcaption>
      <div ref={boxRef} className="h-60 sm:h-[26rem]">
        {size && renderChart(size.width, size.height)}
      </div>
      <ul
        aria-hidden
        className="sm:hidden mt-4 font-mono text-[11px] tabular-nums text-text-primary"
      >
        {legend.map((row) => (
          <li
            key={row.day}
            className="grid grid-cols-[1rem_3.5rem_minmax(0,1fr)] items-center gap-x-2 py-1"
          >
            {row.mark}
            <span className="text-text-secondary">{row.day}</span>
            <span>{row.label}</span>
          </li>
        ))}
      </ul>
    </figure>
  );
}
