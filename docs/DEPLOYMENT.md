# Deployment Guide

How the site is built and deployed.

---

## How it works

The site uses **GitHub Actions** to build and deploy automatically. When you push to `main`, the workflow (`.github/workflows/build-deploy.yml`) does this:

1. Checks out the repo
2. Installs Python and dependencies
3. Runs `python build.py` to generate HTML from CSVs + templates
4. Deploys the built files to GitHub Pages

You don't need Python installed to update the site — just edit files and push.

---

## What gets deployed

The Actions workflow copies only the site files to GitHub Pages:

- HTML pages (`index.html`, `cv.html`, `publications.html`, `repositories.html`, `teaching.html`, `404.html`)
- Styles/scripts (`terminal.css`, `theme.js`, `terminal-easteregg.js`)
- Config and assets (`config.yaml`, `favicon.svg`, `assets/`)

Build tooling, templates, CSVs, tests, and docs stay in the repo but aren't part of the deployed site.

---

## Deploying changes

Just push:

```bash
git add .
git commit -m "describe your change"
git push
```

The site updates within ~2 minutes. Check the **Actions** tab on GitHub if something looks wrong.

---

## Setting up GitHub Pages (first time)

1. Create the repo `yourusername/yourusername.github.io` on GitHub (public, empty)
2. Push your code:
   ```bash
   git init
   git add .
   git commit -m "Initial deploy"
   git branch -M main
   git remote add origin https://github.com/yourusername/yourusername.github.io.git
   git push -u origin main
   ```
3. On GitHub: **Settings > Pages > Source** — select **"GitHub Actions"** (not "Deploy from a branch")
4. The first Actions run triggers automatically. Site is live within a couple minutes at `https://yourusername.github.io`

---

## Local preview (optional)

If you want to see changes before pushing:

```bash
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
python build.py
```

Then open `index.html` in your browser. This is optional — you can also just push and check the live site.

---

## Moving the project to a different machine

1. Clone the repo on the new machine:
   ```bash
   git clone https://github.com/yourusername/yourusername.github.io.git
   cd yourusername.github.io
   ```
2. Edit files and push. Since GitHub Actions handles the build, you don't need Python on the new machine unless you want local preview.

---

## Rolling back

If a push breaks the site:

```bash
git revert HEAD
git push
```

Creates a new commit that undoes the last change. GitHub Actions rebuilds and redeploys within a couple minutes.

---

## GitHub Pages settings reference

- **Repo:** `orijitghosh/orijitghosh.github.io`
- **Source:** GitHub Actions
- **URL:** `https://orijitghosh.github.io`
- **Workflow:** `.github/workflows/build-deploy.yml`
