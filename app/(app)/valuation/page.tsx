"use client";

import { Fragment, useEffect, useId, useRef, useState } from "react";
import StockSearch from "@/components/StockSearch";
import { createClient } from "@/lib/supabase/client";
import type { StockSearchResult } from "@/types";
import { AppPage, Masthead, SectionLabel } from "@/components/AppPage";
import { formatMoney, formatMoneyCompact } from "@/lib/format";
import { apiErrorMessage, PLAIN, reportError } from "@/lib/errors";

// ─── Types (mirrors /api/valuation response) ───────────────────────────────

interface FcfQuarter {
  date: string;
  free_cash_flow: number;
}

interface DcfResult {
  applicable: boolean;
  intrinsic_value: number | null;
  fmp_estimate: number | null;
  growth_rate: number | null;
  annual_fcf: number | null;
  shares_outstanding: number | null;
  note: string | null;
}

interface ValuationData {
  ticker: string;
  current_price: number | null;
  dcf: DcfResult;
  fcf_quarters: FcfQuarter[];
  pays_dividend: boolean;
  annual_dividend: number | null;
  dividend_growth_rate: number | null;
  has_data: boolean;
  unavailable_reason: string | null;
}

const REQUIRED_RETURN = 0.1; // r — standard market assumption

// ─── Formatting helpers ────────────────────────────────────────────────────

function fmtQuarter(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const q = Math.floor(d.getMonth() / 3) + 1;
  return `Q${q} ${d.getFullYear()}`;
}

// ─── Explanatory notes ─────────────────────────────────────────────────────
//
// Each "?" is a small button. Pressing it (click, tap, Enter or Space) opens
// the explanation inline, under the line it belongs to, so it can never run
// off the screen; pressing it again closes it.

function useNote() {
  const id = useId();
  const [open, setOpen] = useState(false);
  return { id, open, toggle: () => setOpen((o) => !o) };
}
type Note = ReturnType<typeof useNote>;

function NoteButton({ note, about }: { note: Note; about: string }) {
  return (
    <button
      type="button"
      aria-expanded={note.open}
      aria-controls={note.id}
      aria-label={`About ${about}`}
      onClick={note.toggle}
      className={`tap inline-flex items-center justify-center align-middle ml-1.5 w-4 h-4 rounded-full border font-body text-[10px] leading-none normal-case tracking-normal transition-colors ${
        note.open
          ? "bg-[#1A1A1A] border-[#1A1A1A] text-white"
          : "border-text-secondary text-text-secondary hover:border-[#1A1A1A] hover:text-[#1A1A1A]"
      }`}
    >
      ?
    </button>
  );
}

function NoteText({ note, children }: { note: Note; children: React.ReactNode }) {
  return (
    <p
      id={note.id}
      hidden={!note.open}
      className="mt-2 mb-1 border-l-2 border-canary pl-3 font-body text-sm text-text-secondary leading-relaxed max-w-prose normal-case tracking-normal"
    >
      {children}
    </p>
  );
}

// ─── Collapsible section shell ─────────────────────────────────────────────

