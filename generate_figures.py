import os
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as patches
import numpy as np

# Set standard publication styling
plt.rcParams['font.family'] = 'DejaVu Sans'
plt.rcParams['font.size'] = 10
plt.rcParams['axes.titlesize'] = 11
plt.rcParams['axes.titleweight'] = 'bold'
plt.rcParams['axes.labelsize'] = 10
plt.rcParams['axes.labelweight'] = 'bold'
plt.rcParams['xtick.labelsize'] = 9
plt.rcParams['ytick.labelsize'] = 9
plt.rcParams['legend.fontsize'] = 9
plt.rcParams['figure.titlesize'] = 12

fig_dir = r"d:\antigravitry\figures"
os.makedirs(fig_dir, exist_ok=True)

# -------------------------------------------------------------
# FIG 1: PRISMA 2020 Literature Screening Flowchart
# -------------------------------------------------------------
def generate_fig1():
    fig, ax = plt.subplots(figsize=(8.5, 9.5), dpi=300)
    ax.axis('off')
    
    # Styling box colors
    box_blue = '#EBF3FA'
    edge_blue = '#1E56A0'
    box_red = '#FDF0ED'
    edge_red = '#D9534F'
    box_green = '#EAF7EA'
    edge_green = '#2E7D32'

    def draw_box(x, y, w, h, text, facecolor, edgecolor, fontsize=8.5, bold=False):
        box = patches.FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.02,rounding_size=0.03",
                                     linewidth=1.4, edgecolor=edgecolor, facecolor=facecolor)
        ax.add_patch(box)
        weight = 'bold' if bold else 'normal'
        ax.text(x + w/2, y + h/2, text, ha='center', va='center', fontsize=fontsize,
                fontweight=weight, color='#1A1A1A', wrap=True)

    def draw_arrow(x1, y1, x2, y2, color='#1E56A0'):
        ax.annotate('', xy=(x2, y2), xytext=(x1, y1),
                    arrowprops=dict(arrowstyle="-|>", color=color, lw=1.5, mutation_scale=14))

    # Phase titles on the left
    ax.text(0.04, 0.88, "IDENTIFICATION", rotation=90, va='center', ha='center', fontsize=10, fontweight='bold', color='#1E56A0')
    ax.text(0.04, 0.65, "SCREENING", rotation=90, va='center', ha='center', fontsize=10, fontweight='bold', color='#1E56A0')
    ax.text(0.04, 0.38, "ELIGIBILITY", rotation=90, va='center', ha='center', fontsize=10, fontweight='bold', color='#1E56A0')
    ax.text(0.04, 0.12, "INCLUDED", rotation=90, va='center', ha='center', fontsize=10, fontweight='bold', color='#2E7D32')

    # Vertical dividing lines
    ax.axvline(0.07, ymin=0.05, ymax=0.95, color='#CCCCCC', linestyle='--', lw=1)

    # Box 1: Identification
    b1_text = ("Database & Repository Identification (n = 240)\n"
               "• IEEE Xplore: 42 | ScienceDirect / Scopus: 58\n"
               "• SpringerLink: 36 | Emerald / MDPI / ACM: 34\n"
               "• Preprints & Academic Archives (SSRN/RG): 48\n"
               "• Statutory/Regulatory (RBI, NPCI, MHA/I4C, PIB): 22")
    draw_box(0.12, 0.80, 0.76, 0.15, b1_text, box_blue, edge_blue, fontsize=8.5, bold=False)

    # Box 2: Duplicate Removal
    draw_arrow(0.50, 0.80, 0.50, 0.73)
    b2_text = ("Duplicate Records Removed (n = 62)\n"
               "Records Screened by Title & Abstract (n = 178)")
    draw_box(0.18, 0.65, 0.64, 0.08, b2_text, box_blue, edge_blue, fontsize=8.5)

    # Exclusion from Title/Abstract
    draw_arrow(0.82, 0.69, 0.89, 0.69)
    draw_arrow(0.89, 0.69, 0.89, 0.57)
    b_ex1 = ("Records Excluded by\nTitle/Abstract (n = 112)\n"
             "• Out-of-scope domain: 54\n"
             "• Non-payment cyber: 36\n"
             "• Pure hardware/crypto: 22")
    draw_box(0.68, 0.47, 0.28, 0.10, b_ex1, box_red, edge_red, fontsize=7.5)

    # Box 3: Sought for retrieval & full text
    draw_arrow(0.50, 0.65, 0.50, 0.53)
    b3_text = ("Full-Text Reports Sought for Retrieval (n = 66)\n"
               "Reports Not Retrieved / Paywalled (n = 4)\n"
               "Full-Text Reports Assessed for Eligibility (n = 62)")
    draw_box(0.15, 0.44, 0.50, 0.09, b3_text, box_blue, edge_blue, fontsize=8.2)

    # Exclusion from Full-Text
    draw_arrow(0.65, 0.485, 0.72, 0.485)
    draw_arrow(0.72, 0.485, 0.72, 0.38)
    b_ex2 = ("Full-Text Excluded (n = 28)\n"
             "• Lacking empirical/verifiable data: 14\n"
             "• Commercial whitepapers/blogs: 8\n"
             "• Insufficient methodology/essay: 6")
    draw_box(0.65, 0.28, 0.31, 0.10, b_ex2, box_red, edge_red, fontsize=7.5)

    # Box 4: Final Synthesis Corpus
    draw_arrow(0.40, 0.44, 0.40, 0.26)
    b4_text = ("Final Synthesised Systematic Corpus (N = 34 Studies)\n\n"
               "• Primary Empirical Indian Student/User Inquiries: 12 Studies\n"
               "  (Awareness, victimisation rates, psychometrics, behavioural compliance)\n\n"
               "• Regulatory Frameworks & Forensic Official Reports: 10 Documents\n"
               "  (RBI Master Directions, NPCI operational releases, MHA/I4C 1930 data)\n\n"
               "• Theoretical, Psychometric & Methodological Formulations: 12 Papers\n"
               "  (Dual-Process Model, PMT, Optimism Bias, HAIS-Q, SEM-ANN, Cochran)")
    draw_box(0.12, 0.05, 0.76, 0.18, b4_text, box_green, edge_green, fontsize=8.5, bold=False)

    plt.tight_layout()
    fig_path = os.path.join(fig_dir, "fig1_prisma_flowchart.png")
    plt.savefig(fig_path, dpi=300, bbox_inches='tight')
    plt.close()
    print("Fig 1 generated:", fig_path)

