import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Sprout,
  Phone,
  Lock,
  User,
  MapPin,
  ArrowRight,
  Building2,
  Mail,
  Tractor,
  Layers,
  Droplets,
  Navigation,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { useActiveLocation } from '@/context/LocationContext';
import { ROUTES } from '@/routes/paths';

const POPULAR_STATES = [
  'Madhya Pradesh',
  'Punjab',
  'Haryana',
  'Uttar Pradesh',
  'Rajasthan',
  'Maharashtra',
  'Gujarat',
  'Bihar',
  'Karnataka',
  'Andhra Pradesh',
  'Telangana',
];

const SOIL_OPTIONS = [
  { value: 'alluvial', labelKey: 'profile:soil_types.alluvial', fallback: 'Alluvial (जलोढ़)' },
  { value: 'black', labelKey: 'profile:soil_types.black', fallback: 'Black / Regur (काली)' },
  { value: 'red', labelKey: 'profile:soil_types.red', fallback: 'Red & Yellow (लाल)' },
  { value: 'loamy', labelKey: 'profile:soil_types.loamy', fallback: 'Loamy (दोमट)' },
  { value: 'sandy', labelKey: 'profile:soil_types.sandy', fallback: 'Sandy (रेतीली)' },
  { value: 'clayey', labelKey: 'profile:soil_types.clayey', fallback: 'Clayey (चिकनी)' },
];

const IRRIGATION_OPTIONS = [
  { value: 'borewell', labelKey: 'profile:irrigation_types.borewell', fallback: 'Borewell (बोरवेल)' },
  { value: 'canal', labelKey: 'profile:irrigation_types.canal', fallback: 'Canal (नहर)' },
  { value: 'well', labelKey: 'profile:irrigation_types.well', fallback: 'Open Well (कुआँ)' },
  { value: 'drip', labelKey: 'profile:irrigation_types.drip', fallback: 'Drip Irrigation (ड्रिप)' },
  { value: 'sprinkler', labelKey: 'profile:irrigation_types.sprinkler', fallback: 'Sprinkler (स्प्रिंकलर)' },
  { value: 'rainfed', labelKey: 'profile:irrigation_types.rainfed', fallback: 'Rainfed (वर्षा आधारित)' },
];

const CROPS_LIST = [
  { value: 'Wheat', labelKey: 'crop:crops.wheat', fallback: 'Wheat (गेहूं)' },
  { value: 'Mustard', labelKey: 'crop:crops.mustard', fallback: 'Mustard (सरसों)' },
  { value: 'Soybean', labelKey: 'crop:crops.soybean', fallback: 'Soybean (सोयाबीन)' },
  { value: 'Rice', labelKey: 'crop:crops.rice', fallback: 'Rice / Paddy (धान/चावल)' },
  { value: 'Potato', labelKey: 'crop:crops.potato', fallback: 'Potato (आलू)' },
  { value: 'Cotton', labelKey: 'crop:crops.cotton', fallback: 'Cotton (कपास)' },
  { value: 'Maize', labelKey: 'crop:crops.maize', fallback: 'Maize (मक्का)' },
  { value: 'Sugarcane', labelKey: 'crop:crops.sugarcane', fallback: 'Sugarcane (गन्ना)' },
];

