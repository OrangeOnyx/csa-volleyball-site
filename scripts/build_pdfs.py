#!/usr/bin/env python3
"""Render the five handbook PDFs from handbooks/src with the program facts filled in.

The sources are the same HTML files the original PDFs were made from (WeasyPrint 66).
Run after changing data/facts.json or a handbook source:

    pip install weasyprint==66.0
    python3 scripts/build_pdfs.py

It rewrites website/resources/*.pdf and the all-in-one ZIP.
"""
import json
import re
import sys
import zipfile
from pathlib import Path

try:
    from weasyprint import HTML
except ImportError:  # pragma: no cover
    sys.exit("WeasyPrint is not installed. Run: pip install weasyprint==66.0")

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "handbooks" / "src"
OUT = ROOT / "website" / "resources"
TBC = "To be confirmed"

# slug -> PDF file name; the order is the order inside the ZIP
HANDBOOKS = [
    ("master-handbook", "CSA_Volleyball_Master_Handbook.pdf"),
    ("player-parent-handbook", "CSA_Volleyball_Player_Parent_Handbook.pdf"),
    ("coach-agreement", "CSA_Volleyball_Coach_Agreement.pdf"),
    ("curriculum-guide", "CSA_Volleyball_Curriculum_Practice_Guide.pdf"),
    ("quick-reference-card", "CSA_Volleyball_Coach_Quick_Reference_Card.pdf"),
]
ZIP_NAME = "CSA_Volleyball_All_Five_Handouts.zip"
TOKEN = re.compile(r"\{\{\s*([\w.]+)\s*(?:\|([^}]*))?\}\}")


def lookup(facts, path):
    value = facts
    for key in path.split("."):
        if not isinstance(value, dict) or key not in value:
            return None
        value = value[key]
    return value


def fill(text, facts):
    def sub(match):
        value = lookup(facts, match.group(1))
        if value is None or value == "":
            return match.group(2) if match.group(2) is not None else TBC
        return str(value)

    return TOKEN.sub(sub, text)


def main():
    facts = json.loads((ROOT / "data" / "facts.json").read_text(encoding="utf-8"))
    author = f'{facts["director"]["name"]}, CSA {facts["director"]["title"]}'
    OUT.mkdir(parents=True, exist_ok=True)
    for slug, pdf in HANDBOOKS:
        html = fill((SRC / f"{slug}.html").read_text(encoding="utf-8"), facts)
        html = html.replace("<head>", f'<head>\n<meta name="author" content="{author}">', 1)
        leftovers = TOKEN.findall(html)
        if leftovers:
            sys.exit(f"{slug}: unfilled tokens {leftovers}")
        HTML(string=html, base_url=str(SRC) + "/").write_pdf(OUT / pdf)
        print(f"wrote resources/{pdf}")

    # Rebuild the all-in-one ZIP with fixed timestamps so it only changes when a PDF does.
    with zipfile.ZipFile(OUT / ZIP_NAME, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for _, pdf in HANDBOOKS:
            info = zipfile.ZipInfo(pdf, date_time=(2026, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            zf.writestr(info, (OUT / pdf).read_bytes())
    print(f"wrote resources/{ZIP_NAME}")


if __name__ == "__main__":
    main()