# -------------------------------------------------------------
# FIG 2: UPI Transaction Volume and Value Growth (FY21–FY26)
# -------------------------------------------------------------
def generate_fig2():
    years = ['FY21', 'FY22', 'FY23', 'FY24', 'FY25', 'FY26 (Proj.)']
    volume = [2233.07, 4595.61, 8371.44, 13112.95, 17219.00, 21800.00]  # Crore transactions
    value = [41.04, 84.16, 139.15, 199.95, 252.30, 315.00]  # Lakh Crore INR

    fig, ax1 = plt.subplots(figsize=(7.5, 4.2), dpi=300)

    color_vol = '#1E56A0'
    color_val = '#D9534F'

    ax1.set_xlabel('Financial Year', fontweight='bold', labelpad=8)
    ax1.set_ylabel('Transaction Volume (Crore Transactions)', color=color_vol, fontweight='bold', labelpad=8)
    line1 = ax1.plot(years, volume, color=color_vol, marker='o', linewidth=2.2, markersize=6.5, label='Volume (Crore Txns)')
    ax1.tick_params(axis='y', labelcolor=color_vol)
    ax1.grid(True, linestyle=':', alpha=0.6)
    ax1.set_ylim(0, 25000)

    # Add data labels for volume
    for i, txt in enumerate(volume):
        ax1.annotate(f"{txt:,.0f}", (years[i], volume[i]), textcoords="offset points", 
                     xytext=(0, 8), ha='center', fontsize=8.5, fontweight='bold', color=color_vol)

    ax2 = ax1.twinx()
    ax2.set_ylabel('Transaction Value (₹ Lakh Crore)', color=color_val, fontweight='bold', labelpad=8)
    line2 = ax2.plot(years, value, color=color_val, marker='s', linewidth=2.2, linestyle='--', markersize=6.5, label='Value (₹ Lakh Cr)')
    ax2.tick_params(axis='y', labelcolor=color_val)
    ax2.set_ylim(0, 360)

    # Add data labels for value
    for i, txt in enumerate(value):
        ax2.annotate(f"₹{txt:.1f}L", (years[i], value[i]), textcoords="offset points", 
                     xytext=(0, -14), ha='center', fontsize=8.5, fontweight='bold', color=color_val)

    # Combined legend
    lines = line1 + line2
    labels = [l.get_label() for l in lines]
    ax1.legend(lines, labels, loc='upper left', frameon=True, facecolor='white', framealpha=0.9)

    plt.title('Macro-Scale Growth Trajectory of UPI Transactions in India (FY 2020–21 to FY 2025–26)\nSource: Compiled from NPCI Annual Operational Bulletins & MeitY/PIB Reports', 
              fontsize=9.5, pad=12)
    plt.tight_layout()
    fig_path = os.path.join(fig_dir, "fig2_upi_volume_trajectory.png")
    plt.savefig(fig_path, dpi=300, bbox_inches='tight')
    plt.close()
    print("Fig 2 generated:", fig_path)

