"""Build static site from CSV files and Jinja2 templates."""
from __future__ import annotations

import re
from datetime import datetime
from pathlib import Path

import pandas as pd
import yaml
from jinja2 import Environment, FileSystemLoader, select_autoescape


_YYYY_MM_RE = re.compile(r"^(\d{4})-(\d{1,2})$")


# ---------------------------------------------------------------------------
# Author formatting helpers
# ---------------------------------------------------------------------------

_BOLD_SPLIT_RE = re.compile(r"(<strong>.*?</strong>)")


def bold_authors(authors: str, patterns: list[str]) -> str:
    """Wrap each pattern in <strong> tags within the authors string.

    Patterns are processed longest-first to avoid partial matches
    (e.g., 'Ghosh A' matching inside 'Ghosh Arijit'). The string is
    re-split on existing <strong>...</strong> regions between each
    pattern, so shorter patterns don't double-bold inside ones already
    wrapped by longer patterns.
    """
    sorted_patterns = sorted(patterns, key=len, reverse=True)
    result = authors
    for pattern in sorted_patterns:
        wrapped = f"<strong>{pattern}</strong>"
        parts = _BOLD_SPLIT_RE.split(result)
        for i, part in enumerate(parts):
            if part.startswith("<strong>") and part.endswith("</strong>"):
                continue
            parts[i] = part.replace(pattern, wrapped)
        result = "".join(parts)
    return result


def format_authors(raw: str) -> str:
    """Convert semicolon-separated authors to display format.

    - Single author: returned as-is.
    - Two authors: joined with ' and '.
    - Three+ authors: joined with ', '.
    """
    parts = [p.strip() for p in raw.split(";") if p.strip()]
    if len(parts) == 0:
        return ""
    if len(parts) == 1:
        return parts[0]
    if len(parts) == 2:
        return f"{parts[0]} and {parts[1]}"
    return ", ".join(parts)


def authors_short(raw: str) -> str:
    """Convert 'Lastname Firstname [Middle]' to 'Lastname F[M]'."""
    parts = [p.strip() for p in raw.split(";") if p.strip()]
    out = []
    for p in parts:
        if p.lower() in ("et al.", "et al"):
            out.append("et al.")
            continue
        tokens = p.split()
        if len(tokens) == 1:
            out.append(tokens[0])
            continue
        last = tokens[0]
        rest = tokens[1:]
        if all(len(t) <= 4 and t.isupper() for t in rest):
            out.append(p)
        else:
            initials = "".join(t[0].upper() for t in rest if t)
            out.append(f"{last} {initials}")
    return ", ".join(out)


# ---------------------------------------------------------------------------
# Date formatting helpers
# ---------------------------------------------------------------------------

def format_news_date(raw: str) -> str:
    """Convert 'YYYY-MM' to 'Mon YYYY'. Pass through other formats."""
    raw = str(raw).strip()
    m = _YYYY_MM_RE.match(raw)
    if not m:
        return raw
    year, month = int(m.group(1)), int(m.group(2))
    if not (1 <= month <= 12):
        return raw
    return datetime(year, month, 1).strftime("%b %Y")


def news_sort_key(raw: str) -> tuple[int, int]:
    """Return a tuple (year, month) for sorting; invalid → (0, 0)."""
    raw = str(raw).strip()
    m = _YYYY_MM_RE.match(raw)
    if not m:
        return (0, 0)
    year, month = int(m.group(1)), int(m.group(2))
    if not (1 <= month <= 12):
        return (0, 0)
    return (year, month)


def year_range(years: list[int]) -> str:
    """Format list of years as 'min–max' (en-dash) or single year."""
    if not years:
        return ""
    lo, hi = min(years), max(years)
    if lo == hi:
        return str(lo)
    return f"{lo}–{hi}"


# ---------------------------------------------------------------------------
# Loaders
# ---------------------------------------------------------------------------

def load_config(path: Path) -> dict:
    """Load YAML config file into a dict."""
    path = Path(path)
    if not path.exists():
        raise FileNotFoundError(f"Config file not found: {path}")
    with open(path, encoding="utf-8") as f:
        return yaml.safe_load(f) or {}


def load_csv(
    path: Path,
    required_columns: list[str],
    optional: bool = False,
) -> list[dict]:
    """Load a CSV into a list of dicts. All values are strings.

    - If file missing and optional=True, returns [] and prints warning.
    - If file missing and optional=False, raises FileNotFoundError.
    - If required column missing, raises ValueError.
    - Empty cells become empty strings.
    """
    path = Path(path)
    if not path.exists():
        if optional:
            print(f"[WARN]  {path} not found; skipping.")
            return []
        raise FileNotFoundError(f"Required CSV not found: {path}")

    df = pd.read_csv(path, encoding="utf-8", keep_default_na=False, dtype=str)
    df = df.fillna("")

    missing = [c for c in required_columns if c not in df.columns]
    if missing:
        raise ValueError(
            f"{path.name} missing required column(s): {missing}. "
            f"Found columns: {list(df.columns)}"
        )

    return df.to_dict("records")


