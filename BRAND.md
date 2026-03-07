# Varchasva Premier League — Brand Toolkit

> The single source of truth for all design tokens, fonts, and usage guidelines.

---

## 🎨 Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| **Gold** | `#EAB308` | Primary accent — CTAs, active nav, price tags, dividers |
| **Gold Light** | `#FDE047` | Gradient highlight (top of text gradient) |
| **Gold Deep** | `#A16207` | Gradient shadow (bottom of text gradient) |
| **Gold Focus** | `#CA8A04` | Hover state for gold elements |
| **Background** | `#000000` | Page background — pure black |
| **Surface** | `rgba(10,10,10,0.4)` | Glass card backgrounds |
| **Border Subtle** | `rgba(255,255,255,0.05)` | Card and panel borders |
| **Border Nav** | `rgba(255,255,255,0.05)` | Navbar bottom border |
| **Text Primary** | `#FFFFFF` | Headlines, primary content |
| **Text Secondary** | `#A1A1AA` (zinc-400) | Body text, descriptions |
| **Text Muted** | `#52525B` (zinc-600) | Labels, sub-captions |

### Role Color Tags (Player Modal)
| Role | Color |
|------|-------|
| Batsman | `#38BDF8` (sky-400) |
| Bowler | `#34D399` (emerald-400) |
| All Rounder | `#A78BFA` (violet-400) |
| Wicketkeeper | `#FBBF24` (amber-400) |

---

## 🔤 Typography

### Fonts
| Variable | Font | Source | Usage |
|----------|------|--------|-------|
| `--font-display` | **Bebas Neue** | Google Fonts | Brand wordmark ("VARCHASVA"), hero titles |
| `--font-heading` | **Rajdhani** | Google Fonts | Page headings ("SQUADS"), section labels |
| `--font-body` | **Geist** | Vercel/Google | All body text, descriptions, UI |
| `--font-mono` | **Geist Mono** | Vercel/Google | Auction prices, code, monospaced data |

### Usage Guidelines
- **Display** (`Bebas Neue`): All-caps, wide letter-spacing (`tracking-widest`). Exclusive to the brand wordmark and the hero `h1`.
- **Heading** (`Rajdhani`): Bold (`font-bold` or `font-semibold`), uppercase, tight tracking. Use for section titles like "SQUADS", "SCHEDULE", "STANDINGS".
- **Body** (`Geist`): Default font for all other text. Regular weight for body, semibold for player names.
- **Mono** (`Geist Mono`): Reserved exclusively for numerical data — auction prices, scores, statistics.

### Scale
| Name | Size | Font | Example Use |
|------|------|------|-------------|
| Display XL | `text-7xl` / `text-8xl` | Bebas Neue | Home hero title |
| Display | `text-5xl` / `text-6xl` | Bebas Neue | Team names in hero |
| Heading | `text-4xl` / `text-5xl` | Rajdhani | Page headings |
| Sub-heading | `text-xl` / `text-2xl` | Rajdhani | Card headings |
| Body | `text-sm` / `text-base` | Geist | Descriptions |
| Caption | `text-xs` | Geist | Labels, metadata |
| Mono | `text-sm` / `text-base` | Geist Mono | Prices, numbers |

---

## ✨ Glassmorphism Utilities

| Class | Description |
|-------|-------------|
| `.glass-panel` | Standard glass card — `rgba(10,10,10,0.4)` bg, 16px blur, subtle white border |
| `.glass-nav` | Navigation bar — `rgba(0,0,0,0.5)` bg, 20px blur, bottom border |

---

## 📐 Design Rules

1. **Text on dark backgrounds** — always use the `text-gold-gradient` class for the main brand title.
2. **No pure white borders** — always use opacity variants like `rgba(255,255,255,0.05)` to keep surfaces minimal.
3. **Glow effects** — use the `amber-500` color for subtle ambient glows (`opacity-5`, `blur-[120px]`).
4. **Hover states** — scale up elements 5–10%. Translate arrows/chevrons 1–2px on hover. Keep all transitions `duration-300`.
5. **Knockout Highlighting** — High-stakes matches (Semi-Finals and Final) should always use distinct `amber-500` glow borders and larger typography to separate them from Pool matches.
6. **Animations (Framer Motion)** — Use staggering for all list and card entrances (`staggerChildren: 0.1`). Use spring animations (`type: "spring", stiffness: 300, damping: 24`) for smooth, premium entry effects. Never use hard cuts for page loads.
