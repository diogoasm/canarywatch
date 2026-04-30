# Canarywatch — Full Product Blueprint

## Product Vision

Canarywatch (brand name: **Canary**) is a personal AI trading coach for retail investors. It watches your portfolio and warns you before you make the mistakes retail traders make — selling before earnings, ignoring sector crashes, missing key dates. The name comes from the canary in the coal mine: an early warning system. The product lives at **canarywatch.io**.

Target user: anyone actively trading stocks — students, young professionals, casual retail investors. People who trade on platforms like eToro, Robinhood, etc. and want smarter awareness of their positions without paying for Bloomberg.

---

## Tech Stack

- **Framework**: Next.js (React) — frontend and backend
- **Styling**: Tailwind CSS
- **Database + Auth**: Supabase
- **Payments**: Stripe (monthly + annual plans)
- **Stock Data**: Alpha Vantage API (or Yahoo Finance wrapper) — real-time prices, earnings dates, news
- **AI Analysis**: Anthropic Claude API (claude-sonnet) — generates personalized portfolio briefings
- **Deployment**: Vercel
- **Domain**: canarywatch.io (Namecheap, connected via CNAME)

---

## Design System

### Philosophy
Editorial and refined. Feels like a well-designed financial newspaper — not an AI dashboard. Clean, trustworthy, and human. The kind of thing you'd be proud to show a Wharton professor.

### Color Palette
- **Background**: #F7F5F0 (warm off-white, never pure white)
- **Surface/Cards**: #FFFFFF with subtle warm shadow
- **Primary Text**: #1A1A1A (near black)
- **Secondary Text**: #6B6B6B (medium grey)
- **Canary Yellow (accent)**: #F5C842 — used sparingly for icons, CTAs, highlights
- **Red (urgent)**: #E03B3B
- **Green (positive)**: #2D9E6B
- **Border**: #E8E4DC (warm grey)

### Typography
- **Display/Headers**: Playfair Display (serif, editorial feel)
- **Body**: DM Sans (clean, modern, readable)
- **Numbers/Data**: DM Mono (monospaced, financial feel)

### Component Style
- No glowing cards, no gradients, no blobs
- Cards have subtle warm box shadows, rounded corners (8px)
- Data presented in clear hierarchy — large number, small label underneath
- Generous whitespace between sections
- Canary bird icons (SVG) used as status indicators — not emoji

### Canary Status Icons
Three states shown on watchlist next to each stock:
- 🟡 **Yellow canary**: Watch — something to monitor (earnings in 1–3 weeks, mild movement)
- 🔴 **Red canary**: Urgent — act soon (earnings in under 7 days, drop >10%, major news)
- 🟢 **Green canary**: Positive — good signal (analyst upgrade, strong momentum, positive news)
- ⚪ **Grey canary**: Neutral — nothing significant flagged right now

---

## Pages

### 1. Landing Page (/)
- Hero section: headline, subheadline, CTA to sign up
- Brief feature overview: Watchlist, AI Briefings, Canary Warnings
- Pricing section (Free vs Premium)
- Footer

Headline direction: *"Your portfolio. Watched."* or *"Know before it moves."*

### 2. Authentication (/login, /signup)
- Email + password via Supabase Auth
- Onboarding flow after signup: asks user what kind of trader they are (beginner / active), optional

### 3. My Watchlist (/watchlist)
Core page. Shows all stocks the user is tracking with:
- Stock ticker + company name (searched and autofilled via Alpha Vantage)
- Number of shares held
- Average buy price (user input)
- Current price (live from API)
- P&L in $ and %
- Canary status icon (auto-generated on page load based on API data)

Add stock flow:
1. User types ticker or company name
2. App searches Alpha Vantage, shows matching result
3. User confirms, inputs shares + avg buy price
4. Stock added to their watchlist in Supabase

Canary flag logic (runs on page load for each stock):
- Earnings in 1–7 days → Red canary
- Earnings in 8–21 days → Yellow canary
- Stock down >10% in past 5 days → Red canary
- Analyst upgrade in past 7 days → Green canary
- No significant flags → Grey canary

### 4. AI Advisor (/advisor)
The premium feature page. User clicks "Generate Briefing" and the app:

1. Fetches all their holdings from Supabase
2. Calls Alpha Vantage for current price, recent news, earnings date for each stock
3. Sends all of this as context to Claude API
4. Claude returns a structured, professional briefing

