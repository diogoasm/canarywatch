import Link from "next/link";

// ─── Building blocks ───────────────────────────────────────────────────────

// Body copy for each step: a touch larger than the app's 14px, which runs to
// too many characters per line across a 680px column.
const BODY = "font-body text-[15px] text-text-primary leading-[1.7] flex flex-col gap-4";

function Step({
  label,
  labelColor = "#6B6B6B",
  title,
  children,
}: {
  label: string;
  labelColor?: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="py-10 first:pt-0 last:pb-0">
      <p
        className="font-mono text-xs uppercase tracking-widest mb-3"
        style={{ color: labelColor }}
      >
        {label}
      </p>
      <h2 className="font-display text-2xl font-medium text-text-primary mb-5">
        {title}
      </h2>
      {children}
    </section>
  );
}

function TipBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-l-2 border-canary pl-4 mt-6">
      <p className="font-body text-sm text-text-primary leading-relaxed">
        <span className="font-semibold">Where to find it: </span>
        {children}
      </p>
    </div>
  );
}

// EPS Actual vs Estimate — simple inline SVG bar comparison
function EpsBeatVisual() {
  const barW = 90;
  return (
    <div className="mt-8">
      <p className="font-body text-xs font-medium text-text-secondary uppercase tracking-wide mb-3">
        EPS Actual vs EPS Estimate
      </p>
      {/* The viewBox starts at the first bar (x=30) so the chart sits on the
          text edge; max-w-[340px] keeps the old drawing scale. */}
      <svg viewBox="30 0 300 120" className="w-full max-w-[340px] h-auto" role="img" aria-label="Example of an EPS beat: actual earnings per share above the analyst estimate">
        {/* Estimate bar */}
        <rect x="30" y="45" width={barW} height="55" rx="4" fill="#C4C0B8" />
        <text x={30 + barW / 2} y="115" textAnchor="middle" fontSize="11" fill="#6B6B6B" fontFamily="var(--font-dm-sans), sans-serif">
          Estimate
        </text>
        <text x={30 + barW / 2} y="38" textAnchor="middle" fontSize="12" fill="#6B6B6B" fontFamily="var(--font-dm-mono), monospace">
          $1.10
        </text>
        {/* Actual bar */}
        <rect x="160" y="25" width={barW} height="75" rx="4" fill="#2D9E6B" />
        <text x={160 + barW / 2} y="115" textAnchor="middle" fontSize="11" fill="#6B6B6B" fontFamily="var(--font-dm-sans), sans-serif">
          Actual
        </text>
        <text x={160 + barW / 2} y="18" textAnchor="middle" fontSize="12" fill="#1E7650" fontFamily="var(--font-dm-mono), monospace">
          $1.28
        </text>
        {/* BEAT badge */}
        <rect x="272" y="50" width="54" height="24" rx="12" fill="#1E7650" />
        <text x="299" y="66" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#FFFFFF" fontFamily="var(--font-dm-sans), sans-serif">
          BEAT
        </text>
      </svg>
      <p className="font-body text-xs text-text-secondary mt-2">
        When actual EPS lands above the estimate, the company{" "}
        <span className="text-positive-ink font-medium">beat</span>. Below it, a{" "}
        <span className="text-urgent-ink font-medium">miss</span>.
      </p>
    </div>
  );
}

