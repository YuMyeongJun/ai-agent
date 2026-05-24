from __future__ import annotations

from pathlib import Path

from fpdf import FPDF

UNICODE_FONT = "AppUnicode"

_FONT_CANDIDATES = [
    Path("/System/Library/Fonts/Supplemental/Arial Unicode.ttf"),
    Path("/Library/Fonts/Arial Unicode.ttf"),
    Path("/System/Library/Fonts/Supplemental/AppleGothic.ttf"),
    Path("/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc"),
    Path("/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc"),
    Path("/usr/share/fonts/truetype/nanum/NanumGothic.ttf"),
    Path("C:/Windows/Fonts/malgun.ttf"),
    Path(__file__).resolve().parents[1] / "assets" / "fonts" / "NotoSansKR-Regular.ttf",
]


def find_unicode_font_path() -> Path | None:
    for path in _FONT_CANDIDATES:
        if path.is_file():
            return path
    return None


def setup_pdf_fonts(pdf: FPDF) -> str:
    """Register a Unicode-capable font. Returns the family name to use."""
    font_path = find_unicode_font_path()
    if font_path is None:
        return "Helvetica"

    pdf.add_font(UNICODE_FONT, "", str(font_path))
    pdf.add_font(UNICODE_FONT, "B", str(font_path))
    return UNICODE_FONT
