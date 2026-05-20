# Daily Update Workflow

How to add or change content on your website.

## The workflow

1. **Edit a CSV file** in `data/` (or `config.yaml` for personal info)
2. **Commit and push:**
   ```bash
   git add .
   git commit -m "describe change"
   git push
   ```

GitHub Actions automatically runs `build.py` and deploys the site. It's live within ~2 minutes.

> **Optional:** To preview locally before pushing, run `python build.py` and open `index.html` in your browser. This requires the Python venv to be set up (see `docs/SETUP.md`).

## Adding a new publication

1. Open `data/publications.csv` in Excel, Google Sheets, or any text editor.
2. Add a new row at the bottom (order doesn't matter — the script sorts by year):

   ```csv
   2026,My New Paper Title,Ghosh Arijit; Smith John,Nature,https://doi.org/10.xxx,yes,
   ```

   Columns: `year, title, authors, venue, url, selected, note`

   - `selected` → `yes` to show on the home page; otherwise leave empty.
   - `authors` → semicolons separate authors. Format: `Lastname Firstname`. Your name (Ghosh Arijit) is auto-bolded.

3. Save the file (CSV format, UTF-8 encoding).
4. Commit and push:
   ```bash
   git add .
   git commit -m "Add publication: My New Paper Title"
   git push
   ```

## Adding news/announcements

1. Open `data/news.csv`.
2. Add a row with date as `YYYY-MM` (e.g., `2026-05`):

   ```csv
   2026-05,Gave a talk at <a href="https://...">Conference Name</a>.
   ```

3. Save, commit, push.

The home page shows the newest 7 items by default (configurable in `config.yaml` → `home_page.news_count`).

## Adding a GitHub repository

1. Open `data/repositories.csv`.
2. Add a row:
   ```csv
   MyNewRepo,Description of what it does.,https://github.com/orijitghosh/MyNewRepo,Python
   ```
   `languages` accepts a comma-separated list, wrapped in quotes if multiple: `"Python, JavaScript"`.
3. If a language isn't recognized, add it to `config.yaml` → `language_colors`.
4. Save, build, commit, push.

## Updating CV (education / experience / awards)

Edit the appropriate CSV:
- `data/education.csv`
- `data/experience.csv`
- `data/awards.csv`

For multi-bullet details, separate bullets with the **pipe character `|`**:

```csv
2022,present,Postdoc,My Lab,Did A|Did B|Did C
```

That renders as a `<ul>` with three `<li>` items.

### Updating the CV PDF

The downloadable CV PDF is at `assets/CV_AG_05192026.pdf` and linked from the CV page's "// general" section. To update it:

1. Place the new PDF in `assets/` (e.g., `assets/CV_AG_NEWDATE.pdf`)
2. Update the link in `templates/cv.html.j2` — find the `cv_pdf` line and change the filename
3. Delete the old PDF from `assets/`
4. Build, commit, push

## Updating teaching/service

Edit `data/service.csv`. The `category` column groups items into one of four sections:

- `editorial` → "// editorial & review"
- `service` → "// service at nih"
- `mentoring` → "// mentoring"
- `teaching` → "// teaching"

Use the `order` column to control display order within a category (lower = first).

## Updating personal info (bio, tags, contact)

Edit `config.yaml` (this file is committed and public — don't put secrets there).

After editing, commit and push. GitHub Actions rebuilds the site automatically.

## Git command reference

```bash
# See what changed
git status

# Stage all changes
git add .

# Commit with a message
git commit -m "Add new publication"

# Send to GitHub
git push origin main

# Get latest from GitHub (e.g., if you edited from another machine)
git pull origin main
```

## Common pitfalls

- **Forgot to activate venv:** You'll see `ModuleNotFoundError: No module named 'pandas'`. Run `venv\Scripts\activate` (or the Mac/Linux equivalent).
- **CSV has commas in cells:** Wrap the cell in double quotes: `"This, has, commas"`. To embed a literal `"`, double it: `"He said ""hi"""`.
- **Excel mangled the file:** Use "Save As → CSV UTF-8 (Comma delimited)". Or edit in a text editor.
- **GitHub Actions build failed:** Check the Actions tab on your repo for error logs. Usually a malformed CSV.
- **All 7 CSV files must exist.** They can be empty (just headers), but they must exist. See `docs/CSV_FORMAT.md` for headers.

## Verifying the live site

After pushing, give GitHub Pages 1-2 minutes. Then hard-refresh your browser (Ctrl+Shift+R / Cmd+Shift+R) to bypass cache.

If after 5 minutes the site still hasn't updated, check the **Actions** tab on GitHub for build errors.