export default function RegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { register } = useAuth();
  const { detectGPS, setLocation } = useActiveLocation();

  const [role, setRole] = useState<'farmer' | 'buyer'>('farmer');
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
    address: '',
    village: '',
    district: '',
    state: '',
    pincode: '',
    latitude: '' as any,
    longitude: '' as any,
    // Farmer fields
    farmSize: '5',
    soilType: 'alluvial',
    irrigationSource: 'borewell',
    mainCrop: 'Wheat',
    // Buyer fields
    companyName: '',
    buyerType: 'Trader',
    gstin: '',
    purchaseInterests: 'Wheat, Mustard, Soybean',
  });

  const [isDetectingGPS, setIsDetectingGPS] = useState(false);
  const [gpsSuccess, setGpsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGPSDetect = async () => {
    setIsDetectingGPS(true);
    setError(null);
    try {
      const detected = await detectGPS();
      setFormData((prev) => ({
        ...prev,
        district: detected.district || prev.district,
        state: detected.state || prev.state,
        village: detected.village || detected.city || prev.village,
        latitude: detected.latitude,
        longitude: detected.longitude,
      }));
      setGpsSuccess(true);
    } catch (err: any) {
      setError(err.message || 'GPS location detection failed.');
    } finally {
      setIsDetectingGPS(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // Client-side validations
    if (formData.phone.trim().length < 10) {
      setError('Please enter a valid 10-digit mobile number');
      setIsLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      setIsLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Password and Confirm Password do not match');
      setIsLoading(false);
      return;
    }

    try {
      const parsedLat = formData.latitude ? Number(formData.latitude) : null;
      const parsedLng = formData.longitude ? Number(formData.longitude) : null;

      const payload = {
        ...formData,
        role,
        farmSize: Number(formData.farmSize) || 5,
        latitude: parsedLat,
        longitude: parsedLng,
      };

      await register(payload);

      // Immediately sync the active location to the new user's location
      setLocation({
        district: formData.district,
        state: formData.state,
        village: formData.village,
        latitude: parsedLat,
        longitude: parsedLng,
        country: 'India',
      });

      if (role === 'buyer') {
        navigate(ROUTES.MARKETPLACE);
      } else {
        navigate(ROUTES.HOME);
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please check your inputs.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-sand-50 flex flex-col items-center justify-center p-4 sm:p-6 py-10">
      <div className="w-full max-w-xl space-y-6">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-agri-forest-100 flex items-center justify-center mx-auto mb-3 shadow-xs">
            <Sprout className="h-9 w-9 text-agri-forest-800" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-agri-forest-900 tracking-tight">
            KisanIQ
          </h1>
          <p className="text-sm text-sand-600 mt-1">{t('auth.register_subtitle')}</p>
        </div>

        {/* Role Switcher */}
        <div className="grid grid-cols-2 gap-2 bg-sand-200 p-1.5 rounded-xl">
          <button
            type="button"
            onClick={() => setRole('farmer')}
            className={`py-2.5 text-xs sm:text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
              role === 'farmer'
                ? 'bg-white text-agri-forest-900 shadow-xs border border-sand-300/50'
                : 'text-sand-700 hover:text-sand-900'
            }`}
          >
            <Sprout className="h-4 w-4 text-agri-forest-700" />
            <span>{t('auth.role_farmer')}</span>
          </button>
          <button
            type="button"
            onClick={() => setRole('buyer')}
            className={`py-2.5 text-xs sm:text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
              role === 'buyer'
                ? 'bg-white text-agri-forest-900 shadow-xs border border-sand-300/50'
                : 'text-sand-700 hover:text-sand-900'
            }`}
          >
            <Building2 className="h-4 w-4 text-agri-gold-600" />
            <span>{t('auth.role_buyer')}</span>
          </button>
        </div>

        <Card className="shadow-md border-sand-200">
          <CardContent className="py-6 px-4 sm:px-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-risk-red-50 border border-risk-red-300 rounded-xl text-xs text-risk-red-700 leading-relaxed">
                  {error}
                </div>
              )}

              {/* 1. Basic Account Info */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-agri-forest-800 border-b border-sand-200 pb-1">
                  1. {t('profile.title')} & {t('auth.login_title')}
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-sand-700 mb-1">
                      {role === 'buyer' ? t('auth.name_label') : t('auth.name_label')}{' '}
                      <span className="text-risk-red-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="h-4 w-4 text-sand-400 absolute left-3 top-3" />
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder={
                          role === 'buyer'
                            ? 'e.g. Vikram Sharma'
                            : 'e.g. Ramesh Kumar'
                        }
                        required
                        className="w-full pl-9 pr-3 py-2 text-sm border border-sand-200 rounded-xl bg-white text-sand-900 focus:outline-none focus:ring-2 focus:ring-agri-forest-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-sand-700 mb-1">
                      {t('auth.phone_label')} <span className="text-risk-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="h-4 w-4 text-sand-400 absolute left-3 top-3" />
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="10-digit mobile number"
                        required
                        maxLength={12}
                        className="w-full pl-9 pr-3 py-2 text-sm border border-sand-200 rounded-xl bg-white text-sand-900 focus:outline-none focus:ring-2 focus:ring-agri-forest-600"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-sand-700 mb-1">
                    {t('auth.email_label')}
                  </label>
                  <div className="relative">
                    <Mail className="h-4 w-4 text-sand-400 absolute left-3 top-3" />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="name@example.com"
                      className="w-full pl-9 pr-3 py-2 text-sm border border-sand-200 rounded-xl bg-white text-sand-900 focus:outline-none focus:ring-2 focus:ring-agri-forest-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-sand-700 mb-1">
                      {t('auth.password_label')} <span className="text-risk-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="h-4 w-4 text-sand-400 absolute left-3 top-3" />
                      <input
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder="Min 6 characters"
                        required
                        minLength={6}
                        className="w-full pl-9 pr-3 py-2 text-sm border border-sand-200 rounded-xl bg-white text-sand-900 focus:outline-none focus:ring-2 focus:ring-agri-forest-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-sand-700 mb-1">
                      {t('auth.confirm_password_label')} <span className="text-risk-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="h-4 w-4 text-sand-400 absolute left-3 top-3" />
                      <input
                        type="password"
                        value={formData.confirmPassword}
                        onChange={(e) =>
                          setFormData({ ...formData, confirmPassword: e.target.value })
                        }
                        placeholder="Repeat password"
                        required
                        minLength={6}
                        className="w-full pl-9 pr-3 py-2 text-sm border border-sand-200 rounded-xl bg-white text-sand-900 focus:outline-none focus:ring-2 focus:ring-agri-forest-600"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Location & Coordinates */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between border-b border-sand-200 pb-1">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-agri-forest-800">
                    2. {t('profile:farm_profile')} — {t('profile:fields.location')}
                  </h3>
                  <button
                    type="button"
                    onClick={handleGPSDetect}
                    disabled={isDetectingGPS}
                    className="flex items-center gap-1 text-xs text-agri-forest-800 hover:text-agri-forest-900 font-semibold bg-agri-forest-50 hover:bg-agri-forest-100 px-2.5 py-1 rounded-lg border border-agri-forest-200 transition-colors"
                  >
                    {isDetectingGPS ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : gpsSuccess ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <Navigation className="h-3.5 w-3.5" />
                    )}
                    <span>
                      {isDetectingGPS ? 'Detecting...' : gpsSuccess ? 'GPS Synced' : 'Auto GPS'}
                    </span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-sand-700 mb-1">
                      {t('auth.state_label')}
                    </label>
                    <select
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-sand-200 rounded-xl bg-white text-sand-900 focus:outline-none focus:ring-2 focus:ring-agri-forest-600"
                    >
                      {POPULAR_STATES.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-sand-700 mb-1">
                      {t('auth.district_label')} <span className="text-risk-red-500">*</span>
                    </label>
                    <div className="relative">
                      <MapPin className="h-4 w-4 text-sand-400 absolute left-3 top-3" />
                      <input
                        type="text"
                        value={formData.district}
                        onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                        placeholder="Gwalior / Indore / etc."
                        required
                        className="w-full pl-9 pr-3 py-2 text-sm border border-sand-200 rounded-xl bg-white text-sand-900 focus:outline-none focus:ring-2 focus:ring-agri-forest-600"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-sand-700 mb-1">
                      {t('auth.village_label')}
                    </label>
                    <input
                      type="text"
                      value={formData.village}
                      onChange={(e) => setFormData({ ...formData, village: e.target.value })}
                      placeholder="e.g. Morar / Maharajpur"
                      className="w-full px-3 py-2 text-sm border border-sand-200 rounded-xl bg-white text-sand-900 focus:outline-none focus:ring-2 focus:ring-agri-forest-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-sand-700 mb-1">
                      Coordinates (Lat, Lon)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        step="0.0001"
                        value={formData.latitude}
                        onChange={(e) =>
                          setFormData({ ...formData, latitude: parseFloat(e.target.value) || 0 })
                        }
                        className="w-1/2 px-2.5 py-2 text-xs border border-sand-200 rounded-xl bg-white text-sand-900"
                        title="Latitude"
                      />
                      <input
                        type="number"
                        step="0.0001"
                        value={formData.longitude}
                        onChange={(e) =>
                          setFormData({ ...formData, longitude: parseFloat(e.target.value) || 0 })
                        }
                        className="w-1/2 px-2.5 py-2 text-xs border border-sand-200 rounded-xl bg-white text-sand-900"
                        title="Longitude"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Role-Specific Information */}
              {role === 'farmer' ? (
                <div className="space-y-3 pt-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-agri-forest-800 border-b border-sand-200 pb-1">
                    3. {t('profile:farm_profile')}
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-sand-700 mb-1">
                        {t('auth.farm_size_label')}
                      </label>
                      <div className="relative">
                        <Tractor className="h-4 w-4 text-sand-400 absolute left-3 top-3" />
                        <input
                          type="number"
                          step="any"
                          min="0.1"
                          value={formData.farmSize}
                          onChange={(e) => setFormData({ ...formData, farmSize: e.target.value })}
                          placeholder="e.g. 5"
                          className="w-full pl-9 pr-3 py-2 text-sm border border-sand-200 rounded-xl bg-white text-sand-900 focus:outline-none focus:ring-2 focus:ring-agri-forest-600"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-sand-700 mb-1">
                        {t('auth.main_crop_label')}
                      </label>
                      <select
                        value={formData.mainCrop}
                        onChange={(e) => setFormData({ ...formData, mainCrop: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-sand-200 rounded-xl bg-white text-sand-900 focus:outline-none focus:ring-2 focus:ring-agri-forest-600"
                      >
                        {CROPS_LIST.map((crop) => (
                          <option key={crop.value} value={crop.value}>
                            {t(crop.labelKey, { defaultValue: crop.fallback })}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-sand-700 mb-1">
                        {t('auth.soil_type_label')}
                      </label>
                      <div className="relative">
                        <Layers className="h-4 w-4 text-sand-400 absolute left-3 top-3" />
                        <select
                          value={formData.soilType}
                          onChange={(e) => setFormData({ ...formData, soilType: e.target.value })}
                          className="w-full pl-9 pr-3 py-2 text-sm border border-sand-200 rounded-xl bg-white text-sand-900 focus:outline-none focus:ring-2 focus:ring-agri-forest-600"
                        >
                          {SOIL_OPTIONS.map((soil) => (
                            <option key={soil.value} value={soil.value}>
                              {t(soil.labelKey, { defaultValue: soil.fallback })}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-sand-700 mb-1">
                        {t('auth.irrigation_label')}
                      </label>
                      <div className="relative">
                        <Droplets className="h-4 w-4 text-sand-400 absolute left-3 top-3" />
                        <select
                          value={formData.irrigationSource}
                          onChange={(e) =>
                            setFormData({ ...formData, irrigationSource: e.target.value })
                          }
                          className="w-full pl-9 pr-3 py-2 text-sm border border-sand-200 rounded-xl bg-white text-sand-900 focus:outline-none focus:ring-2 focus:ring-agri-forest-600"
                        >
                          {IRRIGATION_OPTIONS.map((irr) => (
                            <option key={irr.value} value={irr.value}>
                              {t(irr.labelKey, { defaultValue: irr.fallback })}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 pt-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-agri-forest-800 border-b border-sand-200 pb-1">
                    3. {t('auth.role_buyer')} Details
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-sand-700 mb-1">
                        {t('auth.company_name_label')} <span className="text-risk-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Building2 className="h-4 w-4 text-sand-400 absolute left-3 top-3" />
                        <input
                          type="text"
                          value={formData.companyName}
                          onChange={(e) =>
                            setFormData({ ...formData, companyName: e.target.value })
                          }
                          placeholder="e.g. Shanti Agro Foods Ltd"
                          required
                          className="w-full pl-9 pr-3 py-2 text-sm border border-sand-200 rounded-xl bg-white text-sand-900 focus:outline-none focus:ring-2 focus:ring-agri-forest-600"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-sand-700 mb-1">
                        {t('auth.buyer_type_label')}
                      </label>
                      <select
                        value={formData.buyerType}
                        onChange={(e) => setFormData({ ...formData, buyerType: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-sand-200 rounded-xl bg-white text-sand-900 focus:outline-none focus:ring-2 focus:ring-agri-forest-600"
                      >
                        <option value="Trader">Trader (व्यापारी)</option>
                        <option value="Wholesaler">Wholesaler (थोक विक्रेता)</option>
                        <option value="Food Processor">Food Processor (खाद्य प्रसंस्करणकर्ता)</option>
                        <option value="FPO">FPO (किसान उत्पादक संगठन)</option>
                        <option value="Exporter">Exporter (निर्यातक)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-sand-700 mb-1">
                        {t('auth.gstin_label')}
                      </label>
                      <input
                        type="text"
                        value={formData.gstin}
                        onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                        placeholder="e.g. 23AAAAA0000A1Z5"
                        className="w-full px-3 py-2 text-sm border border-sand-200 rounded-xl bg-white text-sand-900 focus:outline-none focus:ring-2 focus:ring-agri-forest-600"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-sand-700 mb-1">
                        {t('auth.purchase_interests_label')}
                      </label>
                      <input
                        type="text"
                        value={formData.purchaseInterests}
                        onChange={(e) =>
                          setFormData({ ...formData, purchaseInterests: e.target.value })
                        }
                        placeholder="e.g. Wheat, Mustard, Soybean"
                        className="w-full px-3 py-2 text-sm border border-sand-200 rounded-xl bg-white text-sand-900 focus:outline-none focus:ring-2 focus:ring-agri-forest-600"
                      />
                    </div>
                  </div>
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                className="w-full mt-4 py-3 text-base font-bold shadow-sm"
                isLoading={isLoading}
              >
                {isLoading ? t('auth.registering') : t('auth.register_button')}{' '}
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </form>

            <div className="mt-5 pt-4 border-t border-sand-200 text-center text-xs text-sand-600">
              {t('auth.have_account')}{' '}
              <Link to={ROUTES.LOGIN} className="text-agri-forest-800 font-bold hover:underline">
                {t('auth.login_here')}
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
