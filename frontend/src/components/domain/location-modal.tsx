import { useState } from 'react';
import { MapPin, Navigation, Check, X, Loader2, Search } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { useActiveLocation } from '@/context/LocationContext';

interface LocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLocation?: {
    village?: string;
    district?: string;
    state?: string;
  };
  onLocationUpdated: (newLocation: any) => void;
}

const POPULAR_HUBS = [
  // Madhya Pradesh
  { district: 'Gwalior', state: 'Madhya Pradesh', lat: 26.2183, lng: 78.1828, tag: 'Chambal Wheat & Mustard' },
  { district: 'Indore', state: 'Madhya Pradesh', lat: 22.7196, lng: 75.8577, tag: 'Malwa Grain Market' },
  { district: 'Bhopal', state: 'Madhya Pradesh', lat: 23.2599, lng: 77.4126, tag: 'Central MP Pulses' },
  { district: 'Ujjain', state: 'Madhya Pradesh', lat: 23.1765, lng: 75.7885, tag: 'Wheat & Gram Hub' },
  { district: 'Jabalpur', state: 'Madhya Pradesh', lat: 23.1815, lng: 79.9864, tag: 'Mahakoshal Rice & Pea' },
  { district: 'Sagar', state: 'Madhya Pradesh', lat: 23.8388, lng: 78.7378, tag: 'Bundelkhand Lentils' },
  { district: 'Vidisha', state: 'Madhya Pradesh', lat: 23.5251, lng: 77.8081, tag: 'Sharbati Wheat Capital' },
  { district: 'Rewa', state: 'Madhya Pradesh', lat: 24.5362, lng: 81.3037, tag: 'Baghelkhand Paddy' },
  { district: 'Hoshangabad', state: 'Madhya Pradesh', lat: 22.7533, lng: 77.7249, tag: 'Narmada Wheat Bowl' },
  { district: 'Sehore', state: 'Madhya Pradesh', lat: 23.2031, lng: 77.0844, tag: 'Soybean & Gram' },
  { district: 'Mandsaur', state: 'Madhya Pradesh', lat: 24.0722, lng: 75.0682, tag: 'Garlic & Spices' },
  { district: 'Neemuch', state: 'Madhya Pradesh', lat: 24.4764, lng: 74.8722, tag: 'Medicinal Crops & Coriander' },
  { district: 'Khargone', state: 'Madhya Pradesh', lat: 21.8234, lng: 75.6186, tag: 'Chilli & Cotton' },
  { district: 'Khandwa', state: 'Madhya Pradesh', lat: 21.8314, lng: 76.3498, tag: 'Nimar Cotton & Onion' },
  { district: 'Dhar', state: 'Madhya Pradesh', lat: 22.5978, lng: 75.2974, tag: 'Wheat & Soybean' },
  { district: 'Dewas', state: 'Madhya Pradesh', lat: 22.9676, lng: 76.0534, tag: 'Soybean & Maize' },
  { district: 'Ratlam', state: 'Madhya Pradesh', lat: 23.3315, lng: 75.0367, tag: 'Garlic & Wheat' },
  { district: 'Shivpuri', state: 'Madhya Pradesh', lat: 25.4320, lng: 77.6593, tag: 'Mustard & Groundnut' },
  { district: 'Morena', state: 'Madhya Pradesh', lat: 26.4948, lng: 77.9940, tag: 'Mustard Oil Capital' },
  { district: 'Bhind', state: 'Madhya Pradesh', lat: 26.5652, lng: 78.7889, tag: 'Bajra & Mustard' },

  // Punjab
  { district: 'Ludhiana', state: 'Punjab', lat: 30.9010, lng: 75.8573, tag: 'Wheat & Rice Belt' },
  { district: 'Amritsar', state: 'Punjab', lat: 31.6340, lng: 74.8723, tag: 'Basmati Rice Hub' },
  { district: 'Bathinda', state: 'Punjab', lat: 30.2110, lng: 74.9455, tag: 'Malwa Cotton Belt' },
  { district: 'Jalandhar', state: 'Punjab', lat: 31.3260, lng: 75.5762, tag: 'Potato Seed Capital' },
  { district: 'Patiala', state: 'Punjab', lat: 30.3398, lng: 76.3869, tag: 'Paddy & Wheat' },
  { district: 'Sangrur', state: 'Punjab', lat: 30.2458, lng: 75.8421, tag: 'Grain Production Hub' },
  { district: 'Firozpur', state: 'Punjab', lat: 30.9237, lng: 74.6138, tag: 'Border Agriculture Zone' },
  { district: 'Moga', state: 'Punjab', lat: 30.8165, lng: 75.1717, tag: 'Wheat & Dairy Belt' },

  // Haryana
  { district: 'Karnal', state: 'Haryana', lat: 29.6857, lng: 76.9905, tag: 'Basmati Rice Hub' },
  { district: 'Hisar', state: 'Haryana', lat: 29.1492, lng: 75.7217, tag: 'Cotton & Wheat' },
  { district: 'Rohtak', state: 'Haryana', lat: 28.8955, lng: 76.6066, tag: 'Sugarcane & Wheat' },
  { district: 'Sirsa', state: 'Haryana', lat: 29.5349, lng: 75.0297, tag: 'Cotton & Wheat' },
  { district: 'Kurukshetra', state: 'Haryana', lat: 29.9695, lng: 76.8783, tag: 'Basmati & Sunflower' },
  { district: 'Ambala', state: 'Haryana', lat: 30.3782, lng: 76.7767, tag: 'Paddy & Wheat' },
  { district: 'Sonipat', state: 'Haryana', lat: 28.9931, lng: 77.0151, tag: 'Vegetable & Mushroom Belt' },
  { district: 'Panipat', state: 'Haryana', lat: 29.3909, lng: 76.9635, tag: 'Paddy & Wheat' },

  // Uttar Pradesh
  { district: 'Meerut', state: 'Uttar Pradesh', lat: 28.9845, lng: 77.7064, tag: 'Sugarcane & Potato' },
  { district: 'Muzaffarnagar', state: 'Uttar Pradesh', lat: 29.4727, lng: 77.7085, tag: 'Sugar & Jaggery Capital' },
  { district: 'Varanasi', state: 'Uttar Pradesh', lat: 25.3176, lng: 82.9739, tag: 'Vegetables & Rice' },
  { district: 'Gorakhpur', state: 'Uttar Pradesh', lat: 26.7606, lng: 83.3732, tag: 'Sugarcane & Rice' },
  { district: 'Lucknow', state: 'Uttar Pradesh', lat: 26.8467, lng: 80.9462, tag: 'Mango & Paddy' },
  { district: 'Kanpur', state: 'Uttar Pradesh', lat: 26.4499, lng: 80.3319, tag: 'Pulses & Wheat' },
  { district: 'Prayagraj', state: 'Uttar Pradesh', lat: 25.4358, lng: 81.8463, tag: 'Guava & Wheat' },
  { district: 'Bareilly', state: 'Uttar Pradesh', lat: 28.3670, lng: 79.4304, tag: 'Sugarcane & Rice' },
  { district: 'Aligarh', state: 'Uttar Pradesh', lat: 27.8974, lng: 78.0880, tag: 'Wheat & Mustard' },
  { district: 'Agra', state: 'Uttar Pradesh', lat: 27.1767, lng: 78.0081, tag: 'Potato Capital' },
  { district: 'Mathura', state: 'Uttar Pradesh', lat: 27.4924, lng: 77.6737, tag: 'Mustard & Dairy' },
  { district: 'Jhansi', state: 'Uttar Pradesh', lat: 25.4484, lng: 78.5685, tag: 'Bundelkhand Pulses' },

  // Rajasthan
  { district: 'Jaipur', state: 'Rajasthan', lat: 26.9124, lng: 75.7873, tag: 'Mustard & Millets' },
  { district: 'Kota', state: 'Rajasthan', lat: 25.2138, lng: 75.8648, tag: 'Soybean & Coriander' },
  { district: 'Jodhpur', state: 'Rajasthan', lat: 26.2389, lng: 73.0243, tag: 'Bajra & Spices' },
  { district: 'Bikaner', state: 'Rajasthan', lat: 28.0229, lng: 73.3119, tag: 'Guar & Moth' },
  { district: 'Sri Ganganagar', state: 'Rajasthan', lat: 29.9038, lng: 73.8772, tag: 'Food Basket of Rajasthan' },
  { district: 'Alwar', state: 'Rajasthan', lat: 27.5530, lng: 76.6346, tag: 'Mustard & Onion' },
  { district: 'Bharatpur', state: 'Rajasthan', lat: 27.2152, lng: 77.4930, tag: 'Mustard Research Hub' },
  { district: 'Hanumangarh', state: 'Rajasthan', lat: 29.5818, lng: 74.3294, tag: 'Wheat & Cotton' },

  // Maharashtra
  { district: 'Nashik', state: 'Maharashtra', lat: 19.9975, lng: 73.7898, tag: 'Onion & Grape Capital' },
  { district: 'Pune', state: 'Maharashtra', lat: 18.5204, lng: 73.8567, tag: 'Sugarcane & Floriculture' },
  { district: 'Nagpur', state: 'Maharashtra', lat: 21.1458, lng: 79.0882, tag: 'Orange & Soybean' },
  { district: 'Aurangabad', state: 'Maharashtra', lat: 19.8762, lng: 75.3433, tag: 'Cotton & Maize' },
  { district: 'Kolhapur', state: 'Maharashtra', lat: 16.7050, lng: 74.2433, tag: 'Sugarcane & Jaggery' },
  { district: 'Solapur', state: 'Maharashtra', lat: 17.6599, lng: 75.9064, tag: 'Pomegranate & Jowar' },
  { district: 'Amravati', state: 'Maharashtra', lat: 20.9320, lng: 77.7523, tag: 'Cotton & Soybean' },
  { district: 'Jalgaon', state: 'Maharashtra', lat: 21.0077, lng: 75.5626, tag: 'Banana Capital' },

  // Gujarat
  { district: 'Ahmedabad', state: 'Gujarat', lat: 23.0225, lng: 72.5714, tag: 'Cotton & Wheat' },
  { district: 'Rajkot', state: 'Gujarat', lat: 22.3039, lng: 70.8022, tag: 'Groundnut & Cotton' },
  { district: 'Surat', state: 'Gujarat', lat: 21.1702, lng: 72.8311, tag: 'Sugarcane & Paddy' },
  { district: 'Vadodara', state: 'Gujarat', lat: 22.3072, lng: 73.1812, tag: 'Tobacco & Cotton' },
  { district: 'Mehsana', state: 'Gujarat', lat: 23.5880, lng: 72.3693, tag: 'Spices & Cumin' },
  { district: 'Junagadh', state: 'Gujarat', lat: 21.5222, lng: 70.4579, tag: 'Groundnut & Mango' },

  // Bihar
  { district: 'Patna', state: 'Bihar', lat: 25.5941, lng: 85.1376, tag: 'Paddy & Wheat' },
  { district: 'Muzaffarpur', state: 'Bihar', lat: 26.1209, lng: 85.3647, tag: 'Shahi Litchi & Maize' },
  { district: 'Gaya', state: 'Bihar', lat: 24.7914, lng: 85.0002, tag: 'Paddy & Pulses' },
  { district: 'Bhagalpur', state: 'Bihar', lat: 25.2425, lng: 86.9842, tag: 'Katarni Rice & Silk' },

  // Karnataka & Andhra / Telangana
  { district: 'Belagavi', state: 'Karnataka', lat: 15.8497, lng: 74.4977, tag: 'Sugarcane & Maize' },
  { district: 'Bellary', state: 'Karnataka', lat: 15.1394, lng: 76.9214, tag: 'Cotton & Chilli' },
  { district: 'Guntur', state: 'Andhra Pradesh', lat: 16.3067, lng: 80.4365, tag: 'Asia Largest Chilli Yard' },
  { district: 'Vijayawada', state: 'Andhra Pradesh', lat: 16.5062, lng: 80.6480, tag: 'Krishna Delta Paddy' },
  { district: 'Warangal', state: 'Telangana', lat: 17.9689, lng: 79.5941, tag: 'Cotton & Chilli' },
];