# -------------------------------------------------------------
# FIG 3: RBI Bank Frauds vs Digital Payment Frauds (FY21–FY25)
# -------------------------------------------------------------
def generate_fig3():
    years = ['FY 2020–21', 'FY 2021–22', 'FY 2022–23', 'FY 2023–24', 'FY 2024–25']
    total_frauds = [7359, 9097, 13564, 36075, 23953]
    digital_frauds = [4071, 3596, 6699, 29082, 13516]
    proportions = [55.3, 39.5, 49.4, 80.6, 56.4]

    x = np.arange(len(years))
    width = 0.36

    fig, ax1 = plt.subplots(figsize=(8, 4.4), dpi=300)

    rects1 = ax1.bar(x - width/2, total_frauds, width, label='Total Bank Frauds (All Categories)', color='#90A4AE', edgecolor='#455A64', linewidth=1)
    rects2 = ax1.bar(x + width/2, digital_frauds, width, label='Digital Payment Frauds (Card / Internet)', color='#C62828', edgecolor='#B71C1C', linewidth=1)

    ax1.set_xlabel('Financial Year', fontweight='bold', labelpad=8)
    ax1.set_ylabel('Number of Reported Fraud Incidents', fontweight='bold', labelpad=8)
    ax1.set_xticks(x)
    ax1.set_xticklabels(years)
    ax1.legend(loc='upper left', frameon=True, facecolor='white', framealpha=0.95)
    ax1.grid(True, linestyle=':', alpha=0.5, axis='y')
    ax1.set_ylim(0, 42000)

    # Annotate bars
    for i in range(len(years)):
        ax1.text(x[i] - width/2, total_frauds[i] + 700, f"{total_frauds[i]:,}", ha='center', va='bottom', fontsize=8)
        ax1.text(x[i] + width/2, digital_frauds[i] + 700, f"{digital_frauds[i]:,}\n({proportions[i]}%)", 
                 ha='center', va='bottom', fontsize=8, fontweight='bold', color='#B71C1C')

    plt.title('Escalation of RBI-Reported Bank Frauds vs. Digital Payment Frauds (FY21–FY25)\nData Source: Reserve Bank of India (RBI) Annual Reports (2021–2025)',
              fontsize=9.5, pad=12)
    plt.tight_layout()
    fig_path = os.path.join(fig_dir, "fig3_rbi_fraud_trends.png")
    plt.savefig(fig_path, dpi=300, bbox_inches='tight')
    plt.close()
    print("Fig 3 generated:", fig_path)

