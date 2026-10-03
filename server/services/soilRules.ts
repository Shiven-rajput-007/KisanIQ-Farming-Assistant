// KisanIQ Soil Health Interpretation & Agronomic Rules Engine
// Provides crop-specific thresholds and farmer-friendly explanations in Marathi, English, and Hindi

export type ParameterLevel = 'low' | 'optimal' | 'high';

export interface ParameterInterpretation {
  key: string;
  name: string;
  nameMr: string;
  value: number;
  unit: string;
  level: ParameterLevel;
  ratingTextMr: string;
  ratingTextEn: string;
  explanationMr: string;
  explanationEn: string;
}

export interface SoilHealthReportSummary {
  overallHealth: 'poor' | 'medium' | 'optimal';
  overallTextMr: string;
  overallTextEn: string;
  parameters: ParameterInterpretation[];
  deficienciesMr: string[];
  deficienciesEn: string[];
  recommendationsMr: string[];
  recommendationsEn: string[];
}

export interface CropThresholds {
  ph: { min: number; max: number };
  nitrogen: { low: number; high: number }; // kg/ha
  phosphorus: { low: number; high: number }; // kg/ha
  potassium: { low: number; high: number }; // kg/ha
  organicCarbon: { low: number; high: number }; // %
  ecMax: number; // dS/m
}

// Agronomist-aligned Indian soil thresholds
export const DEFAULT_CROP_THRESHOLDS: Record<string, CropThresholds> = {
  wheat: {
    ph: { min: 6.0, max: 7.5 },
    nitrogen: { low: 280, high: 560 },
    phosphorus: { low: 11, high: 25 },
    potassium: { low: 110, high: 280 },
    organicCarbon: { low: 0.5, high: 0.75 },
    ecMax: 1.0,
  },
  soybean: {
    ph: { min: 6.0, max: 7.2 },
    nitrogen: { low: 250, high: 500 },
    phosphorus: { low: 12, high: 28 },
    potassium: { low: 120, high: 300 },
    organicCarbon: { low: 0.5, high: 0.8 },
    ecMax: 1.0,
  },
  cotton: {
    ph: { min: 6.5, max: 8.0 },
    nitrogen: { low: 280, high: 560 },
    phosphorus: { low: 10, high: 24 },
    potassium: { low: 130, high: 300 },
    organicCarbon: { low: 0.5, high: 0.75 },
    ecMax: 1.2,
  },
  rice: {
    ph: { min: 5.5, max: 7.0 },
    nitrogen: { low: 280, high: 560 },
    phosphorus: { low: 12, high: 25 },
    potassium: { low: 110, high: 280 },
    organicCarbon: { low: 0.5, high: 0.75 },
    ecMax: 1.0,
  },
  sugarcane: {
    ph: { min: 6.5, max: 7.5 },
    nitrogen: { low: 300, high: 600 },
    phosphorus: { low: 15, high: 30 },
    potassium: { low: 150, high: 350 },
    organicCarbon: { low: 0.6, high: 0.85 },
    ecMax: 1.0,
  },
  default: {
    ph: { min: 6.5, max: 7.5 },
    nitrogen: { low: 280, high: 560 },
    phosphorus: { low: 11, high: 25 },
    potassium: { low: 110, high: 280 },
    organicCarbon: { low: 0.5, high: 0.75 },
    ecMax: 1.0,
  },
};

