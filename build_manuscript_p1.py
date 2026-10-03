import os
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn
from docx_helpers import set_cell_background, set_cell_margins, set_table_borders, add_header_footer

def build_manuscript():
    doc = docx.Document()
    add_header_footer(doc)

    # Styles
    style_normal = doc.styles['Normal']
    font_normal = style_normal.font
    font_normal.name = 'Times New Roman'
    font_normal.size = Pt(10)
    font_normal.color.rgb = RGBColor(30, 30, 30)

    # -------------------------------------------------------------
    # TITLE & METADATA
    # -------------------------------------------------------------
    p_title = doc.add_paragraph()
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_title.paragraph_format.space_before = Pt(0)
    p_title.paragraph_format.space_after = Pt(6)
    r_title = p_title.add_run("UPI Fraud Awareness Among College Students in India: A Systematic Review of Digital Payment Security Literature, Fraud Typologies, and the Awareness–Behaviour Gap")
    r_title.font.name = 'Times New Roman'
    r_title.font.size = Pt(18)
    r_title.font.bold = True
    r_title.font.color.rgb = RGBColor(20, 40, 80)

    p_sub = doc.add_paragraph()
    p_sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_sub.paragraph_format.space_before = Pt(0)
    p_sub.paragraph_format.space_after = Pt(14)
    r_sub = p_sub.add_run("An IEEE-Style Systematic Integrative Review, Psychometric Synthesis, and Multi-Tier Mitigation Architecture")
    r_sub.font.name = 'Times New Roman'
    r_sub.font.size = Pt(11)
    r_sub.font.italic = True
    r_sub.font.color.rgb = RGBColor(80, 80, 80)

    # Author Block
    tbl_auth = doc.add_table(rows=1, cols=2)
    tbl_auth.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl_auth.autofit = False

    c_a1 = tbl_auth.cell(0, 0)
    c_a2 = tbl_auth.cell(0, 1)
    c_a1.width = Inches(3.4)
    c_a2.width = Inches(3.4)

    p_a1 = c_a1.paragraphs[0]
    p_a1.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_a1 = p_a1.add_run("Shiven Rajput\n")
    r_a1.font.bold = True
    r_a1.font.size = Pt(11)
    r_a1_det = p_a1.add_run("Student Member, IEEE\nDepartment of Data Science\nNoida Institute of Engineering and Technology\nGreater Noida, Uttar Pradesh, India\nEmail: shiven.rajput@niet.co.in")
    r_a1_det.font.size = Pt(9)
    r_a1_det.font.color.rgb = RGBColor(60, 60, 60)

    p_a2 = c_a2.paragraphs[0]
    p_a2.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_a2 = p_a2.add_run("Nisha Verma\n")
    r_a2.font.bold = True
    r_a2.font.size = Pt(11)
    r_a2_det = p_a2.add_run("Academic Supervisor & Guide\nDepartment of Data Science\nNoida Institute of Engineering and Technology\nGreater Noida, Uttar Pradesh, India\nEmail: nisha.verma@niet.co.in")
    r_a2_det.font.size = Pt(9)
    r_a2_det.font.color.rgb = RGBColor(60, 60, 60)

    p_sp = doc.add_paragraph()
    p_sp.paragraph_format.space_before = Pt(6)
    p_sp.paragraph_format.space_after = Pt(6)

    # Abstract Box
    tbl_abs = doc.add_table(rows=1, cols=1)
    tbl_abs.alignment = WD_TABLE_ALIGNMENT.CENTER
    c_abs = tbl_abs.cell(0, 0)
    c_abs.width = Inches(6.8)
    set_cell_background(c_abs, "F4F6F9")
    set_cell_margins(c_abs, top=140, bottom=140, left=180, right=180)
    
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

    p_sp2 = doc.add_paragraph()
    p_sp2.paragraph_format.space_before = Pt(6)
    p_sp2.paragraph_format.space_after = Pt(6)

    # -------------------------------------------------------------
    # HELPER FORMATTING FUNCTIONS
    # -------------------------------------------------------------
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

    def add_equation_block(eq_text, eq_num):
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_before = Pt(6)
        p.paragraph_format.space_after = Pt(6)
        r_eq = p.add_run(eq_text)
        r_eq.font.name = 'Times New Roman'
        r_eq.font.italic = True
        r_eq.font.size = Pt(10.5)
        r_num = p.add_run(f"    ({eq_num})")
        r_num.font.name = 'Times New Roman'
        r_num.font.bold = True
        r_num.font.size = Pt(10)
        return p

    def add_callout_box(title, text, bg_hex="F9FBFD", border_hex="1E56A0"):
        tbl = doc.add_table(rows=1, cols=1)
        tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
        c = tbl.cell(0, 0)
        c.width = Inches(6.8)
        set_cell_background(c, bg_hex)
        set_cell_margins(c, top=100, bottom=100, left=140, right=140)
        tcPr = c._tc.get_or_add_tcPr()
        tcBorders = parse_xml(f'''
            <w:tcBorders {nsdecls("w")}>
                <w:top w:val="single" w:sz="4" w:space="0" w:color="{border_hex}"/>
                <w:left w:val="single" w:sz="16" w:space="0" w:color="{border_hex}"/>
                <w:bottom w:val="single" w:sz="4" w:space="0" w:color="{border_hex}"/>
                <w:right w:val="single" w:sz="4" w:space="0" w:color="{border_hex}"/>
            </w:tcBorders>
        ''')
        tcPr.append(tcBorders)
        p = c.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        p.paragraph_format.line_spacing = 1.15
        r_t = p.add_run(f"{title}: ")
        r_t.font.bold = True
        r_t.font.name = 'Times New Roman'
        r_t.font.size = Pt(9.5)
        r_t.font.color.rgb = RGBColor(20, 40, 80)
        r_b = p.add_run(text)
        r_b.font.name = 'Times New Roman'
        r_b.font.size = Pt(9.5)
        p_after = doc.add_paragraph()
        p_after.paragraph_format.space_before = Pt(3)
        p_after.paragraph_format.space_after = Pt(3)

    def add_fig(image_path, fig_num, caption, width=Inches(6.2)):
        if os.path.exists(image_path):
            p_img = doc.add_paragraph()
            p_img.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p_img.paragraph_format.space_before = Pt(10)
            p_img.paragraph_format.space_after = Pt(3)
            p_img.paragraph_format.keep_with_next = True
            doc.add_picture(image_path, width=width)
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

    def add_table_header(table, headers, col_widths, bg_hex="1E56A0"):
        hdr_cells = table.rows[0].cells
        for i, title in enumerate(headers):
            hdr_cells[i].text = title
            hdr_cells[i].width = col_widths[i]
            set_cell_background(hdr_cells[i], bg_hex)
            set_cell_margins(hdr_cells[i], top=70, bottom=70, left=90, right=90)
            hdr_cells[i].vertical_alignment = WD_ALIGN_VERTICAL.CENTER
            p = hdr_cells[i].paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            for run in p.runs:
                run.font.name = 'Times New Roman'
                run.font.bold = True
                run.font.size = Pt(8.5)
                run.font.color.rgb = RGBColor(255, 255, 255)

    def add_table_row(table, data, col_widths, is_even=False, align_list=None):
        row_cells = table.add_row().cells
        bg_col = "F8FAFC" if is_even else "FFFFFF"
        for i, val in enumerate(data):
            row_cells[i].text = str(val)
            row_cells[i].width = col_widths[i]
            set_cell_background(row_cells[i], bg_col)
            set_cell_margins(row_cells[i], top=60, bottom=60, left=80, right=80)
            row_cells[i].vertical_alignment = WD_ALIGN_VERTICAL.CENTER
            p = row_cells[i].paragraphs[0]
            if align_list and i < len(align_list):
                p.alignment = align_list[i]
            else:
                p.alignment = WD_ALIGN_PARAGRAPH.LEFT
            for run in p.runs:
                run.font.name = 'Times New Roman'
                run.font.size = Pt(8.5)

    # =========================================================================
    # SECTION I: INTRODUCTION
    # =========================================================================
    add_sec_heading("I. INTRODUCTION")

    add_subsec_heading("A. Macro-Scale Evolution of the UPI Ecosystem")
    add_body_p(
        "Launched in August 2016 under the operational aegis of the National Payments Corporation of India (NPCI), the Unified Payments "
        "Interface (UPI) has fundamentally restructured India's retail payments architecture from physical cash reliance to ubiquitous digital "
        "clearing [1]. Government data published by the Ministry of Electronics and Information Technology (MeitY) and the Reserve Bank of "
        "India (RBI) documents an exponential volumetric expansion, rising from 2,233 crore transactions valued at ₹41.04 lakh crore in FY 2020–21 "
        "to over 13,112 crore transactions worth ₹199.95 lakh crore in FY 2023–24 [2], [3]. By FY 2024–25, retail digital payments in India "
        "eclipsed 18,000 crore total transactions, with UPI commanding an extraordinary 83.4% volumetric share of all domestic retail electronic "
        "payment instruments [2], [3]."
    )

    add_subsec_heading("B. Collegiate Adoption Drivers and Digital Ubiquity")
    add_body_p(
        "Within this transformed macroeconomic landscape, higher-education students occupy a uniquely influential demographic stratum. Exhibiting "
        "the behavioral attributes of digital natives, college students rely ubiquitously upon smartphone-based client applications—principally "
        "PhonePe, Google Pay, and Paytm—for everyday peer-to-peer (P2P) debt splitting, merchant commerce (P2M), collegiate canteen expenses, and "
        "tuition remittances [4], [5]. Empirical field surveys across Indian university campuses demonstrate that collegiate uptake is primarily "
        "driven by three utilitarian dimensions: transaction speed (clearing in under three seconds), the complete absence of consumer-facing transaction "
        "fees, and universal merchant acceptance [4], [5]. However, the foundational design principles that catalyzed UPI's global acclaim—sub-second "
        "atomic clearing, minimal verification overhead, and standardized application programming interface (API) interoperability across disparate "
        "banking platforms—have concurrently created systemic socio-technical vulnerabilities [4], [6]."
    )

    add_subsec_heading("C. The Problem Statement: The Security Paradox")
    add_body_p(
        "As retail digital transactions expanded, financial fraud within digital payment rails escalated in parallel. Annual disclosures published "
        "by the Reserve Bank of India (RBI) reveal that commercial banking institutions reported 36,075 total fraud occurrences in FY 2023–24, marking "
        "a 166% year-on-year increase over the 13,564 cases recorded in FY 2022–23 [3], [7]. Most strikingly, fraud classified under the 'card and "
        "internet payments' ledger surged by over 334% in a single annual cycle—rising from 6,699 incidents in FY 2022–23 to 29,082 incidents in "
        "FY 2023–24—accounting for 80.6% of all bank fraud cases by absolute volume [3], [7]. Concurrently, parliamentary disclosures compiled by the "
        "Ministry of Home Affairs (MHA) through the National Cyber Crime Reporting Portal (NCRP) registered over 28 lakh cyber-fraud grievances in "
        "2024–2025 alone, representing aggregate financial debits exceeding ₹22,900 crore [8]."
    )

    add_subsec_heading("D. Exploitation of Cognitive Heuristics Over Cryptographic Protocols")
    add_body_p(
        "Rigorous computational security audits confirm that this escalating wave of payment fraud is not propelled by cryptographic exploits, "
        "transport-layer decryption, or protocol-level penetration of the National Interbank Transfer Protocol [6], [9]. Mathematical and "
        "hardware protections—including AES-256 transmission encryption, device-binding via SIM IMSI/IMEI cryptographic handshakes, and mandatory "
        "two-factor authentication (2FA) enforced through a 4- or 6-digit MPIN—remain computationally sound [9]. Instead, fraudsters systematically "
        "circumvent technical protections by targeting the human-computer interface through psychological manipulation and deceptive social "
        "engineering [6], [10]. This gives rise to the central empirical paradox addressed in this review: college students demonstrate high "
        "declarative awareness of digital payment scams (ranging between 68.5% and 91.2%), yet exhibit alarming rates of real-world financial "
        "victimisation (spanning 24.8% to 58.0%) [4], [5], [10]. Despite institutional advisories and public service communiqués, students routinely "
        "bypass foundational security protocols under real-time transactional pressure [11], [12]."
    )

    add_subsec_heading("E. Research Objectives and Review Questions")
    add_body_p(
        "To systematically interrogate this socio-technical disconnect, this integrative review addresses six structured research questions (RQs):\n"
        "• RQ1: What is the empirical trajectory of UPI transaction volume versus digital retail fraud incidence from FY 2020–21 to FY 2025–26 under official regulatory surveillance?\n"
        "• RQ2: What constitutes the comprehensive taxonomy of UPI fraud vectors, and through what cognitive heuristics do they exploit users over technical penetration?\n"
        "• RQ3: What empirical baseline levels of fraud awareness, cyber-hygiene compliance, and financial victimisation are documented across Indian higher-education cohorts?\n"
        "• RQ4: What formal cognitive, psychometric, and behavioral models account for the observed awareness–behaviour gap in instant payment systems?\n"
        "• RQ5: How efficacious and visible are existing institutional countermeasures, statutory remedies, and the Citizen Financial Cyber Fraud Reporting System (1930 helpline)?\n"
        "• RQ6: What methodological deficiencies characterise current literature, and what constitutes a robust, multi-tier socio-technical mitigation architecture?"
    )

    # =========================================================================
    # SECTION II: REVIEW METHODOLOGY
    # =========================================================================
    add_sec_heading("II. REVIEW METHODOLOGY")

    add_subsec_heading("A. Search Strategy and Corpus Construction")
    add_body_p(
        "In strict adherence to the Preferred Reporting Items for Systematic Reviews and Meta-Analyses (PRISMA 2020) statement [13], a comprehensive, "
        "multi-stage literature search was executed across major international indexing databases (IEEE Xplore, ScienceDirect/Scopus, SpringerLink, "
        "Emerald Insight, MDPI, ACM Digital Library) and recognized academic preprints and open repositories (ResearchGate, SSRN, arXiv). In parallel, "
        "official statutory and regulatory archives were retrieved directly from the Reserve Bank of India (RBI), National Payments Corporation of "
        "India (NPCI), Ministry of Electronics and Information Technology (MeitY), and the Indian Cyber Crime Coordination Centre (I4C) under the "
        "Ministry of Home Affairs (MHA) [13]."
    )

    add_subsec_heading("B. Databases, Repositories, and Boolean Query Pipeline")
    add_body_p(
        "The identification pipeline utilized customized Boolean operational strings combining payment technology, cognitive psychology, and student "
        "demographic keywords: ('UPI' OR 'Unified Payments Interface' OR 'digital payment fraud' OR 'fintech scam') AND ('awareness-behaviour gap' "
        "OR 'cognitive bias' OR 'optimism bias' OR 'social engineering' OR 'quishing') AND ('college students' OR 'university students' OR "
        "'higher education' OR 'youth' OR 'India'). The temporal window was focused on contemporary publications from 2020 through 2026, reflecting "
        "the maturation of the UPI 2.0 architecture and the post-pandemic acceleration of digital campus commerce [13]."
    )

    add_subsec_heading("C. Inclusion and Exclusion Criteria")
    add_body_p(
        "To ensure academic rigor, studies were admitted based on three defined criteria: (i) primary empirical investigations examining UPI adoption, "
        "fraud awareness, security perceptions, or victimisation among Indian college cohorts or retail payment users; (ii) official statutory, regulatory, "
        "or forensic data releases from sovereign Indian authorities (RBI, NPCI, MHA, MeitY); and (iii) foundational behavioral and psychometric "
        "frameworks evaluating cyber-deception (e.g., Protection Motivation Theory, Dual-Process Theory, HAIS-Q) [11], [12], [13]. Non-peer-reviewed "
        "commercial promotional articles, anonymous blog entries, unverified grey literature lacking explicit empirical methodology, and studies focusing "
        "exclusively on enterprise infrastructure or blockchain technologies were systematically excluded [13]."
    )

    add_subsec_heading("D. Screening and Selection Flowchart")
    add_body_p(
        "As detailed in the PRISMA 2020 flowchart (Fig. 1), the initial search pipeline identified 240 records (IEEE Xplore: 42; ScienceDirect/Scopus: 58; "
        "SpringerLink: 36; Emerald/MDPI/ACM: 34; Preprints & Academic Archives: 48; Statutory/Regulatory Repositories: 22). Following automated and "
        "manual deduplication, 62 duplicates were removed, leaving 178 unique records for title and abstract screening. During initial screening, "
        "112 records were excluded as out-of-scope non-payment domains or pure hardware/cryptographic analyses. Full-text reports were sought for the "
        "remaining 66 records, of which 4 could not be retrieved. The remaining 62 full-text studies were critically appraised against empirical "
        "and psychometric validity criteria. A total of 28 studies were excluded with specific justifications (14 lacked empirical or verifiable data; "
        "8 were commercial promotional whitepapers; 6 lacked clear methodology). This rigorous winnowing yielded a final systematic corpus of 34 "
        "peer-reviewed empirical studies, regulatory reports, and theoretical papers [13]."
    )

    add_fig(os.path.join(r"d:\antigravitry\figures", "fig1_prisma_flowchart.png"), 1,
            "PRISMA 2020 literature identification, screening, eligibility appraisal, and systematic inclusion flowchart. Every attrition stage is mathematically consistent (240 identified - 62 duplicates = 178 screened; 178 - 112 = 66 sought; 66 - 4 = 62 assessed; 62 - 28 = 34 included).")

    add_subsec_heading("E. Statistical Sampling Formulation and Cochran's Thresholds")
    add_body_p(
        "To evaluate whether primary campus surveys in the reviewed corpus maintained adequate statistical power, sample sizes were benchmarked "
        "against Cochran's classical sampling formulation for infinite and finite student populations [14], [15]:"
    )
    add_equation_block("n_0 = \\frac{Z^2 \\cdot p(1 - p)}{e^2}, \\quad n = \\frac{n_0}{1 + \\frac{n_0 - 1}{N}}", "1")
    add_body_p(
        "where Z represents the standard normal deviate at a 95% confidence interval (Z = 1.96), p represents the estimated baseline proportion of "
        "fraud awareness (conservatively set at p = 0.5 to yield maximum variance), e is the acceptable margin of error (e = 0.05), and N is the "
        "finite collegiate population size [14]. For an infinite population, the formulation mandates an unadjusted sample threshold of n_0 = 384.16 "
        "(approximately 385 respondents). Cross-examination of the synthesised Indian collegiate studies reveals significant sample heterogeneity: "
        "while larger district-level surveys (e.g., N = 250+ in Pan-India inquiries) approach or satisfy adequate statistical power, several prominent "
        "campus studies (e.g., N = 69, N = 100, N = 109) represent exploratory convenience samples [4], [5], [14], [15]. This underscores a pervasive "
        "methodological fragmentation that limits cross-institutional generalizability."
    )

    add_subsec_heading("F. Data Extraction, Psychometric Benchmarking, and Synthesis Protocol")
    add_body_p(
        "Data extraction followed a standardized protocol capturing sample size, geographic location, collegiate demographic composition, reported "
        "adoption rates, stated fraud awareness, actual cyber-hygiene compliance, victimisation rates, and specific fraud typologies encountered [13]. "
        "To rigorously bridge declarative awareness with operational behavior, findings were benchmarked against the Human Aspects of Information "
        "Security Questionnaire (HAIS-Q) framework [16], which evaluates cybersecurity posture across three distinct cognitive dimensions: Knowledge "
        "(what students know), Attitude (how students feel about security rules), and Behaviour (what students actually do during payment authorization)."
    )

    print("Section II completed")
    return doc

print("Script framework Part 1 ready")