# ---------------------------------------------------------------------------
# Data processors
# ---------------------------------------------------------------------------

def process_publications(
    rows: list[dict],
    bold_patterns: list[str],
) -> list[dict]:
    """Sort, number, and decorate publication rows for rendering."""
    cleaned = []
    for row in rows:
        try:
            row = dict(row)
            row["year"] = int(str(row["year"]).strip())
        except (ValueError, KeyError):
            print(f"[WARN]  publication has invalid year: {row.get('title', '?')}")
            continue
        cleaned.append(row)

    cleaned.sort(key=lambda r: r["year"], reverse=True)

    seen_years: set[int] = set()
    for i, row in enumerate(cleaned):
        row["number"] = i + 1
        row["authors_html"] = bold_authors(
            format_authors(str(row.get("authors", ""))),
            bold_patterns,
        )
        row["show_year_divider"] = row["year"] not in seen_years
        seen_years.add(row["year"])
        row["animation_delay"] = f"{0.10 + i * 0.05:.2f}s"
        row["is_selected"] = str(row.get("selected", "")).strip().lower() == "yes"

    return cleaned


def process_news(rows: list[dict], limit: int) -> list[dict]:
    """Sort newest first, format date, return top `limit` items."""
    cleaned = [dict(r) for r in rows if str(r.get("date", "")).strip()]
    cleaned.sort(key=lambda r: news_sort_key(r["date"]), reverse=True)
    for r in cleaned:
        r["date_formatted"] = format_news_date(r["date"])
    return cleaned[:limit]


def process_awards(rows: list[dict]) -> list[dict]:
    """Sort newest first, coerce year to int."""
    cleaned = []
    for row in rows:
        try:
            row = dict(row)
            row["year"] = int(str(row["year"]).strip())
        except (ValueError, KeyError):
            continue
        cleaned.append(row)
    cleaned.sort(key=lambda r: r["year"], reverse=True)
    return cleaned


def process_repositories(
    rows: list[dict],
    language_colors: dict[str, str],
) -> list[dict]:
    """Add language_pills (list of {name, color}) to each repo."""
    default_color = language_colors.get("default", "#888888")
    out = []
    for row in rows:
        row = dict(row)
        langs_raw = str(row.get("languages", "")).strip()
        pills = []
        for lang in [l.strip() for l in langs_raw.split(",") if l.strip()]:
            color = language_colors.get(lang)
            if color is None:
                print(
                    f"[WARN]  repositories.csv: unknown language '{lang}'. "
                    f"Using default. Add to config.yaml language_colors."
                )
                color = default_color
            pills.append({"name": lang, "color": color})
        row["language_pills"] = pills
        out.append(row)
    return out


def process_timeline(rows: list[dict]) -> list[dict]:
    """Process education or experience entries.

    Adds:
      - year_label: 'start – end'
      - details_list: split of details column on '|'
    """
    out = []
    for row in rows:
        row = dict(row)
        start = str(row.get("start_year", "")).strip()
        end = str(row.get("end_year", "")).strip()
        if start and end:
            row["year_label"] = f"{start} – {end}"
        else:
            row["year_label"] = start or end
        details_raw = str(row.get("details", "")).strip()
        row["details_list"] = [
            d.strip() for d in details_raw.split("|") if d.strip()
        ]
        out.append(row)
    return out


def process_service(rows: list[dict]) -> dict[str, list[dict]]:
    """Group service rows by category, each sorted by 'order'."""
    grouped: dict[str, list[dict]] = {}
    for i, row in enumerate(rows):
        row = dict(row)
        cat = str(row.get("category", "")).strip()
        if not cat:
            continue
        order_raw = str(row.get("order", "")).strip()
        try:
            row["order"] = int(order_raw)
        except ValueError:
            row["order"] = 9999 + i
        grouped.setdefault(cat, []).append(row)

    for cat in grouped:
        grouped[cat].sort(key=lambda r: r["order"])
    return grouped


# ---------------------------------------------------------------------------
# Selected publications for home page
# ---------------------------------------------------------------------------

# Known venue abbreviations for the home page "selected" list.
_VENUE_ABBREV = {
    "Journal of Biological Rhythms": "J. Biological Rhythms",
    "Frontiers in Cell and Developmental Biology": "Frontiers in Cell and Dev. Bio.",
    "International Journal of Molecular Sciences": "Int. J. Molecular Sciences",
    "Biochemical and Biophysical Research Communications": "BBRC",
    "Macromolecular Bioscience": "Macromolecular Bioscience",
    "PROTEINS: Structure, Function, and Bioinformatics": "PROTEINS",
    "In Genetics of Sleep and Sleep Disorders": "Genetics of Sleep and Sleep Disorders",
}


