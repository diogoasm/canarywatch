import Reveal from "@/components/Reveal";

export interface NumberedRow {
  number: string;
  title: string;
  body: string;
}

/** Ruled, numbered rows: the number and title on the left, the text beside. */
export default function NumberedRows({
  rows,
  titleAs: Title = "h3",
}: {
  rows: NumberedRow[];
  titleAs?: "h2" | "h3";
}) {
  return (
    <ol className="border-t border-border">
      {rows.map(({ number, title, body }, index) => (
        <li key={number} className="border-b border-border">
          <Reveal
            delay={index * 0.06}
            className="grid grid-cols-[2.5rem_minmax(0,1fr)] md:grid-cols-[4rem_minmax(0,2fr)_minmax(0,3fr)] items-baseline gap-x-4 md:gap-x-6 gap-y-2 py-8 sm:py-10"
          >
            <span className="font-mono text-sm tabular-nums text-gold-ink">
              {number}
            </span>
            <Title className="font-display text-xl sm:text-2xl text-text-primary">
              {title}
            </Title>
            <p className="col-start-2 md:col-start-3 font-body text-sm sm:text-base text-text-secondary leading-relaxed">
              {body}
            </p>
          </Reveal>
        </li>
      ))}
    </ol>
  );
}