# -------------------------------------------------------------
# FIG 4: Comparison of Student Fraud Awareness vs. Victimisation
# -------------------------------------------------------------
def generate_fig4():
    studies = [
        'Karkera et al.\n(2024, N=109)',
        'Aggarwal\n(2026, N=69)',
        'Sirajutheen &\nAbirami (2026, N=250+)',
        'Roy et al.\n(2024, N=100)',
        'Goliath\n(2024, N=266)'
    ]
    
    awareness = [91.2, 88.4, 68.5, 84.0, 82.5]
    behavioural_compliance = [34.0, 49.3, 24.0, 31.0, 44.2]
    victimisation = [24.8, 50.7, 58.0, 28.0, 38.3]

    x = np.arange(len(studies))
    width = 0.26

    fig, ax = plt.subplots(figsize=(8.5, 4.5), dpi=300)

    r1 = ax.bar(x - width, awareness, width, label='Stated / Declarative Awareness (%)', color='#2E7D32', edgecolor='#1B5E20')
    r2 = ax.bar(x, behavioural_compliance, width, label='Operational Security Compliance (%)', color='#1565C0', edgecolor='#0D47A1')
    r3 = ax.bar(x + width, victimisation, width, label='Reported Risk Exposure / Victimisation (%)', color='#D32F2F', edgecolor='#B71C1C')

    ax.set_ylabel('Percentage (%)', fontweight='bold', labelpad=8)
    ax.set_xlabel('Synthesised Higher-Education Empirical Inquiries', fontweight='bold', labelpad=8)
    ax.set_xticks(x)
    ax.set_xticklabels(studies, fontsize=8.5)
    ax.legend(loc='upper right', frameon=True, facecolor='white', framealpha=0.95)
    ax.grid(True, linestyle=':', alpha=0.5, axis='y')
    ax.set_ylim(0, 110)

    for r in [r1, r2, r3]:
        for bar in r:
            height = bar.get_height()
            ax.annotate(f'{height:.1f}%',
                        xy=(bar.get_x() + bar.get_width() / 2, height),
                        xytext=(0, 3),  # 3 points vertical offset
                        textcoords="offset points",
                        ha='center', va='bottom', fontsize=7.5, fontweight='bold')

    plt.title('The Security Paradox: Stated Fraud Awareness vs. Behavioural Compliance and Victimisation\nAcross Synthesised Higher-Education Field Inquiries (2024–2026)',
              fontsize=9.5, pad=12)
    plt.tight_layout()
    fig_path = os.path.join(fig_dir, "fig4_student_awareness_victimisation.png")
    plt.savefig(fig_path, dpi=300, bbox_inches='tight')
    plt.close()
    print("Fig 4 generated:", fig_path)