export function LocationModal({ isOpen, onClose, currentLocation, onLocationUpdated }: LocationModalProps) {
  const { t } = useTranslation();
  const { location, setLocation, detectGPS } = useActiveLocation();

  const [district, setDistrict] = useState(currentLocation?.district || location.district || 'Gwalior');
  const [state, setState] = useState(currentLocation?.state || location.state || 'Madhya Pradesh');
  const [village, setVillage] = useState(currentLocation?.village || location.village || '');
  const [isDetecting, setIsDetecting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDetectGPS = async () => {
    setIsDetecting(true);
    setStatusMsg(t('location.detecting'));
    try {
      const detected = await detectGPS();
      setDistrict(detected.district);
      setState(detected.state);
      if (detected.latitude !== null && detected.longitude !== null) {
        setStatusMsg(`📍 GPS Sthiti Mili: ${detected.latitude.toFixed(4)}°N, ${detected.longitude.toFixed(4)}°E`);
      }
      onLocationUpdated(detected);
      setTimeout(() => {
        setIsDetecting(false);
        onClose();
      }, 900);
    } catch (err: any) {
      setStatusMsg(err.message || 'Location permission denied or unavailable.');
      setIsDetecting(false);
    }
  };

  const handleSelectHub = async (hub: typeof POPULAR_HUBS[0]) => {
    setIsSaving(true);
    try {
      setDistrict(hub.district);
      setState(hub.state);

      await setLocation({
        district: hub.district,
        state: hub.state,
        village,
        latitude: hub.lat,
        longitude: hub.lng,
      });

      onLocationUpdated({
        district: hub.district,
        state: hub.state,
        village,
        latitude: hub.lat,
        longitude: hub.lng,
      });

      setIsSaving(false);
      onClose();
    } catch (err: any) {
      alert(`Could not update location: ${err.message}`);
      setIsSaving(false);
    }
  };

  const handleManualSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!district || !state) {
      alert('District and State are required.');
      return;
    }

    setIsSaving(true);
    try {
      const matched = POPULAR_HUBS.find(
        (h) => h.district.toLowerCase() === district.toLowerCase()
      );
      let lat: number | null = matched ? matched.lat : null;
      let lng: number | null = matched ? matched.lng : null;

      if (lat === null || lng === null) {
        try {
          const geoRes = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(`${district}, ${state}, India`)}&limit=1`,
            {
              headers: { 'User-Agent': 'KisanIQ-App/2.0' },
              signal: AbortSignal.timeout(4000),
            }
          );
          if (geoRes.ok) {
            const geoData = await geoRes.json();
            if (geoData && geoData.length > 0) {
              lat = parseFloat(geoData[0].lat);
              lng = parseFloat(geoData[0].lon);
            }
          }
        } catch (geoErr) {
          console.warn('[LocationModal] Geocoding lookup notice:', geoErr);
        }
      }

      await setLocation({
        latitude: lat,
        longitude: lng,
        district,
        state,
        village,
      });

      onLocationUpdated({
        latitude: lat,
        longitude: lng,
        district,
        state,
        village,
      });

      setIsSaving(false);
      onClose();
    } catch (err: any) {
      alert(`Could not save location: ${err.message}`);
      setIsSaving(false);
    }
  };

  const filteredHubs = POPULAR_HUBS.filter(h =>
    h.district.toLowerCase().includes(searchQuery.toLowerCase()) ||
    h.state.toLowerCase().includes(searchQuery.toLowerCase()) ||
    h.tag.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-sand-900/60 backdrop-blur-sm animate-in fade-in">
      <Card className="w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden border border-sand-300">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-sand-200 bg-sand-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-agri-forest-100 flex items-center justify-center text-agri-forest-800">
              <MapPin className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-sand-900">{t('location.select_title')}</h3>
              <p className="text-xs text-sand-600">Dynamic weather & local mandi rates update automatically</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-sand-400 hover:text-sand-700 hover:bg-sand-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* GPS Auto-detect Button */}
          <button
            type="button"
            onClick={handleDetectGPS}
            disabled={isDetecting}
            className="w-full flex items-center justify-center gap-2 p-3 bg-agri-forest-800 hover:bg-agri-forest-700 text-white rounded-xl font-medium transition-all shadow-sm active:scale-[0.98] disabled:opacity-50"
          >
            {isDetecting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Navigation className="h-5 w-5 text-agri-gold-400" />
            )}
            <span>{isDetecting ? t('location.detecting') : t('location.detect_gps')}</span>
          </button>

          {statusMsg && (
            <p className="text-xs text-center font-medium text-agri-forest-700 bg-agri-forest-50 p-2 rounded-lg border border-agri-forest-200">
              {statusMsg}
            </p>
          )}

          {/* Popular Agricultural Centers */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-sand-500">
                {t('location.popular_hubs')}
              </span>
              <div className="relative w-44">
                <Search className="h-3.5 w-3.5 absolute left-2 top-2.5 text-sand-400" />
                <input
                  type="text"
                  placeholder={t('location.search_placeholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-7 pr-2 py-1 text-xs border border-sand-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-agri-forest-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {filteredHubs.slice(0, 16).map((hub) => {
                const isSelected = district.toLowerCase() === hub.district.toLowerCase();
                return (
                  <button
                    key={hub.district}
                    type="button"
                    onClick={() => handleSelectHub(hub)}
                    disabled={isSaving}
                    className={`p-2.5 rounded-xl text-left border transition-all text-xs flex flex-col justify-between ${
                      isSelected
                        ? 'border-agri-forest-700 bg-agri-forest-50 text-agri-forest-900 font-semibold shadow-xs'
                        : 'border-sand-200 hover:border-agri-forest-400 bg-white text-sand-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm">{hub.district}</span>
                      {isSelected && <Check className="h-3.5 w-3.5 text-agri-forest-700" />}
                    </div>
                    <span className="text-sand-500 mt-0.5">{hub.state}</span>
                    <span className="text-[10px] text-agri-forest-700 bg-agri-forest-100/60 px-1.5 py-0.5 rounded mt-1.5 inline-block w-fit">
                      {hub.tag}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Manual Input Form */}
          <form onSubmit={handleManualSave} className="pt-2 border-t border-sand-200 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-sand-500 block">
              {t('location.select_title')}
            </span>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium text-sand-700 mb-1 block">{t('location.district_label')} *</label>
                <input
                  type="text"
                  required
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  placeholder="Gwalior, Indore, Bhopal..."
                  className="w-full px-3 py-2 text-sm border border-sand-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-agri-forest-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-sand-700 mb-1 block">{t('location.state_label')} *</label>
                <input
                  type="text"
                  required
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="Madhya Pradesh..."
                  className="w-full px-3 py-2 text-sm border border-sand-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-agri-forest-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-sand-700 mb-1 block">{t('location.village_label')}</label>
              <input
                type="text"
                value={village}
                onChange={(e) => setVillage(e.target.value)}
                placeholder={t('location.village_placeholder')}
                className="w-full px-3 py-2 text-sm border border-sand-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-agri-forest-500"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="submit" variant="primary" className="flex-1" isLoading={isSaving}>
                {isSaving ? t('location.saving') : t('location.save_location')}
              </Button>
              <Button type="button" variant="ghost" onClick={onClose}>
                {t('buttons.cancel')}
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
}
