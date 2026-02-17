#!/usr/bin/env python3
"""
Global Sentiment Pulse Weekly Report Generator
Aeon Infinitive - pulse.aeoninfinitive.com
"""

import sqlite3
import json
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Image, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import io

# Database path
DB_PATH = "/home/ubuntu/projects/sensmundi/pipeline/sensmundi.db"

# Color scheme
DARK_BG = HexColor('#0a0a0f')
ACCENT_BLUE = HexColor('#4f8ffc')
TEXT_WHITE = HexColor('#ffffff')
TEXT_GRAY = HexColor('#a0a0a0')
CARD_BG = HexColor('#1a1a24')

# Date range
WEEK_START = '2026-02-09'
WEEK_END = '2026-02-15'

def query_db(query, params=()):
    """Execute a query and return results"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute(query, params)
    results = cursor.fetchall()
    conn.close()
    return results

def get_global_overview():
    """Get global average sentiment and article counts"""
    query = """
        SELECT 
            AVG(tone_internal) as avg_internal,
            AVG(tone_external) as avg_external,
            AVG(dissonance) as avg_dissonance,
            SUM(article_count_internal) as total_internal,
            SUM(article_count_external) as total_external,
            COUNT(DISTINCT country_code) as countries_tracked
        FROM sentiment
        WHERE timestamp >= ? AND timestamp <= ?
    """
    result = query_db(query, (WEEK_START, WEEK_END))
    return dict(result[0]) if result else {}

def get_top_tense_countries():
    """Get top 5 countries with highest tension"""
    query = """
        SELECT 
            a.country_code,
            c.name,
            a.tension_level,
            a.summary_en,
            a.context_en,
            s.tone_internal,
            s.tone_external,
            s.dissonance
        FROM analyses a
        JOIN countries c ON a.country_code = c.code
        LEFT JOIN sentiment s ON a.country_code = s.country_code 
            AND a.timestamp = s.timestamp
        WHERE a.timestamp >= ? AND a.timestamp <= ?
        ORDER BY 
            CASE a.tension_level 
                WHEN 'critical' THEN 4 
                WHEN 'high' THEN 3 
                WHEN 'medium' THEN 2 
                ELSE 1 
            END DESC,
            s.dissonance DESC
        LIMIT 5
    """
    results = query_db(query, (WEEK_START, WEEK_END))
    return [dict(row) for row in results]

def get_top_dissonance_countries():
    """Get top 5 countries with highest dissonance"""
    query = """
        SELECT 
            s.country_code,
            c.name,
            s.dissonance,
            s.tone_internal,
            s.tone_external,
            a.summary_en,
            a.context_en,
            a.tension_level
        FROM sentiment s
        JOIN countries c ON s.country_code = c.code
        LEFT JOIN analyses a ON s.country_code = a.country_code 
            AND s.timestamp = a.timestamp
        WHERE s.timestamp >= ? AND s.timestamp <= ?
        ORDER BY ABS(s.dissonance) DESC
        LIMIT 5
    """
    results = query_db(query, (WEEK_START, WEEK_END))
    return [dict(row) for row in results]

def get_regional_breakdown():
    """Get average sentiment by region"""
    query = """
        SELECT 
            c.region,
            AVG(s.tone_internal) as avg_internal,
            AVG(s.tone_external) as avg_external,
            AVG(s.dissonance) as avg_dissonance,
            COUNT(DISTINCT s.country_code) as country_count
        FROM sentiment s
        JOIN countries c ON s.country_code = c.code
        WHERE s.timestamp >= ? AND s.timestamp <= ?
            AND c.region IS NOT NULL AND c.region != ''
        GROUP BY c.region
        ORDER BY avg_dissonance DESC
    """
    results = query_db(query, (WEEK_START, WEEK_END))
    return [dict(row) for row in results]

def get_notable_shifts():
    """Analyze timeline data for biggest tone shifts"""
    query = """
        SELECT 
            country_code,
            timeline_internal,
            timeline_external
        FROM sentiment
        WHERE timestamp >= ? AND timestamp <= ?
            AND timeline_internal IS NOT NULL
    """
    results = query_db(query, (WEEK_START, WEEK_END))
    
    shifts = []
    for row in results:
        try:
            timeline_int = json.loads(row['timeline_internal']) if row['timeline_internal'] else []
            if len(timeline_int) >= 2:
                # Calculate shift between first and last
                first_tone = timeline_int[0]['tone']
                last_tone = timeline_int[-1]['tone']
                shift = last_tone - first_tone
                shifts.append({
                    'country_code': row['country_code'],
                    'shift': shift,
                    'from': first_tone,
                    'to': last_tone
                })
        except:
            pass
    
    # Sort by absolute shift and get country names
    shifts.sort(key=lambda x: abs(x['shift']), reverse=True)
    top_shifts = shifts[:5]
    
    # Get country names
    for shift in top_shifts:
        query = "SELECT name FROM countries WHERE code = ?"
        result = query_db(query, (shift['country_code'],))
        shift['name'] = result[0]['name'] if result else shift['country_code']
    
    return top_shifts

def get_key_stories():
    """Get 10 interesting article titles from the week"""
    query = """
        SELECT 
            a.title_en,
            a.title,
            a.source,
            a.country_code,
            c.name as country_name,
            a.tone,
            a.source_type
        FROM articles a
        JOIN countries c ON a.country_code = c.code
        WHERE a.fetched_at >= ? AND a.fetched_at <= ?
            AND (a.title_en IS NOT NULL OR a.title IS NOT NULL)
        ORDER BY ABS(a.tone) DESC, a.fetched_at DESC
        LIMIT 20
    """
    results = query_db(query, (WEEK_START + 'T00:00:00', WEEK_END + 'T23:59:59'))
    
    # Diversify by selecting from different countries and tones
    stories = []
    seen_countries = set()
    positive_count = 0
    negative_count = 0
    
    for row in results:
        if len(stories) >= 10:
            break
            
        country = row['country_code']
        tone = row['tone'] or 0
        
        # Try to balance countries and sentiment
        if country in seen_countries and len(stories) < 5:
            continue
            
        title = row['title_en'] or row['title'] or 'Untitled'
        stories.append({
            'title': title[:120],  # Truncate long titles
            'country': row['country_name'],
            'source': row['source'],
            'tone': tone,
            'type': row['source_type']
        })
        
        seen_countries.add(country)
        if tone > 0:
            positive_count += 1
        else:
            negative_count += 1
    
    return stories

def create_regional_chart():
    """Create bar chart for regional sentiment"""
    regions = get_regional_breakdown()
    
    if not regions:
        return None
    
    # Prepare data
    region_names = [r['region'][:15] for r in regions]  # Truncate names
    internal_tones = [r['avg_internal'] or 0 for r in regions]
    external_tones = [r['avg_external'] or 0 for r in regions]
    
    # Create figure with dark background
    fig, ax = plt.subplots(figsize=(10, 5), facecolor='#0a0a0f')
    ax.set_facecolor('#0a0a0f')
    
    x = range(len(region_names))
    width = 0.35
    
    bars1 = ax.bar([i - width/2 for i in x], internal_tones, width, 
                    label='Internal', color='#4f8ffc', alpha=0.8)
    bars2 = ax.bar([i + width/2 for i in x], external_tones, width,
                    label='External', color='#8fb4fc', alpha=0.8)
    
    ax.set_xlabel('Region', color='#ffffff', fontsize=10)
    ax.set_ylabel('Average Sentiment Tone', color='#ffffff', fontsize=10)
    ax.set_title('Regional Sentiment Breakdown', color='#ffffff', fontsize=12, fontweight='bold')
    ax.set_xticks(x)
    ax.set_xticklabels(region_names, rotation=45, ha='right', color='#a0a0a0', fontsize=8)
    ax.tick_params(axis='y', labelcolor='#a0a0a0')
    ax.legend(facecolor='#1a1a24', edgecolor='#4f8ffc', labelcolor='#ffffff')
    ax.axhline(y=0, color='#666666', linestyle='--', linewidth=0.5)
    ax.grid(axis='y', alpha=0.2, color='#666666')
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    ax.spines['bottom'].set_color('#666666')
    ax.spines['left'].set_color('#666666')
    
    plt.tight_layout()
    
    # Save to bytes
    img_buffer = io.BytesIO()
    plt.savefig(img_buffer, format='png', dpi=150, facecolor='#0a0a0f', edgecolor='none')
    img_buffer.seek(0)
    plt.close()
    
    return img_buffer

def create_dissonance_chart():
    """Create bar chart for top dissonance countries"""
    countries = get_top_dissonance_countries()
    
    if not countries:
        return None
    
    # Prepare data
    names = [c['name'][:20] for c in countries]
    dissonance_values = [abs(c['dissonance'] or 0) for c in countries]
    
    # Create figure
    fig, ax = plt.subplots(figsize=(10, 4), facecolor='#0a0a0f')
    ax.set_facecolor('#0a0a0f')
    
    bars = ax.barh(names, dissonance_values, color='#fc4f4f', alpha=0.8)
    
    ax.set_xlabel('Dissonance Level', color='#ffffff', fontsize=10)
    ax.set_title('Top 5 Highest Dissonance Countries', color='#ffffff', fontsize=12, fontweight='bold')
    ax.tick_params(axis='both', labelcolor='#a0a0a0')
    ax.grid(axis='x', alpha=0.2, color='#666666')
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    ax.spines['bottom'].set_color('#666666')
    ax.spines['left'].set_color('#666666')
    
    plt.tight_layout()
    
    # Save to bytes
    img_buffer = io.BytesIO()
    plt.savefig(img_buffer, format='png', dpi=150, facecolor='#0a0a0f', edgecolor='none')
    img_buffer.seek(0)
    plt.close()
    
    return img_buffer

class PageNumCanvas(canvas.Canvas):
    """Custom canvas for page numbers and footer"""
    
    def __init__(self, *args, **kwargs):
        canvas.Canvas.__init__(self, *args, **kwargs)
        self.pages = []
        
    def showPage(self):
        self.pages.append(dict(self.__dict__))
        self._startPage()
        
    def save(self):
        page_count = len(self.pages)
        for page_num, page in enumerate(self.pages, 1):
            self.__dict__.update(page)
            if page_num > 1:  # Skip footer on cover page
                self.draw_page_footer(page_num, page_count)
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)
        
    def draw_page_footer(self, page_num, page_count):
        self.saveState()
        self.setFillColor(TEXT_GRAY)
        self.setFont('Helvetica', 8)
        footer_text = f"Generated by Pulse (pulse.aeoninfinitive.com) — Aeon Infinitive"
        self.drawString(2*cm, 1.5*cm, footer_text)
        self.drawRightString(A4[0] - 2*cm, 1.5*cm, f"Page {page_num} of {page_count}")
        self.restoreState()

def generate_pdf():
    """Generate the complete PDF report"""
    output_path = "/home/ubuntu/projects/sensmundi/reports/global-pulse-week-2026-02-15.pdf"
    
    # Create PDF with custom canvas
    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        topMargin=2*cm,
        bottomMargin=2.5*cm,
        leftMargin=2*cm,
        rightMargin=2*cm
    )
    
    # Container for elements
    story = []
    
    # Define styles
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=32,
        textColor=TEXT_WHITE,
        alignment=TA_CENTER,
        spaceAfter=12,
        fontName='Helvetica-Bold'
    )
    
    subtitle_style = ParagraphStyle(
        'CustomSubtitle',
        parent=styles['Heading2'],
        fontSize=16,
        textColor=ACCENT_BLUE,
        alignment=TA_CENTER,
        spaceAfter=30,
        fontName='Helvetica'
    )
    
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=18,
        textColor=ACCENT_BLUE,
        spaceAfter=12,
        spaceBefore=20,
        fontName='Helvetica-Bold'
    )
    
    body_style = ParagraphStyle(
        'CustomBody',
        parent=styles['Normal'],
        fontSize=10,
        textColor=TEXT_WHITE,
        spaceAfter=6,
        leading=14,
        fontName='Helvetica'
    )
    
    metric_style = ParagraphStyle(
        'Metric',
        parent=styles['Normal'],
        fontSize=24,
        textColor=ACCENT_BLUE,
        alignment=TA_CENTER,
        spaceAfter=6,
        fontName='Helvetica-Bold'
    )
    
    # === COVER PAGE ===
    story.append(Spacer(1, 6*cm))
    story.append(Paragraph("GLOBAL SENTIMENT PULSE", title_style))
    story.append(Paragraph("Week of February 9-15, 2026", subtitle_style))
    story.append(Spacer(1, 2*cm))
    story.append(Paragraph("Aeon Infinitive", ParagraphStyle(
        'Brand',
        fontSize=14,
        textColor=TEXT_GRAY,
        alignment=TA_CENTER,
        fontName='Helvetica'
    )))
    story.append(PageBreak())
    
    # === GLOBAL OVERVIEW ===
    overview = get_global_overview()
    
    story.append(Paragraph("Global Overview", heading_style))
    
    if overview:
        avg_internal = overview.get('avg_internal', 0) or 0
        avg_external = overview.get('avg_external', 0) or 0
        avg_dissonance = overview.get('avg_dissonance', 0) or 0
        total_articles = (overview.get('total_internal', 0) or 0) + (overview.get('total_external', 0) or 0)
        countries = overview.get('countries_tracked', 0) or 0
        
        # Overall sentiment
        overall = (avg_internal + avg_external) / 2
        trend = "↗ Improving" if overall > -0.5 else "↘ Declining" if overall < -1.5 else "→ Stable"
        
        story.append(Paragraph(f"{overall:.2f}", metric_style))
        story.append(Paragraph("Average Global Sentiment", ParagraphStyle(
            'MetricLabel',
            fontSize=11,
            textColor=TEXT_GRAY,
            alignment=TA_CENTER,
            spaceAfter=20
        )))
        
        story.append(Paragraph(
            f"This week, global sentiment averaged <b>{overall:.2f}</b> across {countries} countries, "
            f"indicating a {trend.split()[1].lower()} trend. "
            f"Internal media tone ({avg_internal:.2f}) {'was more negative than' if avg_internal < avg_external else 'aligned with'} "
            f"external coverage ({avg_external:.2f}), with an average dissonance of {abs(avg_dissonance):.2f}.",
            body_style
        ))
        
        story.append(Paragraph(
            f"Analysis drew from <b>{total_articles:,}</b> articles covering geopolitical events, "
            f"humanitarian crises, and regional developments.",
            body_style
        ))
    
    story.append(Spacer(1, 0.5*cm))
    
    # === TOP 5 MOST TENSE ===
    story.append(Paragraph("Top 5 Most Tense Countries", heading_style))
    
    tense = get_top_tense_countries()
    for i, country in enumerate(tense, 1):
        tension_color = {
            'critical': '#ff4444',
            'high': '#ff8844',
            'medium': '#ffaa44',
            'low': '#44ff88'
        }.get(country.get('tension_level', 'low'), '#888888')
        
        story.append(Paragraph(
            f"<b>{i}. {country['name']}</b> "
            f"<font color='{tension_color}'>[{(country.get('tension_level') or 'unknown').upper()}]</font>",
            body_style
        ))
        
        context = country.get('context_en') or country.get('summary_en') or 'No context available.'
        story.append(Paragraph(context[:300] + ('...' if len(context) > 300 else ''), ParagraphStyle(
            'Context',
            parent=body_style,
            leftIndent=15,
            textColor=TEXT_GRAY,
            fontSize=9
        )))
        story.append(Spacer(1, 0.3*cm))
    
    story.append(PageBreak())
    
    # === TOP 5 DISSONANCE ===
    story.append(Paragraph("Top 5 Highest Dissonance", heading_style))
    story.append(Paragraph(
        "Countries where internal and external narratives diverge most significantly:",
        body_style
    ))
    story.append(Spacer(1, 0.3*cm))
    
    dissonance = get_top_dissonance_countries()
    for i, country in enumerate(dissonance, 1):
        diss = country.get('dissonance', 0) or 0
        internal = country.get('tone_internal', 0) or 0
        external = country.get('tone_external', 0) or 0
        
        story.append(Paragraph(
            f"<b>{i}. {country['name']}</b> (Dissonance: {abs(diss):.2f})",
            body_style
        ))
        
        story.append(Paragraph(
            f"Internal: {internal:.2f} | External: {external:.2f}",
            ParagraphStyle('Metrics', parent=body_style, leftIndent=15, fontSize=9, textColor=ACCENT_BLUE)
        ))
        
        explanation = country.get('context_en') or country.get('summary_en') or \
            f"Internal media {'more positive' if internal > external else 'more negative'} than external coverage."
        
        story.append(Paragraph(explanation[:250] + ('...' if len(explanation) > 250 else ''), ParagraphStyle(
            'Explanation',
            parent=body_style,
            leftIndent=15,
            fontSize=9,
            textColor=TEXT_GRAY
        )))
        story.append(Spacer(1, 0.3*cm))
    
    # Add dissonance chart
    diss_chart = create_dissonance_chart()
    if diss_chart:
        story.append(Spacer(1, 0.5*cm))
        story.append(Image(diss_chart, width=16*cm, height=8*cm))
    
    story.append(PageBreak())
    
    # === REGIONAL BREAKDOWN ===
    story.append(Paragraph("Regional Breakdown", heading_style))
    
    regions = get_regional_breakdown()
    if regions:
        story.append(Paragraph(
            "Average sentiment by geographic region, comparing internal and external media tone:",
            body_style
        ))
        story.append(Spacer(1, 0.5*cm))
        
        # Add chart
        regional_chart = create_regional_chart()
        if regional_chart:
            story.append(Image(regional_chart, width=16*cm, height=10*cm))
        
        story.append(Spacer(1, 0.5*cm))
        
        # Summary table
        for region in regions:
            story.append(Paragraph(
                f"<b>{region['region']}</b>: "
                f"Internal {region['avg_internal']:.2f}, "
                f"External {region['avg_external']:.2f}, "
                f"Dissonance {abs(region['avg_dissonance']):.2f} "
                f"({region['country_count']} countries)",
                ParagraphStyle('RegionSummary', parent=body_style, fontSize=9, leftIndent=10)
            ))
    
    story.append(PageBreak())
    
    # === NOTABLE SHIFTS ===
    story.append(Paragraph("Notable Sentiment Shifts", heading_style))
    story.append(Paragraph(
        "Countries experiencing the most significant changes in media tone throughout the week:",
        body_style
    ))
    story.append(Spacer(1, 0.3*cm))
    
    shifts = get_notable_shifts()
    for i, shift in enumerate(shifts, 1):
        direction = "↗ Improved" if shift['shift'] > 0 else "↘ Declined"
        magnitude = "significantly" if abs(shift['shift']) > 2 else "moderately"
        
        story.append(Paragraph(
            f"<b>{i}. {shift['name']}</b> {direction} {magnitude} "
            f"(from {shift['from']:.2f} to {shift['to']:.2f}, Δ {shift['shift']:+.2f})",
            body_style
        ))
        story.append(Spacer(1, 0.2*cm))
    
    story.append(Spacer(1, 0.5*cm))
    
    # === KEY STORIES ===
    story.append(Paragraph("Key Stories of the Week", heading_style))
    story.append(Paragraph(
        "Ten representative headlines capturing this week's global narrative landscape:",
        body_style
    ))
    story.append(Spacer(1, 0.3*cm))
    
    stories = get_key_stories()
    for i, story_item in enumerate(stories, 1):
        sentiment_label = "Positive" if story_item['tone'] > 1 else "Negative" if story_item['tone'] < -1 else "Neutral"
        sentiment_color = '#44ff88' if story_item['tone'] > 1 else '#ff4444' if story_item['tone'] < -1 else '#888888'
        
        story.append(Paragraph(
            f"<b>{i}.</b> {story_item['title']}",
            body_style
        ))
        story.append(Paragraph(
            f"<font color='{sentiment_color}'>{sentiment_label}</font> | "
            f"{story_item['country']} | {story_item['type'].title()} source",
            ParagraphStyle('StoryMeta', parent=body_style, fontSize=8, textColor=TEXT_GRAY, leftIndent=15)
        ))
        story.append(Spacer(1, 0.2*cm))
    
    # Build PDF
    doc.build(story, canvasmaker=PageNumCanvas)
    
    return output_path

if __name__ == "__main__":
    print("Generating Global Sentiment Pulse Report...")
    print(f"Period: {WEEK_START} to {WEEK_END}")
    print()
    
    pdf_path = generate_pdf()
    
    print(f"✓ Report generated successfully!")
    print(f"📄 Saved to: {pdf_path}")
