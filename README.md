# zeitgeber

A personal academic website, built around the thing I study: the daily clock. It comes with a CSV-based content management system. Edit your publications, news, CV, and repos in spreadsheets, push to GitHub, and a GitHub Actions workflow builds and deploys the site automatically. No databases, no frameworks, no CMS logins.

Live: [orijitghosh.github.io](https://orijitghosh.github.io)

---

## What it looks like

- **The site keeps circadian time.** Your local clock is converted to Zeitgeber time (ZT0 = 06:00). The theme follows the sun (light 06:00 to 18:00, dark otherwise) unless you pick one, and the nav mark is a 24-hour dial whose hand moves through the day.
- **A live fly arena** on the home page. Simulated *Drosophila* walk, rest, fly and sleep on a schedule set by the time of day (morning and evening peaks, a midday siesta, sleep at night). Move the cursor to herd them, sweep fast to scare them off, click to startle them. Toggling the theme is a light pulse, so they startle then too.
- **Two live research figures.** A double-plotted actogram whose free-running period τ you can drag, and a hidden-Markov sleep-state model that steps through wake, quiet wake, light sleep and deep sleep while its transition graph lights up.
- **Motion throughout:** an intro counter, split-text reveals, scroll-lit statements, a scroll-driven marquee, magnetic buttons, a custom cursor, tilting repo cards and circular page transitions (cross-document View Transitions, with a curtain fallback).
- **Publications** get a filter pill, live search with highlighting (press `/`), and a year histogram that doubles as navigation. Link a search with `publications.html?q=sleep`.
- **A tiny shell.** Press `` ` `` anywhere (or use the key in the footer), then type `help`.
- Everything respects `prefers-reduced-motion`, works with a keyboard, and prints cleanly. The amber and violet palette separates by luminance as well as hue, so it holds up for colour-blind readers.
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

1. **Edit `config.yaml`** — replace my name, bio, email, affiliation, tags, Google Scholar URL, etc. with yours.

2. **Edit the CSV files in `data/`** — they're already there with my data as examples. Replace the rows with your own:

   | File | Columns |
   |---|---|
   | `publications.csv` | `year, title, authors, venue, url, selected, note` |
   | `news.csv` | `date, description` |
   | `repositories.csv` | `name, description, url, languages` |
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

The Jinja2 templates are in `templates/`. Every page extends `base.html.j2` (nav, full-screen menu, footer, cursor and page-transition curtain), and small shared pieces (arrows, section eyebrows, the dial mark) live in `_macros.html.j2`. To add a new page:

1. Create `templates/newpage.html.j2` with `{% extends "base.html.j2" %}` and fill the `content` block
2. Add a row to the `PAGES` list in `build.py`
3. Add an entry to `nav_items` at the top of `base.html.j2`

### Swap out the profile image

Replace `assets/profile.webp` and `assets/profile-720.jpg` (a 720×720 fallback). Any square-ish image works; it's clipped to a circle. A photo on a white background looks best, since it's blended onto the portrait disc.

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
│   ├── base.html.j2         # shared layout: nav, menu, footer, cursor
│   ├── _macros.html.j2      # arrows, eyebrows, dial mark
│   ├── index.html.j2
│   ├── publications.html.j2
│   ├── repositories.html.j2
│   ├── cv.html.j2
│   ├── teaching.html.j2
│   └── 404.html.j2
│
├── assets/
│   ├── css/site.css         # all styling: palettes, layout, motion, print
│   ├── js/site.js           # core: theme + ZT clock, reveals, cursor, transitions, intro
│   ├── js/flies.js          # home page fly arena + ZT dial
│   ├── js/research.js       # actogram + sleep-state model
│   ├── js/publications.js   # filters, search, year histogram
│   ├── js/terminal.js       # the ` shell
│   ├── profile.webp / profile-720.jpg
│   └── CV_AG_05192026.pdf   # downloadable CV (swap with your own)
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
```

Covers CSV parsing, author bolding, template rendering, edge cases. Useful if you modify `build.py`.

## License

GPL-3.0. See [LICENSE](LICENSE).

If you use this as a starting point for your own site, a link back is appreciated but not required.
