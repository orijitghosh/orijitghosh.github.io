"""Unit tests for build.py CSV CMS."""
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))

import build


# ---------------------------------------------------------------------------
# bold_authors
# ---------------------------------------------------------------------------

def test_bold_authors_simple():
    result = build.bold_authors("Ghosh Arijit", ["Ghosh Arijit"])
    assert result == "<strong>Ghosh Arijit</strong>"


def test_bold_authors_in_list():
    result = build.bold_authors(
        "Singh NP, Ghosh Arijit, Harbison ST",
        ["Ghosh Arijit"],
    )
    assert result == "Singh NP, <strong>Ghosh Arijit</strong>, Harbison ST"


def test_bold_authors_no_match():
    result = build.bold_authors("Smith J, Jones K", ["Ghosh Arijit"])
    assert result == "Smith J, Jones K"


def test_bold_authors_multiple_patterns_picks_longest_first():
    result = build.bold_authors(
        "Ghosh Arijit",
        ["Ghosh Arijit", "Ghosh A"],
    )
    assert result == "<strong>Ghosh Arijit</strong>"


def test_bold_authors_already_bolded_skipped():
    result = build.bold_authors(
        "<strong>Ghosh Arijit</strong>, Smith J",
        ["Ghosh Arijit"],
    )
    assert result == "<strong>Ghosh Arijit</strong>, Smith J"


# ---------------------------------------------------------------------------
# format_authors
# ---------------------------------------------------------------------------

def test_format_authors_single():
    assert build.format_authors("Ghosh Arijit") == "Ghosh Arijit"


def test_format_authors_two():
    result = build.format_authors("Ghosh Arijit; Harbison Susan Tracy")
    assert result == "Ghosh Arijit and Harbison Susan Tracy"


def test_format_authors_three():
    result = build.format_authors("Singh NP; Ghosh Arijit; Harbison ST")
    assert result == "Singh NP, Ghosh Arijit, Harbison ST"


def test_format_authors_strips_whitespace():
    result = build.format_authors("Smith J;  Jones K  ;Doe X")
    assert result == "Smith J, Jones K, Doe X"


def test_format_authors_with_etal():
    result = build.format_authors("Acharya TK; Kumar S; Ghosh A; et al.")
    assert result == "Acharya TK, Kumar S, Ghosh A, et al."


# ---------------------------------------------------------------------------
# Date helpers
# ---------------------------------------------------------------------------

def test_format_news_date_yyyy_mm():
    assert build.format_news_date("2026-03") == "Mar 2026"
    assert build.format_news_date("2024-10") == "Oct 2024"
    assert build.format_news_date("2026-01") == "Jan 2026"


def test_format_news_date_already_formatted():
    assert build.format_news_date("Mar 2026") == "Mar 2026"


def test_format_news_date_invalid():
    assert build.format_news_date("invalid-date") == "invalid-date"


def test_news_sort_key_yyyy_mm():
    assert build.news_sort_key("2026-03") > build.news_sort_key("2024-10")
    assert build.news_sort_key("2026-03") > build.news_sort_key("2026-01")


def test_news_sort_key_invalid_goes_last():
    assert build.news_sort_key("invalid") < build.news_sort_key("2020-01")


# ---------------------------------------------------------------------------
# year_range
# ---------------------------------------------------------------------------

def test_year_range_multiple():
    assert build.year_range([2026, 2020, 2017, 2026]) == "2017–2026"


def test_year_range_single():
    assert build.year_range([2024]) == "2024"


def test_year_range_empty():
    assert build.year_range([]) == ""


# ---------------------------------------------------------------------------
# load_config / load_csv
# ---------------------------------------------------------------------------

def test_load_config_reads_yaml(tmp_path):
    cfg = tmp_path / "c.yaml"
    cfg.write_text("name: Test\ntags: [a, b]\n", encoding="utf-8")
    result = build.load_config(cfg)
    assert result["name"] == "Test"
    assert result["tags"] == ["a", "b"]


def test_load_config_missing_raises(tmp_path):
    with pytest.raises(FileNotFoundError):
        build.load_config(tmp_path / "missing.yaml")


