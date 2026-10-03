import os
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn
from docx_helpers import set_cell_background, set_cell_margins, set_table_borders, add_header_footer

def create_document():
    doc = docx.Document()
    add_header_footer(doc)

    # Styles
    style_normal = doc.styles['Normal']
    font_normal = style_normal.font
    font_normal.name = 'Times New Roman'
    font_normal.size = Pt(10)
    font_normal.color.rgb = RGBColor(30, 30, 30)

    # Title
    p_title = doc.add_paragraph()
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_title.paragraph_format.space_before = Pt(0)
    p_title.paragraph_format.space_after = Pt(6)
    run_title = p_title.add_run("UPI Fraud Awareness Among College Students in India: A Systematic Review of Digital Payment Security Literature, Fraud Typologies, and the Awareness–Behaviour Gap")
    run_title.font.name = 'Times New Roman'
    run_title.font.size = Pt(18)
    run_title.font.bold = True
    run_title.font.color.rgb = RGBColor(20, 40, 80)

    # Subtitle
    p_sub = doc.add_paragraph()
    p_sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_sub.paragraph_format.space_before = Pt(0)
    p_sub.paragraph_format.space_after = Pt(14)
    run_sub = p_sub.add_run("An IEEE-Style Systematic Integrative Review, Psychometric Synthesis, and Multi-Tier Mitigation Architecture")
    run_sub.font.name = 'Times New Roman'
    run_sub.font.size = Pt(11)
    run_sub.font.italic = True
    run_sub.font.color.rgb = RGBColor(80, 80, 80)

    # Author Block
    tbl_auth = doc.add_table(rows=1, cols=2)
    tbl_auth.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl_auth.autofit = False

    cell_a1 = tbl_auth.cell(0, 0)
    cell_a2 = tbl_auth.cell(0, 1)
    cell_a1.width = Inches(3.4)
    cell_a2.width = Inches(3.4)

    p_a1 = cell_a1.paragraphs[0]
    p_a1.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_a1 = p_a1.add_run("Shiven Rajput\n")
    r_a1.font.bold = True
    r_a1.font.size = Pt(11)
    r_a1_det = p_a1.add_run("Student Member, IEEE\nDepartment of Data Science\nNoida Institute of Engineering and Technology\nGreater Noida, Uttar Pradesh, India\nEmail: shiven.rajput@niet.co.in")
    r_a1_det.font.size = Pt(9)
    r_a1_det.font.color.rgb = RGBColor(60, 60, 60)

    p_a2 = cell_a2.paragraphs[0]
    p_a2.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_a2 = p_a2.add_run("Nisha Verma\n")
    r_a2.font.bold = True
    r_a2.font.size = Pt(11)
    r_a2_det = p_a2.add_run("Academic Supervisor & Guide\nDepartment of Data Science\nNoida Institute of Engineering and Technology\nGreater Noida, Uttar Pradesh, India\nEmail: nisha.verma@niet.co.in")
    r_a2_det.font.size = Pt(9)
    r_a2_det.font.color.rgb = RGBColor(60, 60, 60)

    p_space = doc.add_paragraph()
    p_space.paragraph_format.space_before = Pt(8)
    p_space.paragraph_format.space_after = Pt(8)

    # Abstract Box
    tbl_abs = doc.add_table(rows=1, cols=1)
    tbl_abs.alignment = WD_TABLE_ALIGNMENT.CENTER
    c_abs = tbl_abs.cell(0, 0)
    c_abs.width = Inches(6.8)
    set_cell_background(c_abs, "F4F6F9")
    set_cell_margins(c_abs, top=140, bottom=140, left=180, right=180)
    
    # Border for abstract box
    tcPr = c_abs._tc.get_or_add_tcPr()
    tcBorders = parse_xml(f'''
        <w:tcBorders {nsdecls("w")}>
            <w:top w:val="single" w:sz="6" w:space="0" w:color="1E56A0"/>
            <w:left w:val="single" w:sz="18" w:space="0" w:color="1E56A0"/>
            <w:bottom w:val="single" w:sz="6" w:space="0" w:color="1E56A0"/>
            <w:right w:val="single" w:sz="6" w:space="0" w:color="1E56A0"/>
        </w:tcBorders>
    ''')
    tcPr.append(tcBorders)

    p_abs = c_abs.paragraphs[0]
    p_abs.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    p_abs.paragraph_format.line_spacing = 1.15
    p_abs.paragraph_format.space_after = Pt(4)
    r_abs_bold = p_abs.add_run("Abstract—")
    r_abs_bold.font.bold = True
    r_abs_bold.font.size = Pt(9.5)
    r_abs_bold.font.name = 'Times New Roman'
    
    r_abs_text = p_abs.add_run(
        "The Unified Payments Interface (UPI) has established itself as the architectural backbone of India's retail digital payments "
        "ecosystem, processing over 13,112 crore transactions valued at ₹199.95 lakh crore in FY 2023–24 and escalating past 17,200 crore "
        "transactions in FY 2024–25. College-going youth represent the core demographic driving this frictionless volume, utilizing smartphone "
        "applications ubiquitously for peer-to-peer debt settlement and campus retail. However, the exact architectural characteristics that catalyzed "
        "UPI's mass adoption—sub-second clearance, zero end-user transaction fees, and minimal cognitive overhead—have simultaneously rendered "
        "the payment rail exceptionally fertile for socio-technical exploitation. This systematic review synthesises 34 peer-reviewed, empirical, "
        "and regulatory sources (2020–2026) across five key dimensions: macro-scale transaction trajectories versus fraud incidences, comprehensive threat "
        "taxonomies, empirical collegiate awareness baselines, theoretical drivers of the awareness–behaviour gap, and institutional mitigation mechanisms. "
        "Synthesised campus field investigations reveal an acute 'security paradox': while baseline declarative awareness of digital payment scams "
        "spans 68.5% to 91.2%, operational compliance with basic cyber-hygiene remains below 50%, and reported risk exposure or victimisation persists "
        "between 24.8% and 58.0%. We formalize this disconnect through dual-process cognitive theory, Protection Motivation Theory (PMT), and hybrid "
        "Structural Equation Modeling (SEM-ANN), demonstrating that habituated System 1 heuristic processing, optimism bias, and manufactured situational "
        "urgency systematically overwhelm abstract declarative knowledge during live payment authorization. Finally, we evaluate statutory liabilities, the "
        "1930 Citizen Financial Cyber Fraud Reporting and Management System (CFCFRMS), and articulate a multi-tier mitigation framework that integrates "
        "point-of-risk UI friction nudges, curricular experiential simulation, and automated mule-account interdiction."
    )
    r_abs_text.font.italic = True
    r_abs_text.font.size = Pt(9.5)
    r_abs_text.font.name = 'Times New Roman'

    p_idx = c_abs.add_paragraph()
    p_idx.paragraph_format.line_spacing = 1.15
    p_idx.paragraph_format.space_before = Pt(4)
    r_idx_bold = p_idx.add_run("Index Terms—")
    r_idx_bold.font.bold = True
    r_idx_bold.font.size = Pt(9.5)
    r_idx_bold.font.name = 'Times New Roman'
    r_idx_text = p_idx.add_run("Unified Payments Interface (UPI), digital financial fraud, cybersecurity awareness, awareness–behaviour gap, social engineering, quishing, optimism bias, dual-process theory, structural equation modeling.")
    r_idx_text.font.size = Pt(9.5)
    r_idx_text.font.name = 'Times New Roman'

    p_div = doc.add_paragraph()
    p_div.paragraph_format.space_before = Pt(6)
    p_div.paragraph_format.space_after = Pt(6)

    def add_sec_heading(title):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(14)
        p.paragraph_format.space_after = Pt(4)
        p.paragraph_format.keep_with_next = True
        r = p.add_run(title)
        r.font.name = 'Times New Roman'
        r.font.size = Pt(11.5)
        r.font.bold = True
        r.font.color.rgb = RGBColor(20, 40, 80)
        return p

    def add_subsec_heading(title):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(10)
        p.paragraph_format.space_after = Pt(3)
        p.paragraph_format.keep_with_next = True
        r = p.add_run(title)
        r.font.name = 'Times New Roman'
        r.font.size = Pt(10.5)
        r.font.bold = True
        r.font.italic = True
        r.font.color.rgb = RGBColor(40, 60, 100)
        return p

    def add_body_p(text, indent=0.2):
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        p.paragraph_format.line_spacing = 1.15
        p.paragraph_format.space_after = Pt(5)
        p.paragraph_format.first_line_indent = Inches(indent)
        r = p.add_run(text)
        r.font.name = 'Times New Roman'
        r.font.size = Pt(10)
        return p

    def add_fig(image_path, fig_num, caption, width=Inches(6.2)):
        if os.path.exists(image_path):
            p_img = doc.add_paragraph()
            p_img.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p_img.paragraph_format.space_before = Pt(10)
            p_img.paragraph_format.space_after = Pt(3)
            p_img.paragraph_format.keep_with_next = True
            doc.add_picture(image_path, width=width)
            # Center the picture
            doc.paragraphs[-1].alignment = WD_ALIGN_PARAGRAPH.CENTER
            
            p_cap = doc.add_paragraph()
            p_cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p_cap.paragraph_format.space_before = Pt(2)
            p_cap.paragraph_format.space_after = Pt(10)
            r_num = p_cap.add_run(f"Fig. {fig_num}. ")
            r_num.font.name = 'Times New Roman'
            r_num.font.bold = True
            r_num.font.size = Pt(9)
            r_txt = p_cap.add_run(caption)
            r_txt.font.name = 'Times New Roman'
            r_txt.font.size = Pt(9)

    def add_table_header(table, headers, col_widths, bg_hex="1E56A0"):
        hdr_cells = table.rows[0].cells
        for i, title in enumerate(headers):
            hdr_cells[i].text = title
            hdr_cells[i].width = col_widths[i]
            set_cell_background(hdr_cells[i], bg_hex)
            set_cell_margins(hdr_cells[i], top=80, bottom=80, left=100, right=100)
            hdr_cells[i].vertical_alignment = WD_ALIGN_VERTICAL.CENTER
            p = hdr_cells[i].paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            for run in p.runs:
                run.font.name = 'Times New Roman'
                run.font.bold = True
                run.font.size = Pt(8.5)
                run.font.color.rgb = RGBColor(255, 255, 255)

    def add_table_caption(tbl_num, title):
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_before = Pt(12)
        p.paragraph_format.space_after = Pt(2)
        p.paragraph_format.keep_with_next = True
        r1 = p.add_run(f"TABLE {tbl_num}\n")
        r1.font.name = 'Times New Roman'
        r1.font.bold = True
        r1.font.size = Pt(9.5)
        r2 = p.add_run(title)
        r2.font.name = 'Times New Roman'
        r2.font.size = Pt(8.5)
        r2.font.bold = True
        r2.font.color.rgb = RGBColor(40, 40, 40)

    # =========================================================================
    # SECTION I: INTRODUCTION
    # =========================================================================
    add_sec_heading("I. INTRODUCTION")
    
    add_subsec_heading("A. Macro-Scale Evolution of the UPI Ecosystem")
    add_body_p(
        "Launched in August 2016 under the operational stewardship of the National Payments Corporation of India (NPCI), the Unified Payments "
        "Interface (UPI) has fundamentally restructured the retail payments architecture of the Indian subcontinent from a physical cash-reliant "
        "framework into a globally recognized real-time digital transaction railway [1]. Official monitoring reports released by the Ministry of "
        "Electronics and Information Technology (MeitY) and the Ministry of Finance document an unprecedented volumetric trajectory, expanding "
        "from 2,233 crore transactions valued at ₹41.04 lakh crore in FY 2020–21 to over 13,112 crore transactions worth ₹199.95 lakh crore in "
        "FY 2023–24 [2], [3]. By FY 2024–25, retail digital payments in India exceeded 18,000 crore total transactions, with UPI commanding an "
        "extraordinary 83.4% volumetric share of all domestic retail electronic payment instruments [2], [3]."
    )

    add_subsec_heading("B. Collegiate Adoption Drivers and Digital Ubiquity")
    add_body_p(
        "Within this massive macroeconomic transformation, higher-education students occupy a critical demographic cohort. Characterized as "
        "digitally agile natives, college-going youth rely near-universally upon smartphone-based client handles (predominantly PhonePe, Google Pay, "
        "and Paytm) for daily peer-to-peer (P2P) debt partitioning, collegiate canteen settlements, tuition remittances, and offline merchant (P2M) "
        "commerce [4], [5]. Empirical field surveys across Indian university campuses establish that collegiate uptake is primarily propelled by "
        "three utilitarian parameters: instantaneous clearing latency (< 3 seconds), total elimination of consumer-facing transaction fees, and "
        "ubiquitous merchant QR-code acceptance [4], [5]. However, the very design principles that engineered UPI's domestic and international "
        "success—frictionless execution, minimal cognitive authentication overhead, and standardized application programming interface (API) "
        "interoperability—have inadvertently introduced acute socio-technical vulnerabilities [4], [6]."
    )

    add_subsec_heading("C. The Problem Statement: The Security Paradox")
    add_body_p(
        "In tandem with the volumetric explosion of retail digital clearing, financial fraud within digital payment rails has escalated at an "
        "alarming velocity. Disclosures published in the Reserve Bank of India (RBI) Annual Reports indicate that commercial banking institutions "
        "reported 36,075 total fraud occurrences in FY 2023–24, representing a 166% YoY volumetric expansion over the 13,564 incidents recorded in "
        "FY 2022–23 [3], [7]. Crucially, the digital fraud sub-category ('card and internet transactions') surged by over 334% in a single reporting "
        "cycle, escalating from 6,699 incidents in FY 2022–23 to 29,082 incidents in FY 2023–24 and accounting for 80.6% of all banking fraud cases by "
        "absolute volume [3], [7]. Concurrently, parliamentary disclosures compiled by the Ministry of Home Affairs (MHA) through the National Cyber "
        "Crime Reporting Portal (NCRP) registered over 28 lakh cyber-fraud grievances in 2024–2025 alone, representing aggregate financial debits "
        "surpassing ₹22,900 crore [8]."
    )

    add_subsec_heading("D. Exploitation of Cognitive Heuristics Over Cryptographic Protocols")
    add_body_p(
        "A critical finding emerging from rigorous forensic and computational security audits is that this unprecedented surge in digital payment "
        "fraud is not driven by algorithmic compromises, transport-layer vulnerabilities, or protocol-level penetration of the underlying National "
        "Interbank Transfer Protocol [6], [9]. Mathematical cryptographic safeguards—such as AES-256 transmission encryption, hardware device "
        "binding via SIM IMSI/IMEI cryptographic handshakes, and mandatory two-factor authentication (2FA) enforced through a 4- or 6-digit MPIN—remain "
        "computationally robust [9]. Rather, perpetrators systematically bypass protocol defenses by targeting the human-computer interface through "
        "deceptive social engineering [6], [10]. This dynamic produces the central empirical puzzle examined in this systematic review: college "
        "students exhibit high declarative awareness of basic fraud terminologies (ranging from 68.5% to 91.2%), yet suffer real-world victimisation "
        "rates spanning 24.8% to 58.0% [4], [5], [10]. Despite institutional advisories and public service communiqués, students routinely bypass "
        "procedural security verifications under real-time transactional pressure [11], [12]."
    )

    add_subsec_heading("E. Research Objectives and Review Questions")
    add_body_p(
        "To systematically interrogate this socio-technical security paradox, this integrative review addresses six formal research questions (RQs):\n"
        "• RQ1: What is the empirical trajectory of UPI transaction volume versus digital retail payment fraud incidence from FY 2020–21 to FY 2025–26 under official regulatory surveillance?\n"
        "• RQ2: What constitutes the comprehensive taxonomy of UPI fraud vectors, and through what cognitive heuristics do they exploit users over technical penetration?\n"
        "• RQ3: What empirical baseline levels of fraud awareness, cyber-hygiene compliance, and financial victimisation are documented across Indian higher-education cohorts?\n"
        "• RQ4: What formal cognitive, psychometric, and behavioral models account for the observed awareness–behaviour gap in instant payment systems?\n"
        "• RQ5: How efficacious and visible are existing institutional countermeasures, statutory remedies, and the Citizen Financial Cyber Fraud Reporting System (1930 helpline)?\n"
        "• RQ6: What methodological deficiencies characterise current literature, and what constitutes a robust, multi-tier socio-technical mitigation architecture?"
    )

    print("Section I completed")
    return doc

print("Script framework initialized")
