# Setup Guide

One-time setup for the CSV-based content management system.

## Prerequisites

- **Python 3.8 or newer** — https://www.python.org/downloads/
- **Git** — https://git-scm.com/downloads
- **A text editor** — VS Code, Sublime, Notepad++, or even Notepad
- **GitHub account** with the repo `orijitghosh.github.io`

## Step 1: Clone the repository

```bash
git clone https://github.com/orijitghosh/orijitghosh.github.io.git
cd orijitghosh.github.io
```

> Note: The repo only contains the built site files (HTML, CSS, JS, assets). Build tooling (`build.py`, `requirements.txt`, `templates/`, `tests/`, `docs/`) and data (`data/`) are gitignored and must be set up separately — see "Portable project setup" below.

## Step 2: Set up Python environment

**Windows (PowerShell):**
```powershell
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

**Mac/Linux:**
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

You should see `jinja2`, `pandas`, `pyyaml`, and `pytest` install.

> Note for NIH/corporate machines: Defender real-time scanning makes pip slow. The install will finish; just be patient.

## Step 3: Create your `data/` folder and CSV files

The `data/` folder is **gitignored** so it's empty after cloning. You need to create your CSV files locally.

```bash
mkdir data
```

Create these 7 files inside `data/` with the headers listed in `docs/CSV_FORMAT.md`:

- `data/publications.csv`
- `data/news.csv`
- `data/repositories.csv`
- `data/education.csv`
- `data/experience.csv`
- `data/awards.csv`
- `data/service.csv`

You can populate them with your real data, or copy starter content from `docs/CSV_FORMAT.md`.

## Step 4: First build

```bash
python build.py
```

Expected output:
```
Loading config.yaml... OK
Reading CSV files...
  publications.csv (N entries)
  news.csv (N entries)
  ...
Build complete.
```

If you see errors, check `docs/TROUBLESHOOTING.md`.

## Step 5: Preview locally

Open `index.html` in a web browser (double-click the file). Click through the navigation tabs to verify all pages render. On mobile or narrow screens, use the hamburger menu (☰) to access navigation tabs.

## Step 6: Configure GitHub Pages

1. Push the repo (if not already done):
   ```bash
   git push origin main
   ```
2. On GitHub, go to your repo → **Settings → Pages**
3. **Source:** Deploy from a branch
4. **Branch:** `main`, **Folder:** `/ (root)`
5. Click **Save**

After ~1 minute, the site is live at `https://orijitghosh.github.io`.

## Step 7: Verify deployment

Visit `https://orijitghosh.github.io`. The site should match your local `index.html`.

## You're done!

To add new content from now on, see `docs/UPDATE.md`.

## Important: back up your CSV files

`data/*.csv` is gitignored — **GitHub does not have a copy.** Back up regularly:

- Copy to a personal cloud folder (Dropbox, OneDrive, Google Drive)
- Or keep a private second repo just for the data
- Or take periodic local backups

If you lose the CSV files, you can rebuild them from the live HTML, but it's painful. Back up.

## Portable project setup (moving to a new machine)

When you copy or clone this project to a new machine, remember that the following are **not in the GitHub repo** (gitignored):

- `data/` — your CSV content files (copy from backup or previous machine)
- `build.py`, `requirements.txt` — the build script and dependencies
- `templates/` — Jinja2 source templates
- `tests/` — test suite
- `docs/` — documentation (including this file)
- `venv/` — Python virtual environment (recreate on each machine)

Copy these from your previous machine or backup, then:

```powershell
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python build.py
```
