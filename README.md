# zeitgeber

A personal academic website, built around the thing I study: the daily clock. It comes with a CSV-based content management system. Edit your publications, news, CV, and repos in spreadsheets, push to GitHub, and a GitHub Actions workflow builds and deploys the site automatically. No databases, no frameworks, no CMS logins.

Live: [orijitghosh.github.io](https://orijitghosh.github.io)

---

## What it looks like

- **The site keeps circadian time.** Your local clock is converted to Zeitgeber time (ZT0 = 06:00). The theme follows the sun (warm cotton paper from 06:00 to 18:00, dark slate otherwise) unless you pick one, and the nav mark is a 24-hour dial whose hand moves through the day.
- **Personal research figures on the live demo (excluded on forks):** On [orijitghosh.github.io](https://orijitghosh.github.io), the home page includes two bespoke simulations for my own work—a double-plotted *Drosophila* actogram (free-running period τ and *period* alleles) and a generative four-state hidden Markov model. **These two figures are personal to my site and are automatically excluded when you build your own website from a fork** (as soon as you change `github:` in `config.yaml`, or if you start from `config.example.yaml`).
- **Calm, zero-clutter typography:** immediate rendering with no intro preloaders, custom cursors, or scroll-jacking—just readable prose, selected publication summaries, and structured CV/code pages.
- **Publications** get a filter pill, live search with highlighting (press `/`), and a year histogram that doubles as navigation. Link a search with `publications.html?q=sleep`.
- **A tiny shell** (`terminal.js`, press `` ` `` anywhere or use the footer button) and an interactive fly arena tucked onto the `404.html` page.
- Everything respects `prefers-reduced-motion`, works with a keyboard, and prints cleanly. The ochre and dusk-violet palette separates by luminance as well as hue, so it holds up for colour-blind readers.
- No frameworks and no build step for the front end: plain CSS and classic `defer` scripts, so opening `index.html` straight from disk works.

## Pages

| Page | Content source |
|---|---|
| **About** (home) | `config.yaml` (bio, tags) + `data/news.csv` + `data/publications.csv` (selected) |
| **publications** | `data/publications.csv` — auto-sorted by year, author name auto-bolded |
| **repositories** | `data/repositories.csv` — language color dots from config |
| **cv** | `data/education.csv` + `data/experience.csv` + `data/awards.csv` |
| **teaching** | `data/service.csv` — category column splits into editorial/service/mentoring/teaching |

---

## Fork it for yourself

### Prerequisites

- Python 3.8+
- Git

### Setup

```bash
git clone https://github.com/orijitghosh/orijitghosh.github.io.git my-site
cd my-site

python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### Make it yours

1. **Edit `config.yaml`** (or start fresh with `cp config.example.yaml config.yaml`) — replace my name, `github` username, bio, email, affiliation, tags, Google Scholar URL, etc. with yours.
   > **Note:** The interactive actogram and hidden Markov model figures on my live site are personal to my research and are **automatically omitted** once `github:` is no longer `orijitghosh`. Your home page will cleanly show **About → Selected publications → Recent updates** (or you can add optional plain-text `research.topics` in `config.yaml`).

2. **Edit the CSV files in `data/`** — they're already there with my data as examples. Replace the rows with your own:

   | File | Columns |
   |---|---|
   | `publications.csv` | `year, title, authors, venue, url, selected, note, summary` (`summary` optional) |
   | `news.csv` | `date, description` |
   | `repositories.csv` | `name, description, url, languages, link_url, link_label` (`link_*` optional) |
   | `education.csv` | `start_year, end_year, degree, institution, details` |
   | `experience.csv` | `start_year, end_year, title, institution, details` |
   | `awards.csv` | `year, description` |
   | `service.csv` | `category, description, order` |

   Keep the header row, replace everything below it. See `docs/CSV_FORMAT.md` for the full spec with examples.

3. **Build:**

   ```bash
   python build.py
   ```

4. **Preview** — open `index.html` in your browser.

### Deploy to GitHub Pages

Create a repo named `yourusername.github.io` on GitHub, then:

```bash
git add .
git commit -m "Initial deploy"
git branch -M main
git remote set-url origin https://github.com/yourusername/yourusername.github.io.git
git push -u origin main
```

Then go to your repo **Settings > Pages > Source** and select **"GitHub Actions"** (not "Deploy from a branch"). The included workflow (`.github/workflows/build-deploy.yml`) handles the rest — it installs Python, runs `build.py`, and deploys the output.

Your site will be live at `https://yourusername.github.io` within a couple minutes.

### Day-to-day workflow

```bash
# edit a CSV or template, then just push:
git add .
git commit -m "Add new publication"
git push
```

GitHub Actions runs `build.py` automatically on every push. You don't need Python installed to update the site — just edit files and push.

If you want to preview locally before pushing, you can still run `python build.py` and open `index.html` in your browser.

---

## CSV conventions

A few things that might not be obvious:

- **Authors** in `publications.csv` are semicolon-separated (`Ghosh Arijit; Smith John`). Names matching `author_bold_patterns` in `config.yaml` get auto-bolded.
- **`selected: yes`** in publications — those show up on the home page. Leave blank otherwise.
- **Pipe `|` separates bullet points** in the `details` column of education/experience CSVs. `Did A|Did B|Did C` renders as a bulleted list.
- **`category`** in `service.csv` must be one of: `editorial`, `service`, `mentoring`, `teaching`. Controls which section the item appears under.
- **`date`** in `news.csv` is `YYYY-MM` format (e.g., `2026-05`). Auto-formatted to "May 2026" in the output.
- **HTML is allowed** in most description fields — links, `<em>`, `<code>`, etc. If the cell contains commas, wrap it in double quotes.

## Customization

### Colors and theme

All colours are CSS custom properties at the top of `assets/css/site.css`, with one block for the night (dark) palette and one for the day (light) palette. The main ones are `--bg`, `--ink`, `--sun` (the amber accent), `--dusk` (the violet accent) and `--fly`.

### Language colors for repo cards

`config.yaml` has a `language_colors` map (GitHub-style). If you add a repo with a language not in the list, it falls back to gray. Add new ones:

```yaml
language_colors:
  Julia: "#a270ba"
  Matlab: "#e16737"
```

### Adding pages

The Jinja2 templates are in `templates/`. Every page extends `base.html.j2` (nav, mobile menu, and footer), and small shared pieces (arrows and the 24-hour dial mark) live in `_macros.html.j2`. To add a new page:

1. Create `templates/newpage.html.j2` with `{% extends "base.html.j2" %}` and fill the `content` block
2. Add a row to the `PAGES` list in `build.py`
3. Add an entry to `nav_items` at the top of `base.html.j2`

### Swap out the profile image

Replace `assets/profile.webp` and `assets/profile-720.jpg` (a 720×720 fallback). Any square-ish image works; it renders in a clean portrait frame on the About section.

---

## Project structure

```
.
├── config.yaml              # personal info, display settings, language colors
├── build.py                 # reads CSVs + config, renders Jinja2 templates to HTML
├── requirements.txt         # jinja2, pandas, pyyaml, pytest
│
├── data/                    # YOUR content — replace with your own
│   ├── publications.csv
│   ├── news.csv
│   ├── repositories.csv
│   ├── education.csv
│   ├── experience.csv
│   ├── awards.csv
│   └── service.csv
│
├── templates/               # Jinja2 source templates
│   ├── base.html.j2         # shared layout: nav, mobile menu, footer
│   ├── _macros.html.j2      # arrows, dial mark
│   ├── index.html.j2
│   ├── publications.html.j2
│   ├── repositories.html.j2
│   ├── cv.html.j2
│   ├── teaching.html.j2
│   └── 404.html.j2
│
├── assets/
│   ├── css/site.css         # all styling: day/night palettes, layout, print
│   ├── js/site.js           # core: theme + ZT clock, mobile menu, copy email
│   ├── js/flies.js          # 404 page fly arena
│   ├── js/research.js       # interactive actogram + sleep-state HMM
│   ├── js/publications.js   # filters, search, year histogram
│   ├── js/terminal.js       # the ` shell
│   ├── profile.webp / profile-720.jpg
│   └── CV_AG_11202026.pdf   # downloadable CV (swap with your own)
│
├── favicon.svg
├── 404.html
│
├── tests/
│   └── test_build.py        # tests for the build script
│
├── docs/                    # guides for editing, deploying, troubleshooting
│   ├── SETUP.md
│   ├── UPDATE.md
│   ├── DEPLOYMENT.md
│   ├── TROUBLESHOOTING.md
│   ├── TUTORIAL.md
│   └── CSV_FORMAT.md
│
├── .github/workflows/
│   └── build-deploy.yml     # GitHub Actions: auto build + deploy on push
├── LICENSE                  # GPL-3.0
└── README.md                # you're here
```

The `data/` folder contains my actual content as working examples. Fork the repo, replace the CSVs with your own data, and you're good to go.

## Tests

```bash
pytest tests/test_build.py -v
node --test tests/*.test.cjs
```

Covers CSV parsing, author bolding, template rendering, edge cases. Useful if you modify `build.py`.

## License

GPL-3.0. See [LICENSE](LICENSE).

If you use this as a starting point for your own site, a link back is appreciated but not required.