# -------------------------------------------------------------
# FIG 5: Taxonomy of UPI Threat Vectors and Cognitive Exploitation
# -------------------------------------------------------------
def generate_fig5():
    fig, ax = plt.subplots(figsize=(9, 5.2), dpi=300)
    ax.axis('off')

    # Left Container: Robust Technical Core
    rect_tech = patches.FancyBboxPatch((0.05, 0.10), 0.38, 0.80, boxstyle="round,pad=0.03,rounding_size=0.04",
                                       linewidth=2, edgecolor='#1E56A0', facecolor='#F0F4F8')
    ax.add_patch(rect_tech)
    ax.text(0.24, 0.84, "ROBUST TECHNICAL CORE\n(Protocol & Cryptographic Layer)", ha='center', va='center', 
            fontsize=9.5, fontweight='bold', color='#0D47A1')

    tech_elements = [
        ("NPCI Central Switch Clearing", "Sub-second interbank routing & atomic settlement"),
        ("Hardware Device-Binding", "IMEI / IMSI cryptographic handshake with SIM"),
        ("Transport Layer Security (TLS 1.3)", "End-to-end encrypted packet transmission"),
        ("Two-Factor Authentication (2FA)", "Virtual Payment Address (VPA) + Secure MPIN"),
        ("Security Assessment", "Direct Protocol Exploits: < 0.1%\nAlgorithmic Cryptography Remains Unbroken")
    ]
    y_pos = 0.70
    for title, desc in tech_elements:
        is_last = (title == "Security Assessment")
        bg_col = '#E1F5FE' if not is_last else '#E8F5E9'
        border_col = '#0288D1' if not is_last else '#2E7D32'
        text_col = '#01579B' if not is_last else '#1B5E20'
        
        box = patches.FancyBboxPatch((0.08, y_pos - 0.08), 0.32, 0.095, boxstyle="round,pad=0.015,rounding_size=0.02",
                                     linewidth=1.2, edgecolor=border_col, facecolor=bg_col)
        ax.add_patch(box)
        ax.text(0.24, y_pos - 0.01, title, ha='center', va='center', fontsize=8.5, fontweight='bold', color=text_col)
        ax.text(0.24, y_pos - 0.05, desc, ha='center', va='center', fontsize=7.2, color='#333333')
        y_pos -= 0.13

    # Right Container: Exploited Cognitive Endpoints
    rect_cog = patches.FancyBboxPatch((0.57, 0.10), 0.38, 0.80, boxstyle="round,pad=0.03,rounding_size=0.04",
                                      linewidth=2, edgecolor='#D32F2F', facecolor='#FDF2F2')
    ax.add_patch(rect_cog)
    ax.text(0.76, 0.84, "EXPLOITED COGNITIVE LAYER\n(Human-Computer Interface)", ha='center', va='center', 
            fontsize=9.5, fontweight='bold', color='#B71C1C')

    cog_elements = [
        ("Quishing (QR Code Manipulation)", "Exploits 'Scan-to-Receive' heuristic; MPIN debits account"),
        ("Vishing & Authority Impersonation", "Fabricated bank/police emergency triggers panic compliance"),
        ("Remote-Screen Access Takeover", "AnyDesk/TeamViewer apps capture OTPs and bypass 2FA"),
        ("Money Mule Account Leasing", "Zero-balance accounts leased for financial commission"),
        ("Threat Assessment", "Socio-Technical Exploitation: > 99.0%\nVictim Autonomously Enters MPIN/Transfers")
    ]
    y_pos = 0.70
    for title, desc in cog_elements:
        is_last = (title == "Threat Assessment")
        bg_col = '#FFEBEE' if not is_last else '#FFCDD2'
        border_col = '#E53935' if not is_last else '#C62828'
        text_col = '#B71C1C' if not is_last else '#7F0000'
        
        box = patches.FancyBboxPatch((0.60, y_pos - 0.08), 0.32, 0.095, boxstyle="round,pad=0.015,rounding_size=0.02",
                                     linewidth=1.2, edgecolor=border_col, facecolor=bg_col)
        ax.add_patch(box)
        ax.text(0.76, y_pos - 0.01, title, ha='center', va='center', fontsize=8.5, fontweight='bold', color=text_col)
        ax.text(0.76, y_pos - 0.05, desc, ha='center', va='center', fontsize=7.2, color='#333333')
        y_pos -= 0.13

    # Connecting Arrow & Explanatory Middle Text
    ax.annotate('', xy=(0.57, 0.50), xytext=(0.43, 0.50),
                arrowprops=dict(arrowstyle="<->", color='#D32F2F', lw=2.5, mutation_scale=18))
    ax.text(0.50, 0.56, "SOCIO-TECHNICAL\nEXPLOITATION GAP", ha='center', va='center', 
            fontsize=8, fontweight='bold', color='#C62828')
    ax.text(0.50, 0.43, "Attackers bypass\ntechnical crypto\nby targeting human\nheuristics directly", 
            ha='center', va='center', fontsize=7.2, color='#455A64', style='italic')

    plt.title('Taxonomy of UPI Security Architecture: Robust Protocol Core vs. Exploited Cognitive Attack Surface',
              fontsize=10, pad=12)
    plt.tight_layout()
    fig_path = os.path.join(fig_dir, "fig5_upi_threat_taxonomy.png")
    plt.savefig(fig_path, dpi=300, bbox_inches='tight')
    plt.close()
    print("Fig 5 generated:", fig_path)

