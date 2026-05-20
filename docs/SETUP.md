# Setup Guide

One-time setup for the CSV-based content management system.

## Prerequisites

- **Git** — https://git-scm.com/downloads
- **GitHub account** with a repo named `yourusername.github.io`
- **A text editor** — VS Code, Sublime, Notepad++, Excel, or even Notepad

Python is only needed if you want to preview locally before pushing. GitHub Actions handles the build and deploy automatically.

## Step 1: Clone the repository

```bash
git clone https://github.com/orijitghosh/orijitghosh.github.io.git
cd orijitghosh.github.io
```

## Step 2: Make it yours

1. Edit `config.yaml` — replace name, bio, email, affiliation, tags, etc.
2. Edit the CSV files in `data/` — replace the rows with your own content (keep the header rows). See `docs/CSV_FORMAT.md` for column specs.
3. Replace `assets/profile.png` with your photo and `assets/CV_AG_05192026.pdf` with your CV.

## Step 3: Deploy

Create your own repo named `yourusername.github.io` on GitHub, then:

```bash
git add .
git commit -m "Initial deploy"
git branch -M main
git remote set-url origin https://github.com/yourusername/yourusername.github.io.git
git push -u origin main
```

Go to **Settings > Pages > Source** and select **"GitHub Actions"**. The included workflow builds and deploys the site automatically. It'll be live at `https://yourusername.github.io` within a couple minutes.

## Step 4: Verify

Visit `https://yourusername.github.io`. Hard-refresh (Ctrl+Shift+R) if you see a cached version.

## You're done!

From now on, just edit CSVs or config, commit, and push. See `docs/UPDATE.md` for the day-to-day workflow.

## Optional: local preview

If you want to preview changes in your browser before pushing:

```bash
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
python build.py
```

Then open `index.html` in your browser. This is entirely optional since GitHub Actions runs the build for you.