// Static, visual-only checklist item
function ChecklistItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span
        className="shrink-0 mt-0.5 w-[18px] h-[18px] rounded border-2 border-text-secondary/40 bg-white"
        aria-hidden="true"
      />
      <span className="font-body text-sm text-text-primary leading-relaxed">
        {children}
      </span>
    </li>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function LearnPage() {
  return (
    <div className="px-4 sm:px-6 py-8">
      <article className="max-w-[680px] mx-auto">
        {/* ── Header ── */}
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-text-primary">
            How to Research a Stock
          </h1>
          <p className="font-body text-sm text-text-secondary mt-1">
            Canary flags what to watch. This teaches you what to do about it.
          </p>
        </div>

        <div className="divide-y divide-border">
          {/* ── Step 1: Earnings report ── */}
          <Step label="Step 1" title="Read the Earnings Report">
            <div className={BODY}>
              <p>
                Every quarter, public companies report three things that move
                their stock: <strong>EPS</strong> (earnings per share — profit
                divided by share count), <strong>revenue</strong> (total sales),
                and <strong>guidance</strong> (management&apos;s forecast for the
                next quarter or year).
              </p>
              <p>
                Before each report, analysts publish estimates. If the company
                reports above them, it <em>beat</em>; below, it <em>missed</em>.
                Stocks often move sharply on the gap between expectation and
                reality — not on the raw numbers.
              </p>
              <p>
                Guidance frequently matters more than the results themselves. A
                company can beat this quarter but crash because it lowered next
                quarter&apos;s outlook — markets price the future, not the past.
              </p>
            </div>
            <EpsBeatVisual />
            <TipBox>
              Go to Yahoo Finance → search ticker → click Financials → then
              Earnings. Or search &ldquo;[Company Name] Q1 2026 earnings
              results&rdquo; on Google.
            </TipBox>
          </Step>

          {/* ── Step 2: SEC filings ── */}
          <Step label="Step 2" title="Read the 10-K and 10-Q">
            <div className={BODY}>
              <p>
                The <strong>10-K</strong> is the annual report every US-listed
                company must file with the SEC — audited, comprehensive, and far
                more honest than a press release. The <strong>10-Q</strong> is
                its lighter quarterly cousin.
              </p>
              <p>What to look for:</p>
              <ul className="list-disc pl-5 flex flex-col gap-1.5">
                <li>
                  <strong>Revenue trend</strong> — growing, flat, or shrinking
                  over several quarters?
                </li>
                <li>
                  <strong>Operating expenses</strong> — are costs growing faster
                  than revenue?
                </li>
                <li>
                  <strong>Cash position</strong> — how long can the company fund
                  itself without raising money?
                </li>
                <li>
                  <strong>Debt levels</strong> — heavy debt gets dangerous when
                  rates rise or growth slows.
                </li>
                <li>
                  <strong>MD&amp;A</strong> — Management Discussion &amp;
                  Analysis, where leadership explains results and risks in their
                  own words.
                </li>
              </ul>
            </div>
            <TipBox>
              Go to sec.gov/edgar → search the company name → filter by 10-K or
              10-Q. Or search &ldquo;[Company] 10-K 2025 SEC filing&rdquo;.
            </TipBox>
          </Step>

          {/* ── Step 3: Analyst coverage ── */}
          <Step label="Step 3" title="What Do the Analysts Think?">
            <div className={BODY}>
              <p>
                Professional analysts publish <strong>price targets</strong>{" "}
                (where they think the stock will trade in ~12 months),{" "}
                <strong>buy/hold/sell ratings</strong>, and{" "}
                <strong>consensus estimates</strong> for earnings and revenue.
              </p>
              <p>
                Don&apos;t blindly follow any single analyst — they&apos;re wrong
                constantly. What&apos;s useful is the <em>consensus</em> and the{" "}
                <em>direction of revisions</em>: many analysts raising targets at
                once is a genuinely informative signal; a wave of downgrades is a
                warning.
              </p>
              <p>
                If a stock has <strong>no analyst coverage at all</strong>, treat
                it as higher risk. It usually means the company is too small for
                institutions to bother with — less information, less scrutiny,
                and bigger surprises in both directions.
              </p>
            </div>
            <TipBox>
              Yahoo Finance → Analysts tab. Look at the number of analysts
              covering the stock — more is generally better.
            </TipBox>
          </Step>

          {/* ── Step 4: Valuation tools ── */}
          <Step label="Step 4" title="Run the Numbers Yourself">
            <div className={BODY}>
              <p>
                <strong>DCF (Discounted Cash Flow)</strong> estimates what a
                company is worth by projecting its future cash flows and
                discounting them back to today. It works best for companies that
                actually generate cash — and it&apos;s only as good as its growth
                assumptions.
              </p>
              <p>
                <strong>DDM (Dividend Discount Model)</strong> values a stock as
                the present value of all its future dividends. It only applies to
                consistent dividend payers, and breaks down for fast growers.
              </p>
              <p>
                No model is perfect. Use these as a sanity check, not a verdict.
              </p>
            </div>
            <Link
              href="/valuation"
              className="tap inline-block bg-canary text-[#1A1A1A] font-body text-sm font-bold px-5 py-2.5 rounded-lg hover:bg-canary-dark transition-colors mt-5"
            >
              Try the Valuation Tool →
            </Link>
          </Step>

          {/* ── Step 5: Pre-trade checklist ── */}
          <Step
            label="Before You Trade"
            labelColor="#E03B3B"
            title="Ask Yourself These Questions"
          >
            <ul className="flex flex-col gap-3.5">
              <ChecklistItem>
                Do I know when the next earnings date is?
              </ChecklistItem>
              <ChecklistItem>
                Did the company beat or miss estimates last quarter?
              </ChecklistItem>
              <ChecklistItem>
                What is the analyst consensus — and has it changed recently?
              </ChecklistItem>
              <ChecklistItem>
                Am I buying because of data, or because of hype?
              </ChecklistItem>
              <ChecklistItem>
                What would make me sell this position?
              </ChecklistItem>
              <ChecklistItem>
                How much of my portfolio is this position — am I
                over-concentrated?
              </ChecklistItem>
            </ul>
          </Step>
        </div>

        {/* ── Footer ── */}
        <p className="font-body text-xs italic text-text-secondary text-center leading-relaxed mt-10 px-4">
          This guide is for educational purposes only and does not constitute
          financial advice. Always do your own research and consider consulting a
          financial advisor.
        </p>
      </article>
    </div>
  );
}
