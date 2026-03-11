# Colaboree StockInsight

> Know your stocks. Before you miss the move.

A stock intelligence platform with live prices, P/E ratios, OracleValue™ intrinsic estimates, and valuation charts — powered by Yahoo Finance.

![StockInsight](https://img.shields.io/badge/Built%20with-React%20%2B%20Vite-61dafb?style=flat&logo=react)

---

## 🚀 Quick Start

```bash
# 1. Clone the repo
git clone https://github.com/YOUR_USERNAME/colaboree-stockinsight.git
cd colaboree-stockinsight

# 2. Install dependencies
npm install

# 3. Run locally
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🏗️ Build for Production

```bash
npm run build
```

Output goes to the `dist/` folder — ready to deploy anywhere.

---

## 🌐 Deploy to GitHub Pages (Automatic)

This repo includes a GitHub Actions workflow that auto-deploys on every push to `main`.

**One-time setup:**
1. Go to your repo → **Settings** → **Pages**
2. Under **Source**, select **GitHub Actions**
3. Push to `main` — it deploys automatically ✅

Your live URL will be: `https://YOUR_USERNAME.github.io/colaboree-stockinsight/`

> **Note:** If your repo name is different, update `base` in `vite.config.js`:
> ```js
> base: '/your-repo-name/'
> ```

---

## 📦 Tech Stack

| Tool | Purpose |
|------|---------|
| React 18 | UI framework |
| Vite 5 | Build tool & dev server |
| Yahoo Finance API | Live stock data (free, no API key needed) |
| TradingView Widget | Interactive price charts |

---

## ✨ Features

- 🔍 Search any stock ticker
- 📈 Live price, change %, OHLV data
- 🏦 Fundamentals: P/E, Forward P/E, PEG, ROE, ROIC, Debt/Equity
- 🧮 OracleValue™ — intrinsic value estimate
- 📊 Valuation chart with DCF, PS, PE, PB models
- 📉 TradingView interactive chart

---

## 📄 License

MIT — free to use and modify.
