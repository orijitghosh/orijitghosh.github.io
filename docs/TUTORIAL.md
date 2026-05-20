# Beginner's Tutorial: Your First Update

This walks you through making your **very first content change** end-to-end. Do this once and the workflow becomes second nature.

> Time estimate: 10 minutes

---

## What you'll do

You'll add a fake "test" news item to verify the whole pipeline works, then remove it.

---

## Setup check

Open PowerShell. Navigate to your project folder:

```powershell
cd C:\Users\ariji\OneDrive\Desktop\PersonalWebsite\site
```

Activate Python virtual environment:

```powershell
venv\Scripts\activate
```

You should see `(venv)` appear at the start of your prompt. If you see a "command not recognized" error, the venv doesn't exist yet — see `docs/SETUP.md`.

---

## Step 1: Open your CSV in Excel (or any editor)

Open `data/news.csv`. You can:

- **Excel:** Right-click → Open with → Excel
- **VS Code:** Right-click → Open with → VS Code (best for HTML in cells)
- **Notepad:** Right-click → Open with → Notepad (simplest)

You'll see something like:

```
date,description
2026-03,"Received the SRBR Merit Award..."
2026-01,"Posted a <a href=""..."">Preprint</a> on..."
...
```

---

## Step 2: Add a new row

Add a row at the **bottom** of the file:

```csv
2026-12,"Test news item — please ignore. This is just a test."
```

Save the file.

> **Important:** if Excel asks "Keep this format?" choose YES (CSV). Don't save as `.xlsx`.

---

## Step 3: Run the build

In PowerShell:

```powershell
python build.py
```

You should see:

```
Loading config.yaml... OK
Reading CSV files...
  publications.csv (15 entries)
  news.csv (8 entries)        ← was 7, now 8 (your new entry counted)
  ...
Build complete.
```

If you see an error, check `docs/TROUBLESHOOTING.md`.

---

## Step 4: Preview in browser

Double-click `index.html` in your file explorer. The home page opens in your browser.

Look at the **right side** under "// latest". The newest item should be:

> **Dec 2026** — Test news item — please ignore. This is just a test.

> Note: the date displays as "Dec 2026" automatically — you typed "2026-12" in the CSV.

---

## Step 5: Remove the test row

Open `data/news.csv` again. Delete the test row you just added. Save.

Run:

```powershell
python build.py
```

Refresh `index.html` (Ctrl+R) and confirm the test item is gone.

---

## Step 6: You're ready

That's the entire workflow:

1. Edit a CSV file
2. Commit and push to GitHub
3. GitHub Actions builds and deploys automatically

If you want to preview locally before pushing, run `python build.py` and open `index.html`.

---

## Common scenarios — quick recipes

### Adding a real news item

```csv
2026-05,"Gave a talk at <a href=""https://conf-website.com"">CIRC 2026</a> in Boston."
```

### Adding a publication

In `data/publications.csv`:

```csv
2026,My New Cool Paper About Sleep,Ghosh Arijit; Smith John,Nature Genetics,https://doi.org/10.xxx,yes,
```

The `yes` in the `selected` column makes it appear on the home page too.

### Adding a new repository

In `data/repositories.csv`:

```csv
ChronoTools,Python tools for chronobiology data analysis.,https://github.com/orijitghosh/ChronoTools,Python
```

### Updating your CV (add a new award)

In `data/awards.csv`:

```csv
2026,Best Poster Award at SRBR 2026
```

### Updating your bio

Open `config.yaml` (NOT a CSV — this is YAML). Find the `bio:` section. Edit the paragraphs.

```yaml
bio:
  - 'Currently I am a... <updated bio text here>'
```

After editing, run `python build.py`.

---

## Publishing to the live site

```powershell
git add .
git commit -m "Add news: SRBR talk in Boston"
git push
```

GitHub Actions builds and deploys automatically. Wait 1-2 minutes, then visit `https://orijitghosh.github.io`. Hard-refresh with Ctrl+Shift+R to bypass cache.

---

## What if I break something?

The site is just files. Worst case, you can always:

1. **Undo unsaved changes** — just don't save the CSV.
2. **Revert local changes** — `git checkout -- path/to/file`
3. **Undo the last commit** — `git reset --soft HEAD~1`
4. **Restore from backup** — copy CSV from your Dropbox/OneDrive backup
5. **Roll back live site** — `git revert HEAD && git push`

The original Jekyll site is preserved in git history, so you can always restore it if needed.

---

## Quick command cheat sheet

| Want to... | Command |
|---|---|
| See what changed | `git status` |
| Commit changes | `git add . && git commit -m "message"` |
| Push to live site | `git push` |
| Pull updates from GitHub | `git pull` |
| Preview locally (optional) | `python build.py` then open `index.html` |
| Run tests | `pytest tests/test_build.py` |

---

## Where to find more help

- Detailed schema for each CSV: `docs/CSV_FORMAT.md`
- Daily workflow with examples: `docs/UPDATE.md`
- Errors and fixes: `docs/TROUBLESHOOTING.md`
- One-time setup on a new machine: `docs/SETUP.md`
- Deploying or migrating: `docs/DEPLOYMENT.md`
