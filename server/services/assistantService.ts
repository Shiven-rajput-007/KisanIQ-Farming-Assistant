import { db } from '../db/index.js';
import { weatherService } from './weatherService.js';
import { marketService } from './marketService.js';
import { nluEngine, NLUResult } from './nluEngine.js';
import { soilService } from './soilService.js';

export interface AssistantResponse {
  reply: string;
  intent: string;
  entities: Record<string, any>;
  detectedLanguage: string;
  action?: {
    type: string;
    requiresConfirmation: boolean;
    payload?: any;
    summary: string;
  };
}

export class AssistantService {
  async processQuery(
    farmerId?: string,
    userQuery: string = '',
    contextInfo?: {
      activeLocation?: { district?: string; state?: string; latitude?: number; longitude?: number };
      role?: string;
      language?: string;
    }
  ): Promise<AssistantResponse> {
    const sessionId = farmerId || 'guest_user';
    const nluResult: NLUResult = nluEngine.analyze(userQuery, sessionId);
    const { intent, entities, detectedLanguage, followUpQuestion } = nluResult;

    // Language resolution: Context language takes priority, then detected language; Hindi is primary default
    let resolvedLang = 'hi';
    if (contextInfo?.language === 'mr') {
      resolvedLang = 'mr';
    } else if (contextInfo?.language === 'en') {
      resolvedLang = 'en';
    } else if (contextInfo?.language === 'hi') {
      resolvedLang = 'hi';
    } else if (detectedLanguage === 'mr' || detectedLanguage === 'marathi_mixed') {
      resolvedLang = 'mr';
    } else if (detectedLanguage === 'en') {
      resolvedLang = 'en';
    } else {
      resolvedLang = 'hi';
    }

    const isMarathi = resolvedLang === 'mr';
    const isEnglish = resolvedLang === 'en';
    const isHindi = resolvedLang === 'hi';

    // 1. Fetch user/farmer crop & location context from DB if exists
    let farmerCrop: any = null;
    let userLat = contextInfo?.activeLocation?.latitude || null;
    let userLon = contextInfo?.activeLocation?.longitude || null;
    let userDistrict = contextInfo?.activeLocation?.district || (isMarathi ? 'पुणे' : 'इंदौर');
    let userState = contextInfo?.activeLocation?.state || (isMarathi ? 'महाराष्ट्र' : 'मध्य प्रदेश');

    if (farmerId && farmerId !== 'guest_user') {
      try {
        const [cropRes, farmerRes] = await Promise.all([
          db.query('SELECT * FROM crops WHERE farmer_id = $1 ORDER BY created_at DESC LIMIT 1', [farmerId]),
          db.query('SELECT district, state, latitude, longitude FROM farmers WHERE id = $1', [farmerId]),
        ]);
        if (cropRes.rows.length > 0) farmerCrop = cropRes.rows[0];
        if (farmerRes.rows.length > 0) {
          const f = farmerRes.rows[0];
          if (!contextInfo?.activeLocation?.latitude && f.latitude) userLat = Number(f.latitude);
          if (!contextInfo?.activeLocation?.longitude && f.longitude) userLon = Number(f.longitude);
          if (!contextInfo?.activeLocation?.district && f.district) userDistrict = f.district;
          if (!contextInfo?.activeLocation?.state && f.state) userState = f.state;
        }
      } catch (e) {
        console.warn('[AssistantService] Context fetch error:', e);
      }
    }

    // Determine targeted coordinates: if user mentioned a specific city, use that city!
    const targetLat = entities.coordinates?.lat || userLat;
    const targetLon = entities.coordinates?.lon || userLon;
    const targetDistrict = entities.location || userDistrict;
    const targetState = entities.state || userState;
    const selectedCrop = entities.crop || farmerCrop?.name || (isMarathi ? 'गहू' : isHindi ? 'गेहूं' : 'Wheat');

    let reply = '';
    let action: AssistantResponse['action'] = undefined;

    // -------------------------------------------------------------
    // INTENT DISPATCHER
    // -------------------------------------------------------------
    switch (intent) {
      case 'GREETING': {
        if (isMarathi) {
          reply = `नमस्कार! मी किसानIQ कृषी सहाय्यक आहे. मी तुमच्या क्षेत्रातील (${targetDistrict}) हवामान, ${selectedCrop} चे थेट बाजारभाव, माती परीक्षण अहवाल आणि शेती सल्ल्यामध्ये मदत करू शकतो. आज तुम्हाला कोणती माहिती हवी आहे?`;
        } else if (isHindi) {
          reply = `नमस्ते! मैं किसानIQ कृषि सहायक हूँ। मैं आपके क्षेत्र (${targetDistrict}) के मौसम, ${selectedCrop} के मंडी भाव, फसल सलाह और सीधी बिक्री में आपकी सहायता कर सकता हूँ। आज आप क्या जानना चाहते हैं?`;
        } else {
          reply = `Hello! I am KisanIQ Farming Assistant. I can help you with live weather in ${targetDistrict}, ${selectedCrop} mandi rates, soil testing reports, and marketplace orders. How can I assist you today?`;
        }
        break;
      }

      case 'FOLLOW_UP_NEEDED': {
        reply =
          followUpQuestion ||
          (isMarathi
            ? 'तुम्ही कोणते पीक घेतले आहे? गहू, सोयाबीन, कापूस की दुसरे पीक? कृपया पिकाचे नाव सांगा जेणेकरून मी अचूक सल्ला देऊ शकेन.'
            : isHindi
            ? 'आपने कौन सी फसल लगाई है? गेहूं, सोयाबीन, कपास या कोई और फसल? कृपया फसल का नाम बताएं।'
            : 'Which crop are you growing? Wheat, soybean, cotton, or another crop? Please specify so I can assist you precisely.');
        break;
      }

      case 'SOIL_REPORT': {
        const report = await soilService.getLatestReport(farmerId);
        if (!report) {
          if (isMarathi) {
            reply = `तुमच्या खात्यावर सध्या कोणताही सत्यापित माती परीक्षण अहवाल आढळला नाही. अचूक खत व्यवस्थापनासाठी कृपया 'माती परीक्षण' विभागात जाऊन जवळच्या अधिकृत लॅबमध्ये चाचणी बुक करा.`;
          } else if (isHindi) {
            reply = `आपके खाते पर कोई सत्यापित मिट्टी परीक्षण रिपोर्ट नहीं मिली। कृपया 'मिट्टी परीक्षण' अनुभाग में जाकर पास की लैब में टेस्ट बुक करें।`;
          } else {
            reply = `No verified soil test report was found for your account. Please book a soil test in the Soil Testing section to get tailored nutrient advice.`;
          }
          break;
        }

        const param = entities.soilParameter;
        if (param === 'ph') {
          const phRating = report.ph < 6.0 ? (isMarathi ? 'आम्लयुक्त (कमी)' : 'Acidic (Low)') : report.ph > 7.5 ? (isMarathi ? 'अल्कधर्मी (जास्त)' : 'Alkaline (High)') : (isMarathi ? 'उत्तम (सामान्य)' : 'Optimal');
          if (isMarathi) {
            reply = `तुमच्या शेवटच्या अधिकृत माती परीक्षण अहवालानुसार (दिनांक: ${report.testDate}, प्रयोगशाळा: ${report.labName || 'अधिकृत लॅब'}) तुमच्या शेतातील मातीचा **pH ${report.ph}** आहे, जो **${phRating}** पातळीवर आहे. बहुतांश पिकांसाठी 6.5 ते 7.5 हा pH अत्यंत योग्य मानला जातो.`;
          } else if (isHindi) {
            reply = `आपकी नवीनतम मिट्टी परीक्षण रिपोर्ट (${report.testDate}) के अनुसार मिट्टी का **pH मान ${report.ph}** (${phRating}) है।`;
          } else {
            reply = `According to your verified soil test report (${report.testDate}), your soil **pH is ${report.ph}** (${phRating}).`;
          }
        } else if (param === 'nitrogen') {
          const nRating = report.nitrogenKgHa < 280 ? (isMarathi ? 'कमी' : 'Low') : report.nitrogenKgHa > 560 ? (isMarathi ? 'जास्त' : 'High') : (isMarathi ? 'मध्यम' : 'Medium');
          if (isMarathi) {
            reply = `माती परीक्षण अहवालानुसार जमिनीत उपलब्ध **नायट्रोजन (नत्र) चे प्रमाण ${report.nitrogenKgHa} kg/ha** आहे, जे **${nRating}** आहे (इष्टतम: 280-560 kg/ha). ${report.nitrogenKgHa < 280 ? 'नत्राची कमतरता भरून काढण्यासाठी शिफारसीत युरिया किंवा सेंद्रिय खताचा वापर वाढवावा.' : 'नायट्रोजन संतुलित आहे.'}`;
          } else if (isHindi) {
            reply = `मिट्टी रिपोर्ट के अनुसार उपलब्ध **नाइट्रोजन ${report.nitrogenKgHa} kg/ha** (${nRating}) है।`;
          } else {
            reply = `According to your soil report, available **Nitrogen is ${report.nitrogenKgHa} kg/ha** (${nRating}). Optimal range is 280-560 kg/ha.`;
          }
        } else if (param === 'phosphorus') {
          if (isMarathi) {
            reply = `माती परीक्षण अहवालानुसार उपलब्ध **फॉस्फरस (स्फुरद) चे प्रमाण ${report.phosphorusKgHa} kg/ha** आहे (मध्यम पातळी). योग्य मुळांच्या वाढीसाठी सिंगल सुपर फॉस्फेट (SSP) किंवा DAP चा वापर शिफारसीनुसार करावा.`;
          } else if (isHindi) {
            reply = `मिट्टी में **फास्फोरस का स्तर ${report.phosphorusKgHa} kg/ha** है।`;
          } else {
            reply = `Available **Phosphorus is ${report.phosphorusKgHa} kg/ha** according to your latest soil test.`;
          }
        } else if (param === 'potassium') {
          if (isMarathi) {
            reply = `माती परीक्षण अहवालानुसार उपलब्ध **पोटॅशियम (पालाश) चे प्रमाण ${report.potassiumKgHa} kg/ha** आहे (चांगली पातळी). यामुळे पिकाची रोगप्रतिकारक शक्ती आणि दाण्यांची प्रत सुधारते.`;
          } else if (isHindi) {
            reply = `मिट्टी में **पोटाश का स्तर ${report.potassiumKgHa} kg/ha** है।`;
          } else {
            reply = `Available **Potassium is ${report.potassiumKgHa} kg/ha** in your soil.`;
          }
        } else {
          // General full report summary
          const defMr = report.deficiencies && report.deficiencies.length > 0 ? report.deficiencies.join(', ') : 'नाही (संतुलित)';
          if (isMarathi) {
            reply = `तुमचा शेवटचा माती परीक्षण अहवाल (लॅब: ${report.labName || 'अधिकृत प्रयोगशाळा'}, तारीख: ${report.testDate}):\n` +
              `• मातीचा pH (सामू): **${report.ph}** (उत्तम)\n` +
              `• नायट्रोजन (नत्र): **${report.nitrogenKgHa} kg/ha** (कमी)\n` +
              `• फॉस्फरस (स्फुरद): **${report.phosphorusKgHa} kg/ha**\n` +
              `• पोटॅश (पालाश): **${report.potassiumKgHa} kg/ha**\n` +
              `• सेंद्रिय कर्ब: **${report.organicCarbon}%**\n` +
              `• मुख्य कमतरता: **${defMr}**\n` +
              `• **सल्ला:** ${report.recommendations || 'पिकाला युरिया दोन हप्त्यात विभागून द्या आणि शेणखताचा वापर करा.'}`;
          } else if (isHindi) {
            reply = `आपकी नवीनतम मिट्टी रिपोर्ट (${report.testDate}): pH: ${report.ph}, नाइट्रोजन: ${report.nitrogenKgHa} kg/ha, फास्फोरस: ${report.phosphorusKgHa} kg/ha, पोटाश: ${report.potassiumKgHa} kg/ha, जैविक कार्बन: ${report.organicCarbon}%। सलाह: ${report.recommendations || 'संतुलित खाद का उपयोग करें।'}`;
          } else {
            reply = `Latest Soil Report (${report.testDate}): pH: ${report.ph}, Nitrogen: ${report.nitrogenKgHa} kg/ha, Phosphorus: ${report.phosphorusKgHa} kg/ha, Potassium: ${report.potassiumKgHa} kg/ha, Organic Carbon: ${report.organicCarbon}%. Advisory: ${report.recommendations || 'Apply balanced fertilizers as recommended.'}`;
          }
        }
        break;
      }

      case 'SOIL_TEST': {
        if (isMarathi) {
          reply = `माती परीक्षण करण्याची अधिकृत पद्धत:\n` +
            `1. **नमुना गोळा करणे:** शेतातील वेगवेगळ्या 8 ते 10 ठिकाणांहून 'V' आकाराचे 15-20 सेमी खोल खड्डे करून माती गोळा करा.\n` +
            `2. **मिश्रण व कोरडे करणे:** सर्व माती एकत्र करून सावलीत वाळवा आणि 500 ग्रॅम स्वच्छ नमुना पिशवीत भरा.\n` +
            `3. **लॅब नोंदणी:** आपल्या KisanIQ अॅपमधील **'माती परीक्षण'** विभागात जाऊन मान्यताप्राप्त प्रयोगशाळा निवडा आणि ऑनलाइन विनंती पाठवा.\n` +
            `तुम्हाला जवळची प्रयोगशाळा पाहायची आहे का?`;
        } else if (isHindi) {
          reply = `मिट्टी परीक्षण कैसे करें:\n1. खेत से 8-10 स्थानों पर 15 सेमी गहरा 'V' आकार का गड्ढा कर 500 ग्राम मिट्टी का नमूना लें।\n2. KisanIQ ऐप के 'मिट्टी परीक्षण' अनुभाग में जाकर अपनी निकटतम मान्यता प्राप्त लैब में टेस्ट बुक करें।`;
        } else {
          reply = `Soil testing procedure:\n1. Collect 500g composite soil sample across 8-10 'V' shaped spots (15cm depth).\n2. Navigate to the 'Soil Testing' section to book an accredited lab test and track progress.`;
        }
        break;
      }

      case 'FERTILIZER_ADVICE': {
        const report = await soilService.getLatestReport(farmerId);
        const hasLowNitrogen = report ? report.nitrogenKgHa < 280 : true;

        if (isMarathi) {
          if (hasLowNitrogen) {
            reply = `तुमच्या माती परीक्षण अहवालानुसार जमिनीत **नायट्रोजन (नत्र) ची कमतरता** (${report?.nitrogenKgHa || 260} kg/ha) आहे. ${selectedCrop} पिकासाठी सल्ला:\n` +
              `• **युरिया:** पेरणीच्या वेळी 30% आणि पेरणीनंतर 25-30 दिवसांनी उर्वरित युरिया सिंचनासोबत द्या.\n` +
              `• **सेंद्रिय खत:** प्रति एकरी 2-3 ट्रॉली चांगले कुजलेले शेणखत किंवा गांडूळ खत जमिनीत मिसळा.\n` +
              `• सूक्ष्म अन्नद्रव्यांसाठी झिंक सल्फेटची शिफारस केली जाते.`;
          } else {
            reply = `${selectedCrop} पिकासाठी संतुलित खत व्यवस्थापन करा. पेरणीच्या वेळी NPK 10:26:26 किंवा 12:32:16 चा बेसल डोस द्या आणि 30 दिवसांनी युरियाची दुसरी मात्रा द्या.`;
          }
        } else if (isHindi) {
          reply = `मिट्टी रिपोर्ट के अनुसार नाइट्रोजन की मात्रा कम है। ${selectedCrop} के लिए यूरिया को दो भागों में विभाजित करके दें। साथ में गोबर खाद का प्रयोग करें।`;
        } else {
          reply = `Based on your soil report showing low nitrogen (${report?.nitrogenKgHa || 260} kg/ha), apply split doses of Urea (basal + 30 days) along with well-decomposed organic farmyard manure for ${selectedCrop}.`;
        }
        break;
      }

      case 'WEATHER': {
        if (!targetLat || !targetLon) {
          reply = isMarathi
            ? `कृपया अचूक हवामान पाहण्यासाठी तुमचे सक्रिय स्थान किंवा जिल्हा निवडा.`
            : isHindi
            ? `कृपया सटीक मौसम देखने के लिए अपना सक्रिय स्थान या जिला चुनें।`
            : `Please set your active location or district to view verified local weather.`;
          break;
        }

        try {
          const weather = await weatherService.getWeather(targetLat, targetLon);
          const { current, forecast } = weather;
          const tomorrow = forecast && forecast.length > 1 ? forecast[1] : (forecast && forecast.length > 0 ? forecast[0] : null);

          if (entities.timeframe === 'tomorrow') {
            if (tomorrow) {
              if ((tomorrow.rainProbability ?? 0) >= 40) {
                if (isMarathi) {
                  reply = `उद्या ${targetDistrict} मध्ये पावसाची **${tomorrow.rainProbability ?? 0}% शक्यता** आहे (कमाल: ${tomorrow.high ?? '--'}°C, किमान: ${tomorrow.low ?? '--'}°C). हवामान पाहता उद्या पिकाला पाणी देणे टाळा आणि शेतातून पाण्याचा योग्य निचरा ठेवा.`;
                } else if (isHindi) {
                  reply = `कल ${targetDistrict} में बारिश की **${tomorrow.rainProbability ?? 0}% संभावना** है (तापमान ${tomorrow.high ?? '--'}°C / ${tomorrow.low ?? '--'}°C)। मौसम को देखते हुए कल तक सिंचाई टालें और जल निकासी दुरुस्त रखें।`;
                } else {
                  reply = `Tomorrow in ${targetDistrict}, there is a **${tomorrow.rainProbability ?? 0}% chance of rain** (High: ${tomorrow.high ?? '--'}°C, Low: ${tomorrow.low ?? '--'}°C). We recommend postponing irrigation and ensuring field drainage.`;
                }
              } else {
                if (isMarathi) {
                  reply = `उद्या ${targetDistrict} मध्ये हवामान प्रामुख्याने स्वच्छ राहील. पावसाची शक्यता केवळ **${tomorrow.rainProbability ?? 0}%** आहे. कमाल तापमान ${tomorrow.high ?? '--'}°C आणि किमान ${tomorrow.low ?? '--'}°C राहण्याचा अंदाज आहे.`;
                } else if (isHindi) {
                  reply = `कल ${targetDistrict} में मौसम मुख्य रूप से साफ रहेगा। बारिश की संभावना केवल **${tomorrow.rainProbability ?? 0}%** है। अधिकतम तापमान ${tomorrow.high ?? '--'}°C और न्यूनतम ${tomorrow.low ?? '--'}°C रहेगा।`;
                } else {
                  reply = `Tomorrow in ${targetDistrict}, the weather will be mostly clear with only **${tomorrow.rainProbability ?? 0}% chance of rain**. High will be around ${tomorrow.high ?? '--'}°C and low around ${tomorrow.low ?? '--'}°C.`;
                }
              }
            } else {
              reply = isMarathi
                ? `उद्याचा हवामान अंदाज सध्या उपलब्ध नाही.`
                : isHindi
                ? `कल का मौसम पूर्वानुमान अभी उपलब्ध नहीं है।`
                : `Tomorrow's forecast is currently unavailable.`;
            }
          } else if (entities.timeframe === 'forecast') {
            const daysText = forecast && forecast.length > 0
              ? forecast
                  .slice(0, 3)
                  .map((f: any) => `${f.dayName || f.date}: ${f.high ?? '--'}°C / ${f.low ?? '--'}°C (${f.rainProbability ?? 0}% बारिश/rain)`)
                  .join(' | ')
              : '';
            if (isMarathi) {
              reply = `${targetDistrict} साठी पुढील 3 दिवसांचा अंदाज: ${daysText}। सध्याचे तापमान **${current.temperature ?? '--'}°C** असून आर्द्रता **${current.humidity ?? '--'}%** आहे.`;
            } else if (isHindi) {
              reply = `${targetDistrict} के लिए अगले 3 दिनों का पूर्वानुमान: ${daysText}। वर्तमान तापमान ${current.temperature ?? '--'}°C और नमी ${current.humidity ?? '--'}% है।`;
            } else {
              reply = `Next 3-day forecast for ${targetDistrict}: ${daysText}. Current temperature is ${current.temperature ?? '--'}°C with ${current.humidity ?? '--'}% humidity.`;
            }
          } else {
            const tomProb = tomorrow ? `${tomorrow.rainProbability ?? 0}%` : 'उपलब्ध नाही';
            if (isMarathi) {
              reply = `${targetDistrict} मध्ये आजचे तापमान **${current.temperature ?? '--'}°C** आहे (हवेतील आर्द्रता: ${current.humidity ?? '--'}%, वाऱ्याचा वेग: ${current.windSpeed ?? '--'} km/h). स्थिती: ${current.condition}। उद्या पावसाची शक्यता **${tomProb}** आहे.`;
            } else if (isHindi) {
              reply = `${targetDistrict} में आज का तापमान **${current.temperature ?? '--'}°C** है (नमी: ${current.humidity ?? '--'}%, हवा: ${current.windSpeed ?? '--'} km/h)। स्थिति: ${current.condition}। कल बारिश की संभावना ${tomProb} है।`;
            } else {
              reply = `Today in ${targetDistrict}, the temperature is **${current.temperature ?? '--'}°C** with **${current.humidity ?? '--'}% humidity** and wind speed of ${current.windSpeed ?? '--'} km/h. Conditions: ${current.condition}. Tomorrow's rain probability is ${tomProb}.`;
            }
          }
        } catch (weatherErr) {
          reply = isMarathi
            ? `${targetDistrict} परिसरासाठी थेट हवामान माहिती सध्या उपलब्ध नाही. कृपया थोड्या वेळाने प्रयत्न करा.`
            : isHindi
            ? `${targetDistrict} क्षेत्र के लिए लाइव मौसम डेटा वर्तमान में अनुपलब्ध है। कृपया थोड़ी देर बाद पुनः प्रयास करें।`
            : `Live weather data for ${targetDistrict} is currently unavailable. Please try again shortly.`;
        }
        break;
      }

      case 'LOCATION_CHANGE': {
        if (entities.location && entities.coordinates) {
          action = {
            type: 'CHANGE_LOCATION',
            requiresConfirmation: true,
            payload: {
              district: entities.location,
              state: entities.state || 'Maharashtra',
              latitude: entities.coordinates.lat,
              longitude: entities.coordinates.lon,
            },
            summary: isMarathi
              ? `सक्रिय स्थान बदलून ${entities.location}, ${entities.state} करा`
              : isHindi
              ? `सक्रिय स्थान बदलकर ${entities.location}, ${entities.state} करें`
              : `Change active location to ${entities.location}, ${entities.state}`,
          };
          reply = isMarathi
            ? `मी तुमचे निवडलेले स्थान **${entities.location}, ${entities.state}** ओळखले आहे. तुम्ही तुमचे सक्रिय स्थान अपडेट करू इच्छिता का?`
            : isHindi
            ? `मैंने आपके द्वारा चुना गया स्थान **${entities.location}, ${entities.state}** पहचाना है। क्या आप अपना सक्रिय स्थान अपडेट करना चाहते हैं?`
            : `I identified your request to set location to **${entities.location}, ${entities.state}**. Would you like me to update your active location?`;
        } else {
          reply = isMarathi
            ? `तुम्हाला कोणता जिल्हा किंवा शहर निवडायचे आहे? (उदा. पुणे, नाशिक, नागपूर, सोलापूर, कोल्हापूर, सातारा)`
            : isHindi
            ? `आप कौन सा जिला या शहर सेट करना चाहते हैं? (उदा. इंदौर, कानपुर, लखनऊ, भोपाल, ग्वालियर)`
            : `Which district or city would you like to set? (e.g. Pune, Nashik, Nagpur, Solapur, Indore)`;
        }
        break;
      }

      case 'USE_GPS_LOCATION': {
        action = {
          type: 'TRIGGER_GPS',
          requiresConfirmation: false,
          summary: isMarathi
            ? 'ब्राउझर GPS द्वारे स्थान शोधा'
            : isHindi
            ? 'ब्राउज़र GPS से स्थान पहचानें'
            : 'Detect location via browser GPS',
        };
        reply = isMarathi
          ? `तुमचे चालू GPS स्थान शोधले जात आहे. कृपया स्क्रीनवरील लोकेशन परमिशनला मंजुरी द्या.`
          : isHindi
          ? `आपके वर्तमान GPS निर्देशांक पहचाने जा रहे हैं। कृपया स्क्रीन पर लोकेशन अनुमति दें।`
          : `Detecting your precise GPS location now. Please grant browser location permission if prompted.`;
        break;
      }

      case 'MANDI_PRICE': {
        const comp = await marketService.getMarketComparison(
          farmerId,
          selectedCrop,
          100,
          targetLat || undefined,
          targetLon || undefined,
          targetDistrict,
          targetState
        );
        const top = comp.markets && comp.markets.length > 0 ? comp.markets[0] : null;
        if (top) {
          if (isMarathi) {
            reply = `${top.name} (${top.district || targetDistrict}) येथे **${selectedCrop}** चा सध्याचा बाजारभाव **₹${top.price.toLocaleString('en-IN')}/क्विंटल** आहे (अंतर: ${top.distance} किमी, वाहतूक खर्च: ₹${top.transportCost}). अंदाजे निव्वळ परतावा ₹${top.netReturn.toLocaleString('en-IN')} आहे. (स्रोत: ${top.source})`;
          } else if (isHindi) {
            reply = `${top.name} (${top.district || targetDistrict}) में **${selectedCrop}** का मॉडल भाव **₹${top.price.toLocaleString('en-IN')}/क्विंटल** है (दूरी: ${top.distance} किमी, परिवहन: ₹${top.transportCost})। शुद्ध अनुमानित रिटर्न ₹${top.netReturn.toLocaleString('en-IN')} है। स्रोत: ${top.source}।`;
          } else {
            reply = `At ${top.name} (${top.district || targetDistrict}), current benchmark price for **${selectedCrop}** is **₹${top.price.toLocaleString('en-IN')}/quintal** (Distance: ${top.distance} km, Freight: ₹${top.transportCost}). Estimated net return: ₹${top.netReturn.toLocaleString('en-IN')}. Source: ${top.source}.`;
          }
        } else {
          reply = isMarathi
            ? `माफ करा, ${targetDistrict} परिसरासाठी ${selectedCrop} चे थेट बाजारभाव सध्या उपलब्ध नाहीत.`
            : isHindi
            ? `क्षमा करें, ${targetDistrict} क्षेत्र के लिए ${selectedCrop} के लाइव मंडी भाव अभी उपलब्ध नहीं हैं।`
            : `Currently, live mandi rates for ${selectedCrop} around ${targetDistrict} are unavailable.`;
        }
        break;
      }

      case 'MARKET_RECOMMENDATION': {
        const comp = await marketService.getMarketComparison(
          farmerId,
          selectedCrop,
          100,
          targetLat || undefined,
          targetLon || undefined,
          targetDistrict,
          targetState
        );
        const top = comp.markets && comp.markets.length > 0 ? comp.markets[0] : null;
        if (top) {
          if (isMarathi) {
            reply = `किसानIQ विश्लेषण: आज तुमच्यासाठी सर्वात योग्य पर्याय **${top.name}** आहे (दर: ₹${top.price}/क्विंटल, निव्वळ नफा: ₹${top.netReturn.toLocaleString('en-IN')}). निर्णय इंजिनचा सल्ला: 60% माल आता विकावा आणि 40% पुढील दरवाढीच्या प्रतीक्षेत ठेवावा.`;
          } else if (isHindi) {
            reply = `किसानIQ विश्लेषण: आज सबसे बेहतर व्यावहारिक विकल्प **${top.name}** है (भाव: ₹${top.price}/q, शुद्ध लाभ: ₹${top.netReturn.toLocaleString('en-IN')})। किसानIQ सुझाव देता है कि 60% मात्रा अभी बेचें और 40% भाव उछाल की प्रतीक्षा में रोकें।`;
          } else {
            reply = `KisanIQ Recommendation: The best practical option today is **${top.name}** (Price: ₹${top.price}/q, Net Realization: ₹${top.netReturn.toLocaleString('en-IN')}). Our decision engine advises selling 60% now and holding 40% to balance market risk.`;
          }
        } else {
          reply = isMarathi
            ? `माफ करा, ${targetDistrict} परिसरासाठी ${selectedCrop} चे थेट बाजारभाव सध्या उपलब्ध नाहीत.`
            : isHindi
            ? `क्षमा करें, ${targetDistrict} क्षेत्र के लिए ${selectedCrop} के सत्यापित मंडी भाव अभी उपलब्ध नहीं हैं।`
            : `Currently, verified mandi rates for ${selectedCrop} around ${targetDistrict} are unavailable.`;
        }
        break;
      }

      case 'IRRIGATION_ADVICE': {
        const cropDisplay = farmerCrop?.name || selectedCrop;
        const stageDisplay = farmerCrop?.current_stage || (isMarathi ? 'सध्याच्या' : isHindi ? 'वर्तमान' : 'growing');

        if (!targetLat || !targetLon) {
          reply = isMarathi
            ? `सिंचन सल्ला मिळवण्यासाठी कृपया आपले स्थान किंवा जिल्हा निश्चित करा.`
            : isHindi
            ? `सिंचाई सलाह के लिए कृपया अपना सक्रिय स्थान या जिला सेट करें।`
            : `Please set your active location to receive irrigation advice.`;
          break;
        }

        try {
          const weather = await weatherService.getWeather(targetLat, targetLon);
          const tomorrow = weather.forecast && weather.forecast.length > 1 ? weather.forecast[1] : (weather.forecast && weather.forecast.length > 0 ? weather.forecast[0] : null);
          if (tomorrow && (tomorrow.rainProbability ?? 0) >= 40) {
            if (isMarathi) {
              reply = `आज शेतात पाणी देऊ नका. उद्या ${targetDistrict} मध्ये **${tomorrow.rainProbability ?? 0}% पावसाची शक्यता** आहे. ${cropDisplay} पिकाच्या ${stageDisplay} अवस्थेत अतिरिक्त पाण्याने मुळे कुजण्याचा धोका संभवतो.`;
            } else if (isHindi) {
              reply = `आज फसल में पानी न दें। कल ${targetDistrict} में **${tomorrow.rainProbability ?? 0}% बारिश** की संभावना है। ${cropDisplay} की ${stageDisplay} अवस्था में अतिरिक्त पानी से जड़ सड़न का खतरा हो सकता है।`;
            } else {
              reply = `Do not irrigate today. Rain probability tomorrow in ${targetDistrict} is **${tomorrow.rainProbability ?? 0}%**. Over-watering during the ${stageDisplay} stage of ${cropDisplay} can risk root disease.`;
            }
          } else {
            if (isMarathi) {
              reply = `पुढील २ दिवसांत पावसाची शक्यता कमी आहे. जर जमिनीचा वरचा २ इंचाचा थर कोरडा असेल, तर सकाळच्या किंवा संध्याकाळच्या वेळी हलके सिंचन करावे.`;
            } else if (isHindi) {
              reply = `अगले 2 दिनों में बारिश की संभावना कम है। यदि मिट्टी की ऊपरी सतह 2 इंच तक सूखी है, तो शाम के समय हल्की सिंचाई करें।`;
            } else {
              reply = `Rain probability is low for the next 2 days. If topsoil moisture is below 2 inches, proceed with light irrigation during morning or evening hours.`;
            }
          }
        } catch (irrErr) {
          reply = isMarathi
            ? `हवामान डेटा उपलब्ध नसल्याने सिंचन सल्ला तयार करता आला नाही. जमिनीचा ओलावा तपासून निर्णय घ्या.`
            : isHindi
            ? `मौसम डेटा अनुपलब्ध होने के कारण सिंचाई परामर्श तैयार नहीं हो सका। कृपया खेत की नमी देखकर निर्णय लें।`
            : `Unable to retrieve weather forecast for irrigation advisory. Please check soil moisture directly before watering.`;
        }
        break;
      }

      case 'DISEASE_PEST': {
        let humidityText = '';
        if (targetLat && targetLon) {
          try {
            const weather = await weatherService.getWeather(targetLat, targetLon);
            if (weather.current.humidity !== null && weather.current.humidity !== undefined) {
              humidityText = ` (${weather.current.humidity}%)`;
            }
          } catch {
            // Weather service error, proceed with general agronomic advice
          }
        }

        if (isMarathi) {
          reply = `सध्याच्या हवेतील आर्द्रतेमुळे${humidityText} **${selectedCrop}** पिकावर बुरशी किंवा कीड (उदा. मावा, तांबेरा) येण्याचा धोका वाढू शकतो. पानांवर पिवळे डाग दिसल्यास त्वरित शिफारशीत बुरशीनाशकाची (Propiconazole 25% EC - 1 मिली/लीटर पाणी) फवारणी करा.`;
        } else if (isHindi) {
          reply = `वर्तमान नमी स्तर${humidityText} में **${selectedCrop}** में फफूंद या कीट (जैसे पीला रतुआ या माहू) का खतरा बढ़ सकता है। पत्तों के नीचे पीले पाउडर या धब्बे दिखें तो प्रोपिकोनाजोल (Propiconazole 25% EC) 1ml/लीटर पानी की दर से छिड़काव करें।`;
        } else {
          reply = `At current humidity levels${humidityText}, **${selectedCrop}** may be susceptible to fungal or rust symptoms (e.g. Yellow Rust / Aphids). Inspect leaf undersides; if spotted, spray Propiconazole 25% EC at 1 ml per liter of water.`;
        }
        break;
      }

      case 'CROP_RECOMMENDATION': {
        if (!farmerCrop) {
          if (isMarathi) {
            reply = `तुमच्या खात्यावर अद्याप कोणतेही पीक नोंदवलेले नाही. कृपया 'माझे पीक' विभागात जाऊन चालू पीक जोडा, जेणेकरून अचूक पीक सल्ला देता येईल.`;
          } else if (isHindi) {
            reply = `आपके खाते पर अभी कोई फसल पंजीकृत नहीं है। कृपया 'मेरी फसल' अनुभाग में जाकर अपनी सक्रिय फसल जोड़ें ताकि व्यक्तिगत कृषि सलाह मिल सके।`;
          } else {
            reply = `You have not registered any crop yet. Please register your active crop in the 'My Crop' section to receive personalized agronomic guidance.`;
          }
        } else {
          const vName = farmerCrop.variety || (isMarathi ? 'प्रमाणित वाण' : isHindi ? 'प्रमाणित किस्म' : 'Certified');
          const dOld = farmerCrop.days_old || 60;
          const cStage = farmerCrop.current_stage || (isMarathi ? 'वाढीची अवस्था' : isHindi ? 'वानस्पतिक वृद्धि' : 'vegetative');

          if (isMarathi) {
            reply = `तुमचे ${farmerCrop.name} पीक (${vName}) सध्या ${dOld} दिवसांचे असून ${cStage} अवस्थेत आहे. हवामान अनुकूल आहे. वेळेवर तण काढणी आणि नत्र खताचा संतुलित वापर ठेवा.`;
          } else if (isHindi) {
            reply = `आपकी ${farmerCrop.name} फसल (${vName}) ${dOld} दिन पुरानी है और ${cStage} चरण में है। मौसम अनुकूल है। समय पर निराई-गुड़ाई करें और यूरिया की दूसरी खुराक सिंचाई के साथ दें।`;
          } else {
            reply = `Your ${farmerCrop.name} crop (${vName}) is currently ${dOld} days old in ${cStage} stage. Weather conditions are supportive. Ensure balanced nitrogen application and timely weed management.`;
          }
        }
        break;
      }

      case 'SELLER_SEARCH': {
        const targetLoc = entities.location;
        let listingsRes;
        let isLocationFiltered = false;

        if (targetLoc) {
          listingsRes = await db.query(
            `SELECT l.*, f.name as farmer_name, f.district as farmer_district, f.phone as farmer_phone
             FROM crop_listings l
             JOIN farmers f ON l.farmer_id = f.id
             WHERE l.status = 'active' AND l.crop_name ILIKE $1 AND (l.location ILIKE $2 OR f.district ILIKE $2)
             ORDER BY l.created_at DESC LIMIT 4`,
            [`%${selectedCrop}%`, `%${targetLoc}%`]
          );
          if (listingsRes.rows.length > 0) {
            isLocationFiltered = true;
          }
        }

        if (!listingsRes || listingsRes.rows.length === 0) {
          listingsRes = await db.query(
            `SELECT l.*, f.name as farmer_name, f.district as farmer_district, f.phone as farmer_phone
             FROM crop_listings l
             JOIN farmers f ON l.farmer_id = f.id
             WHERE l.status = 'active' AND l.crop_name ILIKE $1
             ORDER BY l.created_at DESC LIMIT 4`,
            [`%${selectedCrop}%`]
          );
        }

        if (listingsRes.rows.length > 0) {
          const listText = listingsRes.rows
            .map(
              (r: any) =>
                `• ${r.farmer_name} (${r.location || r.farmer_district}): ${r.quantity_quintals}q @ ₹${r.price_per_quintal}/q`
            )
            .join('\n');

          if (isMarathi) {
            reply = `${targetLoc ? `${targetLoc} जवळ ` : ''}सत्यापित शेतकरी जे ${selectedCrop} विकत आहेत:\n${listText}\nतुम्ही थेट मार्केटप्लेसद्वारे यांच्याकडून खरेदी करू शकता.`;
          } else if (isHindi) {
            reply = `${targetLoc ? `${targetLoc} के आसपास एवं ` : ''}सत्यापित किसान जो ${selectedCrop} बेच रहे हैं:\n${listText}\nआप मार्केटप्लेस में सीधे इनसे खरीद सकते हैं।`;
          } else {
            reply = `Verified farmers selling ${selectedCrop}${targetLoc ? ` in/around ${targetLoc}` : ''}:\n${listText}\nYou can purchase directly via the Marketplace.`;
          }
        } else {
          reply = isMarathi
            ? `सध्या ${selectedCrop} पिकासाठी कोणतीही सक्रिय नोंदणी उपलब्ध नाही. खरेदीदार इतर पिकांसाठी थेट मार्केटप्लेस पाहू शकतात.`
            : isHindi
            ? `वर्तमान में ${selectedCrop} के लिए कोई सक्रिय लिस्टिंग नहीं मिली। खरीदार मार्केटप्लेस में अन्य फसलें देख सकते हैं।`
            : `Currently, no direct farmer listings were found for ${selectedCrop}. You can browse all available crops in the Marketplace.`;
        }
        break;
      }

      case 'MY_LISTINGS': {
        const res = await db.query(
          `SELECT * FROM crop_listings WHERE farmer_id = $1 ORDER BY created_at DESC LIMIT 5`,
          [farmerId]
        );
        if (res.rows.length > 0) {
          const items = res.rows
            .map((r: any) => `• ${r.crop_name} (${r.variety}): ${r.quantity_quintals}q @ ₹${r.price_per_quintal}/q [${r.status}]`)
            .join('\n');
          reply = isMarathi
            ? `तुमच्या सक्रिय पीक विक्री नोंदी:\n${items}`
            : isHindi
            ? `आपकी सक्रिय फसल लिस्टिंग:\n${items}`
            : `Your published crop listings:\n${items}`;
        } else {
          reply = isMarathi
            ? `तुमची कोणतीही सक्रिय विक्री नोंदणी नाही. तुम्ही बोलून किंवा मार्केट विभागातून नवीन नोंदणी करू शकता.`
            : isHindi
            ? `आपकी अभी कोई फसल लिस्टिंग नहीं है। आप बोलकर या मार्केट सेक्शन से नई फसल लिस्ट कर सकते हैं।`
            : `You do not have any published crop listings yet. You can create one by speaking or visiting the Sell section.`;
        }
        break;
      }

      case 'CREATE_LISTING': {
        const qty = entities.quantity || 10;
        const price = entities.price || 2500;
        const crop = selectedCrop;
        const grade = entities.grade || 'Grade A';
        const variety = entities.variety || (isMarathi ? 'प्रमाणित वाण' : 'Certified Sharbati');

        action = {
          type: 'CREATE_LISTING',
          requiresConfirmation: true,
          payload: {
            cropName: crop,
            variety,
            quantityQuintals: qty,
            pricePerQuintal: price,
            qualityGrade: grade,
            location: `${userDistrict}, ${userState}`,
            description: `Naturally harvested ${crop} from ${userDistrict}`,
          },
          summary: isMarathi
            ? `${qty} क्विंटल ${crop} (दर: ₹${price}/q) ची विक्री नोंदणी प्रसिद्ध करा`
            : isHindi
            ? `${qty} क्विंटल ${crop} (दर: ₹${price}/q) की लिस्टिंग प्रकाशित करें`
            : `Publish listing: ${qty}q of ${crop} at ₹${price}/quintal`,
        };

        reply = isMarathi
          ? `मी तुमची विक्री नोंदणी तयार केली आहे: **${crop} — ${qty} क्विंटल — ₹${price.toLocaleString('en-IN')}/क्विंटल**। मी ही मार्केटप्लेसमध्ये प्रसिद्ध करू का?`
          : isHindi
          ? `मैंने आपकी लिस्टिंग तैयार कर ली है: **${crop} — ${qty} क्विंटल — ₹${price.toLocaleString('en-IN')}/क्विंटल**। क्या मैं इसे मार्केटप्लेस में प्रकाशित कर दूँ?`
          : `I have prepared your listing: **${crop} — ${qty} quintals — ₹${price.toLocaleString('en-IN')}/quintal**. Should I publish this to the marketplace?`;
        break;
      }

      case 'MY_ORDERS': {
        const ordersRes = await db.query(
          `SELECT * FROM marketplace_orders WHERE buyer_id = $1 OR farmer_id = $1 ORDER BY created_at DESC LIMIT 3`,
          [farmerId]
        );
        if (ordersRes.rows.length > 0) {
          const ordText = ordersRes.rows
            .map((o: any) => `• Order #${o.id.slice(-6)}: ${o.quantity_quintals}q ${o.crop_name} (Status: ${o.status.toUpperCase()}, Tracking: ${o.tracking_code})`)
            .join('\n');
          reply = isMarathi
            ? `तुमच्या अलीकडील ऑर्डर्स:\n${ordText}`
            : isHindi
            ? `आपके हाल के ऑर्डर:\n${ordText}`
            : `Your recent orders:\n${ordText}`;
        } else {
          reply = isMarathi
            ? `सध्या तुमची कोणतीही सक्रिय ऑर्डर नाही.`
            : isHindi
            ? `वर्तमान में आपका कोई सक्रिय ऑर्डर नहीं है।`
            : `You currently have no active marketplace orders.`;
        }
        break;
      }

      case 'LOGISTICS_TRACKING': {
        const trackRes = await db.query(
          `SELECT * FROM marketplace_orders WHERE (buyer_id = $1 OR farmer_id = $1) AND status != 'delivered' ORDER BY created_at DESC LIMIT 1`,
          [farmerId]
        );
        if (trackRes.rows.length > 0) {
          const ord = trackRes.rows[0];
          reply = isMarathi
            ? `ऑर्डर #${ord.id.slice(-6)} ची स्थिती: **${ord.status.toUpperCase()}**। ट्रॅकिंग क्रमांक: **${ord.tracking_code}**। डिलिव्हरी पत्ता: ${ord.delivery_address}।`
            : isHindi
            ? `ऑर्डर #${ord.id.slice(-6)} का स्टेटस: **${ord.status.toUpperCase()}**। ट्रैकिंग कोड: **${ord.tracking_code}**। डिलीवरी पता: ${ord.delivery_address}।`
            : `Order #${ord.id.slice(-6)} status: **${ord.status.toUpperCase()}**. Tracking code: **${ord.tracking_code}**. Delivery address: ${ord.delivery_address}.`;
        } else {
          reply = isMarathi
            ? `तुमची कोणतीही गाडी किंवा माल वाहतुकीत नाही. मागील सर्व ऑर्डर्स पूर्ण झाल्या आहेत.`
            : isHindi
            ? `आपका कोई शिपमेंट रास्ते में नहीं है। सभी पूर्व ऑर्डर डिलीवर हो चुके हैं।`
            : `You have no active shipments in transit. All previous orders have been completed.`;
        }
        break;
      }

      case 'CROP_ROTATION': {
        reply = isMarathi
          ? `गहू किंवा इतर पिकांच्या काढणीनंतर तुम्ही **सोयाबीन**, **मूग** किंवा **उडीद** घेऊ शकता. कडधान्य पिके जमिनीत हवेतील नत्र स्थिर करतात, ज्यामुळे जमिनीचा कस सुधारतो आणि पुढील पिकाचे उत्पादन १५-२०% वाढते.`
          : isHindi
          ? `गेहूं या सरसों की कटाई के बाद आप **सोयाबीन (JS-2034)** या **मूंग / उड़द** लगा सकते हैं। दलहनी फसलें मिट्टी में प्राकृतिक नाइट्रोजन जोड़ती हैं और अगली रबी फसल की उत्पादकता 15-20% बढ़ाती हैं।`
          : `Following wheat or mustard harvest, planting **Soybean (JS-2034)** or **Moong/Pulses** is ideal. Legumes fix biological nitrogen, boosting subsequent rabi crop yield by 15-20%.`;
        break;
      }

      default: {
        reply = isMarathi
          ? `नमस्कार! मी हवामान अंदाज, सिंचन सल्ला, खतांची मात्रा, ${selectedCrop} चे बाजारभाव आणि माती परीक्षण अहवालाबाबत आपली मदत करू शकतो. आपण मराठीत विचारू शकता.`
          : isHindi
          ? `नमस्ते! मैं मौसम, सिंचाई सलाह, ${selectedCrop} के मंडी भाव, और फसल लिस्टिंग में आपकी सहायता कर सकता हूँ। आप जैसे चाहें हिंदी, अंग्रेज़ी या हिंग्लिश में पूछ सकते हैं।`
          : `Hello! I can help you with weather, irrigation advisory, mandi rates for ${selectedCrop}, and marketplace trade. Feel free to speak or type in Marathi, Hindi, or English.`;
        break;
      }
    }

    // Save chat interaction to database
    try {
      const userMsgId = `msg_${Date.now()}_u`;
      const asstMsgId = `msg_${Date.now()}_a`;
      await db.query(
        `INSERT INTO chat_messages (id, farmer_id, role, content) VALUES ($1, $2, $3, $4)`,
        [userMsgId, farmerId === 'guest_user' ? null : farmerId, 'user', userQuery]
      );
      await db.query(
        `INSERT INTO chat_messages (id, farmer_id, role, content) VALUES ($1, $2, $3, $4)`,
        [asstMsgId, farmerId === 'guest_user' ? null : farmerId, 'assistant', reply]
      );
    } catch (dbErr) {
      console.warn('[AssistantService] Failed to persist chat messages:', dbErr);
    }

    return {
      reply,
      intent,
      entities,
      detectedLanguage,
      action,
    };
  }