Briefing card structure (sections):
- **Portfolio Snapshot**: Total invested, current value, overall P&L %, best and worst performer
- **Key Dates**: Earnings dates for each held stock, sorted by urgency
- **Canary Warnings**: Specific flags — formatted as "ONDS earnings in 21 days. Last quarter missed EPS by $0.33. Decide your strategy before May 21."
- **Market Context**: Brief sector-level notes relevant to held stocks
- **Outlook**: Short forward-looking summary per stock with % upside/downside based on analyst targets

Claude system prompt direction:
- Professional, concise, data-driven tone
- Always uses the user's actual share count and buy price to calculate real P&L
- Never gives buy/sell recommendations — gives information and flags
- Always ends with disclaimer: "This is AI-generated analysis for informational purposes only. Not financial advice. Always do your own research."
- Response structured in clearly labelled JSON sections that the frontend renders as cards

Briefing limits:
- **Free users**: 2 briefings per month (counter stored in Supabase, resets on 1st of month)
- **Premium users**: Unlimited briefings, plus option to generate briefing for a single specific stock

### 5. Settings (/settings)
- Account info (email, password change)
- Subscription status (Free / Premium)
- Upgrade to Premium via Stripe
- Cancel subscription
- Delete account

---

## Database Schema (Supabase)

### users
Handled by Supabase Auth — email, uid, created_at

### profiles
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | FK to auth.users |
| plan | text | 'free' or 'premium' |
| briefings_used | int | resets monthly |
| briefings_reset_at | timestamp | date of last reset |
| stripe_customer_id | text | for billing |
| created_at | timestamp | |

### watchlist
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | primary key |
| user_id | uuid | FK to profiles |
| ticker | text | e.g. 'ONDS' |
| company_name | text | e.g. 'Ondas Inc' |
| shares | numeric | user input |
| avg_buy_price | numeric | user input |
| added_at | timestamp | |

### briefings
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | primary key |
| user_id | uuid | FK to profiles |
| content | jsonb | full structured briefing |
| generated_at | timestamp | |
| type | text | 'portfolio' or 'single' |
| ticker | text | null if portfolio briefing |

---

## Pricing

| Plan | Price | Features |
|------|-------|----------|
| Free | €0 | Watchlist (up to 5 stocks), 2 AI briefings/month, canary warnings |
| Premium | €9.99/month or €79/year | Unlimited stocks, unlimited briefings, single-stock briefing option |

Stripe products to create:
- canary_premium_monthly (€9.99/month)
- canary_premium_annual (€79/year)

---

## External APIs and Keys Needed

Add all to .env.local and Vercel environment variables:

| Key | Service | Purpose |
|-----|---------|---------|
| ANTHROPIC_API_KEY | Anthropic | Claude AI briefings |
| ALPHA_VANTAGE_API_KEY | Alpha Vantage | Stock prices, earnings, news |
| NEXT_PUBLIC_SUPABASE_URL | Supabase | Database |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Supabase | Database |
| STRIPE_SECRET_KEY | Stripe | Payments backend |
| NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY | Stripe | Payments frontend |
| STRIPE_WEBHOOK_SECRET | Stripe | Webhook verification |

---

## Build Order (Claude Code Sequence)

1. Project scaffold — Next.js, Tailwind, folder structure, design tokens
2. Landing page — hero, features, pricing section, footer
3. Supabase setup — auth, profiles table, watchlist table, briefings table
4. Authentication — signup, login, onboarding flow
5. Watchlist page — add stock (search via Alpha Vantage), display holdings, P&L calculation
6. Canary warning system — on page load, fetch flags per stock, display canary icons
7. AI Advisor page — briefing generation, Claude API integration, structured card display
8. Briefing limit system — free user counter, reset logic, upgrade prompt
9. Stripe integration — Premium plans, checkout, webhooks, plan gating
10. Settings page — account, subscription management
11. Polish — mobile responsiveness, loading states, error handling
12. Deploy — Vercel, environment variables, custom domain canarywatch.io

---

## Key Product Principles

- **Never information overload**: Briefings are concise. Canary icons are scannable. The user should be able to understand their portfolio situation in under 60 seconds.
- **Always data-driven**: Every AI statement is grounded in the user's actual numbers — their shares, their buy price, real API data. Not generic market commentary.
- **Professional but human**: Tone is like a smart friend who works in finance, not a Bloomberg terminal.
- **Mobile-first**: Many users will check this on their phone.
- **Disclaimer always present**: Every AI output ends with the standard financial disclaimer.
