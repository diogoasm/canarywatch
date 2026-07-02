"use client";

import { useState } from "react";
import StockSearch from "@/components/StockSearch";
import type { StockSearchResult } from "@/types";

// ─── Types (mirrors /api/valuation response) ───────────────────────────────

interface FcfQuarter {
  date: string;
  free_cash_flow: number;
}

interface ValuationData {
  ticker: string;
  current_price: number | null;
  dcf_value: number | null;
  fcf_quarters: FcfQuarter[];
  pays_dividend: boolean;
  annual_dividend: number | null;
  dividend_growth_rate: number | null;
  dividend_yield: number | null;
  has_data: boolean;
}

const REQUIRED_RETURN = 0.1; // r — standard market assumption

// ─── Formatting helpers ────────────────────────────────────────────────────

function fmtMoney(n: number): string {
  return `$${n.toFixed(2)}`;
}

function fmtBig(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(0)}M`;
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(0)}K`;
  return `${sign}$${abs.toFixed(0)}`;
}

function fmtQuarter(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const q = Math.floor(d.getMonth() / 3) + 1;
  return `Q${q} ${d.getFullYear()}`;
}

// ─── Tooltip ───────────────────────────────────────────────────────────────

function InfoTip({ text }: { text: string }) {
  return (
    <span className="relative group inline-flex items-center align-middle ml-1.5">
      <span
        className="inline-flex items-center justify-center w-4 h-4 rounded-full border border-text-secondary/50 text-text-secondary font-body text-[10px] cursor-help select-none"
        aria-label={text}
      >
        ?
      </span>
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-30 hidden group-hover:block w-64 pointer-events-none">
        <span className="block bg-[#1A1A1A] text-white font-body text-xs leading-relaxed rounded-lg px-3 py-2 shadow-xl">
          {text}
        </span>
        <span className="block w-2 h-2 bg-[#1A1A1A] rotate-45 mx-auto -mt-1" />
      </span>
    </span>
  );
}

// ─── Collapsible section shell ─────────────────────────────────────────────

