import base64
import io
from datetime import datetime

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Image as RLImage, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

BRAND = colors.HexColor("#701A2D")
INK = colors.HexColor("#1C1917")
MUTED = colors.HexColor("#57534E")
LINE = colors.HexColor("#E7E5E4")
STATUS_COLORS = {
    "PASS": colors.HexColor("#059669"),
    "REVIEW REQUIRED": colors.HexColor("#D97706"),
    "LOW QUALITY": colors.HexColor("#DC2626"),
}


def _fmt_date(value):
    if not value:
        return "-"
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).strftime("%d %b %Y, %H:%M UTC")
    except ValueError:
        return value


def build_pdf(report: dict) -> bytes:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm, topMargin=16 * mm, bottomMargin=16 * mm)
    styles = getSampleStyleSheet()
    h_brand = ParagraphStyle("brand", parent=styles["Title"], fontName="Helvetica-Bold", fontSize=22, textColor=BRAND, alignment=0, spaceAfter=0)
    tagline = ParagraphStyle("tag", parent=styles["Normal"], fontSize=9, textColor=MUTED, spaceAfter=10)
    h2 = ParagraphStyle("h2", parent=styles["Heading2"], fontName="Helvetica-Bold", fontSize=12, textColor=INK, spaceBefore=12, spaceAfter=6)
    body = ParagraphStyle("body", parent=styles["Normal"], fontSize=9.5, textColor=INK, leading=14)
    small = ParagraphStyle("small", parent=styles["Normal"], fontSize=8, textColor=MUTED, leading=11)
    status = report.get("overall_status", "REVIEW REQUIRED")
    status_style = ParagraphStyle("status", parent=body, fontName="Helvetica-Bold", fontSize=14, textColor=STATUS_COLORS.get(status, INK))

    qr_cell = Paragraph("", small)
    if report.get("qr_code"):
        qr_cell = RLImage(io.BytesIO(base64.b64decode(report["qr_code"])), width=26 * mm, height=26 * mm)
    story = [
        Paragraph("ONION<font color='#059669'>AI</font>", h_brand),
        Paragraph("Smart Quality. Trusted Trade. &nbsp;|&nbsp; Standardized Digital Quality Report", tagline),
        Table(
            [
                [
                    Paragraph(f"<b>Batch</b> {report['batch_id']}<br/><br/><b>Verification ID</b> {report['verification_id']}", body),
                    Paragraph(status, status_style),
                    qr_cell,
                    Paragraph("Scan to verify this record on the ONIONAI Buyer Verification page", small),
                ]
            ],
            colWidths=[70 * mm, 40 * mm, 28 * mm, 36 * mm],
            style=TableStyle([("LINEBELOW", (0, 0), (-1, -1), 1, BRAND), ("BOTTOMPADDING", (0, 0), (-1, -1), 8), ("VALIGN", (0, 0), (-1, -1), "MIDDLE")]),
        ),
        Paragraph("Batch Details", h2),
    ]

    details = [
        ["Farmer / Supplier", report.get("supplier", "-"), "Procurement Center", report.get("procurement_center", "-")],
        ["Onion Variety", report.get("variety", "-"), "Quantity", f"{report.get('quantity')} {report.get('unit')}"],
        ["Storage Location", report.get("storage_location") or "-", "Inspection Date", _fmt_date(report.get("inspection_date"))],
        ["Inspection Source", report.get("inspection_source", "-"), "Inspections Done", str(report.get("inspection_count", 0))],
    ]
    story.append(
        Table(
            details,
            colWidths=[38 * mm, 50 * mm, 38 * mm, 48 * mm],
            style=TableStyle(
                [
                    ("FONTSIZE", (0, 0), (-1, -1), 9),
                    ("TEXTCOLOR", (0, 0), (0, -1), MUTED),
                    ("TEXTCOLOR", (2, 0), (2, -1), MUTED),
                    ("LINEBELOW", (0, 0), (-1, -1), 0.5, LINE),
                    ("TOPPADDING", (0, 0), (-1, -1), 5),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ]
            ),
        )
    )

    story.append(Paragraph("Quality Summary", h2))
    summary = [
        ["Grade A", "URS (Under/Over-size)", "Good Quality", "Defective"],
        [f"{report['grade_a']}%", f"{report['urs']}%", f"{report['good_quality']}%", f"{report['defective']}%"],
    ]
    story.append(
        Table(
            summary,
            colWidths=[43.5 * mm] * 4,
            style=TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F5F4F0")),
                    ("FONTSIZE", (0, 0), (-1, 0), 8),
                    ("TEXTCOLOR", (0, 0), (-1, 0), MUTED),
                    ("FONTNAME", (0, 1), (-1, 1), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 1), (-1, 1), 16),
                    ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                    ("BOX", (0, 0), (-1, -1), 0.5, LINE),
                    ("INNERGRID", (0, 0), (-1, -1), 0.5, LINE),
                    ("TOPPADDING", (0, 0), (-1, -1), 7),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
                ]
            ),
        )
    )

    story.append(Paragraph("Quality Breakdown", h2))
    pct = report.get("percentages", {})
    breakdown = [["Good", "Damaged", "Rotten", "Sprouted", "Undersized", "Oversized"]]
    breakdown.append([f"{pct.get(k, 0)}%" for k in ("good", "damaged", "rotten", "sprouted", "undersized", "oversized")])
    story.append(
        Table(
            breakdown,
            colWidths=[29 * mm] * 6,
            style=TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F5F4F0")),
                    ("FONTSIZE", (0, 0), (-1, -1), 9),
                    ("FONTNAME", (0, 1), (-1, 1), "Helvetica-Bold"),
                    ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                    ("BOX", (0, 0), (-1, -1), 0.5, LINE),
                    ("INNERGRID", (0, 0), (-1, -1), 0.5, LINE),
                    ("TOPPADDING", (0, 0), (-1, -1), 6),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ]
            ),
        )
    )

    story.append(Paragraph("AI Assessment Summary", h2))
    story.append(Paragraph(report.get("ai_summary", "-"), body))
    story.append(Spacer(1, 4))
    story.append(Paragraph(f"Total onions analysed: {report.get('total_detected', 0)} &nbsp;|&nbsp; Engine: {report.get('ai_provider', '-')} ({report.get('ai_model', '-')})", small))

    hv = report.get("human_verification") or {}
    story.append(Paragraph("Human Verification", h2))
    story.append(Paragraph(f"Status: <b>{hv.get('status', 'PENDING')}</b>" + (f" by {hv.get('verified_by_name')}" if hv.get("verified_by_name") else "") + (f" — {hv.get('remarks')}" if hv.get("remarks") else ""), body))

    story.append(Paragraph("Storage History", h2))
    history = [["Day", "Date", "Grade A", "URS", "Good Quality", "Defective", "Status"]]
    for rec in report.get("storage_history", []):
        history.append([f"Day {rec['day']}", _fmt_date(rec.get("date"))[:11], f"{rec['grade_a']}%", f"{rec['urs']}%", f"{rec['quality_percentage']}%", f"{rec['defect_percentage']}%", rec.get("status", "-")])
    if len(history) == 1:
        history.append(["-", "-", "-", "-", "-", "-", "-"])
    story.append(
        Table(
            history,
            colWidths=[18 * mm, 30 * mm, 22 * mm, 20 * mm, 28 * mm, 24 * mm, 32 * mm],
            style=TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F5F4F0")),
                    ("FONTSIZE", (0, 0), (-1, -1), 8.5),
                    ("LINEBELOW", (0, 0), (-1, -1), 0.5, LINE),
                    ("TOPPADDING", (0, 0), (-1, -1), 4),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ]
            ),
        )
    )
    trend = report.get("quality_trend") or "stable"
    story.append(Paragraph(f"Storage trend: <b>{trend.title()}</b> &nbsp;|&nbsp; Storage duration: {report.get('storage_duration_days', 0)} day(s)", small))

    dispatch = report.get("dispatch") or {}
    story.append(Paragraph("Dispatch Status", h2))
    story.append(Paragraph(f"<b>{dispatch.get('label', 'Not yet verified')}</b>" + (f" — {dispatch.get('remarks')}" if dispatch.get("remarks") else ""), body))

    story.append(Spacer(1, 14))
    story.append(
        Paragraph(
            f"Generated {_fmt_date(report.get('generated_at'))} · Verification ID {report['verification_id']} · "
            "AI-Assisted Onion Quality Assessment. Results are estimates from visible characteristics and must be confirmed by human verification. "
            "Verify this record at the ONIONAI Buyer Verification page.",
            small,
        )
    )
    doc.build(story)
    return buf.getvalue()