export class SoilRulesEngine {
  /**
   * Evaluates soil report numbers against crop requirements
   */
  evaluate(
    data: {
      ph: number;
      ec: number;
      organicCarbon: number;
      nitrogen: number;
      phosphorus: number;
      potassium: number;
      moisture?: number;
    },
    cropName: string = 'Wheat'
  ): SoilHealthReportSummary {
    const cropKey = cropName.toLowerCase().replace(/[^a-z]/g, '');
    const thresholds = DEFAULT_CROP_THRESHOLDS[cropKey] || DEFAULT_CROP_THRESHOLDS.default;

    const parameters: ParameterInterpretation[] = [];
    const deficienciesMr: string[] = [];
    const deficienciesEn: string[] = [];
    const recommendationsMr: string[] = [];
    const recommendationsEn: string[] = [];

    // 1. pH Interpretation
    let phLevel: ParameterLevel = 'optimal';
    let phTextMr = 'योग्य (उदासीन)';
    let phTextEn = 'Optimal';
    let phExpMr = 'मातीचा सामू (pH) पिकासाठी उत्तम आहे. मुळांना अन्नद्रव्ये सहज शोषून घेता येतात.';
    let phExpEn = 'Soil pH is well-balanced, enabling optimal nutrient absorption by crop roots.';

    if (data.ph < thresholds.ph.min) {
      phLevel = 'low';
      phTextMr = 'कमी (आम्लयुक्त / Acidic)';
      phTextEn = 'Acidic';
      phExpMr = 'माती थोडी आम्लयुक्त आहे. यामुळे फॉस्फरस उपलब्धता कमी होऊ शकते. आवश्यकतेनुसार प्रयोगशाळेच्या सल्ल्याने चुना किंवा सेंद्रिय खतांचा वापर करा.';
      phExpEn = 'Soil is slightly acidic. Phosphorus uptake may be restricted. Consider agricultural lime or organic compost as advised by lab.';
      deficienciesMr.push('मातीचा सामू (pH) कमी आहे (आम्लयुक्त जमीन)');
      deficienciesEn.push('Soil pH is below optimal range (acidic tendency)');
    } else if (data.ph > thresholds.ph.max) {
      phLevel = 'high';
      phTextMr = 'जास्त (अल्कलाईन / Alkaline)';
      phTextEn = 'Alkaline';
      phExpMr = 'मातीचा सामू जास्त आहे (चोपण किंवा खारवट कल). जिप्सम किंवा सेंद्रिय हिरवळीच्या खतांचा वापर फायदेशीर ठरेल.';
      phExpEn = 'Soil pH is elevated. Micro-nutrient uptake may be hindered. Gypsum and green manure help balance high pH.';
      deficienciesMr.push('मातीचा सामू (pH) जास्त आहे');
      deficienciesEn.push('Soil pH is elevated (alkaline tendency)');
    }

    parameters.push({
      key: 'ph',
      name: 'Soil pH',
      nameMr: 'मातीचा सामू (pH)',
      value: data.ph,
      unit: '',
      level: phLevel,
      ratingTextMr: phTextMr,
      ratingTextEn: phTextEn,
      explanationMr: phExpMr,
      explanationEn: phExpEn,
    });

    // 2. Electrical Conductivity (EC / क्षारता)
    let ecLevel: ParameterLevel = 'optimal';
    let ecTextMr = 'योग्य (सामान्य)';
    let ecTextEn = 'Normal';
    let ecExpMr = 'मातीत क्षारांचे प्रमाण सुरक्षित मर्यादेत आहे. पिकाला पाणी शोषण्यास कोणतीही अडचण नाही.';
    let ecExpEn = 'Soil salinity is within safe levels with no osmotic stress on roots.';

    if (data.ec > thresholds.ecMax) {
      ecLevel = 'high';
      ecTextMr = 'जास्त (क्षारयुक्त / Saline)';
      ecTextEn = 'High Salinity';
      ecExpMr = 'तुमच्या मातीतील क्षारता जास्त आहे. यामुळे पिकाच्या वाढीवर आणि मुळांच्या कार्यक्षमतेवर परिणाम होऊ शकतो. पाण्याचा उत्तम निचरा ठेवा.';
      ecExpEn = 'Soil salinity is elevated. Ensure efficient field drainage and avoid saline irrigation water.';
      deficienciesMr.push('मातीतील क्षारता (EC) जास्त आहे');
      deficienciesEn.push('High electrical conductivity / salinity detected');
    }

    parameters.push({
      key: 'ec',
      name: 'Electrical Conductivity',
      nameMr: 'क्षारता / विद्युत वाहकता (EC)',
      value: data.ec,
      unit: 'dS/m',
      level: ecLevel,
      ratingTextMr: ecTextMr,
      ratingTextEn: ecTextEn,
      explanationMr: ecExpMr,
      explanationEn: ecExpEn,
    });

    // 3. Organic Carbon (OC / सेंद्रिय कर्ब)
    let ocLevel: ParameterLevel = 'optimal';
    let ocTextMr = 'योग्य';
    let ocTextEn = 'Optimal';
    let ocExpMr = 'सेंद्रिय कर्ब चांगला असल्याने मातीची सुपीकता आणि सूक्ष्मजीव कार्यक्षमता उत्तम आहे.';
    let ocExpEn = 'Good organic matter content, supporting beneficial soil microbial activity and water retention.';

    if (data.organicCarbon < thresholds.organicCarbon.low) {
      ocLevel = 'low';
      ocTextMr = 'कमी';
      ocTextEn = 'Low';
      ocExpMr = 'मातीतील सेंद्रिय कर्ब कमी आहे. शेणखत, कंपोस्ट किंवा गांडूळखताचा नियमित वापर करणे गरजेचे आहे.';
      ocExpEn = 'Soil organic carbon is low. Well-decomposed farmyard manure or vermicompost is recommended to restore humus.';
      deficienciesMr.push('सेंद्रिय कर्ब (Organic Carbon) कमी आहे');
      deficienciesEn.push('Low organic carbon content');
      recommendationsMr.push('एकरनिहाय चांगल्या कुजलेल्या शेणखताचा किंवा गांडूळखताचा वापर करा.');
      recommendationsEn.push('Apply well-rotted organic manure or vermicompost to improve soil organic carbon.');
    } else if (data.organicCarbon > thresholds.organicCarbon.high) {
      ocLevel = 'high';
      ocTextMr = 'उत्तम / जास्त';
      ocTextEn = 'High';
      ocExpMr = 'मातीतील सेंद्रिय कर्ब अत्यंत समृद्ध आहे.';
      ocExpEn = 'Excellent soil organic carbon content.';
    }

    parameters.push({
      key: 'organicCarbon',
      name: 'Organic Carbon',
      nameMr: 'सेंद्रिय कर्ब (OC)',
      value: data.organicCarbon,
      unit: '%',
      level: ocLevel,
      ratingTextMr: ocTextMr,
      ratingTextEn: ocTextEn,
      explanationMr: ocExpMr,
      explanationEn: ocExpEn,
    });

    // 4. Nitrogen (N / नायट्रोजन)
    let nLevel: ParameterLevel = 'optimal';
    let nTextMr = 'मध्यम / योग्य';
    let nTextEn = 'Optimal';
    let nExpMr = 'नायट्रोजनची पातळी पिकासाठी संतुलित आहे.';
    let nExpEn = 'Available nitrogen level is well-balanced for the vegetative stage.';

    if (data.nitrogen < thresholds.nitrogen.low) {
      nLevel = 'low';
      nTextMr = 'कमी';
      nTextEn = 'Deficient';
      nExpMr = 'तुमच्या मातीतील नायट्रोजनची पातळी कमी आहे. यामुळे पानांचा पिवळेपणा व फुटवे कमी येण्याची शक्यता असते. प्रयोगशाळेच्या शिफारशीनुसार युरिया/नायट्रोजन खतांचे नियोजन करा.';
      nExpEn = 'Available nitrogen is below target. May cause yellowing of older leaves and reduced tillering. Supplement per lab recommendation.';
      deficienciesMr.push('नायट्रोजन (N) ची कमतरता आहे');
      deficienciesEn.push('Nitrogen deficiency detected');
      recommendationsMr.push('सिंचनासोबत संतुलित नत्रयुक्त खतांची मात्रा द्या (प्रयोगशाळेच्या सल्ल्यानुसार).');
      recommendationsEn.push('Apply split-dose nitrogen fertilizer during irrigation cycles per agronomist card.');
    } else if (data.nitrogen > thresholds.nitrogen.high) {
      nLevel = 'high';
      nTextMr = 'जास्त';
      nTextEn = 'High';
      nExpMr = 'मातीत नायट्रोजनचे प्रमाण जास्त आहे. अतिरिक्त नत्र खत दिल्यास कीड-रोगाचा प्रादुर्भाव वाढू शकतो.';
      nExpEn = 'Nitrogen is abundant. Avoid excess chemical fertilizer to prevent vegetative lodging and disease vulnerability.';
    }

    parameters.push({
      key: 'nitrogen',
      name: 'Available Nitrogen',
      nameMr: 'नायट्रोजन (N)',
      value: data.nitrogen,
      unit: 'kg/ha',
      level: nLevel,
      ratingTextMr: nTextMr,
      ratingTextEn: nTextEn,
      explanationMr: nExpMr,
      explanationEn: nExpEn,
    });

    // 5. Phosphorus (P / फॉस्फरस)
    let pLevel: ParameterLevel = 'optimal';
    let pTextMr = 'मध्यम / योग्य';
    let pTextEn = 'Optimal';
    let pExpMr = 'फॉस्फरसचे प्रमाण समाधानकारक आहे, ज्यामुळे मुळांची वाढ चांगली होईल.';
    let pExpEn = 'Available phosphorus is in the optimal range, promoting robust root development.';

    if (data.phosphorus < thresholds.phosphorus.low) {
      pLevel = 'low';
      pTextMr = 'कमी';
      pTextEn = 'Low';
      pExpMr = 'मातीत फॉस्फरसची कमतरता आहे. मुळांच्या मजबुतीसाठी आणि दाणे भरण्यासाठी फॉस्फरसयुक्त खताचा (उदा. डीएपी किंवा एसएसपी) समतोल वापर करा.';
      pExpEn = 'Available phosphorus is low. Root growth and grain formation may be restricted. Apply phosphorus as prescribed.';
      deficienciesMr.push('फॉस्फरस (P) ची कमतरता आहे');
      deficienciesEn.push('Phosphorus deficiency detected');
      recommendationsMr.push('पेरणीच्या वेळी किंवा मुळांच्या वाढीसाठी फॉस्फरसयुक्त खत वापरा.');
      recommendationsEn.push('Ensure balanced phosphatic fertilizer application as per lab card.');
    } else if (data.phosphorus > thresholds.phosphorus.high) {
      pLevel = 'high';
      pTextMr = 'जास्त';
      pTextEn = 'High';
      pExpMr = 'फॉस्फरसचे प्रमाण मुबलक आहे. अतिरिक्त फॉस्फरस खताची गरज नाही.';
      pExpEn = 'Phosphorus is plentiful in soil. Extra phosphatic application can be economized.';
    }

    parameters.push({
      key: 'phosphorus',
      name: 'Available Phosphorus',
      nameMr: 'फॉस्फरस (P)',
      value: data.phosphorus,
      unit: 'kg/ha',
      level: pLevel,
      ratingTextMr: pTextMr,
      ratingTextEn: pTextEn,
      explanationMr: pExpMr,
      explanationEn: pExpEn,
    });

    // 6. Potassium (K / पोटॅशियम)
    let kLevel: ParameterLevel = 'optimal';
    let kTextMr = 'योग्य';
    let kTextEn = 'Optimal';
    let kExpMr = 'पोटॅशियमचे प्रमाण उत्तम आहे. यामुळे पिकाची रोगप्रतिकारक शक्ती आणि दाण्यांचे वजन चांगले राहील.';
    let kExpEn = 'Available potassium is optimal, boosting disease resistance and grain filling.';

    if (data.potassium < thresholds.potassium.low) {
      kLevel = 'low';
      kTextMr = 'कमी';
      kTextEn = 'Low';
      kExpMr = 'मातीतील पोटॅशियम कमी आहे. पिकाची रोगप्रतिकारक शक्ती वाढवण्यासाठी पालाशयुक्त खताचा (MOP) वापर करा.';
      kExpEn = 'Potassium is low. Plants may be susceptible to drought stress and lodging. Use potash fertilizer as advised.';
      deficienciesMr.push('पोटॅशियम (K) ची पातळी कमी आहे');
      deficienciesEn.push('Potassium deficiency detected');
      recommendationsMr.push('दाणे भरण्याच्या अवस्थेत पालाशयुक्त खताची योग्य मात्रा द्या.');
      recommendationsEn.push('Supplement with potash fertilizer per laboratory recommendation.');
    } else if (data.potassium > thresholds.potassium.high) {
      kLevel = 'high';
      kTextMr = 'जास्त';
      kTextEn = 'High';
      kExpMr = 'पोटॅशियमचे प्रमाण समाधानकारक आहे.';
      kExpEn = 'Potassium is abundant.';
    }

    parameters.push({
      key: 'potassium',
      name: 'Available Potassium',
      nameMr: 'पोटॅशियम (K)',
      value: data.potassium,
      unit: 'kg/ha',
      level: kLevel,
      ratingTextMr: kTextMr,
      ratingTextEn: kTextEn,
      explanationMr: kExpMr,
      explanationEn: kExpEn,
    });

    // Determine overall health score
    let lowCount = parameters.filter((p) => p.level === 'low').length;
    let highEc = ecLevel === 'high';

    let overallHealth: 'poor' | 'medium' | 'optimal' = 'optimal';
    let overallTextMr = 'उत्तम सुपीकता';
    let overallTextEn = 'Optimal Soil Health';

    if (lowCount >= 3 || highEc) {
      overallHealth = 'poor';
      overallTextMr = 'सुधारणा आवश्यक (कमी सुपीकता)';
      overallTextEn = 'Needs Attention (Deficiencies Found)';
    } else if (lowCount >= 1 || phLevel !== 'optimal') {
      overallHealth = 'medium';
      overallTextMr = 'मध्यम सुपीकता (संतुलन आवश्यक)';
      overallTextEn = 'Moderate Soil Fertility';
    }

    if (recommendationsMr.length === 0) {
      recommendationsMr.push('मातीचे आरोग्य चांगले आहे. सध्याच्या सेंद्रिय खतांचे प्रमाण चालू ठेवा.');
      recommendationsEn.push('Soil nutrients are well balanced. Maintain current organic cultivation practices.');
    }

    return {
      overallHealth,
      overallTextMr,
      overallTextEn,
      parameters,
      deficienciesMr,
      deficienciesEn,
      recommendationsMr,
      recommendationsEn,
    };
  }
}

export const soilRulesEngine = new SoilRulesEngine();