def test_load_csv_reads_data(tmp_path):
    csv = tmp_path / "data.csv"
    csv.write_text("name,age\nAlice,30\nBob,25\n", encoding="utf-8")
    result = build.load_csv(csv, required_columns=["name", "age"])
    assert len(result) == 2
    assert result[0]["name"] == "Alice"
    assert result[0]["age"] == "30"


def test_load_csv_missing_required_column_raises(tmp_path):
    csv = tmp_path / "data.csv"
    csv.write_text("name\nAlice\n", encoding="utf-8")
    with pytest.raises(ValueError, match="missing required column"):
        build.load_csv(csv, required_columns=["name", "age"])


def test_load_csv_missing_file_returns_empty(tmp_path):
    result = build.load_csv(
        tmp_path / "missing.csv",
        required_columns=["x"],
        optional=True,
    )
    assert result == []


# ---------------------------------------------------------------------------
# process_publications
# ---------------------------------------------------------------------------

def _pub_row(year, title="T", authors="X", venue="V", url="", selected="", note=""):
    return {
        "year": str(year), "title": title, "authors": authors,
        "venue": venue, "url": url, "selected": selected, "note": note,
    }


def test_process_publications_sorts_by_year_desc():
    rows = [_pub_row(2020, "Old"), _pub_row(2026, "New"), _pub_row(2024, "Mid")]
    pubs = build.process_publications(rows, [])
    assert [p["year"] for p in pubs] == [2026, 2024, 2020]


def test_process_publications_adds_number():
    rows = [_pub_row(2026, "A"), _pub_row(2024, "B")]
    pubs = build.process_publications(rows, [])
    assert pubs[0]["number"] == 1
    assert pubs[1]["number"] == 2


def test_process_publications_bolds_authors():
    rows = [_pub_row(2024, "T", authors="Smith J; Ghosh A")]
    pubs = build.process_publications(rows, ["Ghosh A"])
    assert "<strong>Ghosh A</strong>" in pubs[0]["authors_html"]


def test_process_publications_year_divider_flag():
    rows = [_pub_row(2026, "A"), _pub_row(2024, "B"), _pub_row(2024, "C")]
    pubs = build.process_publications(rows, [])
    assert pubs[0]["show_year_divider"] is True
    assert pubs[1]["show_year_divider"] is True
    assert pubs[2]["show_year_divider"] is False


def test_process_publications_animation_delay():
    rows = [_pub_row(2026, "A"), _pub_row(2024, "B")]
    pubs = build.process_publications(rows, [])
    assert pubs[0]["animation_delay"] == "0.10s"
    assert pubs[1]["animation_delay"] == "0.15s"


def test_process_publications_selected_flag():
    rows = [_pub_row(2026, "A", selected="yes"), _pub_row(2024, "B")]
    pubs = build.process_publications(rows, [])
    assert pubs[0]["is_selected"] is True
    assert pubs[1]["is_selected"] is False


# ---------------------------------------------------------------------------
# process_news / process_awards / process_repositories
# ---------------------------------------------------------------------------

def test_process_news_sorts_and_formats():
    rows = [
        {"date": "2024-10", "description": "Old"},
        {"date": "2026-03", "description": "New"},
    ]
    news = build.process_news(rows, limit=10)
    assert news[0]["date_formatted"] == "Mar 2026"
    assert news[0]["description"] == "New"
    assert news[1]["date_formatted"] == "Oct 2024"


def test_process_news_respects_limit():
    rows = [{"date": f"2024-{i:02d}", "description": str(i)} for i in range(1, 13)]
    news = build.process_news(rows, limit=5)
    assert len(news) == 5


def test_process_awards_sorts_desc():
    rows = [
        {"year": "2020", "description": "Old"},
        {"year": "2026", "description": "New"},
    ]
    awards = build.process_awards(rows)
    assert awards[0]["year"] == 2026
    assert awards[1]["year"] == 2020


def test_process_repositories_resolves_colors():
    rows = [
        {"name": "Foo", "description": "x", "url": "u", "languages": "R"},
        {"name": "Bar", "description": "y", "url": "v", "languages": "Ruby, HTML"},
    ]
    colors = {"R": "#276DC3", "Ruby": "#701516", "HTML": "#e34c26", "default": "#888"}
    repos = build.process_repositories(rows, colors)
    assert repos[0]["language_pills"] == [{"name": "R", "color": "#276DC3"}]
    assert repos[1]["language_pills"] == [
        {"name": "Ruby", "color": "#701516"},
        {"name": "HTML", "color": "#e34c26"},
    ]


