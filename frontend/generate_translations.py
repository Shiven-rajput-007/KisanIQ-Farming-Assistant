import os
import json

base_dir = r"d:\antigravitry\frontend\src\locales"

langs = {
    "pa": {
        "nav": {"home": "ਹੋਮ", "meri_fasal": "ਮੇਰੀ ਫ਼ਸਲ", "bechein": "ਵੇਚੋ", "madad": "ਮਦਦ"},
        "buttons": {"why": "ਕਿਉਂ?", "details": "ਵੇਰਵੇ", "retry": "ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ", "save": "ਸੇਵ ਕਰੋ", "continue": "ਜਾਰੀ ਰੱਖੋ", "back": "ਵਾਪਸ", "submit": "ਜਮ੍ਹਾ ਕਰੋ", "cancel": "ਰੱਦ ਕਰੋ"}
    },
    "mr": {
        "nav": {"home": "होम", "meri_fasal": "माझे पीक", "bechein": "विका", "madad": "मदत"},
        "buttons": {"why": "का?", "details": "तपशील", "retry": "पुन्हा प्रयत्न करा", "save": "जतन करा", "continue": "पुढे जा", "back": "मागे", "submit": "सबमिट करा", "cancel": "रद्द करा"}
    },
    "gu": {
        "nav": {"home": "હોમ", "meri_fasal": "મારો પાક", "bechein": "વેચો", "madad": "મદદ"},
        "buttons": {"why": "કેમ?", "details": "વિગતો", "retry": "ફરી પ્રયાસ કરો", "save": "સેવ કરો", "continue": "ચાલુ રાખો", "back": "પાછા", "submit": "સબમિટ કરો", "cancel": "રદ કરો"}
    },
    "bn": {
        "nav": {"home": "হোম", "meri_fasal": "আমার ফসল", "bechein": "বিক্রি", "madad": "সাহায্য"},
        "buttons": {"why": "কেন?", "details": "বিস্তারিত", "retry": "আবার চেষ্টা করুন", "save": "সংরক্ষণ", "continue": "চালিয়ে যান", "back": "পিছনে", "submit": "জমা দিন", "cancel": "বাতিল"}
    },
    "ta": {
        "nav": {"home": "முகப்பு", "meri_fasal": "என் பயிர்", "bechein": "விற்கவும்", "madad": "உதவி"},
        "buttons": {"why": "ஏன்?", "details": "விவரங்கள்", "retry": "மீண்டும் முயற்சி", "save": "சேமி", "continue": "தொடரவும்", "back": "பின்", "submit": "சமர்ப்பி", "cancel": "ரத்து"}
    },
    "te": {
        "nav": {"home": "హోమ్", "meri_fasal": "నా పంట", "bechein": "అమ్మండి", "madad": "సహాయం"},
        "buttons": {"why": "ఎందుకు?", "details": "వివరాలు", "retry": "మళ్ళీ ప్రయత్నించండి", "save": "సేవ్", "continue": "కొనసాగించు", "back": "వెనుకకు", "submit": "సబ్మిట్", "cancel": "రద్దు"}
    },
    "kn": {
        "nav": {"home": "ಮುಖಪುಟ", "meri_fasal": "ನನ್ನ ಬೆಳೆ", "bechein": "ಮಾರಾಟ", "madad": "ಸಹಾಯ"},
        "buttons": {"why": "ಏಕೆ?", "details": "ವಿವರಗಳು", "retry": "ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ", "save": "ಉಳಿಸಿ", "continue": "ಮುಂದುವರಿಸಿ", "back": "ಹಿಂದೆ", "submit": "ಸಲ್ಲಿಸಿ", "cancel": "ರದ್ದು"}
    },
    "ml": {
        "nav": {"home": "ഹോം", "meri_fasal": "എന്റെ വിള", "bechein": "വിൽക്കുക", "madad": "സഹായം"},
        "buttons": {"why": "എന്തുകൊണ്ട്?", "details": "വിശദാംശങ്ങൾ", "retry": "വീണ്ടും ശ്രമിക്കുക", "save": "സേവ്", "continue": "തുടരുക", "back": "പിന്നിലേക്ക്", "submit": "സമർപ്പിക്കുക", "cancel": "റദ്ദാക്കുക"}
    },
    "or": {
        "nav": {"home": "ହୋମ", "meri_fasal": "ମୋ ଫସଲ", "bechein": "ବିକ୍ରି", "madad": "ସାହାଯ୍ୟ"},
        "buttons": {"why": "କାହିଁକି?", "details": "ବିବରଣୀ", "retry": "ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ", "save": "ସେଭ୍ କରନ୍ତୁ", "continue": "ଜାରି ରଖନ୍ତୁ", "back": "ପଛକୁ", "submit": "ଦାଖଲ କରନ୍ତୁ", "cancel": "ବାତିଲ"}
    }
}

