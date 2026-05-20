# terminal-academic

A terminal-themed personal academic website with a CSV-based content management system. Edit your publications, news, CV, and repos in spreadsheets, run a build script, push to GitHub Pages. No databases, no frameworks, no CMS logins.

Live: [orijitghosh.github.io](https://orijitghosh.github.io)

---

## What it looks like

- Dark/light theme toggle with film-grain texture overlay
- Colorblind-accessible palettes (deuteranopia, protanopia, tritanopia)
- Responsive hamburger nav on mobile
- Terminal-style easter egg (try typing `help` in the console widget)
- Page transition animations, typing effect on the home page
- Print-friendly CV layout

## Pages

| Page | Content source |
|---|---|
| **about.sh** (home) | `config.yaml` (bio, tags) + `data/news.csv` + `data/publications.csv` (selected) |
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

2. **Create your `data/` folder** with 7 CSV files:

   ```
   mkdir data
   ```

   | File | Columns |
   |---|---|
   | `publications.csv` | `year, title, authors, venue, url, selected, note` |
   | `news.csv` | `date, description` |
   | `repositories.csv` | `name, description, url, languages` |
   | `education.csv` | `start_year, end_year, degree, institution, details` |
   | `experience.csv` | `start_year, end_year, title, institution, details` |
   | `awards.csv` | `year, description` |
   | `service.csv` | `category, description, order` |

   See `docs/CSV_FORMAT.md` for the full spec with examples.

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

Go to your repo **Settings > Pages > Branch: main, Folder: / (root) > Save**. Your site will be live in about a minute.

### Day-to-day workflow

```bash
# edit a CSV, then:
python build.py
git add .
git commit -m "Add new publication"
git push
```

That's it. No build pipelines, no CI, no deploy commands. Push and it's live.

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

All colors live in CSS custom properties at the top of `terminal.css`. The dark theme, light theme, and three colorblind palettes each have their own block. Change `--tan`, `--green`, `--accent`, `--bg`, etc. to whatever you want.

### Language colors for repo cards

`config.yaml` has a `language_colors` map (GitHub-style). If you add a repo with a language not in the list, it falls back to gray. Add new ones:

```yaml
language_colors:
  Julia: "#a270ba"
  Matlab: "#e16737"
```

### Adding pages

The Jinja2 templates are in `templates/`. Each page imports macros from `base.html.j2` (the nav bar and status bar). To add a new page:

1. Create `templates/newpage.html.j2`
2. Add the rendering call in `build.py`
3. Add a tab in the `topbar` macro in `base.html.j2`

### Swap out the profile image

Replace `assets/profile.png`. Any square-ish image works, it gets clipped to a circle via CSS.

---

## Project structure

```
.
├── config.yaml              # personal info, display settings, language colors
├── build.py                 # reads CSVs + config, renders Jinja2 templates to HTML
├── requirements.txt         # jinja2, pandas, pyyaml, pytest
│
├── data/                    # YOUR content (gitignored — stays local)
│   ├── publications.csv
│   ├── news.csv
│   ├── repositories.csv
│   ├── education.csv
│   ├── experience.csv
│   ├── awards.csv
│   └── service.csv
│
├── templates/               # Jinja2 source templates
│   ├── base.html.j2         # nav bar + status bar macros
│   ├── index.html.j2
│   ├── publications.html.j2
│   ├── repositories.html.j2
│   ├── cv.html.j2
│   └── teaching.html.j2
│
├── assets/
│   ├── profile.png
│   └── CV_AG_05192026.pdf   # downloadable CV (swap with your own)
│
├── terminal.css             # all styling — themes, responsive, print
├── theme.js                 # dark/light/colorblind toggle logic
├── terminal-easteregg.js    # interactive terminal widget
├── favicon.svg
├── 404.html
│
├── tests/
│   └── test_build.py        # 43 tests for the build script
│
├── docs/                    # guides for editing, deploying, troubleshooting
│   ├── SETUP.md
│   ├── UPDATE.md
│   ├── DEPLOYMENT.md
│   ├── TROUBLESHOOTING.md
│   ├── TUTORIAL.md
│   └── CSV_FORMAT.md
│
├── LICENSE                  # GPL-3.0
└── README.md                # you're here
```

The `data/` folder is gitignored because it contains your personal content. Everything else is in the repo so people can fork it.

## Tests

```bash
pytest tests/test_build.py -v
```

Covers CSV parsing, author bolding, template rendering, edge cases. Useful if you modify `build.py`.

## License

GPL-3.0. See [LICENSE](LICENSE).

If you use this as a starting point for your own site, a link back is appreciated but not required.