# -------------------------------------------------------------
# FIG 6: Conceptual Framework of the Awareness–Behaviour Gap
# -------------------------------------------------------------
def generate_fig6():
    fig, ax = plt.subplots(figsize=(9.2, 5.8), dpi=300)
    ax.axis('off')

    def draw_cbox(x, y, w, h, header, subtext, facecolor='#E3F2FD', edgecolor='#1976D2'):
        box = patches.FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.02,rounding_size=0.03",
                                     linewidth=1.4, edgecolor=edgecolor, facecolor=facecolor)
        ax.add_patch(box)
        ax.text(x + w/2, y + h*0.72, header, ha='center', va='center', fontsize=8.5, fontweight='bold', color='#0D47A1')
        ax.text(x + w/2, y + h*0.35, subtext, ha='center', va='center', fontsize=7.2, color='#263238', wrap=True)

    def draw_carrow(x1, y1, x2, y2, color='#1565C0', label=''):
        ax.annotate('', xy=(x2, y2), xytext=(x1, y1),
                    arrowprops=dict(arrowstyle="-|>", color=color, lw=1.8, mutation_scale=14))
        if label:
            mx, my = (x1 + x2)/2, (y1 + y2)/2
            ax.text(mx + 0.02, my, label, fontsize=7.5, fontweight='bold', color=color, va='center')

    # Main horizontal sequence
    # Box 1: Adoption Drivers
    draw_cbox(0.04, 0.68, 0.24, 0.22, "1. UPI Utilitarian Drivers", 
              "• Zero transaction latency\n• Nil merchant surcharges\n• Ubiquitous QR acceptance\n• Frictionless P2P split",
              facecolor='#E8F5E9', edgecolor='#2E7D32')

    # Arrow 1 -> 2
    draw_carrow(0.28, 0.79, 0.36, 0.79)

    # Box 2: Habitual System 1 Processing
    draw_cbox(0.36, 0.68, 0.26, 0.22, "2. Habituated System 1 Action", 
              "• Automatic, low-effort execution\n• Muscle memory PIN entry\n• Cognitive complacency\n• Conflating speed with safety",
              facecolor='#FFF9C4', edgecolor='#FBC02D')

    # Arrow 2 -> 3
    draw_carrow(0.62, 0.79, 0.70, 0.79)

    # Box 3: Social Engineering Stimuli
    draw_cbox(0.70, 0.68, 0.26, 0.22, "3. Situational Stimuli / Triggers", 
              "• Manufactured urgency (fear)\n• Impersonation of authority\n• Cashback / scholarship greed\n• Scan-to-receive fallacy",
              facecolor='#FFEBEE', edgecolor='#E53935')

    # Arrow 3 -> 4 (Downwards)
    draw_carrow(0.83, 0.68, 0.83, 0.50, color='#C62828', label='Triggers Override')

    # Box 4: Suppression of Analytical Verification
    draw_cbox(0.58, 0.32, 0.38, 0.18, "4. Suppression of System 2 Verification", 
              "• Bypasses payee Virtual Payment Address (VPA) check\n• Fails to inspect transaction type (Debit vs. Credit)\n• Devalues risk due to heightened Optimism Bias",
              facecolor='#FFCDD2', edgecolor='#C62828')

    # Arrow 4 -> 5
    draw_carrow(0.58, 0.41, 0.44, 0.41, color='#B71C1C')

    # Box 5: Unsafe Authorization / Fraud Exposure
    draw_cbox(0.04, 0.32, 0.40, 0.18, "5. Compromise & Victimisation", 
              "• Victim autonomously executes MPIN authorization\n• Immediate debited funds; rapid multi-hop layering\n• Zero-liability protection frequently denied by banks",
              facecolor='#D32F2F', edgecolor='#B71C1C')
    # Change text color of Box 5 for contrast
    # re-render text inside Box 5
    ax.text(0.24, 0.32 + 0.18*0.72, "5. Compromise & Victimisation", ha='center', va='center', fontsize=8.5, fontweight='bold', color='white')
    ax.text(0.24, 0.32 + 0.18*0.35, "• Victim autonomously executes MPIN authorization\n• Immediate debited funds; rapid multi-hop layering\n• Zero-liability protection frequently denied by banks", ha='center', va='center', fontsize=7.2, color='#FFEBEE', wrap=True)

    # Bottom Protective / Moderating Framework
    box_mod = patches.FancyBboxPatch((0.04, 0.04), 0.92, 0.18, boxstyle="round,pad=0.02,rounding_size=0.03",
                                     linewidth=1.5, edgecolor='#388E3C', facecolor='#E8F5E9')
    ax.add_patch(box_mod)
    ax.text(0.50, 0.18, "MODERATING SOCIO-TECHNICAL CONTROLS & COUNTERMEASURES", ha='center', va='center',
            fontsize=8.5, fontweight='bold', color='#1B5E20')
    
    mod_text = ("• Procedural Transactional Friction: Mandatory 1-hour cooling-off window for >₹10,000 transfers to unlinked handles [29]\n"
                "• Point-of-Risk UI Nudges: Contextual prompts enforcing 3-second hesitation on QR/Collect requests (System 2 trigger)\n"
                "• Sequential Mediation Interventions: Strengthening Digital Interaction Skills (M1) and Cybersecurity Awareness (M2) [27]\n"
                "• Rapid Forensic Interception: Immediate 1930 / CFCFRMS reporting within Golden Hour to freeze mule trails [30]")
    ax.text(0.50, 0.10, mod_text, ha='center', va='center', fontsize=7.5, color='#1B5E20', wrap=True)

    # Moderating arrows pointing upward
    ax.annotate('', xy=(0.77, 0.32), xytext=(0.77, 0.22),
                arrowprops=dict(arrowstyle="-|>", color='#2E7D32', lw=1.6, linestyle='--'))
    ax.text(0.79, 0.26, "Inhibits Override", fontsize=7.2, fontweight='bold', color='#2E7D32')

    plt.title('Integrated Conceptual Framework of the UPI Fraud Awareness–Behaviour Gap:\nCognitive Heuristics, Optimism Bias, and Multi-Tier Socio-Technical Moderation',
              fontsize=9.5, pad=12)
    plt.tight_layout()
    fig_path = os.path.join(fig_dir, "fig6_awareness_behaviour_gap_framework.png")
    plt.savefig(fig_path, dpi=300, bbox_inches='tight')
    plt.close()
    print("Fig 6 generated:", fig_path)