def shorten_venue(venue: str) -> str:
    """Abbreviate known long venue names. Unknown venues unchanged."""
    return _VENUE_ABBREV.get(venue.strip(), venue.strip())


def select_for_home(
    publications: list[dict],
    limit: int,
    bold_patterns: list[str],
) -> list[dict]:
    """Filter selected publications, build short authors/venue for home page."""
    out = []
    for pub in publications:
        if not pub.get("is_selected"):
            continue
        copy = dict(pub)
        copy["authors_short"] = bold_authors(
            authors_short(str(pub.get("authors", ""))),
            bold_patterns,
        )
        copy["venue_short"] = shorten_venue(str(pub.get("venue", "")))
        out.append(copy)
        if len(out) >= limit:
            break
    return out


# ---------------------------------------------------------------------------
# Main pipeline
# ---------------------------------------------------------------------------

PAGES = [
    # (template_name, output_filename, active_tab)
    ("index.html.j2", "index.html", "index"),
    ("publications.html.j2", "publications.html", "publications"),
    ("repositories.html.j2", "repositories.html", "repositories"),
    ("cv.html.j2", "cv.html", "cv"),
    ("teaching.html.j2", "teaching.html", "teaching"),
]


def build_site(project_root: Path | None = None) -> None:
    """Read all data and render all templates to output HTML files."""
    root = Path(project_root) if project_root else Path(__file__).parent

    print("Loading config.yaml...", end=" ")
    config = load_config(root / "config.yaml")
    print("OK")

    print("Reading CSV files...")
    publications_raw = load_csv(
        root / "data" / "publications.csv",
        ["year", "title", "authors", "venue"],
    )
    print(f"  publications.csv ({len(publications_raw)} entries)")

    news_raw = load_csv(
        root / "data" / "news.csv",
        ["date", "description"],
        optional=True,
    )
    print(f"  news.csv ({len(news_raw)} entries)")

    repos_raw = load_csv(
        root / "data" / "repositories.csv",
        ["name", "description", "url"],
        optional=True,
    )
    print(f"  repositories.csv ({len(repos_raw)} entries)")

    education_raw = load_csv(
        root / "data" / "education.csv",
        ["start_year", "end_year", "degree", "institution"],
        optional=True,
    )
    print(f"  education.csv ({len(education_raw)} entries)")

    experience_raw = load_csv(
        root / "data" / "experience.csv",
        ["start_year", "end_year", "title", "institution"],
        optional=True,
    )
    print(f"  experience.csv ({len(experience_raw)} entries)")

    awards_raw = load_csv(
        root / "data" / "awards.csv",
        ["year", "description"],
        optional=True,
    )
    print(f"  awards.csv ({len(awards_raw)} entries)")

    service_raw = load_csv(
        root / "data" / "service.csv",
        ["category", "description"],
        optional=True,
    )
    print(f"  service.csv ({len(service_raw)} entries)")

    print("Processing data...")
    bold_patterns = config.get("author_bold_patterns", [])
    publications = process_publications(publications_raw, bold_patterns)
    news_limit = config.get("home_page", {}).get("news_count", 7)
    news = process_news(news_raw, limit=news_limit)
    sel_limit = config.get("home_page", {}).get("selected_publications_count", 6)
    selected_publications = select_for_home(publications, sel_limit, bold_patterns)
    repositories = process_repositories(
        repos_raw, config.get("language_colors", {})
    )
    education = process_timeline(education_raw)
    experience = process_timeline(experience_raw)
    awards = process_awards(awards_raw)
    service = process_service(service_raw)
    pub_year_range = year_range([p["year"] for p in publications])

    print(
        f"  {len(publications)} publications, {len(news)} news, "
        f"{len(repositories)} repos, {len(awards)} awards"
    )
    print(f"  {len(selected_publications)} selected publications for home")

    print("Rendering templates...")
    env = Environment(
        loader=FileSystemLoader(str(root / "templates")),
        autoescape=select_autoescape(["html.j2", "html"]),
        keep_trailing_newline=True,
    )

    context = {
        "config": config,
        "publications": publications,
        "selected_publications": selected_publications,
        "news": news,
        "repositories": repositories,
        "education": education,
        "experience": experience,
        "awards": awards,
        "service": service,
        "pub_year_range": pub_year_range,
        "pub_count": len(publications),
    }

    for template_name, output_name, _active in PAGES:
        template = env.get_template(template_name)
        html = template.render(**context)
        out_path = root / output_name
        out_path.write_text(html, encoding="utf-8")
        print(f"  {output_name}")

    print("\nBuild complete.")


if __name__ == "__main__":
    build_site()
