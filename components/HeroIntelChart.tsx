import { formatMoney } from "@/lib/format";
import {
  CHART_COLORS as C,
  EARNINGS_LABEL,
  findStory,
  formatDay,
  toTime,
  type DailyClose,
} from "@/lib/intelStory";

// The Intel chart cut down to its three moments, for the hero. Everything is
// placed in percentages and drawn on the server: the hero must not wait for
// JavaScript, and the labels must not stretch with the line.

// The line's top and bottom, in percent: room above for the peak label.
const TOP = 12;
const BOTTOM = 96;

function Marker({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <span
      className="absolute w-3 h-3 -ml-1.5 -mt-1.5 rounded-full border-2"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        backgroundColor: color,
        borderColor: C.paper,
      }}
    />
  );
}

export default function HeroIntelChart({ closes }: { closes: DailyClose[] }) {
  const story = findStory(closes);
  if (!story) return null;
  const { sold, earnings, mayHigh } = story;

  const prices = closes.map((c) => c.close);
  const low = Math.min(...prices);
  const high = Math.max(...prices);
  const start = toTime(closes[0].date);
  const end = toTime(closes[closes.length - 1].date);
  const x = (date: string) => ((toTime(date) - start) / (end - start)) * 100;
  const y = (price: number) =>
    TOP + ((high - price) / (high - low)) * (BOTTOM - TOP);

  const line = closes
    .map(
      (c, i) =>
        `${i ? "L" : "M"}${x(c.date).toFixed(2)} ${y(c.close).toFixed(2)}`
    )
    .join("");

  const soldX = x(sold.date);
  const soldY = y(sold.close);
  const earningsX = x(earnings.date);
  const peakX = x(mayHigh.date);
  const peakY = y(mayHigh.close);

  return (
    <figure>
      <a href="#why" className="group block">
        <div
          aria-hidden="true"
          className="relative h-56 sm:h-72 lg:h-80 border-b border-border font-mono text-xs tabular-nums"
        >
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="absolute inset-0 w-full h-full overflow-visible"
          >
            <path
              d={line}
              fill="none"
              stroke={C.ink}
              strokeWidth={1.5}
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>

          <span
            className="absolute inset-y-0 w-px"
            style={{ left: `${earningsX}%`, backgroundColor: C.red }}
          />
          <span
            className="absolute top-0 -translate-x-full pr-2 leading-none"
            style={{ left: `${earningsX}%`, color: C.redInk }}
          >
            {EARNINGS_LABEL}
          </span>

          <Marker x={soldX} y={soldY} color={C.canary} />
          <span
            className="absolute -translate-x-full -translate-y-full pr-2 pb-2 text-text-primary"
            style={{ left: `${soldX}%`, top: `${soldY}%` }}
          >
            Sold
          </span>

          <Marker x={peakX} y={peakY} color={C.grey} />
          <span
            className="absolute -translate-x-1/2 -translate-y-full pb-2 text-text-primary"
            style={{ left: `${peakX}%`, top: `${peakY}%` }}
          >
            ${Math.round(mayHigh.close)}
          </span>
        </div>

        <span className="inline-block mt-4 font-body text-sm text-text-primary underline underline-offset-4 decoration-text-primary/35 group-hover:decoration-text-primary transition-colors duration-150">
          Sold Intel two days before earnings.
        </span>
        <span className="sr-only"> Read the full story.</span>
      </a>
      <figcaption className="sr-only">
        Intel&apos;s daily closing price, January to May 2026. Sold on{" "}
        {formatDay(sold.date)}. Earnings on {formatDay(earnings.date)}. Peak of{" "}
        {formatMoney(mayHigh.close)} on {formatDay(mayHigh.date)}.
      </figcaption>
    </figure>
  );
}