function CollapsibleCard({
  title,
  tooltip,
  children,
  defaultOpen = true,
}: {
  title: string;
  tooltip?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="card overflow-visible">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-6 py-4 text-left"
        aria-expanded={open}
      >
        <span className="font-display text-base font-bold text-text-primary">
          {title}
          {tooltip && <InfoTip text={tooltip} />}
        </span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          className={`shrink-0 text-text-secondary transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        >
          <path
            d="M2.5 5l4.5 4.5L11.5 5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {open && <div className="px-6 pb-6">{children}</div>}
    </div>
  );
}

// ─── Value comparison rows ─────────────────────────────────────────────────

function ValueRow({
  label,
  value,
  tooltip,
  valueClass = "text-text-primary",
}: {
  label: string;
  value: string;
  tooltip?: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-border last:border-0">
      <span className="font-body text-sm text-text-secondary">
        {label}
        {tooltip && <InfoTip text={tooltip} />}
      </span>
      <span className={`font-mono text-sm font-bold ${valueClass}`}>
        {value}
      </span>
    </div>
  );
}

function PremiumDiscountRow({
  price,
  intrinsic,
}: {
  price: number;
  intrinsic: number;
}) {
  const pct = ((price - intrinsic) / intrinsic) * 100;
  const above = pct >= 0;
  return (
    <ValueRow
      label="Premium / Discount to Intrinsic Value"
      value={`${Math.abs(pct).toFixed(1)}% ${above ? "above" : "below"} intrinsic value`}
      valueClass={above ? "text-urgent" : "text-positive"}
    />
  );
}

// ─── FCF bar chart (inline SVG) ────────────────────────────────────────────

function FcfChart({ quarters }: { quarters: FcfQuarter[] }) {
  const maxAbs = Math.max(...quarters.map((q) => Math.abs(q.free_cash_flow)), 1);
  const rowH = 30;
  const labelW = 64;
  const chartW = 320;
  const valueW = 76;
  const totalW = labelW + chartW + valueW;
  const totalH = quarters.length * rowH;

  return (
    <svg
      viewBox={`0 0 ${totalW} ${totalH}`}
      className="w-full h-auto"
      role="img"
      aria-label="Free cash flow trend, last 4 quarters"
    >
      {quarters.map((q, i) => {
        const w = (Math.abs(q.free_cash_flow) / maxAbs) * chartW;
        const positive = q.free_cash_flow >= 0;
        const y = i * rowH;
        return (
          <g key={q.date}>
            <text
              x={labelW - 8}
              y={y + rowH / 2 + 4}
              textAnchor="end"
              className="fill-[#6B6B6B]"
              fontSize="11"
              fontFamily="var(--font-dm-mono), monospace"
            >
              {fmtQuarter(q.date)}
            </text>
            <rect
              x={labelW}
              y={y + 6}
              width={Math.max(w, 2)}
              height={rowH - 12}
              rx="3"
              fill={positive ? "#2D9E6B" : "#E03B3B"}
              opacity="0.85"
            />
            <text
              x={labelW + Math.max(w, 2) + 8}
              y={y + rowH / 2 + 4}
              className="fill-[#1A1A1A]"
              fontSize="11"
              fontFamily="var(--font-dm-mono), monospace"
            >
              {fmtBig(q.free_cash_flow)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── DCF card ──────────────────────────────────────────────────────────────

function DcfSection({ data }: { data: ValuationData }) {
  return (
    <CollapsibleCard
      title="Discounted Cash Flow (DCF)"
      tooltip="DCF calculates what a company's future cash flows are worth in today's money. It's the most widely used valuation method by professional investors."
    >
      {data.dcf_value !== null && data.current_price !== null ? (
        <div className="mb-6">
          <ValueRow
            label="Current Market Price"
            value={fmtMoney(data.current_price)}
          />
          <ValueRow
            label="DCF Intrinsic Value"
            value={fmtMoney(data.dcf_value)}
            tooltip="This is what the model estimates the stock is worth based on projected future cash flows discounted back to today. This is a model output, not a fact — it depends heavily on growth assumptions which may not reflect reality."
          />
          <PremiumDiscountRow
            price={data.current_price}
            intrinsic={data.dcf_value}
          />
        </div>
      ) : (
        <p className="font-body text-sm text-text-secondary mb-6">
          No DCF model available for {data.ticker}.
        </p>
      )}

      {data.fcf_quarters.length > 0 && (
        <div className="mb-5">
          <p className="font-body text-xs font-medium text-text-secondary uppercase tracking-wide mb-3">
            Free Cash Flow Trend (last 4 quarters)
            <InfoTip text="Free cash flow is the actual cash a company generates after capital expenditures. Growing FCF is generally a positive sign." />
          </p>
          <FcfChart quarters={data.fcf_quarters} />
        </div>
      )}

      <p className="font-body text-xs italic text-text-secondary leading-relaxed">
        DCF models are sensitive to growth rate assumptions. Small changes in
        assumed growth can dramatically change the output. Always
        cross-reference with other methods.
      </p>
    </CollapsibleCard>
  );
}

// ─── DDM card ──────────────────────────────────────────────────────────────

function DdmSection({ data }: { data: ValuationData }) {
  if (!data.pays_dividend || data.annual_dividend === null) {
    return (
      <div className="card p-6 bg-background/60">
        <h3 className="font-display text-base font-bold text-text-secondary mb-2">
          DDM Not Applicable
        </h3>
        <p className="font-body text-sm text-text-secondary leading-relaxed">
          The Dividend Discount Model only applies to stocks that pay regular
          dividends. {data.ticker} does not currently pay a dividend, so DDM
          cannot be used to estimate its value.
        </p>
      </div>
    );
  }

  const d0 = data.annual_dividend;
  const g = data.dividend_growth_rate ?? 0;
  const d1 = d0 * (1 + g);
  const modelValid = g < REQUIRED_RETURN;
  const intrinsic = modelValid ? d1 / (REQUIRED_RETURN - g) : null;

  return (
    <CollapsibleCard
      title="Dividend Discount Model (DDM)"
      tooltip="DDM values a stock based on the present value of all future dividend payments. Best for stable, mature companies with consistent dividend growth."
    >
      {/* Gordon Growth Model formula */}
      <div className="bg-background rounded-lg p-5 mb-5">
        <p className="font-mono text-sm text-text-primary text-center mb-4">
          Intrinsic Value = D₁ / (r − g)
        </p>
        <div className="flex flex-col gap-2">
          <p className="font-body text-sm text-text-secondary">
            <span className="font-mono font-bold text-text-primary">D₁</span> ={" "}
            Next year&apos;s expected dividend:{" "}
            <span className="font-mono text-text-primary">{fmtMoney(d1)}</span>
          </p>
          <p className="font-body text-sm text-text-secondary">
            <span className="font-mono font-bold text-text-primary">r</span> ={" "}
            Required rate of return:{" "}
            <span className="font-mono text-text-primary">10%</span>
            <InfoTip text="The required rate of return (10%) represents what investors typically expect to earn from stocks historically. You can adjust this assumption." />
          </p>
          <p className="font-body text-sm text-text-secondary">
            <span className="font-mono font-bold text-text-primary">g</span> ={" "}
            Dividend growth rate:{" "}
            <span className="font-mono text-text-primary">
              {data.dividend_growth_rate !== null
                ? `${(g * 100).toFixed(1)}%`
                : "0.0% (insufficient history)"}
            </span>
            <InfoTip text="Calculated from the last 3 years of dividend history. Past growth doesn't guarantee future growth." />
          </p>
          {intrinsic !== null && (
            <p className="font-body text-sm text-text-primary pt-2 border-t border-border mt-1">
              = Intrinsic Value:{" "}
              <span className="font-mono font-bold">
                {fmtMoney(intrinsic)} per share
              </span>
            </p>
          )}
        </div>
      </div>

      {!modelValid && (
        <p className="font-body text-sm text-text-secondary leading-relaxed mb-4">
          {data.ticker}&apos;s dividend growth rate ({(g * 100).toFixed(1)}%)
          exceeds the required rate of return (10%), so the Gordon Growth Model
          breaks down mathematically. Rapid dividend growth rarely lasts —
          treat this stock as outside DDM&apos;s comfort zone.
        </p>
      )}

      {intrinsic !== null && data.current_price !== null && (
        <div>
          <ValueRow
            label="Current Market Price"
            value={fmtMoney(data.current_price)}
          />
          <ValueRow
            label="DDM Intrinsic Value"
            value={fmtMoney(intrinsic)}
          />
          <PremiumDiscountRow price={data.current_price} intrinsic={intrinsic} />
        </div>
      )}
    </CollapsibleCard>
  );
}

// ─── Loading skeleton ──────────────────────────────────────────────────────

function ValuationSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      {[1, 2].map((i) => (
        <div key={i} className="card p-6 animate-pulse">
          <div className="h-4 bg-border rounded w-56 mb-5" />
          <div className="h-3 bg-background rounded w-full mb-2.5" />
          <div className="h-3 bg-background rounded w-full mb-2.5" />
          <div className="h-3 bg-background rounded w-2/3 mb-5" />
          <div className="h-20 bg-background rounded" />
        </div>
      ))}
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function ValuationPage() {
  const [selected, setSelected] = useState<StockSearchResult | null>(null);
  const [data, setData] = useState<ValuationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSelect(result: StockSearchResult) {
    setSelected(result);
    setData(null);
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(
        `/api/valuation?ticker=${encodeURIComponent(result.ticker)}`
      );
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Failed to load valuation data.");
      } else {
        setData(json as ValuationData);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      {/* ── Header ── */}
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-text-primary">
          Valuation Tools
        </h1>
        <p className="font-body text-sm text-text-secondary mt-1">
          Understand what a stock is worth — and decide for yourself.
        </p>
      </div>

      {/* ── Search ── */}
      <div className="mb-8">
        <StockSearch onSelect={handleSelect} />
        {selected && !loading && (
          <p className="font-body text-xs text-text-secondary mt-2">
            Showing valuation for{" "}
            <span className="font-mono font-bold text-text-primary">
              {selected.ticker}
            </span>{" "}
            — {selected.company_name}
          </p>
        )}
      </div>

      {/* ── Content ── */}
      {loading ? (
        <ValuationSkeleton />
      ) : error ? (
        <div className="card p-6 bg-background/60">
          <p className="font-body text-sm text-text-secondary">{error}</p>
        </div>
      ) : data ? (
        data.has_data ? (
          <div className="flex flex-col gap-5">
            <DcfSection data={data} />
            <DdmSection data={data} />
            <p className="font-body text-xs text-text-secondary text-center leading-relaxed px-4">
              These tools are educational. They show you the maths professional
              investors use — the judgment is yours. Not financial advice.
            </p>
          </div>
        ) : (
          <div className="card p-6 bg-background/60">
            <p className="font-body text-sm text-text-secondary leading-relaxed">
              Valuation data unavailable for {data.ticker}. This may be a very
              small company, ETF, or foreign-listed stock with limited
              coverage.
            </p>
          </div>
        )
      ) : (
        <div className="card p-10 text-center">
          <p className="font-body text-sm text-text-secondary">
            Search for any stock above to see its DCF and DDM valuation.
          </p>
        </div>
      )}
    </div>
  );
}
