# Deployment Guide

How the site is deployed and how to set it up on GitHub Pages.

---

## Current setup

The site is deployed at `https://orijitghosh.github.io` via GitHub Pages, serving from the `main` branch root.

The old Jekyll/al-folio site was archived (renamed to `orijitghosh.github.io-old-alfolio`) and a fresh repo `orijitghosh.github.io` was created for this new static site.

---

## What gets deployed (and what doesn't)

The `.gitignore` keeps build tooling and private data out of the repo. Only the built site is pushed.

**Deployed (in the GitHub repo):**
- `index.html`, `cv.html`, `publications.html`, `repositories.html`, `teaching.html`, `404.html`
- `terminal.css`, `theme.js`, `terminal-easteregg.js`
- `config.yaml`, `favicon.svg`
- `assets/profile.png`, `assets/CV_AG_05192026.pdf`

**NOT deployed (gitignored):**
- `data/` — private CSV content files
- `build.py`, `requirements.txt` — build tooling
- `templates/` — Jinja2 source templates
- `tests/` — test suite
- `docs/` — documentation
- `HANDOFF.md` — maintainer notes
- `.remember/` — Claude Code internal files
- `venv/`, `__pycache__/`, `.pytest_cache/` — Python artifacts

---

## Deploying changes

After editing CSVs or templates:

```powershell
# 1. Build
python build.py

# 2. Commit and push
git add .
git commit -m "describe your change"
git push origin main
```

GitHub Pages auto-deploys within ~1 minute.

Quick one-liner:
```powershell
python build.py; git add .; git commit -m "Update $(Get-Date -Format 'yyyy-MM-dd HH:mm')"; git push
```

---

## Setting up GitHub Pages (first time)

1. Create the repo `orijitghosh/orijitghosh.github.io` on GitHub (public, empty — no README or .gitignore)
2. From your local project folder:
   ```powershell
   git init
   git add .
   git commit -m "Initial deploy: new personal website"
   git branch -M main
   git remote add origin https://github.com/orijitghosh/orijitghosh.github.io.git
   git push -u origin main
   ```
3. On GitHub: **Settings → Pages → Source: Deploy from branch → Branch: main, Folder: / (root) → Save**
4. Wait ~1 minute, then visit `https://orijitghosh.github.io`

---

## Moving the project to a different machine

This setup is fully portable. To move it:

1. **Copy the entire project folder** to the new machine, INCLUDING `data/` and `docs/` but EXCLUDING `venv/`.
2. On the new machine:
   ```powershell
   cd path\to\site
   python -m venv venv
   venv\Scripts\activate
   pip install -r requirements.txt
   python build.py
   ```
3. Verify in browser. Now you can edit and `git push` from the new machine.

> Make sure the new machine has Git configured with the same GitHub credentials, or you won't be able to push.

> **Back up your `data/` folder!** It's gitignored and only exists on your local machines. Keep a copy on OneDrive, Dropbox, or a private repo.

---

## Rolling back

If the live site looks broken after a push:

```powershell
git revert HEAD
git push origin main
```

This creates a new commit that undoes the last change. GitHub Pages rebuilds within a minute.

---

## GitHub Pages settings reference

- **Repo:** `orijitghosh/orijitghosh.github.io`
- **Branch:** `main`
- **Folder:** `/ (root)`
- **URL:** `https://orijitghosh.github.io`
- **No Jekyll:** The site serves plain HTML (no `.nojekyll` file needed since there are no files starting with `_`)