function CollapsibleCard({
  title,
  about,
  children,
  defaultOpen = true,
}: {
  title: string;
  /** The explanation behind the "?" beside the title. */
  about?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const note = useNote();
  return (
    <section className="border-t border-border">
      <div className="flex items-center gap-1">
        <h2 className="min-w-0">
          <button
            onClick={() => setOpen((o) => !o)}
            className="py-6 text-left font-display text-xl font-bold text-text-primary focus-inset"
            aria-expanded={open}
          >
            {title}
          </button>
        </h2>
        {about && <NoteButton note={note} about={title} />}
        {/* The chevron is a larger click target for the same toggle; the
            title button is the one keyboards and screen readers use. */}
        <div
          aria-hidden="true"
          onClick={() => setOpen((o) => !o)}
          className="flex-1 self-stretch flex items-center justify-end cursor-pointer pl-4"
        >
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
        </div>
      </div>
      {about && (
        <div className="-mt-3 mb-5">
          <NoteText note={note}>{about}</NoteText>
        </div>
      )}
      {open && <div className="pb-12">{children}</div>}
    </section>
  );
}

// ─── Value comparison rows ─────────────────────────────────────────────────

function ValueRow({
  label,
  value,
  about,
  valueClass = "text-text-primary",
}: {
  label: string;
  value: string;
  about?: string;
  valueClass?: string;
}) {
  const note = useNote();
  return (
    <div className="py-3 border-b border-border last:border-0">
      <div className="flex items-center justify-between gap-4">
        <span className="font-body text-sm text-text-secondary">
          {label}
          {about && <NoteButton note={note} about={label} />}
        </span>
        <span className={`font-mono text-sm font-bold text-right ${valueClass}`}>
          {value}
        </span>
      </div>
      {about && <NoteText note={note}>{about}</NoteText>}
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
      label="Premium or discount to intrinsic value"
      value={`${Math.abs(pct).toFixed(1)}% ${above ? "above" : "below"} intrinsic value`}
      valueClass={above ? "text-urgent-ink" : "text-positive-ink"}
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
              {formatMoneyCompact(q.free_cash_flow)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// One line of the DDM formula with its own "?" note under it.
function NotedLine({
  about,
  note: text,
  children,
}: {
  about: string;
  note: string;
  children: React.ReactNode;
}) {
  const note = useNote();
  return (
    <div>
      <p className="font-body text-sm text-text-secondary">
        {children}
        <NoteButton note={note} about={about} />
      </p>
      <NoteText note={note}>{text}</NoteText>
    </div>
  );
}

function FcfBlock({ quarters }: { quarters: FcfQuarter[] }) {
  const note = useNote();
  return (
    <div className="mb-5">
      <SectionLabel as="h3" className="text-text-secondary !mb-3">
        Free cash flow, last 4 quarters
        <NoteButton note={note} about="free cash flow" />
      </SectionLabel>
      <div className="-mt-1 mb-3">
        <NoteText note={note}>
          Free cash flow is the actual cash a company generates after capital
          expenditures. Growing FCF is generally a positive sign.
        </NoteText>
      </div>
      <FcfChart quarters={quarters} />
    </div>
  );
}

// ─── DCF card ──────────────────────────────────────────────────────────────

function DcfSection({ data }: { data: ValuationData }) {
  const dcf = data.dcf;

  if (!dcf.applicable || dcf.intrinsic_value === null) {
    return (
      <section className="border-t border-border pt-6 pb-12">
        <h2 className="font-display text-xl font-bold text-text-secondary mb-2">
          DCF not applicable
        </h2>
        <p className="font-body text-sm text-text-secondary leading-relaxed">
          {data.ticker} does not have positive free cash flow history required
          for a meaningful DCF calculation. This is common for early-stage or
          unprofitable companies.
        </p>
      </section>
    );
  }

  return (
    <CollapsibleCard
      title="Discounted Cash Flow (DCF)"
      about="DCF calculates what a company's future cash flows are worth in today's money. It's the most widely used valuation method by professional investors."
    >
      <div className="mb-4">
        {data.current_price !== null && (
          <ValueRow
            label="Current market price"
            value={formatMoney(data.current_price)}
          />
        )}
        <ValueRow
          label="DCF intrinsic value"
          value={formatMoney(dcf.intrinsic_value)}
          about="This is what the model estimates the stock is worth based on projected future cash flows discounted back to today. This is a model output, not a fact — it depends heavily on growth assumptions which may not reflect reality."
        />
        {data.current_price !== null && (
          <PremiumDiscountRow
            price={data.current_price}
            intrinsic={dcf.intrinsic_value}
          />
        )}
      </div>

      {dcf.note !== null ? (
        <p className="font-body text-xs text-text-secondary leading-relaxed mb-6">
          {dcf.note}
        </p>
      ) : (
        <p className="font-body text-xs text-text-secondary leading-relaxed mb-6">
          {dcf.fmp_estimate !== null && (
            <>
              Our calculation:{" "}
              <span className="font-mono text-text-primary">
                {formatMoney(dcf.intrinsic_value)}
              </span>{" "}
              | FMP estimate:{" "}
              <span className="font-mono text-text-primary">
                {formatMoney(dcf.fmp_estimate)}
              </span>
              <br />
            </>
          )}
          Assumptions:{" "}
          {dcf.growth_rate !== null
            ? `${(dcf.growth_rate * 100).toFixed(1)}% annual FCF growth`
            : "conservative FCF growth"}
          , 10% discount rate, 2.5% terminal growth over 5 years.
        </p>
      )}

      {data.fcf_quarters.length > 0 && (
        <FcfBlock quarters={data.fcf_quarters} />
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
      <section className="border-t border-border pt-6 pb-12">
        <h2 className="font-display text-xl font-bold text-text-secondary mb-2">
          DDM not applicable
        </h2>
        <p className="font-body text-sm text-text-secondary leading-relaxed">
          The Dividend Discount Model only applies to stocks that pay regular
          dividends. {data.ticker} does not currently pay a dividend, so DDM
          cannot be used to estimate its value.
        </p>
      </section>
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
      about="DDM values a stock based on the present value of all future dividend payments. Best for stable, mature companies with consistent dividend growth."
    >
      {/* Gordon Growth Model formula */}
      <div className="border-l-2 border-border pl-5 py-1 mb-6">
        <p className="font-mono text-sm text-text-primary mb-4">
          Intrinsic Value = D₁ / (r − g)
        </p>
        <div className="flex flex-col gap-2">
          <p className="font-body text-sm text-text-secondary">
            <span className="font-mono font-bold text-text-primary">D₁</span> ={" "}
            Next year&apos;s expected dividend:{" "}
            <span className="font-mono text-text-primary">{formatMoney(d1)}</span>
          </p>
          <NotedLine
            about="required rate of return"
            note="The required rate of return (10%) represents what investors typically expect to earn from stocks historically."
          >
            <span className="font-mono font-bold text-text-primary">r</span> ={" "}
            Required rate of return:{" "}
            <span className="font-mono text-text-primary">10%</span>
          </NotedLine>
          <NotedLine
            about="dividend growth rate"
            note="Calculated from the last 3 years of dividend history. Past growth doesn't guarantee future growth."
          >
            <span className="font-mono font-bold text-text-primary">g</span> ={" "}
            Dividend growth rate:{" "}
            <span className="font-mono text-text-primary">
              {data.dividend_growth_rate !== null
                ? `${(g * 100).toFixed(1)}%`
                : "0.0% (insufficient history)"}
            </span>
          </NotedLine>
          {intrinsic !== null && (
            <p className="font-body text-sm text-text-primary pt-2 border-t border-border mt-1">
              = Intrinsic value:{" "}
              <span className="font-mono font-bold">
                {formatMoney(intrinsic)} per share
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
            label="Current market price"
            value={formatMoney(data.current_price)}
          />
          <ValueRow
            label="DDM intrinsic value"
            value={formatMoney(intrinsic)}
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
    <div aria-hidden="true">
      {[1, 2].map((i) => (
        <div key={i} className="border-t border-border pt-6 pb-12 animate-pulse">
          <div className="h-5 bg-border w-56 mb-8" />
          <div className="h-3 bg-border/60 w-full mb-4" />
          <div className="h-3 bg-border/60 w-full mb-4" />
          <div className="h-3 bg-border/60 w-2/3 mb-8" />
          <div className="h-20 bg-border/40" />
        </div>
      ))}
    </div>
  );
}

// ─── Quick picks from the watchlist ────────────────────────────────────────

type Holding = Pick<StockSearchResult, "ticker" | "company_name">;

function QuickPicks({
  holdings,
  selectedTicker,
  onPick,
}: {
  holdings: Holding[] | null;
  selectedTicker: string | null;
  onPick: (stock: StockSearchResult) => void;
}) {
  // Holds the line's space while the watchlist loads, so nothing jumps when
  // it arrives.
  if (holdings === null) {
    return (
      <p aria-hidden className="font-body text-sm mt-3 invisible">
        &nbsp;
      </p>
    );
  }

  if (holdings.length === 0) {
    if (selectedTicker) return null;
    return (
      <p className="font-body text-sm text-text-secondary mt-3">
        Search any stock to see its DCF and DDM valuation.
      </p>
    );
  }

  return (
    <p className="font-body text-sm text-text-secondary mt-3">
      Your holdings:{" "}
      {holdings.map((h, i) => {
        const active = h.ticker === selectedTicker;
        return (
          <Fragment key={h.ticker}>
            {/* The extra space keeps neighbouring 44px tap areas from
                overlapping when a ticker is short (KO). */}
            {i > 0 && <span className="mx-1.5"> · </span>}
            <button
              type="button"
              title={h.company_name}
              aria-pressed={active}
              onClick={() => onPick({ ...h, exchange: "" })}
              className={`tap font-mono underline underline-offset-4 transition-colors ${
                active
                  ? "text-[#1A1A1A] decoration-canary decoration-2"
                  : "text-text-secondary decoration-text-secondary/40 hover:text-[#1A1A1A]"
              }`}
            >
              {h.ticker}
            </button>
          </Fragment>
        );
      })}
    </p>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function ValuationPage() {
  const [selected, setSelected] = useState<StockSearchResult | null>(null);
  const [data, setData] = useState<ValuationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // null while loading; a failed fetch counts as an empty watchlist.
  const [holdings, setHoldings] = useState<Holding[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      let rows: Holding[] = [];
      try {
        const { data } = await createClient()
          .from("watchlist")
          .select("ticker, company_name")
          .order("added_at", { ascending: true });
        rows = (data ?? []) as Holding[];
      } catch {
        // Fall through with no holdings.
      }
      // Two lots of the same stock are two rows but one link.
      const unique = rows.filter(
        (h, i) => rows.findIndex((r) => r.ticker === h.ticker) === i
      );
      if (!cancelled) setHoldings(unique);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // The quick picks stay on screen, so a second pick can land before the
  // first answer. Only the latest request may write to the page.
  const latestRequest = useRef(0);

  async function handleSelect(result: StockSearchResult) {
    const run = ++latestRequest.current;
    setSelected(result);
    setData(null);
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(
        `/api/valuation?ticker=${encodeURIComponent(result.ticker)}`
      );
      const json = await res.json();
      if (run !== latestRequest.current) return;
      if (!res.ok) {
        setError(apiErrorMessage("valuation", res, json, PLAIN.load));
      } else {
        setData(json as ValuationData);
        if (!json.has_data) console.info("[valuation] no data:", json.unavailable_reason);
      }
    } catch (err) {
      if (run !== latestRequest.current) return;
      setError(reportError("valuation", err, PLAIN.network));
    } finally {
      if (run === latestRequest.current) setLoading(false);
    }
  }

  return (
    <AppPage>
      <Masthead
        label="Valuation"
        title="What is it worth?"
        description="Search any stock, or pick one you hold. The maths is shown; the judgement is yours."
      />

      {/* Label-and-value rows read badly at full width, so the tools keep a
          narrower column on the shared left edge. */}
      <div className="max-w-2xl">
        {/* ── Search ── */}
        <div className="pb-10">
          <StockSearch label="Find a stock" onSelect={handleSelect} />
          <QuickPicks
            holdings={holdings}
            selectedTicker={selected?.ticker ?? null}
            onPick={handleSelect}
          />
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
          <p role="alert" className="border-t border-border py-6 font-body text-sm text-urgent-ink">
            {error}
          </p>
        ) : data ? (
          data.has_data ? (
            <div>
              <DcfSection data={data} />
              <DdmSection data={data} />
              <p className="border-t border-border pt-6 font-body text-xs text-text-secondary leading-relaxed">
                These tools are educational. They show you the maths professional
                investors use — the judgment is yours. Not financial advice.
              </p>
            </div>
          ) : (
            <p className="border-t border-border py-6 font-body text-sm text-text-secondary leading-relaxed">
              There isn&apos;t enough data to value {data.ticker} yet. Smaller or
              newly listed companies often don&apos;t report the cash flow or
              dividend history these models need.
            </p>
          )
        ) : null}
      </div>
    </AppPage>
  );
}
