# BrainIAC — Paper Website

Interactive site for the Nature Neuroscience (2026) paper
**"A generalizable foundation model for analysis of human brain MRI"** by Tak, Garomsa, Zapaishchykova, et al.

Built with React + Vite + Tailwind. Recharts for visualizations. Deploys to GitHub Pages.

## Quick start

```bash
npm install
npm run dev
```

Opens on http://localhost:5173.

## Build

```bash
npm run build
npm run preview   # preview the production build locally
```

Output in `dist/`.

## Deploy to GitHub Pages

The repo ships with a ready-made GitHub Actions workflow that builds and deploys on every push to `main`.

**One-time setup:**

1. Push this repo to GitHub (e.g. `brainiac-site`).
2. Go to **Settings → Pages**.
3. Under **Source**, pick **GitHub Actions** (not "Deploy from a branch").
4. Push to `main`. The workflow in `.github/workflows/deploy.yml` will run.
5. After it finishes (1–2 min), your site will be live at
   `https://<username>.github.io/<repo-name>/`.

The `base` path in `vite.config.js` is set to `./` so the site works whether it is served
from a user page, an organization page, or a project page — no config changes needed.

## Project structure

```
brainiac-site/
├── public/
│   └── favicon.svg          # Brain logo favicon
├── src/
│   ├── App.jsx              # Main component — all sections + data
│   ├── main.jsx             # React entry point
│   └── index.css            # Tailwind + global styles + animations
├── .github/workflows/
│   └── deploy.yml           # Auto-deploy workflow
├── index.html               # Shell, fonts, OG meta
├── tailwind.config.js
├── postcss.config.js
├── vite.config.js
└── package.json
```

## Customization

All paper data lives inline at the top of `src/App.jsx`:

- `MODELS` — colors and labels for the 4 compared models
- `TASKS` — all 7 downstream tasks, each with performance curves, few-shot, linear probe
- `DATASETS` — the 34 datasets with condition assignments
- `ROBUSTNESS_DATA` — perturbation curves (contrast, Gibbs, bias)
- `CITATION` — BibTeX entry

### Swap the logo

Replace `public/favicon.svg` and edit the `BrainLogo` component in `src/App.jsx`.

### Add figures from the paper

When you have the source figures (saliency maps, Kaplan-Meier curves, t-SNE, segmentation overlays),
drop them into `public/figures/` and reference them as `./figures/figname.png`.
The `base: './'` setting in `vite.config.js` means relative paths just work.

### Change the color palette

The teal `#2dd4bf` used for BrainIAC is referenced in many places.
Global find-and-replace on that hex code will recolor the accent.

## Tech stack

- **React 18** — UI
- **Vite 5** — build tool and dev server
- **Tailwind CSS 3** — utility styling
- **Recharts 2** — line, bar, and radar charts
- **lucide-react** — icons
- **Fraunces / Geist / JetBrains Mono** — typography (loaded from Google Fonts)

## License

Site code: MIT (do whatever).
Paper content cited on the site: © The Author(s) 2026, CC BY-NC-ND 4.0. Original publication:
[doi.org/10.1038/s41593-026-02202-6](https://doi.org/10.1038/s41593-026-02202-6).
