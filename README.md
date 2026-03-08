# Varchasva Premier League

Official tournament hub for **Varchasva** — a college cricket premier league.
Built with Next.js, Tailwind CSS 4, and a live Google Sheets data backend.

---

## ✨ Features
- **IPL Dark Mode** aesthetic — pure black backgrounds, golden accents
- **Glassmorphism** cards and modals with backdrop blur
- **Brand fonts** — Bebas Neue (wordmark), Rajdhani (headings), Geist (body)
- **Live Google Sheets** integration — update team data without touching code
- **Mobile-friendly** — hamburger nav, responsive grid, full-screen modal
- **Vercel-ready** — no configuration needed

---

## � Data Source (Google Sheets)

All team and player data is pulled live from this sheet:
**[Varchasva Master Sheet](https://docs.google.com/spreadsheets/d/11T1LB7-Gwe_nCiHF4N0WbtuflCA-ltBjG6WCocuh4yM/edit?gid=667574756)**

> [!IMPORTANT]
> The sheet **must be publicly viewable**: `File → Share → Share with others → General access → Anyone with the link`.

### Sheet Format
The sheet must have the following columns (exact header names):

| Column | Description | Example |
|--------|-------------|---------|
| `TeamName` | Full team name | `Phoenix Strikers` |
| `ShortName` | 2–3 letter code | `PHX` |
| `Color` | Hex color for the team badge | `#EAB308` |
| `Players` | Comma-separated player entries | `Rahul:Batsman:12 Cr, Rohan:Bowler:8 Cr` |

**Players format:** `Name:Role:Price, Name:Role:Price, ...`

**Supported Roles** (for color coding in modal): `Batsman`, `Bowler`, `All Rounder`, `Wicketkeeper`

---

## 🚀 Local Setup

```bash
# Install dependencies
npm install

# Start dev server
npm run dev
```

Visit **http://localhost:3000** — the Squads page loads data from the Google Sheet automatically.

---

## ☁️ Deploy to Vercel (Free)

### Option A — Vercel Dashboard (recommended)
1. Push this project to a GitHub repository.
2. Go to [vercel.com](https://vercel.com) → **Add New Project** → Import your repo.
3. Vercel auto-detects Next.js. Click **Deploy**.
4. Done — your site is live!

### Option B — Vercel CLI
```bash
npm i -g vercel
vercel         # preview deploy
vercel --prod  # production deploy
```

---

## 🗂️ Project Structure

```
src/
├── app/
│   ├── layout.tsx        # Root layout + Navbar + font imports
│   ├── page.tsx          # Home / landing page
│   ├── globals.css       # Global styles, glassmorphism utilities
│   └── squads/
│       └── page.tsx      # Squads page (reads from Google Sheets)
├── components/
│   └── Navbar.tsx        # Fixed glass navbar with mobile hamburger menu
public/
│   └── logo.jpg          # Varchasva Phoenix logo
BRAND.md                  # Full brand toolkit (colors, fonts, usage rules)
```

---

## 🎨 Brand

See **[BRAND.md](./BRAND.md)** for the complete design system — color palette, font choices, type scale, and glassmorphism utility guidelines.
