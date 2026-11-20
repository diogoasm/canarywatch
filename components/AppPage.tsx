// The shared frame for the signed-in pages (/watchlist, /advisor, /valuation,
// /learn, /settings): one width, one left edge, one masthead, and ruled
// sections instead of boxes. Advisor's morning briefing is the model.

/** Same max width and gutters on every app page, so the left edge never moves. */
export function AppPage({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">{children}</div>
  );
}

/**
 * Small DM Mono label over a Playfair title. `aside` sits on the right from
 * sm up (Advisor's "Generated 06:29 · Regenerate"); `children` sit under the
 * title (a one-line description, or the canary strip).
 */
export function Masthead({
  label,
  title,
  description,
  aside,
  children,
}: {
  label: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  aside?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <header className="pb-8">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <p className="font-mono text-xs uppercase tracking-widest text-text-secondary mb-3">
            {label}
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-text-primary leading-tight">
            {title}
          </h1>
        </div>
        {aside && <div className="shrink-0">{aside}</div>}
      </div>
      {description && (
        <p className="font-body text-sm text-text-secondary mt-2">
          {description}
        </p>
      )}
      {children}
    </header>
  );
}

/** The mono section label used across the app pages. */
export function SectionLabel({
  children,
  className = "text-text-secondary",
  as: Tag = "h2",
}: {
  children: React.ReactNode;
  className?: string;
  as?: "h2" | "h3" | "p";
}) {
  return (
    <Tag
      className={`font-mono text-xs font-normal uppercase tracking-widest mb-6 ${className}`}
    >
      {children}
    </Tag>
  );
}

/** A ruled section: a hairline on top, generous space, no box. */
export function Section({
  label,
  labelClassName,
  children,
  className = "",
}: {
  label?: string;
  labelClassName?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`border-t border-border py-10 sm:py-12 ${className}`}>
      {label && <SectionLabel className={labelClassName}>{label}</SectionLabel>}
      {children}
    </section>
  );
}
