import { permanentRedirect } from "next/navigation";

// Must redirect at request time. When this is statically prerendered, Next 14
// stores only the 308 status (no Location header) and Vercel serves a broken
// redirect — the same bug that caused the "Redirect error" on the old homepage.
export const dynamic = "force-dynamic";

// Content moved to the homepage — keep the old URL resolving for existing links.
export default function HowItWorksPage() {
  permanentRedirect("/");
}