en_common = {
  "app_name": "KisanIQ",
  "greeting": "Namaste, {{name}} ji",
  "greeting_emoji": "👋",
  "location_prefix": "📍",
  "nav": {
    "home": "Home",
    "meri_fasal": "My Crop",
    "bechein": "Sell",
    "madad": "Help"
  },
  "buttons": {
    "why": "Why?",
    "details": "Details",
    "compare": "Compare",
    "retry": "Try Again",
    "save": "Save",
    "continue": "Continue",
    "back": "Back",
    "submit": "Submit",
    "cancel": "Cancel",
    "change": "Change",
    "add": "Add",
    "view_all": "View All",
    "learn_more": "Learn More"
  },
  "status": {
    "low": "Low",
    "medium": "Medium",
    "high": "High",
    "critical": "Critical",
    "good": "Good",
    "recommended": "Recommended",
    "consider": "Consider",
    "caution": "Caution",
    "avoid": "Avoid"
  },
  "time": {
    "today": "Today",
    "tomorrow": "Tomorrow",
    "yesterday": "Yesterday",
    "just_now": "Just now",
    "min_ago": "{{count}} min ago",
    "hours_ago": "{{count}}h ago",
    "days_ago": "{{count}}d ago",
    "last_updated": "Last updated: {{time}}"
  },
  "states": {
    "loading": "Loading...",
    "error_title": "Something went wrong",
    "error_description": "Unable to load this information right now.",
    "offline_title": "You are offline",
    "offline_description": "Showing last available information.",
    "empty_title": "Nothing here yet",
    "demo_label": "Demo Data"
  },
  "language": {
    "title": "Choose Language",
    "change": "Change Language",
    "current": "Current"
  },
  "units": {
    "per_quintal": "/q",
    "quintal": "quintal",
    "acres": "acres",
    "km": "km",
    "kmph": "km/h",
    "mm": "mm",
    "days": "days",
    "days_old": "{{count}} days old"
  },
  "notifications": {
    "title": "Notifications",
    "no_notifications": "No new notifications"
  },
  "profile": {
    "title": "Profile",
    "farm_details": "Farm Details",
    "settings": "Settings"
  }
}

titles = {
    "home.json": {"weather": {"title": "Today's Weather"}, "aaj_kya_karein": {"title": "TODAY'S ACTIONS"}},
    "crop.json": {"title": "My Crop"},
    "market.json": {"title": "Sell Crop"},
    "weather.json": {"title": "Today's Weather"},
    "risk.json": {"title": "Risk Assessment"},
    "assistant.json": {"title": "Ask KisanIQ"},
    "profile.json": {"title": "Profile"},
    "notifications.json": {"title": "Notifications"}
}

for lang, data in langs.items():
    lang_dir = os.path.join(base_dir, lang)
    os.makedirs(lang_dir, exist_ok=True)
    
    # common.json
    common = dict(en_common) # copy
    common['nav'] = dict(en_common['nav'])
    common['buttons'] = dict(en_common['buttons'])
    
    for k, v in data['nav'].items():
        common['nav'][k] = v
    for k, v in data['buttons'].items():
        common['buttons'][k] = v
        
    with open(os.path.join(lang_dir, 'common.json'), 'w', encoding='utf-8') as f:
        json.dump(common, f, ensure_ascii=False, indent=2)
        
    # other files
    for filename, content in titles.items():
        with open(os.path.join(lang_dir, filename), 'w', encoding='utf-8') as f:
            json.dump(content, f, ensure_ascii=False, indent=2)