  async executeAction(
    farmerId: string,
    actionType: string,
    payload: any
  ): Promise<{ success: boolean; message: string; result?: any }> {
    switch (actionType) {
      case 'CHANGE_LOCATION': {
        const { district, state, latitude, longitude } = payload;
        if (farmerId && farmerId !== 'guest_user') {
          await db.query(
            `UPDATE farmers SET district = $1, state = $2, latitude = $3, longitude = $4, updated_at = NOW() WHERE id = $5`,
            [district, state, latitude, longitude, farmerId]
          );
        }
        return {
          success: true,
          message: `Location successfully updated to ${district}, ${state}.`,
          result: { district, state, latitude, longitude },
        };
      }

      case 'CREATE_LISTING': {
        if (!farmerId || farmerId === 'guest_user') {
          throw new Error('Authentication required to create a crop listing.');
        }
        const id = `lst_${Date.now()}`;
        const { cropName, variety, quantityQuintals, pricePerQuintal, qualityGrade, location, description } = payload;
        await db.query(
          `INSERT INTO crop_listings (id, farmer_id, crop_name, variety, quantity_quintals, price_per_quintal, quality_grade, location, description, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active')`,
          [
            id,
            farmerId,
            cropName,
            variety || 'Certified',
            Number(quantityQuintals),
            Number(pricePerQuintal),
            qualityGrade || 'Grade A',
            location || 'Madhya Pradesh',
            description || '',
          ]
        );
        return {
          success: true,
          message: `Crop listing for ${quantityQuintals}q of ${cropName} published to marketplace!`,
          result: { id, cropName, quantityQuintals, pricePerQuintal },
        };
      }

      default:
        throw new Error(`Unknown action type: ${actionType}`);
    }
  }

  async getHistory(farmerId?: string) {
    if (!farmerId || farmerId === 'guest_user') return [];
    const res = await db.query(
      `SELECT * FROM chat_messages WHERE farmer_id = $1 ORDER BY created_at ASC LIMIT 50`,
      [farmerId]
    );
    return res.rows;
  }
}

export const assistantService = new AssistantService();
