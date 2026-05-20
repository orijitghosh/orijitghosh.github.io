# Troubleshooting

Solutions for common issues.

## Build script errors

### `ModuleNotFoundError: No module named 'pandas'`

You forgot to activate the virtual environment, or dependencies aren't installed.

```powershell
# Activate (Windows)
venv\Scripts\activate

# Activate (Mac/Linux)
source venv/bin/activate

# If venv doesn't exist, create it:
python -m venv venv
# Then activate as above

# Install deps:
pip install -r requirements.txt
```

### `FileNotFoundError: Config file not found: config.yaml`

You're running `python build.py` from the wrong directory. Run from the project root (where `build.py` lives):

```bash
cd /path/to/site
python build.py
```

### `ValueError: publications.csv missing required column(s): ['title']`

The CSV is missing a required column. The error message lists which one. Open the CSV and check the header row matches the schema in `docs/CSV_FORMAT.md`.

### `pandas.errors.ParserError: Error tokenizing data`

The CSV is malformed — usually unmatched quotes, or extra/missing commas in a row.

1. Open the CSV in a plain text editor (not Excel)
2. Find the line mentioned in the error
3. Check that quotes are balanced and column count matches the header

### `[WARN] repositories.csv: unknown language 'Julia'`

You used a language not in `config.yaml`. Either:
- Accept the default gray color (just a warning, not an error), or
- Add it to `config.yaml` → `language_colors`:
  ```yaml
  language_colors:
    Julia: "#a270ba"
  ```

### Author name not bolding

The string in your CSV's `authors` column doesn't match any pattern in `config.yaml` → `author_bold_patterns`.

Check exact spelling (case-sensitive). Add the variant if needed:

```yaml
author_bold_patterns:
  - "Ghosh, Arijit"
  - "Arijit Ghosh"
  - "Ghosh Arijit"
  - "Ghosh A"
  - "Ghosh AR"  # add new variants here
```

## Git issues

### `error: failed to push some refs`

Someone else (or you on another machine) pushed first. Pull first, then push:

```bash
git pull --rebase origin main
git push origin main
```

### `fatal: not a git repository`

You're not in the project folder, or git hasn't been initialized. `cd` to the project root. If it's a fresh copy without `.git/`, run `git init` and set up the remote (see `docs/DEPLOYMENT.md`).

### `Permission denied (publickey)`

Your SSH key isn't set up with GitHub. Either:
- Set up an SSH key: https://docs.github.com/en/authentication/connecting-to-github-with-ssh
- Or use HTTPS: `git remote set-url origin https://github.com/orijitghosh/orijitghosh.github.io.git`

### `'gh' is not recognized` / `command not found: gh`

The GitHub CLI (`gh`) is not installed. You don't need it — use `git` commands directly and create repos via the GitHub web interface. See `docs/DEPLOYMENT.md` for the manual workflow.

## GitHub Pages issues

### Site didn't update after pushing

1. Wait 1-2 minutes. GitHub Pages has a small delay.
2. Hard-refresh your browser: Ctrl+Shift+R (Windows) / Cmd+Shift+R (Mac).
3. Open an incognito/private window — bypasses cache.
4. Check **Settings → Pages** is configured to serve from `main` branch root.
5. Check the **Actions** tab for failed deployments.

### "404 — File not found" on github.io

- Confirm `index.html` exists in repo root (not in a subfolder).
- Confirm GitHub Pages is enabled (Settings → Pages).
- Try waiting longer — initial setup can take 5-10 minutes.

## CSV editing issues

### Excel saves with weird encoding

Excel's default save can mangle UTF-8 characters (especially Bengali). Workarounds:

- **Best:** Use Google Sheets, then File → Download → Comma-separated values (.csv).
- Or in Excel, "Save As" → "CSV UTF-8 (Comma delimited) (*.csv)".
- Or edit in VS Code/Notepad++ which preserve UTF-8.

### Special characters render as `?`

The CSV was saved with non-UTF-8 encoding. Re-save as UTF-8 (see above).

### Commas inside text break the CSV

Wrap the entire cell in double quotes:

```csv
title,description
"Sleep, Genetics, and Behavior","Some text, with commas, in it"
```

To embed a literal double quote inside a quoted cell, double it:

```csv
title,description
"He said ""hello"" to the lab","desc"
```

## Python issues

### `'python' is not recognized as an internal or external command` (Windows)

Python isn't on your PATH. Either:
- Reinstall Python and check "Add Python to PATH" during install, or
- Use `py` instead of `python`: `py -m venv venv` etc.

### `command not found: python` (Mac)

Try `python3`:
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python3 build.py
```

### Pip is extremely slow on a corporate machine

Windows Defender real-time scanning each downloaded wheel makes installs slow on locked-down machines. Workarounds:

- Use `--only-binary=:all:` to avoid building from source: `pip install --only-binary=:all: -r requirements.txt`
- Disconnect from VPN temporarily during install (not while editing CSVs).
- Be patient — first install only happens once. Subsequent runs are fast.

## Tests fail after editing build.py

Run `pytest tests/test_build.py -v` to see which tests fail. The error usually points to the function that broke.

To see what you changed: `git diff build.py`.

## Undoing a bad change

```bash
# Discard uncommitted changes to a single file
git checkout -- path/to/file

# Undo the most recent commit (keeps changes staged)
git reset --soft HEAD~1

# Undo most recent commit AND discard changes (DANGEROUS)
git reset --hard HEAD~1
```

If you've already pushed a bad commit, fix forward (commit a correction) rather than rewriting history.

## Still stuck?

Check `docs/CSV_FORMAT.md` for column specifications and `docs/UPDATE.md` for the standard workflow.