def test_process_repositories_unknown_language_uses_default():
    rows = [{"name": "Foo", "description": "x", "url": "u", "languages": "Julia"}]
    colors = {"R": "#276DC3", "default": "#888"}
    repos = build.process_repositories(rows, colors)
    assert repos[0]["language_pills"] == [{"name": "Julia", "color": "#888"}]


# ---------------------------------------------------------------------------
# process_timeline / process_service
# ---------------------------------------------------------------------------

def test_process_timeline_splits_details():
    rows = [{
        "start_year": "2022", "end_year": "present",
        "title": "Postdoc", "institution": "NIH",
        "details": "Did A|Did B|Did C",
    }]
    out = build.process_timeline(rows)
    assert out[0]["details_list"] == ["Did A", "Did B", "Did C"]


def test_process_timeline_year_string():
    rows = [
        {"start_year": "2022", "end_year": "present", "title": "T", "institution": "I", "details": ""},
        {"start_year": "2016", "end_year": "2022", "title": "T", "institution": "I", "details": ""},
    ]
    out = build.process_timeline(rows)
    assert out[0]["year_label"] == "2022 – present"
    assert out[1]["year_label"] == "2016 – 2022"


def test_process_timeline_empty_details():
    rows = [{
        "start_year": "2020", "end_year": "2022",
        "title": "T", "institution": "I", "details": "",
    }]
    out = build.process_timeline(rows)
    assert out[0]["details_list"] == []


def test_process_service_groups_by_category():
    rows = [
        {"category": "teaching", "description": "T1", "order": "2"},
        {"category": "editorial", "description": "E1", "order": "1"},
        {"category": "teaching", "description": "T0", "order": "1"},
    ]
    grouped = build.process_service(rows)
    assert grouped["editorial"] == [{"category": "editorial", "description": "E1", "order": 1}]
    assert grouped["teaching"][0]["description"] == "T0"
    assert grouped["teaching"][1]["description"] == "T1"


def test_process_service_handles_missing_order():
    rows = [
        {"category": "teaching", "description": "First", "order": ""},
        {"category": "teaching", "description": "Second", "order": ""},
    ]
    grouped = build.process_service(rows)
    assert [r["description"] for r in grouped["teaching"]] == ["First", "Second"]


# ---------------------------------------------------------------------------
# select_for_home / shorten_venue / authors_short
# ---------------------------------------------------------------------------

def test_select_for_home_filters_and_shortens():
    pubs = [
        {
            "year": 2026, "title": "T", "authors": "Ghosh Arijit; Harbison Susan Tracy",
            "authors_html": "<strong>Ghosh Arijit</strong> and Harbison Susan Tracy",
            "venue": "Journal of Biological Rhythms", "url": "u",
            "is_selected": True, "note": "",
        },
        {
            "year": 2024, "title": "U", "authors": "Smith J", "authors_html": "Smith J",
            "venue": "Nature", "url": "", "is_selected": False, "note": "",
        },
    ]
    result = build.select_for_home(pubs, limit=10, bold_patterns=["Ghosh A"])
    assert len(result) == 1
    assert result[0]["year"] == 2026
    assert "Ghosh A" in result[0]["authors_short"]
    assert result[0]["venue_short"] == "J. Biological Rhythms"


def test_select_for_home_respects_limit():
    pubs = [
        {"year": y, "title": "T", "authors": "X", "authors_html": "X",
         "venue": "V", "url": "", "is_selected": True, "note": ""}
        for y in range(2010, 2027)
    ]
    result = build.select_for_home(pubs, limit=3, bold_patterns=[])
    assert len(result) == 3


def test_shorten_venue_known_journals():
    assert build.shorten_venue("Journal of Biological Rhythms") == "J. Biological Rhythms"
    assert build.shorten_venue("Frontiers in Cell and Developmental Biology") == "Frontiers in Cell and Dev. Bio."
    assert build.shorten_venue("Scientific Reports") == "Scientific Reports"


def test_authors_short_initials():
    assert build.authors_short("Ghosh Arijit") == "Ghosh A"
    assert build.authors_short("Ghosh Arijit; Harbison Susan Tracy") == "Ghosh A, Harbison ST"
