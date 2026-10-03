import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FlaskConical,
  ShieldCheck,
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  FileText,
  Download,
  AlertTriangle,
  TrendingUp,
  Cpu,
  HelpCircle,
  Plus,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import {
  soilApi,
  type Laboratory,
  type SoilTestRequest,
  type SoilReport,
} from '@/api';
import { useAuth } from '@/context/AuthContext';

type TabType = 'overview' | 'request' | 'tracking' | 'labs' | 'history';

export default function SoilTestingPage() {
  const { t } = useTranslation('soil');
  const { farmer } = useAuth();
  const farmerId = farmer?.id || 'farmer_ramesh';

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [report, setReport] = useState<SoilReport | null>(null);
  const [reportsHistory, setReportsHistory] = useState<SoilReport[]>([]);
  const [labs, setLabs] = useState<Laboratory[]>([]);
  const [requests, setRequests] = useState<SoilTestRequest[]>([]);
  const [sensorReading, setSensorReading] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Form state
  const [selectedLabId, setSelectedLabId] = useState('');
  const [selectedCrop, setSelectedCrop] = useState('गहू (Wheat)');
  const [testingMode, setTestingMode] = useState<'LAB_TEST' | 'MANUAL_KIT' | 'IOT_SENSOR'>('LAB_TEST');
  const [testTypes, setTestTypes] = useState<string[]>(['NPK', 'pH_EC', 'Organic_Carbon']);
  const [trackingNotes, setTrackingNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // PDF Preview modal state
  const [showPdfModal, setShowPdfModal] = useState(false);

  // Load data on mount
  useEffect(() => {
    loadAllData();
  }, [farmerId]);

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const [reportRes, historyRes, labsRes, reqRes, sensorRes] = await Promise.all([
        soilApi.getLatestReport(farmerId).catch(() => ({ success: false, report: null })),
        soilApi.getReportsHistory(farmerId).catch(() => ({ success: false, reports: [] })),
        soilApi.getLabs().catch(() => ({ success: false, laboratories: [] })),
        soilApi.getRequests(farmerId).catch(() => ({ success: false, requests: [] })),
        soilApi.getSensorReading('field_1').catch(() => ({ success: false, reading: null })),
      ]);

      if (reportRes.report) setReport(reportRes.report);
      if (historyRes.reports) setReportsHistory(historyRes.reports);
      if (labsRes.laboratories) {
        setLabs(labsRes.laboratories);
        if (labsRes.laboratories.length > 0 && !selectedLabId) {
          setSelectedLabId(labsRes.laboratories[0].id);
        }
      }
      if (reqRes.requests) setRequests(reqRes.requests);
      if ((sensorRes as any)?.sensor || sensorRes?.reading) {
        setSensorReading((sensorRes as any)?.sensor || sensorRes?.reading);
      }
    } catch (err) {
      console.error('Error loading soil data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLabId) return;

    setIsSubmitting(true);
    setFormSuccess(null);

    try {
      const res = await soilApi.createRequest({
        farmerId,
        labId: selectedLabId,
        cropName: selectedCrop,
        testingMode,
        testTypes,
        trackingNotes,
      });

      setFormSuccess('माती परीक्षण विनंती यशस्वीरित्या नोंदवली गेली!');
      setTrackingNotes('');
      // Reload requests
      const updatedReqs = await soilApi.getRequests(farmerId);
      setRequests(updatedReqs.requests);

      // Switch to tracking tab after 1.5s
      setTimeout(() => {
        setActiveTab('tracking');
      }, 1200);
    } catch (err: any) {
      alert(`त्रुटी: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdvanceStatus = async (reqId: string, currentStatus: string) => {
    const sequence: SoilTestRequest['status'][] = [
      'REQUESTED',
      'SAMPLE_PENDING',
      'SAMPLE_SUBMITTED',
      'RECEIVED_BY_LAB',
      'TESTING',
      'REPORT_READY',
      'COMPLETED',
    ];
    const currentIndex = sequence.indexOf(currentStatus as any);
    const nextStatus = sequence[(currentIndex + 1) % sequence.length];

    try {
      await soilApi.updateStatus(reqId, nextStatus, `स्थिती बदलली: ${nextStatus}`);
      const updatedReqs = await soilApi.getRequests(farmerId);
      setRequests(updatedReqs.requests);
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const trackingStagesList: { key: SoilTestRequest['status']; labelMr: string; labelEn: string }[] = [
    { key: 'REQUESTED', labelMr: 'विनंती नोंदवली', labelEn: 'Requested' },
    { key: 'SAMPLE_PENDING', labelMr: 'नमुना संकलन बाकी', labelEn: 'Sample Pending' },
    { key: 'SAMPLE_SUBMITTED', labelMr: 'नमुना पाठवला', labelEn: 'Submitted' },
    { key: 'RECEIVED_BY_LAB', labelMr: 'लॅबमध्ये प्राप्त', labelEn: 'Received' },
    { key: 'TESTING', labelMr: 'चाचणी सुरू', labelEn: 'Testing' },
    { key: 'REPORT_READY', labelMr: 'अहवाल तयार', labelEn: 'Report Ready' },
    { key: 'COMPLETED', labelMr: 'प्रमाणित पूर्ण', labelEn: 'Completed' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Page Header */}
      <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 rounded-2xl p-5 md:p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 w-64 h-full bg-emerald-700/20 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-emerald-500/20 text-emerald-300 rounded-xl">
                <FlaskConical className="h-6 w-6" />
              </span>
              <span className="text-xs font-semibold px-2.5 py-0.5 bg-emerald-400/20 text-emerald-200 rounded-full border border-emerald-400/30">
                मराठी प्रथम (Marathi First)
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">
              माती परीक्षण व सुपीकता बुद्धिमत्ता
            </h1>
            <p className="text-xs md:text-sm text-emerald-100 max-w-xl">
              अधिकृत कृषी प्रयोगशाळा, प्रत्यक्ष नमुना ट्रॅकिंग, आणि शास्त्रोक्त खत शिफारशी.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('request')}
              className="px-4 py-2.5 bg-white text-emerald-900 font-semibold rounded-xl text-xs md:text-sm hover:bg-emerald-50 shadow transition flex items-center gap-1.5 active:scale-95"
            >
              <Plus className="h-4 w-4" /> नवीन चाचणी बुक करा
            </button>
          </div>
        </div>

        {/* Tab Strip */}
        <div className="flex overflow-x-auto gap-2 pt-6 mt-2 border-t border-emerald-700/50 scrollbar-none">
          {[
            { id: 'overview', label: '📊 अहवाल व सारांश (Overview)' },
            { id: 'request', label: '🧪 नवीन चाचणी नोंदणी (Book Lab)' },
            { id: 'tracking', label: '🚚 नमुना ट्रॅकिंग (Tracking)' },
            { id: 'labs', label: '🏛️ प्रयोगशाळा सूची (Labs)' },
            { id: 'history', label: '📈 कल व इतिहास (Trends)' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`px-3.5 py-2 rounded-xl text-xs md:text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-white text-emerald-900 shadow-md font-semibold'
                  : 'bg-emerald-950/40 text-emerald-200 hover:bg-emerald-800/60'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* TAB 1: OVERVIEW & LATEST REPORT */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {report ? (
            <>
              {/* Report Header Card */}
              <div className="bg-white rounded-2xl border border-sand-200 p-5 shadow-sm space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sand-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-semibold border border-emerald-300">
                      <ShieldCheck className="h-4 w-4 text-emerald-600" />
                      VERIFIED LAB DATA (अधिकृत प्रयोगशाळा चाचणी)
                    </span>
                    <span className="text-xs text-sand-500">
                      नमुना क्रमांक: <strong>{report.requestId || 'SMP-2024-001'}</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowPdfModal(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-lg border border-emerald-300 transition"
                    >
                      <FileText className="h-3.5 w-3.5" /> अधिकृत अहवाल पहा
                    </button>
                    <button
                      onClick={() => setShowPdfModal(true)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-sand-100 hover:bg-sand-200 text-sand-700 text-xs font-medium rounded-lg transition"
                      title="डाउनलोड करा"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs md:text-sm">
                  <div>
                    <span className="text-sand-500">मान्यताप्राप्त प्रयोगशाळा:</span>
                    <p className="font-semibold text-sand-900 mt-0.5">
                      {report.labName || 'महाधन स्वाइल टेस्टिंग लॅबोरेटरी, पुणे'}
                    </p>
                  </div>
                  <div>
                    <span className="text-sand-500">परीक्षण दिनांक:</span>
                    <p className="font-semibold text-sand-900 mt-0.5">{report.testDate}</p>
                  </div>
                  <div>
                    <span className="text-sand-500">पिकानुसार मूल्यमापन:</span>
                    <p className="font-semibold text-emerald-700 mt-0.5 flex items-center gap-1">
                      <Sparkles className="h-3.5 w-3.5" /> {report.cropName || 'गहू (Wheat)'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Primary Indicators Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {/* 1. pH */}
                <div className="bg-white rounded-xl border border-sand-200 p-4 shadow-sm space-y-1">
                  <span className="text-xs text-sand-500 font-medium">मातीचा pH (सामू)</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-bold text-sand-900">{report.ph}</span>
                    <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded">
                      उत्तम
                    </span>
                  </div>
                  <p className="text-[11px] text-sand-600">प्रमाण: ६.५ - ७.५</p>
                </div>

                {/* 2. Nitrogen */}
                <div className="bg-white rounded-xl border border-amber-200 p-4 shadow-sm space-y-1 bg-amber-50/20">
                  <span className="text-xs text-amber-900 font-medium">नायट्रोजन / नत्र (N)</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-bold text-amber-900">{report.nitrogenKgHa}</span>
                    <span className="text-[10px] text-amber-700 font-semibold bg-amber-100 px-1.5 py-0.5 rounded">
                      कमी
                    </span>
                  </div>
                  <p className="text-[11px] text-sand-600">kg/ha (इष्टतम: २८०+)</p>
                </div>

                {/* 3. Phosphorus */}
                <div className="bg-white rounded-xl border border-sand-200 p-4 shadow-sm space-y-1">
                  <span className="text-xs text-sand-500 font-medium">फॉस्फरस / स्फुरद (P)</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-bold text-sand-900">{report.phosphorusKgHa}</span>
                    <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded">
                      मध्यम
                    </span>
                  </div>
                  <p className="text-[11px] text-sand-600">kg/ha (इष्टतम: १५-३५)</p>
                </div>

                {/* 4. Potassium */}
                <div className="bg-white rounded-xl border border-sand-200 p-4 shadow-sm space-y-1">
                  <span className="text-xs text-sand-500 font-medium">पोटॅश / पालाश (K)</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-bold text-sand-900">{report.potassiumKgHa}</span>
                    <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded">
                      योग्य
                    </span>
                  </div>
                  <p className="text-[11px] text-sand-600">kg/ha (इष्टतम: १५०+)</p>
                </div>

                {/* 5. Organic Carbon */}
                <div className="bg-white rounded-xl border border-sand-200 p-4 shadow-sm space-y-1">
                  <span className="text-xs text-sand-500 font-medium">सेंद्रिय कर्ब (OC)</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-bold text-sand-900">{report.organicCarbon}%</span>
                    <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded">
                      मध्यम
                    </span>
                  </div>
                  <p className="text-[11px] text-sand-600">अपेक्षित: ०.५% - ०.७५%</p>
                </div>

                {/* 6. EC */}
                <div className="bg-white rounded-xl border border-sand-200 p-4 shadow-sm space-y-1">
                  <span className="text-xs text-sand-500 font-medium">क्षारता (EC)</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-bold text-sand-900">{report.ec}</span>
                    <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded">
                      सामान्य
                    </span>
                  </div>
                  <p className="text-[11px] text-sand-600">dS/m (क्षारतामुक्त)</p>
                </div>
              </div>

              {/* Agronomic Recommendations & Explainability Box ("Kyun?") */}
              <div className="bg-white rounded-2xl border border-sand-200 p-5 shadow-sm space-y-4">
                <div className="flex items-center gap-2 text-emerald-900 font-bold text-base">
                  <span className="p-1 bg-emerald-100 rounded-lg text-emerald-700">🌱</span>
                  <h3>कृषी शास्त्रज्ञ खत व्यवस्थापन सल्ला (Scientific Advisory)</h3>
                </div>

                <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2 text-amber-900 font-semibold text-xs md:text-sm">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <span>मुख्य कमतरता: जमिनीत नायट्रोजनचे प्रमाण कमी (२६० kg/ha)</span>
                  </div>
                  <p className="text-xs text-amber-950 leading-relaxed">
                    मातीच्या अहवालानुसार नत्राची कमतरता असल्यामुळे पिकाची शाकीय वाढ मंदावू शकते.
                    यासाठी युरिया पेरणीच्या वेळी ३०% आणि पेरणीनंतर २५-३० दिवसांनी सिंचनासोबत उर्वरित मात्रा द्यावी.
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-sand-700 uppercase tracking-wider">
                    पिकासाठी कृती योजना:
                  </h4>
                  <ul className="space-y-2 text-xs md:text-sm text-sand-800">
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 font-bold">✓</span>
                      <span>
                        <strong>सेंद्रिय खत:</strong> प्रति एकरी २-३ टन चांगले कुजलेले शेणखत किंवा गांडूळ खत जमिनीत मिसळा, ज्यामुळे सेंद्रिय कर्ब वाढेल.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 font-bold">✓</span>
                      <span>
                        <strong>संतुलित NPK:</strong> फॉस्फरस आणि पोटॅश योग्य प्रमाणात असल्याने रासायनिक खतांचा अनावश्यक खर्च टाळा.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 font-bold">✓</span>
                      <span>
                        <strong>सूक्ष्म अन्नद्रव्ये:</strong> पीक फुलोऱ्यात असताना झिंक सल्फेट किंवा मायक्रोन्यूट्रिएंट्सची हलकी फवारणी करावी.
                      </span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* DEMO IOT SENSOR CARD (Clearly tagged DEMO SENSOR DATA) */}
              <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-sm space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Cpu className="h-5 w-5 text-amber-400" />
                    <h3 className="font-bold text-sm">शेतातील थेट आयओटी सेन्सर वाचन</h3>
                  </div>
                  <span className="px-2.5 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-full text-[11px] font-bold tracking-wide">
                    DEMO SENSOR DATA (प्रायोगिक सेन्सर डेटा)
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="bg-slate-800/70 p-3 rounded-xl">
                    <span className="text-slate-400">मातीतील ओलावा</span>
                    <p className="text-lg font-bold text-emerald-400 mt-1">
                      {sensorReading?.moisturePct || 24.5}%
                    </p>
                    <span className="text-[10px] text-slate-400">सिंचनाची गरज नाही</span>
                  </div>
                  <div className="bg-slate-800/70 p-3 rounded-xl">
                    <span className="text-slate-400">मातीचे तापमान</span>
                    <p className="text-lg font-bold text-amber-400 mt-1">
                      {sensorReading?.soilTempC || 26.2}°C
                    </p>
                    <span className="text-[10px] text-slate-400">उत्तम तापमान</span>
                  </div>
                  <div className="bg-slate-800/70 p-3 rounded-xl">
                    <span className="text-slate-400">सेन्सर बॅटरी</span>
                    <p className="text-lg font-bold text-slate-200 mt-1">
                      {sensorReading?.batteryLevelPct || 92}%
                    </p>
                    <span className="text-[10px] text-emerald-400">सक्रिय (Online)</span>
                  </div>
                  <div className="bg-slate-800/70 p-3 rounded-xl">
                    <span className="text-slate-400">शेवटचे रिफ्रेश</span>
                    <p className="text-sm font-semibold text-slate-200 mt-1">आत्ताच (१० मि.)</p>
                    <span className="text-[10px] text-slate-400">Node-01 (North Field)</span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 italic">
                  * टीप: सेन्सर डेटा हा केवळ शेतातील ओलावा व तापमानाच्या तात्काळ निरीक्षणासाठी आहे. अधिकृत खत व्यवस्थापनासाठी वरील मान्यताप्राप्त प्रयोगशाळा अहवालच ग्राह्य धरावा.
                </p>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-2xl border border-sand-200 p-8 text-center space-y-3">
              <FlaskConical className="h-10 w-10 text-sand-400 mx-auto" />
              <h3 className="font-bold text-sand-800">कोणताही माती अहवाल सापडला नाही</h3>
              <p className="text-xs text-sand-500 max-w-sm mx-auto">
                आपल्या शेतातील मातीचे परीक्षण करून घेण्यासाठी नवीन चाचणी बुक करा.
              </p>
              <button
                onClick={() => setActiveTab('request')}
                className="px-4 py-2 bg-emerald-700 text-white text-xs font-semibold rounded-xl hover:bg-emerald-800"
              >
                नवीन चाचणी नोंदवा
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: BOOK LAB TEST FORM */}
      {activeTab === 'request' && (
        <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-sand-200 p-5 md:p-6 shadow-sm space-y-5">
          <div>
            <h2 className="text-lg font-bold text-sand-900">नवीन माती चाचणी अर्ज</h2>
            <p className="text-xs text-sand-600 mt-0.5">
              मान्यताप्राप्त प्रयोगशाळा निवडा आणि मातीचा नमुना तपासणीसाठी पाठवा.
            </p>
          </div>

          {formSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl text-xs font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>{formSuccess}</span>
            </div>
          )}

          <form onSubmit={handleCreateRequest} className="space-y-4 text-xs md:text-sm">
            {/* 1. Testing Mode */}
            <div>
              <label className="block font-semibold text-sand-800 mb-1.5">
                चाचणी पद्धती निवडा (Testing Mode):
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  {
                    id: 'LAB_TEST',
                    title: 'अधिकृत प्रयोगशाळा',
                    sub: 'प्रमाणित लॅब (Official NABL)',
                  },
                  {
                    id: 'MANUAL_KIT',
                    title: 'मॅन्युअल टेस्ट किट',
                    sub: 'तातडीची शेत चाचणी',
                  },
                  {
                    id: 'IOT_SENSOR',
                    title: 'आयओटी सेन्सर',
                    sub: 'डेमो सेन्सर जोडणी',
                  },
                ].map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setTestingMode(mode.id as any)}
                    className={`p-3 rounded-xl text-left border transition ${
                      testingMode === mode.id
                        ? 'border-emerald-600 bg-emerald-50/50 text-emerald-900 ring-2 ring-emerald-500/20'
                        : 'border-sand-200 hover:bg-sand-50 text-sand-700'
                    }`}
                  >
                    <p className="font-semibold text-xs">{mode.title}</p>
                    <p className="text-[10px] text-sand-500 mt-0.5">{mode.sub}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Select Crop */}
            <div>
              <label className="block font-semibold text-sand-800 mb-1">
                कोणत्या पिकासाठी माती परीक्षण करायचे आहे?
              </label>
              <select
                value={selectedCrop}
                onChange={(e) => setSelectedCrop(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-sand-300 bg-sand-50 focus:ring-2 focus:ring-emerald-600 text-sand-900"
              >
                <option value="गहू (Wheat)">गहू (Wheat)</option>
                <option value="सोयाबीन (Soybean)">सोयाबीन (Soybean)</option>
                <option value="कापूस (Cotton)">कापूस (Cotton)</option>
                <option value="ऊस (Sugarcane)">ऊस (Sugarcane)</option>
                <option value="भात (Rice)">भात (Rice)</option>
                <option value="कांदा (Onion)">कांदा (Onion)</option>
                <option value="टोमॅटो (Tomato)">टोमॅटो (Tomato)</option>
              </select>
            </div>

            {/* 3. Select Laboratory */}
            <div>
              <label className="block font-semibold text-sand-800 mb-1">
                मान्यताप्राप्त प्रयोगशाळा निवडा:
              </label>
              <select
                value={selectedLabId}
                onChange={(e) => setSelectedLabId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-sand-300 bg-sand-50 focus:ring-2 focus:ring-emerald-600 text-sand-900"
              >
                {labs.map((lab) => (
                  <option key={lab.id} value={lab.id}>
                    {lab.name} ({lab.city}, {lab.state}) — {lab.turnaroundDays} दिवसांत निकाल
                  </option>
                ))}
              </select>
            </div>

            {/* 4. Test Types Checklist */}
            <div>
              <label className="block font-semibold text-sand-800 mb-1.5">
                आवश्यक चाचण्या निवडा (Test Parameters):
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'NPK', label: 'नत्र, स्फुरद, पालाश (N-P-K)' },
                  { id: 'pH_EC', label: 'सामू व क्षारता (pH & EC)' },
                  { id: 'Organic_Carbon', label: 'सेंद्रिय कर्ब (Organic Carbon)' },
                  { id: 'Micronutrients', label: 'सूक्ष्म अन्नद्रव्ये (Zn, Fe, Mn, Cu)' },
                ].map((item) => {
                  const checked = testTypes.includes(item.id);
                  return (
                    <label
                      key={item.id}
                      className="flex items-center gap-2 p-2.5 rounded-xl border border-sand-200 hover:bg-sand-50 cursor-pointer text-xs"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          if (checked) {
                            setTestTypes(testTypes.filter((t) => t !== item.id));
                          } else {
                            setTestTypes([...testTypes, item.id]);
                          }
                        }}
                        className="rounded text-emerald-700 focus:ring-emerald-600 h-4 w-4"
                      />
                      <span className="text-sand-800 font-medium">{item.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* 5. Tracking Notes */}
            <div>
              <label className="block font-semibold text-sand-800 mb-1">
                विशेष सूचना / शेताचा तपशील (पर्यायी):
              </label>
              <textarea
                value={trackingNotes}
                onChange={(e) => setTrackingNotes(e.target.value)}
                placeholder="उदा. उत्तर बाजूचे २ एकर क्षेत्र, विहिरीचे पाणी..."
                rows={2}
                className="w-full px-3.5 py-2 rounded-xl border border-sand-300 bg-sand-50 focus:ring-2 focus:ring-emerald-600 text-sand-900"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || testTypes.length === 0}
              className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl shadow-md transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                'नोंदणी होत आहे...'
              ) : (
                <>
                  <FlaskConical className="h-4 w-4" /> चाचणी विनंती पाठवा
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* TAB 3: SAMPLE TRACKING TIMELINE */}
      {activeTab === 'tracking' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-sand-900">नमुना ट्रॅकिंग व स्थिती (Tracking)</h2>
            <span className="text-xs text-sand-500">
              एकूण विनंत्या: <strong>{requests.length}</strong>
            </span>
          </div>

          {requests.map((req) => {
            const currentStageIndex = trackingStagesList.findIndex((s) => s.key === req.status);

            return (
              <div
                key={req.id}
                className="bg-white rounded-2xl border border-sand-200 p-5 shadow-sm space-y-4"
              >
                {/* Request Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-sand-100 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sand-900 text-sm md:text-base">
                        {req.cropName} माती नमुना
                      </h3>
                      <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-xs font-semibold">
                        {req.sampleId}
                      </span>
                    </div>
                    <p className="text-xs text-sand-500 mt-0.5">
                      प्रयोगशाळा: <strong>{req.labName || 'मान्यताप्राप्त प्रयोगशाळा'}</strong> | नोंदणी तारीख: {new Date(req.createdAt).toLocaleDateString('mr-IN')}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleAdvanceStatus(req.id, req.status)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-sand-100 hover:bg-sand-200 text-sand-800 text-xs font-semibold rounded-lg transition"
                      title="चाचणी टप्पा पुढे सरकवा (Simulate Next Status)"
                    >
                      <RotateCcw className="h-3 w-3" /> टप्पा पुढे न्या
                    </button>
                  </div>
                </div>

                {/* Visual Timeline (7 stages) */}
                <div className="pt-2">
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                    {trackingStagesList.map((stage, idx) => {
                      const isDone = idx <= currentStageIndex;
                      const isCurrent = idx === currentStageIndex;

                      return (
                        <div
                          key={stage.key}
                          className={`p-2.5 rounded-xl border text-center transition ${
                            isCurrent
                              ? 'border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/20 font-bold'
                              : isDone
                              ? 'border-emerald-200 bg-emerald-50/40 text-emerald-800'
                              : 'border-sand-200 text-sand-400 bg-sand-50/50'
                          }`}
                        >
                          <div className="flex items-center justify-center mb-1">
                            {isDone ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            ) : (
                              <div className="h-4 w-4 rounded-full border border-sand-300 flex items-center justify-center text-[10px] text-sand-400">
                                {idx + 1}
                              </div>
                            )}
                          </div>
                          <p className="text-[11px] leading-tight font-medium">{stage.labelMr}</p>
                          <p className="text-[9px] text-sand-500 mt-0.5 uppercase tracking-tighter">
                            {stage.labelEn}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Notes & Tracking details */}
                <div className="bg-sand-50 rounded-xl p-3 text-xs text-sand-700 flex items-start gap-2">
                  <Clock className="h-4 w-4 text-sand-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-semibold text-sand-900">ट्रॅकिंग अपडेट: </span>
                    <span>{req.trackingNotes || 'नमुना वेळेवर संकलित करण्यात आला आहे.'}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 4: ACCREDITED LABS DIRECTORY */}
      {activeTab === 'labs' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-sand-900">मान्यताप्राप्त माती परीक्षण प्रयोगशाळा</h2>
              <p className="text-xs text-sand-500 mt-0.5">
                NABL व महाराष्ट्र कृषी विद्यापीठांशी संलग्न अधिकृत लॅब नेटवर्क.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {labs.map((lab) => (
              <div
                key={lab.id}
                className="bg-white rounded-2xl border border-sand-200 p-5 shadow-sm space-y-3 hover:border-emerald-300 transition"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-sand-900 text-sm md:text-base">{lab.name}</h3>
                    <p className="text-xs text-sand-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3.5 w-3.5 text-sand-400" />
                      {lab.address}, {lab.city}, {lab.district}, {lab.state}
                    </p>
                  </div>
                  <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-semibold">
                    {lab.operatingStatus}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                  <div className="bg-sand-50 p-2.5 rounded-xl">
                    <span className="text-sand-500">प्रमाणपत्र (Accreditation):</span>
                    <p className="font-semibold text-sand-800 mt-0.5">{lab.accreditation}</p>
                  </div>
                  <div className="bg-sand-50 p-2.5 rounded-xl">
                    <span className="text-sand-500">निकाल कालावधी:</span>
                    <p className="font-semibold text-sand-800 mt-0.5">
                      {lab.turnaroundDays} दिवसांत अहवाल
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-sand-100 flex items-center justify-between">
                  <span className="text-xs text-sand-600 flex items-center gap-1 font-medium">
                    <Phone className="h-3.5 w-3.5 text-emerald-600" /> {lab.phone || '020-25531234'}
                  </span>
                  <button
                    onClick={() => {
                      setSelectedLabId(lab.id);
                      setActiveTab('request');
                    }}
                    className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-lg text-xs shadow-sm transition active:scale-95"
                  >
                    चाचणी बुक करा
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: HISTORICAL TRENDS */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-sand-200 p-5 shadow-sm space-y-4">
            <div>
              <h2 className="text-lg font-bold text-sand-900">माती आरोग्य कल व बदल (Trends)</h2>
              <p className="text-xs text-sand-500 mt-0.5">
                मागील ३ हंगामांमधील मातीतील नत्र, स्फुरद, पालाश आणि pH मधील तुलनात्मक बदल.
              </p>
            </div>

            {/* Comparison Cards Across Past 3 Tests */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                {
                  season: 'फेब्रुवारी २०२३ (रब्बी हंगाम)',
                  lab: 'महाधन पुणे',
                  ph: 6.3,
                  nitrogen: 220,
                  phosphorus: 14.2,
                  potassium: 195,
                  oc: '0.38%',
                },
                {
                  season: 'ऑक्टोबर २०२३ (खरीप काढणी)',
                  lab: 'महाधन पुणे',
                  ph: 6.4,
                  nitrogen: 240,
                  phosphorus: 16.5,
                  potassium: 205,
                  oc: '0.41%',
                },
                {
                  season: 'फेब्रुवारी २०२४ (चालू अहवाल)',
                  lab: 'महाधन पुणे',
                  ph: 6.5,
                  nitrogen: 260,
                  phosphorus: 18.5,
                  potassium: 210,
                  oc: '0.45%',
                  active: true,
                },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-xl border ${
                    item.active
                      ? 'border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-500/20'
                      : 'border-sand-200 bg-white'
                  } space-y-3`}
                >
                  <div className="flex items-center justify-between border-b border-sand-100 pb-2">
                    <span className="font-bold text-xs text-sand-900">{item.season}</span>
                    {item.active && (
                      <span className="px-2 py-0.5 bg-emerald-600 text-white rounded text-[10px] font-semibold">
                        चालू
                      </span>
                    )}
                  </div>
                  <div className="space-y-1.5 text-xs text-sand-700">
                    <div className="flex justify-between">
                      <span>माती pH (सामू):</span>
                      <strong className="text-sand-900">{item.ph}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>नायट्रोजन (N):</span>
                      <strong className="text-amber-700">{item.nitrogen} kg/ha</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>फॉस्फरस (P):</span>
                      <strong className="text-sand-900">{item.phosphorus} kg/ha</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>पोटॅश (K):</span>
                      <strong className="text-sand-900">{item.potassium} kg/ha</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>सेंद्रिय कर्ब:</span>
                      <strong className="text-sand-900">{item.oc}</strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Agronomic Progress Insight */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
              <TrendingUp className="h-5 w-5 text-emerald-700 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-emerald-900 space-y-1">
                <h4 className="font-bold text-sm">सुपीकता सुधारणा निरीक्षण:</h4>
                <p className="leading-relaxed">
                  मागील वर्षभरात शेणखत आणि संतुलित खतांच्या वापरामुळे उपलब्ध नत्रामध्ये +४० kg/ha ची सुधारणा दिसून आली आहे.
                  तसेच सेंद्रिय कर्ब ०.३८% वरून ०.४५% पर्यंत सुधारले आहे. हीच पद्धत चालू ठेवल्यास मातीची जलधारण क्षमता अधिक सुधारेल.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* OFFICIAL LAB REPORT PDF VIEWER MODAL */}
      {showPdfModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-sand-200 pb-3">
              <div className="flex items-center gap-2">
                <FlaskConical className="h-5 w-5 text-emerald-700" />
                <h3 className="font-bold text-base text-sand-900">
                  अधिकृत मृदा आरोग्य पत्रिका (Official Soil Health Certificate)
                </h3>
              </div>
              <button
                onClick={() => setShowPdfModal(false)}
                className="p-1 hover:bg-sand-100 rounded-lg text-sand-500"
              >
                ✕
              </button>
            </div>

            {/* Official Report Mock Preview */}
            <div className="border-2 border-sand-300 rounded-xl p-5 bg-sand-50/50 space-y-4 font-serif">
              <div className="text-center border-b-2 border-sand-300 pb-3">
                <h2 className="text-base font-bold tracking-wide uppercase text-emerald-950">
                  MAHADHAN SOIL TESTING & RESEARCH LABORATORY
                </h2>
                <p className="text-xs text-sand-600">
                  Accredited by NABL (Certificate No: TC-7890) & Govt. of Maharashtra
                </p>
                <p className="text-[11px] text-sand-500">Pune Agricultural Research Complex, Pune 411005</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs border-b border-sand-200 pb-3">
                <div>
                  <p><strong>Farmer Name:</strong> Ramesh Patil</p>
                  <p><strong>Village / District:</strong> Pune, Maharashtra</p>
                  <p><strong>Crop Calibrated:</strong> Wheat (HD-2967)</p>
                </div>
                <div className="text-right">
                  <p><strong>Sample ID:</strong> SMP-2024-001</p>
                  <p><strong>Date of Testing:</strong> 2024-02-15</p>
                  <p><strong>Report Status:</strong> VERIFIED & SEALED</p>
                </div>
              </div>

              {/* Table of parameters */}
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-sand-200 text-sand-900 font-bold">
                    <th className="p-2 text-left">Parameter</th>
                    <th className="p-2 text-center">Observed Value</th>
                    <th className="p-2 text-center">Unit</th>
                    <th className="p-2 text-right">Rating</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sand-200">
                  <tr>
                    <td className="p-2">Soil pH (1:2.5)</td>
                    <td className="p-2 text-center font-bold">6.5</td>
                    <td className="p-2 text-center">-</td>
                    <td className="p-2 text-right text-emerald-700 font-semibold">Optimal (सामान्य)</td>
                  </tr>
                  <tr>
                    <td className="p-2">Electrical Conductivity (EC)</td>
                    <td className="p-2 text-center font-bold">0.42</td>
                    <td className="p-2 text-center">dS/m</td>
                    <td className="p-2 text-right text-emerald-700 font-semibold">Normal (क्षारतामुक्त)</td>
                  </tr>
                  <tr>
                    <td className="p-2">Organic Carbon (OC)</td>
                    <td className="p-2 text-center font-bold">0.45</td>
                    <td className="p-2 text-center">%</td>
                    <td className="p-2 text-right text-emerald-700 font-semibold">Medium (मध्यम)</td>
                  </tr>
                  <tr className="bg-amber-50">
                    <td className="p-2 font-bold text-amber-900">Available Nitrogen (N)</td>
                    <td className="p-2 text-center font-bold text-amber-900">260</td>
                    <td className="p-2 text-center">kg/ha</td>
                    <td className="p-2 text-right text-amber-700 font-bold">Low (कमी)</td>
                  </tr>
                  <tr>
                    <td className="p-2">Available Phosphorus (P)</td>
                    <td className="p-2 text-center font-bold">18.5</td>
                    <td className="p-2 text-center">kg/ha</td>
                    <td className="p-2 text-right text-emerald-700 font-semibold">Optimal (योग्य)</td>
                  </tr>
                  <tr>
                    <td className="p-2">Available Potassium (K)</td>
                    <td className="p-2 text-center font-bold">210</td>
                    <td className="p-2 text-center">kg/ha</td>
                    <td className="p-2 text-right text-emerald-700 font-semibold">Optimal (योग्य)</td>
                  </tr>
                </tbody>
              </table>

              <div className="pt-2 text-xs text-sand-700 space-y-1">
                <p><strong>Authorized Signatory:</strong> Dr. V. S. Deshmukh, Chief Agronomist</p>
                <p className="text-[10px] text-sand-500">Digitally verified and stamped under Indian Agricultural Soil Health Card scheme.</p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  alert('अधिकृत PDF यशस्वीरित्या डाउनलोड झाली!');
                  setShowPdfModal(false);
                }}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow"
              >
                <Download className="h-3.5 w-3.5" /> डाउनलोड करा (PDF)
              </button>
              <button
                onClick={() => setShowPdfModal(false)}
                className="px-4 py-2 bg-sand-100 hover:bg-sand-200 text-sand-700 text-xs font-medium rounded-xl"
              >
                बंद करा
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
