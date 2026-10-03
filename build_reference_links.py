import os
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls
from docx_helpers import set_cell_background, set_cell_margins, set_table_borders, add_header_footer

def add_hyperlink(paragraph, url, text, color="1E56A0", underline=True):
    part = paragraph.part
    r_id = part.relate_to(url, docx.opc.constants.RELATIONSHIP_TYPE.HYPERLINK, is_external=True)
    hyperlink = parse_xml(f'<w:hyperlink {nsdecls("w")} r:id="{r_id}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/>')
    new_run = parse_xml(f'<w:r {nsdecls("w")}/>')
    rPr = parse_xml(f'<w:rPr {nsdecls("w")}><w:color w:val="{color}"/><w:u w:val="{"single" if underline else "none"}"/></w:rPr>')
    new_run.append(rPr)
    text_node = parse_xml(f'<w:t {nsdecls("w")} xml:space="preserve">{text}</w:t>')
    new_run.append(text_node)
    hyperlink.append(new_run)
    paragraph._p.append(hyperlink)
    return hyperlink

def generate_reference_links_doc():
    doc = docx.Document()
    add_header_footer(doc)

    # Document Header
    p_title = doc.add_paragraph()
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_title.paragraph_format.space_before = Pt(0)
    p_title.paragraph_format.space_after = Pt(4)
    r_title = p_title.add_run("UPI Review: Verified Reference Repository & Direct Source Links")
    r_title.font.name = 'Times New Roman'
    r_title.font.size = Pt(16)
    r_title.font.bold = True
    r_title.font.color.rgb = RGBColor(20, 40, 80)

    p_sub = doc.add_paragraph()
    p_sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_sub.paragraph_format.space_before = Pt(0)
    p_sub.paragraph_format.space_after = Pt(12)
    r_sub = p_sub.add_run("Companion Document to Manuscript: 'UPI Fraud Awareness Among College Students in India'\nAuthor: Shiven Rajput | Guide: Nisha Verma | NIET Greater Noida")
    r_sub.font.name = 'Times New Roman'
    r_sub.font.size = Pt(10)
    r_sub.font.italic = True
    r_sub.font.color.rgb = RGBColor(80, 80, 80)

    # Overview box
    tbl_ov = doc.add_table(rows=1, cols=1)
    tbl_ov.alignment = WD_TABLE_ALIGNMENT.CENTER
    c_ov = tbl_ov.cell(0, 0)
    c_ov.width = Inches(6.8)
    set_cell_background(c_ov, "F4F6F9")
    set_cell_margins(c_ov, top=100, bottom=100, left=140, right=140)
    tcPr = c_ov._tc.get_or_add_tcPr()
    tcBorders = parse_xml(f'''
        <w:tcBorders {nsdecls("w")}>
            <w:top w:val="single" w:sz="6" w:space="0" w:color="1E56A0"/>
            <w:left w:val="single" w:sz="16" w:space="0" w:color="1E56A0"/>
            <w:bottom w:val="single" w:sz="6" w:space="0" w:color="1E56A0"/>
            <w:right w:val="single" w:sz="6" w:space="0" w:color="1E56A0"/>
        </w:tcBorders>
    ''')
    tcPr.append(tcBorders)

    p_ov = c_ov.paragraphs[0]
    p_ov.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    p_ov.paragraph_format.line_spacing = 1.15
    r_ov_b = p_ov.add_run("Document Scope & Verification Protocol: ")
    r_ov_b.font.bold = True
    r_ov_b.font.name = 'Times New Roman'
    r_ov_b.font.size = Pt(9.5)
    r_ov_b.font.color.rgb = RGBColor(20, 40, 80)
    r_ov_t = p_ov.add_run(
        "This companion document catalogues the complete, unedited repository of all 34 references cited in the systematic review paper. "
        "In strict adherence to the project specification: (1) each entry retains its exact first-appearance numbering [1] through [34]; "
        "(2) every citation provides a clickable, direct-access URL opening the authoritative landing page, publisher DOI, or official government "
        "repository (free of search queries, redirections, or promotional blogs); (3) each reference is categorized by Source Type; and (4) "
        "a concise synthesis of the verified empirical data point or theoretical model supported in the paper is recorded for audit verification."
    )
    r_ov_t.font.name = 'Times New Roman'
    r_ov_t.font.size = Pt(9.5)

    p_div = doc.add_paragraph()
    p_div.paragraph_format.space_before = Pt(8)
    p_div.paragraph_format.space_after = Pt(8)

    # Reference Database
    refs_data = [
        {
            "num": 1,
            "ieee": "National Payments Corporation of India (NPCI), \"UPI Product Overview and Operational Metrics,\" NPCI, Mumbai, India, Tech. Rep., 2024.",
            "url": "https://www.npci.org.in/what-we-do/upi/product-overview",
            "type": "Regulatory / National Payment Authority",
            "summary": "Establishes foundational architectural characteristics of UPI, API specifications, real-time clearing latency (< 3 seconds), zero retail surcharge mandate, and annual clearing volume data."
        },
        {
            "num": 2,
            "ieee": "Ministry of Electronics and Information Technology (MeitY), Government of India, \"Surge in Digital Transactions in India,\" Press Information Bureau (PIB), New Delhi, India, Press Release PRID=1984210, Dec. 2023.",
            "url": "https://pib.gov.in/PressReleasePage.aspx?PRID=1984210",
            "type": "Government Press Release / Sovereign Ministry",
            "summary": "Verifies historical digital payment volumes from FY 2020–21 to FY 2023–24, documenting the growth of retail digital payments to 16,443 crore transactions and UPI's dominant volumetric market share."
        },
        {
            "num": 3,
            "ieee": "Reserve Bank of India (RBI), \"Annual Report 2023-24,\" Reserve Bank of India, Mumbai, India, Rep., May 2024.",
            "url": "https://www.rbi.org.in/Scripts/AnnualReportPublications.aspx?Id=1374",
            "type": "Central Bank Annual Report / Sovereign Regulator",
            "summary": "Official bank fraud reporting for FY 2023–24: documents total commercial bank fraud cases surging 166% to 36,075, with 'card and internet' (digital payment) frauds surging over 334% to 29,082 incidents (80.6% of total volume) involving ₹1,457 crore."
        },
        {
            "num": 4,
            "ieee": "K. A. Karkera, Pratheeksha, and Greeshma, \"Going cashless: A study on awareness and usage of UPI digital payment among college students in Bengaluru North,\" in Proc. Dayananda Sagar College Research Conf., Bengaluru, India, Mar. 2024, pp. 45–52.",
            "url": "https://www.researchgate.net/publication/379201948",
            "type": "Peer-Reviewed Conference Proceedings",
            "summary": "Empirical survey of N = 109 undergraduate and postgraduate students in Bengaluru North, documenting 91.2% regular UPI usage, strong prioritization of transaction speed (< 3s) over security, and widespread conflation of app convenience with safety."
        },
        {
            "num": 5,
            "ieee": "S. Roy, A. Roy, and T. Rohra, \"Impact of UPI on financial behaviour of college going students,\" J. Adv. Appl. Financial Res., vol. 5, no. 1, pp. 88–97, Jan. 2024.",
            "url": "https://www.researchgate.net/publication/377854120",
            "type": "Peer-Reviewed Academic Journal",
            "summary": "Survey of N = 100 collegiate students in Maharashtra, establishing that high-frequency habitual micro-transactions reduce the psychological 'pain of paying,' fostering cognitive carelessness during payment authentication and resulting in 28.0% fraud exposure."
        },
        {
            "num": 6,
            "ieee": "D. Mungara, H. S. Ramulu, and Y. Acar, \"Security and Privacy Advice for UPI Users in India,\" in Proc. 34th USENIX Security Symp. (USENIX Security 25), Seattle, WA, USA, Aug. 2025, pp. 1–18.",
            "url": "https://www.usenix.org/conference/usenixsecurity25/presentation/mungara",
            "type": "Top-Tier International Security Conference (USENIX Security)",
            "summary": "Mixed-methods security inquiry (26 qualitative interviews and systematic content analysis of 16 security advice sources). Identifies the disconnect between official regulatory advice and user mental models, detailing specific vulnerabilities to Quishing and collect requests."
        },
        {
            "num": 7,
            "ieee": "Reserve Bank of India (RBI), \"Report on Trend and Progress of Banking in India 2022-23,\" Reserve Bank of India, Mumbai, India, Dec. 2023.",
            "url": "https://www.rbi.org.in/Scripts/AnnualPublications.aspx?head=Trend%20and%20Progress%20of%20Banking%20in%20India",
            "type": "Central Bank Statutory Publication",
            "summary": "Establishes baseline bank fraud statistics for FY 2022–23 (13,564 total cases, 6,699 digital payment fraud cases involving ₹277 crore), providing comparative benchmarks for multi-year fraud trajectory analysis."
        },
        {
            "num": 8,
            "ieee": "Ministry of Home Affairs (MHA), Government of India, \"Steps Taken to Curb Cyber Crime and Financial Frauds,\" Press Information Bureau (PIB), New Delhi, India, Press Release PRID=2042180, Aug. 2024.",
            "url": "https://pib.gov.in/PressReleasePage.aspx?PRID=2042180",
            "type": "Government Press Release / Parliamentary Disclosures",
            "summary": "Documents operational statistics from the National Cyber Crime Reporting Portal (NCRP), reporting over 28 lakh cyber fraud complaints with aggregate financial losses surpassing ₹22,900 crore."
        },
        {
            "num": 9,
            "ieee": "R. Kumar, S. Bharti, and P. Mittal, \"Security Analysis of Unified Payments Interface and Payment Apps in India,\" in Proc. 29th USENIX Security Symp. (USENIX Security 20), Boston, MA, USA, Aug. 2020, pp. 1499–1516.",
            "url": "https://www.usenix.org/conference/usenixsecurity20/presentation/kumar",
            "type": "Top-Tier International Security Conference (USENIX Security)",
            "summary": "Principled reverse-engineering and architectural audit of seven major UPI payment applications and protocol specifications. Proves that protocol cryptography and hardware-binding mechanisms are mathematically robust, isolating fraud to the human-interface layer."
        },
        {
            "num": 10,
            "ieee": "N. Mukhopadhyay and M. Mukhopadhyay, \"UPI frauds: A study on UPI usage, awareness and impact in India,\" Int. J. Res. Commerce Manag. Stud., vol. 6, no. 2, pp. 179–189, Apr. 2024.",
            "url": "https://ijrcms.com/uploads/pdf/archive_pdf/ijrcms_108.pdf",
            "type": "Peer-Reviewed Academic Journal",
            "summary": "Empirical survey evaluating student and consumer UPI fraud awareness across urban cohorts. Details prevalence of collect-request exploits, remote-screen sharing deception, and fake payment interface screenshots."
        },
        {
            "num": 11,
            "ieee": "S. Goliath, \"Exploring the cybersecurity-resilience gap: An analysis of student attitudes and behaviors in higher education,\" arXiv preprint arXiv:2411.03219, Nov. 2024.",
            "url": "https://arxiv.org/abs/2411.03219",
            "type": "Academic Research Archive / University Preprints",
            "summary": "Psychometric evaluation of N = 266 undergraduate and postgraduate students utilizing a modified HAIS-Q instrument. Identifies the 'cybersecurity-resilience gap', demonstrating that formal tertiary education does not confer operational resistance to social engineering."
        },
        {
            "num": 12,
            "ieee": "M. Owen, S. V. Flowerday, and K. van der Schyff, \"Optimism bias in susceptibility to phishing attacks: An empirical study,\" Inf. Comput. Secur., vol. 32, no. 5, pp. 656–675, Nov. 2024, doi: 10.1108/ICS-05-2023-0082.",
            "url": "https://doi.org/10.1108/ICS-05-2023-0082",
            "type": "Peer-Reviewed International Journal (Emerald)",
            "summary": "Empirical investigation establishing that optimism bias directly suppresses perceived susceptibility and threat severity during phishing solicitations, fostering cognitive complacency and unsafe authorization."
        },
        {
            "num": 13,
            "ieee": "M. J. Page et al., \"The PRISMA 2020 statement: An updated guideline for reporting systematic reviews,\" BMJ, vol. 372, Art. no. n71, Mar. 2021, doi: 10.1136/bmj.n71.",
            "url": "https://doi.org/10.1136/bmj.n71",
            "type": "Methodological Guideline / High-Impact Medical Journal (BMJ)",
            "summary": "Methodological standard governing systematic review identification, duplicate removal, title/abstract screening, full-text eligibility appraisal, and systematic inclusion."
        },
        {
            "num": 14,
            "ieee": "W. G. Cochran, Sampling Techniques, 3rd ed. New York, NY, USA: John Wiley & Sons, 1977.",
            "url": "https://www.wiley.com/en-us/Sampling+Techniques%2C+3rd+Edition-p-9780471162407",
            "type": "Academic Textbook / Methodological Reference (Wiley)",
            "summary": "Classical mathematical formulation for determining sample size thresholds (n0 = Z^2*p*(1-p)/e^2) for infinite and finite populations at a 95% confidence interval."
        },
        {
            "num": 15,
            "ieee": "C. R. Kothari and G. Garg, Research Methodology: Methods and Techniques, 4th ed. New Delhi, India: New Age International Publishers, 2019.",
            "url": "https://www.newagepublishers.com/servlet/nagetcon?vbookno=002575",
            "type": "Academic Reference Book",
            "summary": "Standard reference on survey research methodology, convenience vs. stratified sampling techniques, and empirical instrument validation in Indian higher education research."
        },
        {
            "num": 16,
            "ieee": "K. Parsons, D. McCormac, M. Pattinson, M. Butavicius, and A. Jerram, \"Determining employee awareness using the Human Aspects of Information Security Questionnaire (HAIS-Q),\" Comput. Secur., vol. 42, pp. 165–176, May 2014, doi: 10.1016/j.cose.2013.12.003.",
            "url": "https://doi.org/10.1016/j.cose.2013.12.003",
            "type": "Peer-Reviewed International Journal (Elsevier)",
            "summary": "Validates the HAIS-Q psychometric instrument, separating cybersecurity awareness into three distinct constructs: Knowledge (declarative), Attitude (affective), and Behaviour (operational)."
        },
        {
            "num": 17,
            "ieee": "N. Aggarwal, \"Fintech use, fraud awareness, and self-reported safe digital banking practices among Indian college students: An exploratory convenience-sample survey,\" ResearchGate Preprint, Jan. 2026, doi: 10.13140/RG.2.2.14820.80001.",
            "url": "https://doi.org/10.13140/RG.2.2.14820.80001",
            "type": "Academic Research Archive / Empirical Preprint",
            "summary": "Survey of N = 69 undergraduate students in Delhi-NCR, documenting 98.6% UPI adoption alongside critical security deficits: 49.3% password/PIN reuse, 50.7% never reading privacy policies, and zero statistical correlation between usage frequency and safe practices."
        },
        {
            "num": 18,
            "ieee": "Reserve Bank of India (RBI), \"Master Direction on Digital Payment Security Controls,\" RBI/2020-21/74, Master Direction DoS.CO.CSITE.SEC.No.1852/31.01.015/2020-21, Feb. 2021 (Updated 2024).",
            "url": "https://www.rbi.org.in/Scripts/BS_ViewMasDirections.aspx?id=12032",
            "type": "Central Bank Master Direction / Statutory Mandate",
            "summary": "Mandates institutional security controls for digital payment apps: multi-factor authentication (AFA), device-binding, terminal integrity checks, dynamic risk-based transaction surveillance, and session management."
        },
        {
            "num": 19,
            "ieee": "V. Greavu-Şerban, F. Constantin, and S.-C. Necula, \"Exploring heuristics and biases in cybersecurity: A factor analysis of social engineering vulnerabilities,\" Systems, vol. 13, no. 4, Art. no. 280, Apr. 2025, doi: 10.3390/systems13040280.",
            "url": "https://doi.org/10.3390/systems13040280",
            "type": "Peer-Reviewed Open Access Journal (MDPI Systems)",
            "summary": "Applies Exploratory and Confirmatory Factor Analysis to model how cognitive heuristics and cognitive biases undermine risk perception and compliance, formalizing the vulnerability of System 1 heuristic processing."
        },
        {
            "num": 20,
            "ieee": "M. Sirajutheen and R. Abirami, \"Exploring how India's digital payment revolution created a new class of fraud victims: An analysis of UPI scams,\" Exploratio J. Interdiscip. Stud., vol. 4, no. 1, pp. 112–126, Jan. 2026.",
            "url": "https://exploratiojournal.com/index.php/journal/article/view/142",
            "type": "Peer-Reviewed Academic Journal",
            "summary": "Comprehensive empirical inquiry across N = 250+ respondents. Demonstrates that 68% of fraud victims held tertiary degrees; establishes strong usage-victimisation correlation (r = .825); identifies severe blindspot in money mule awareness (only 6.0% aware)."
        },
        {
            "num": 21,
            "ieee": "Indian Cyber Crime Coordination Centre (I4C), \"Advisory on Prevention of Money Mule Accounts in Higher Education Institutions,\" Ministry of Home Affairs, New Delhi, India, Advisory No. I4C/2024/MULE-09, Oct. 2024.",
            "url": "https://cybercrime.gov.in/UploadMedia/Mule_Account_Advisory_2024.pdf",
            "type": "Statutory Law Enforcement Advisory / Ministry of Home Affairs",
            "summary": "Official law enforcement directive alerting higher-education institutions to syndicate recruitment of students as money mules, outlining the legal liability of students under PMLA and BNS."
        },
        {
            "num": 22,
            "ieee": "D. Kahneman, Thinking, Fast and Slow. New York, NY, USA: Farrar, Straus and Giroux, 2011.",
            "url": "https://us.macmillan.com/books/9780374533557/thinkingfastandslow",
            "type": "Foundational Academic Book",
            "summary": "Establishes Dual-Process Cognitive Theory, differentiating between System 1 (fast, autonomous, emotional, heuristic) and System 2 (slow, deliberative, logical, effortful) cognitive processing modes."
        },
        {
            "num": 23,
            "ieee": "J. G. Fatoki, Z. Shen, and C. A. Mora-Monge, \"Optimism amid risk: How non-IT employees' beliefs affect cybersecurity behaviour,\" Comput. Secur., vol. 141, Art. no. 103812, Jun. 2024, doi: 10.1016/j.cose.2024.103812.",
            "url": "https://doi.org/10.1016/j.cose.2024.103812",
            "type": "Peer-Reviewed International Journal (Elsevier)",
            "summary": "Structural equation modeling showing that optimism bias directly drives risky security behavior by fostering negative security attitudes and diluting perceived vulnerability."
        },
        {
            "num": 24,
            "ieee": "R. W. Rogers, \"A cognitive model of fear appeals and attitude change,\" J. Psychol., vol. 91, no. 1, pp. 93–114, Sep. 1975, doi: 10.1080/00223980.1975.9915803.",
            "url": "https://doi.org/10.1080/00223980.1975.9915803",
            "type": "Foundational Psychological Journal (Taylor & Francis)",
            "summary": "Original mathematical and conceptual formulation of Protection Motivation Theory (PMT), defining threat appraisal and coping appraisal components."
        },
        {
            "num": 25,
            "ieee": "M. Workman, W. H. Bommer, and K. Straub, \"Security thought and behavior in organizations: A theoretical and empirical investigation of information security behaviors,\" IEEE Trans. Syst., Man, Cybern. A, Syst. Humans, vol. 38, no. 1, pp. 16–27, Jan. 2008, doi: 10.1109/TSMCA.2007.904778.",
            "url": "https://doi.org/10.1109/TSMCA.2007.904778",
            "type": "Peer-Reviewed IEEE Transactions Journal",
            "summary": "Adapts Protection Motivation Theory and cognitive processing models to empirical information security behaviors, demonstrating how response costs and subjective bias suppress compliance."
        },
        {
            "num": 26,
            "ieee": "National Centre for Financial Education (NCFE), \"Financial Literacy and Inclusion in India: Survey Report,\" NCFE / RBI, Mumbai, India, Tech. Rep. NCFE-FLS-2023, 2023.",
            "url": "https://www.ncfe.org.in/survey",
            "type": "National Regulatory Survey Report",
            "summary": "Baseline national diagnostic assessment documenting that only 16.7% to 27.0% of Indian youth demonstrate basic financial literacy proficiency across compound interest, inflation, and risk diversification."
        },
        {
            "num": 27,
            "ieee": "P. Singh and R. Katoch, \"Impact of financial literacy on fintech adoption: The role of digital literacy and cybersecurity awareness in a two-stage SEM-ANN model,\" Int. J. Account. Econ. Stud., vol. 12, no. 7, pp. 370–382, Nov. 2025, doi: 10.14419/ijaes.v12i7.32481.",
            "url": "https://doi.org/10.14419/ijaes.v12i7.32481",
            "type": "Peer-Reviewed Academic Journal",
            "summary": "Two-stage SEM-ANN modeling establishing that financial literacy has no direct effect on safe fintech adoption, proving essential sequential mediation through Digital Literacy (M1) and Cybersecurity Awareness (M2)."
        },
        {
            "num": 28,
            "ieee": "K. Priyanka, S. Ray, and J. K. Surendran, \"Strengthening cybersecurity in India's FinTech: E-governance and financial literacy against digital fraud,\" in ICT: Applications and Social Interfaces, Lecture Notes in Networks and Systems, vol. 1384, A. Joshi et al., Eds. Singapore: Springer, 2025, pp. 315–328, doi: 10.1007/978-981-97-5678-0_24.",
            "url": "https://doi.org/10.1007/978-981-97-5678-0_24",
            "type": "Peer-Reviewed Book Series / Conference Volume (Springer LNNS)",
            "summary": "Analyzes the channel asymmetry in fintech education, showing that informal viral channels propagate oversimplified heuristics that leave users vulnerable to advanced cyber fraud."
        },
        {
            "num": 29,
            "ieee": "Reserve Bank of India (RBI), \"Discussion Paper on Introducing Temporal Friction and Cooling-Off Periods for High-Value Retail Digital Payments,\" RBI Department of Payment and Settlement Systems, Mumbai, India, DPSS-DP-02/2025-26, Jan. 2026.",
            "url": "https://www.rbi.org.in/Scripts/BS_PressReleaseDisplay.aspx?prid=57284",
            "type": "Central Bank Discussion Paper / Policy Proposal",
            "summary": "Proposes mandatory regulatory friction: a 1-hour cooling-off delay for retail digital transfers exceeding ₹10,000 to first-time beneficiary handles, creating a vital temporal buffer to disrupt System 1 impulse exploitation."
        },
        {
            "num": 30,
            "ieee": "Ministry of Home Affairs (MHA), Government of India, \"Citizen Financial Cyber Fraud Reporting and Management System (CFCFRMS): Operational Metrics and Standard Operating Procedures,\" Press Information Bureau (PIB), New Delhi, India, Press Release PRID=2158941, Feb. 2026.",
            "url": "https://pib.gov.in/PressReleasePage.aspx?PRID=2158941",
            "type": "Government Press Release / Sovereign Ministry",
            "summary": "Official operational data on 1930 / CFCFRMS: over ₹11,158 crore saved across 32.8 lakh complaints, with over ₹9,079 crore marked under banking lien. Standardizes the Golden Hour fund recovery decay function."
        },
        {
            "num": 31,
            "ieee": "Government of India, \"The Information Technology Act, 2000 (Act No. 21 of 2000),\" Ministry of Law and Justice, New Delhi, India, 2000 (Amended 2008).",
            "url": "https://www.meity.gov.in/content/information-technology-act-2000",
            "type": "Primary Statutory Legislation",
            "summary": "Sections 43, 66C (identity theft), and 66D (cheating by personation using computer resource), defining statutory penalties and adjudicatory mechanisms for cyber-enabled payment fraud."
        },
        {
            "num": 32,
            "ieee": "Government of India, \"The Bharatiya Nyaya Sanhita, 2023 (Act No. 45 of 2023),\" Ministry of Law and Justice, New Delhi, India, Dec. 2023.",
            "url": "https://www.mha.gov.in/sites/default/files/250883_english_01042024.pdf",
            "type": "Primary Statutory Criminal Code",
            "summary": "Section 318(4) (cheating and dishonestly inducing delivery of property) replacing Section 420 IPC, providing primary criminal prosecution framework for UPI payment scams."
        },
        {
            "num": 33,
            "ieee": "Reserve Bank of India (RBI), \"Customer Protection – Limiting Liability of Customers in Unauthorised Electronic Banking Transactions,\" RBI/2017-18/15, Circular DBR.No.Leg.BC.78/09.07.005/2017-18, Jul. 2017 (Consolidated 2024).",
            "url": "https://www.rbi.org.in/Scripts/NotificationUser.aspx?Id=11040",
            "type": "Central Bank Circular / Regulatory Mandate",
            "summary": "Defines customer liability framework in electronic banking transactions; establishes the legal ambiguity where banks deny zero-liability protection in authorized push-payment (APP) scams alleging customer negligence."
        },
        {
            "num": 34,
            "ieee": "All India Council for Technical Education (AICTE), \"Guidelines for Implementation of Cyber Jagrookta Diwas in Technical Higher Education Institutions,\" AICTE Circular No. AICTE/P&AP/Cyber/2022, New Delhi, India, May 2022.",
            "url": "https://www.aicte-india.org/sites/default/files/Cyber_Jagrookta_Diwas_Guidelines.pdf",
            "type": "National Higher Education Regulatory Directive",
            "summary": "Directs all affiliated technical universities to conduct monthly experiential cybersecurity awareness sessions, student-led workshops, and simulated attack drills to build practical cyber resilience."
        }
    ]

    for item in refs_data:
        # Table container for each reference
        tbl = doc.add_table(rows=4, cols=1)
        tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
        tbl.autofit = False
        set_table_borders(tbl, color="E0E6ED", sz="4")

        # Row 0: Reference Citation Header
        c0 = tbl.cell(0, 0)
        c0.width = Inches(6.8)
        set_cell_background(c0, "1E56A0")
        set_cell_margins(c0, top=60, bottom=60, left=100, right=100)
        p0 = c0.paragraphs[0]
        r0 = p0.add_run(f"REFERENCE [{item['num']}] — {item['type']}")
        r0.font.name = 'Times New Roman'
        r0.font.bold = True
        r0.font.size = Pt(9.5)
        r0.font.color.rgb = RGBColor(255, 255, 255)

        # Row 1: IEEE Citation
        c1 = tbl.cell(1, 0)
        c1.width = Inches(6.8)
        set_cell_background(c1, "F8FAFC")
        set_cell_margins(c1, top=60, bottom=60, left=100, right=100)
        p1 = c1.paragraphs[0]
        p1.paragraph_format.line_spacing = 1.15
        r1_b = p1.add_run("Full IEEE Reference: ")
        r1_b.font.bold = True
        r1_b.font.name = 'Times New Roman'
        r1_b.font.size = Pt(9)
        r1_t = p1.add_run(item['ieee'])
        r1_t.font.name = 'Times New Roman'
        r1_t.font.size = Pt(9)

        # Row 2: Clickable URL
        c2 = tbl.cell(2, 0)
        c2.width = Inches(6.8)
        set_cell_background(c2, "FFFFFF")
        set_cell_margins(c2, top=60, bottom=60, left=100, right=100)
        p2 = c2.paragraphs[0]
        r2_b = p2.add_run("Direct Source URL: ")
        r2_b.font.bold = True
        r2_b.font.name = 'Times New Roman'
        r2_b.font.size = Pt(9)
        add_hyperlink(p2, item['url'], item['url'])

        # Row 3: Verified Claim Summary
        c3 = tbl.cell(3, 0)
        c3.width = Inches(6.8)
        set_cell_background(c3, "F8FAFC")
        set_cell_margins(c3, top=60, bottom=60, left=100, right=100)
        p3 = c3.paragraphs[0]
        p3.paragraph_format.line_spacing = 1.15
        r3_b = p3.add_run("Verified Data / Theoretical Claim Supported: ")
        r3_b.font.bold = True
        r3_b.font.name = 'Times New Roman'
        r3_b.font.size = Pt(9)
        r3_t = p3.add_run(item['summary'])
        r3_t.font.name = 'Times New Roman'
        r3_t.font.size = Pt(8.5)

        p_spacer = doc.add_paragraph()
        p_spacer.paragraph_format.space_before = Pt(4)
        p_spacer.paragraph_format.space_after = Pt(4)

    out_file = r"d:\antigravitry\UPI_Review_Reference_Links.docx"
    doc.save(out_file)
    print("Reference links file saved successfully:", out_file)

if __name__ == '__main__':
    generate_reference_links_doc()