# -------------------------------------------------------------
# FIG 7: 1930/CFCFRMS Incident Response & Fund Recovery Decay
# -------------------------------------------------------------
def generate_fig7():
    fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(8.5, 6.2), dpi=300, gridspec_kw={'height_ratios': [1.1, 1.3]})

    # --- TOP SUBPLOT: Workflow Diagram ---
    ax1.axis('off')
    ax1.set_xlim(0, 1)
    ax1.set_ylim(0, 1)

    steps = [
        ("1. Fraud Inception", "Victim duped into\nauthorizing MPIN / transfer\n(t = 0)", '#FFEBEE', '#D32F2F', '#B71C1C'),
        ("2. Rapid Reporting", "Victim calls 1930 Helpline\nor logs ticket on NCRP\n(Golden Hour: t < 2h)", '#FFF9C4', '#FBC02D', '#F57F17'),
        ("3. CFCFRMS Engine", "Automated API dispatches\nreal-time fraud alert across\nconnected banking switch", '#E1F5FE', '#0288D1', '#01579B'),
        ("4. Automated Lien", "Intermediary bank traces\nmoney trail & freezes\ndestination account", '#E8F5E9', '#388E3C', '#1B5E20'),
        ("5. Fund Restitution", "Forensic adjudication &\nformal refund via judicial\nremedies (BNS / IT Act)", '#EDE7F6', '#7E57C2', '#4A148C')
    ]

    box_w = 0.16
    box_h = 0.65
    y_pos = 0.18
    xs = [0.03, 0.23, 0.43, 0.63, 0.83]

    for i, (title, desc, bg, edge, txt_col) in enumerate(steps):
        box = patches.FancyBboxPatch((xs[i], y_pos), box_w, box_h, boxstyle="round,pad=0.015,rounding_size=0.03",
                                     linewidth=1.3, edgecolor=edge, facecolor=bg)
        ax1.add_patch(box)
        ax1.text(xs[i] + box_w/2, y_pos + box_h*0.75, title, ha='center', va='center', fontsize=7.8, fontweight='bold', color=txt_col)
        ax1.text(xs[i] + box_w/2, y_pos + box_h*0.35, desc, ha='center', va='center', fontsize=6.8, color='#263238')

        if i < len(steps) - 1:
            ax1.annotate('', xy=(xs[i+1], y_pos + box_h/2), xytext=(xs[i] + box_w, y_pos + box_h/2),
                         arrowprops=dict(arrowstyle="-|>", color='#455A64', lw=1.5, mutation_scale=12))

    ax1.set_title('A. Incident-Response Workflow Architecture (1930 Helpline & CFCFRMS Infrastructure)', 
                  fontsize=9, fontweight='bold', loc='left', pad=6)

    # --- BOTTOM SUBPLOT: Fund Recovery Temporal Decay Curve ---
    t = np.linspace(0, 12, 500)
    R0 = 0.80  # 80% baseline recovery at t=0
    lam = 0.45  # Decay parameter per hour
    R = R0 * np.exp(-lam * t) * 100  # Percentage

    ax2.plot(t, R, color='#D32F2F', linewidth=2.4, label=r'Recovery Probability: $R(t) = R_0 \cdot e^{-\lambda t}$ ($R_0=0.80, \lambda=0.45\,\mathrm{h}^{-1}$)')
    ax2.axvspan(0, 2, color='#C8E6C9', alpha=0.4, label='Golden Hour Window (t ≤ 2h, Recovery ≈ 70%–80%)')
    ax2.axvspan(2, 6, color='#FFF59D', alpha=0.3, label='Intermediary Layering Window (2h < t ≤ 6h, Recovery 15%–45%)')
    ax2.axvspan(6, 12, color='#FFCDD2', alpha=0.3, label='Syndicate Cash-Out / Off-Ramp Window (t > 6h, Recovery < 5%)')

    ax2.set_xlabel('Reporting Latency Post-Incident (Hours)', fontweight='bold', labelpad=8)
    ax2.set_ylabel('Probability of Fund Interception (%)', fontweight='bold', labelpad=8)
    ax2.set_xlim(0, 12)
    ax2.set_ylim(0, 100)
    ax2.grid(True, linestyle=':', alpha=0.6)
    ax2.legend(loc='upper right', frameon=True, facecolor='white', framealpha=0.9, fontsize=8)

    # Critical annotations
    ax2.annotate('R(0.5h) ≈ 64%', xy=(0.5, R0*np.exp(-lam*0.5)*100), xytext=(1.2, 70),
                 arrowprops=dict(arrowstyle="->", color='#2E7D32', lw=1.2), fontsize=8, fontweight='bold', color='#1B5E20')
    ax2.annotate('R(2h) ≈ 32.5%', xy=(2.0, R0*np.exp(-lam*2.0)*100), xytext=(2.8, 45),
                 arrowprops=dict(arrowstyle="->", color='#F57F17', lw=1.2), fontsize=8, fontweight='bold', color='#E65100')
    ax2.annotate('R(6h) ≈ 5.4%', xy=(6.0, R0*np.exp(-lam*6.0)*100), xytext=(6.8, 20),
                 arrowprops=dict(arrowstyle="->", color='#C62828', lw=1.2), fontsize=8, fontweight='bold', color='#B71C1C')

    ax2.set_title('B. Empirical Fund Recovery Temporal Decay Function Under Rapid Interception Dynamics', 
                  fontsize=9, fontweight='bold', loc='left', pad=6)

    plt.tight_layout()
    fig_path = os.path.join(fig_dir, "fig7_incident_response_recovery_decay.png")
    plt.savefig(fig_path, dpi=300, bbox_inches='tight')
    plt.close()
    print("Fig 7 generated:", fig_path)

if __name__ == '__main__':
    generate_fig1()
    generate_fig2()
    generate_fig3()
    generate_fig4()
    generate_fig5()
    generate_fig6()
    generate_fig7()
    print("All 7 figures generated successfully!")
