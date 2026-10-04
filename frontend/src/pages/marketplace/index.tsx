import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ShoppingBag,
  Search,
  Filter,
  CheckCircle2,
  Package,
  Truck,
  MapPin,
  Phone,
  Calendar,
  Sparkles,
  Tag,
  ArrowRight,
  ShieldCheck,
  Building2,
  X,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { SectionHeader } from '@/components/ui/section-header';
import { listingsApi, marketplaceApi, type CropListing, type MarketplaceOrder } from '@/api';
import { useAuth } from '@/context/AuthContext';

const CROP_CATEGORIES = [
  { id: 'all', labelKey: 'marketplace.all_crops' },
  { id: 'Wheat', labelKey: 'crop:crops.wheat' },
  { id: 'Rice', labelKey: 'crop:crops.rice' },
  { id: 'Mustard', labelKey: 'crop:crops.mustard' },
  { id: 'Soybean', labelKey: 'crop:crops.soybean' },
  { id: 'Potato', labelKey: 'crop:crops.potato' },
  { id: 'Cotton', labelKey: 'crop:crops.cotton' },
];

const QUALITY_GRADES = ['all', 'Grade A', 'Grade B', 'Grade A (Aromatic)', 'Organic Certified'];

export default function MarketplacePage() {
  const { t } = useTranslation();
  const { user, role, farmer } = useAuth();

  const [activeTab, setActiveTab] = useState<'listings' | 'my-orders'>('listings');
  const [selectedCrop, setSelectedCrop] = useState('all');
  const [selectedGrade, setSelectedGrade] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [listings, setListings] = useState<CropListing[]>([]);
  const [orders, setOrders] = useState<MarketplaceOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Buy Modal state
  const [selectedListing, setSelectedListing] = useState<CropListing | null>(null);
  const [buyQuantity, setBuyQuantity] = useState<number>(10);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [buyerPhone, setBuyerPhone] = useState(user?.phone || '');
  const [buyerName, setBuyerName] = useState(user?.name || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const fetchListings = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await listingsApi.getListings({
        crop: selectedCrop !== 'all' ? selectedCrop : undefined,
        grade: selectedGrade !== 'all' ? selectedGrade : undefined,
        search: searchQuery || undefined,
      });
      setListings(res.listings || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load crop listings');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchOrders = async () => {
    try {
      const res = await marketplaceApi.getBuyerOrders();
      setOrders(res.orders || []);
    } catch (err: any) {
      console.warn('Failed to load orders:', err);
    }
  };

  useEffect(() => {
    fetchListings();
  }, [selectedCrop, selectedGrade]);

  useEffect(() => {
    if (activeTab === 'my-orders') {
      fetchOrders();
    }
  }, [activeTab]);

  const handleOpenBuyModal = (listing: CropListing) => {
    setSelectedListing(listing);
    setBuyQuantity(Math.min(20, listing.quantity));
    setDeliveryAddress(user?.location?.address || 'Sanwer Road Industrial Area, Indore, MP');
  };

  const handleConfirmPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedListing) return;

    if (buyQuantity <= 0 || buyQuantity > selectedListing.quantity) {
      alert(`Please enter a quantity between 1 and ${selectedListing.quantity} quintals`);
      return;
    }

    if (!deliveryAddress.trim()) {
      alert('Please enter a delivery destination address');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await marketplaceApi.placeOrder({
        listingId: selectedListing.id,
        quantityQuintals: Number(buyQuantity),
        deliveryAddress: deliveryAddress.trim(),
        buyerName,
        buyerPhone,
      });

      setSuccessNotice(
        `Order confirmed! Tracking Code: ${res.order.trackingCode}. Transport logistics scheduled.`
      );
      setSelectedListing(null);
      fetchListings();
      fetchOrders();
      setActiveTab('my-orders');
      setTimeout(() => setSuccessNotice(null), 8000);
    } catch (err: any) {
      alert(`Purchase failed: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-agri-forest-800 text-white flex items-center justify-center shadow-sm">
              <ShoppingBag className="h-5 w-5 text-agri-gold-400" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-sand-900">
                {t('marketplace.title')}
              </h1>
              <p className="text-xs md:text-sm text-sand-600">
                {t('marketplace.tagline')}
              </p>
            </div>
          </div>
        </div>

        {/* View Mode Tabs */}
        <div className="flex bg-sand-200 p-1 rounded-xl w-full md:w-auto self-start">
          <button
            type="button"
            onClick={() => setActiveTab('listings')}
            className={`flex-1 md:flex-initial px-4 py-2 text-xs md:text-sm font-semibold rounded-lg transition-all ${
              activeTab === 'listings'
                ? 'bg-white text-agri-forest-900 shadow-xs'
                : 'text-sand-700 hover:text-sand-900'
            }`}
          >
            🌾 {t('marketplace.browse_crops')}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('my-orders')}
            className={`flex-1 md:flex-initial px-4 py-2 text-xs md:text-sm font-semibold rounded-lg transition-all ${
              activeTab === 'my-orders'
                ? 'bg-white text-agri-forest-900 shadow-xs'
                : 'text-sand-700 hover:text-sand-900'
            }`}
          >
            📦 {t('marketplace.my_orders')}
          </button>
        </div>
      </div>

      {/* Success Notification Alert */}
      {successNotice && (
        <div className="p-4 bg-agri-leaf-50 border border-agri-leaf-400 rounded-xl flex items-center gap-3 text-agri-leaf-800 animate-in fade-in">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-agri-leaf-600" />
          <p className="text-sm font-medium">{successNotice}</p>
        </div>
      )}

      {/* Trust & Guarantee Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-agri-forest-50 border border-agri-forest-200">
          <ShieldCheck className="h-5 w-5 text-agri-forest-700 shrink-0" />
          <div>
            <p className="text-xs font-bold text-agri-forest-900">{t('marketplace.trust_verified_title')}</p>
            <p className="text-[11px] text-agri-forest-700">{t('marketplace.trust_verified_desc')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-agri-gold-50 border border-agri-gold-300">
          <Truck className="h-5 w-5 text-agri-gold-700 shrink-0" />
          <div>
            <p className="text-xs font-bold text-agri-gold-900">{t('marketplace.trust_logistics_title')}</p>
            <p className="text-[11px] text-agri-gold-700">{t('marketplace.trust_logistics_desc')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-sand-100 border border-sand-300">
          <Building2 className="h-5 w-5 text-sand-800 shrink-0" />
          <div>
            <p className="text-xs font-bold text-sand-900">{t('marketplace.trust_quality_title')}</p>
            <p className="text-[11px] text-sand-700">{t('marketplace.trust_quality_desc')}</p>
          </div>
        </div>
      </div>

      {activeTab === 'listings' ? (
        <>
          {/* Filters & Search */}
          <div className="space-y-3 bg-white p-4 rounded-xl border border-sand-200 shadow-xs">
            {/* Search input */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="h-4 w-4 absolute left-3 top-3 text-sand-400" />
                <input
                  type="text"
                  placeholder={t('marketplace.search_placeholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchListings()}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-sand-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-agri-forest-500"
                />
              </div>
              <Button variant="secondary" onClick={fetchListings}>
                {t('buttons.search')}
              </Button>
            </div>

            {/* Crop Category Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {CROP_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCrop(cat.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                    selectedCrop === cat.id
                      ? 'bg-agri-forest-800 text-white'
                      : 'bg-sand-100 text-sand-700 hover:bg-sand-200'
                  }`}
                >
                  {t(cat.labelKey, { defaultValue: cat.id })}
                </button>
              ))}
            </div>

            {/* Quality Grade Filter */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-sand-500 font-medium">Quality Grade:</span>
              <div className="flex items-center gap-1.5 overflow-x-auto">
                {QUALITY_GRADES.map((grade) => (
                  <button
                    key={grade}
                    onClick={() => setSelectedGrade(grade)}
                    className={`px-2.5 py-0.5 rounded text-xs transition-colors ${
                      selectedGrade === grade
                        ? 'bg-agri-gold-500 text-white font-semibold'
                        : 'bg-sand-100 text-sand-600 hover:bg-sand-200'
                    }`}
                  >
                    {grade === 'all' ? 'All Grades' : grade}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Listings Feed */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Skeleton className="h-48 w-full rounded-xl" />
              <Skeleton className="h-48 w-full rounded-xl" />
              <Skeleton className="h-48 w-full rounded-xl" />
              <Skeleton className="h-48 w-full rounded-xl" />
            </div>
          ) : error ? (
            <ErrorState onRetry={fetchListings} description={error} />
          ) : listings.length === 0 ? (
            <EmptyState
              title={t('marketplace.no_listings')}
              description=""
              actionLabel={t('marketplace.all_crops')}
              onAction={() => {
                setSelectedCrop('all');
                setSelectedGrade('all');
                setSearchQuery('');
              }}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {listings.map((item) => (
                <Card
                  key={item.id}
                  className="hover:shadow-md transition-all border border-sand-200 overflow-hidden flex flex-col justify-between"
                >
                  <div>
                    {/* Header: Crop name & Grade */}
                    <div className="p-4 bg-sand-50/70 border-b border-sand-200 flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-bold text-sand-900">{item.cropName}</h3>
                          <span className="text-xs text-sand-500 font-medium">({item.variety || 'Standard'})</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-sand-600 mt-1">
                          <MapPin className="h-3 w-3 text-agri-forest-700" />
                          <span>{item.location || item.farmerLocation}</span>
                        </div>
                      </div>
                      <Badge
                        variant={
                          item.qualityGrade.includes('Organic')
                            ? 'success'
                            : item.qualityGrade.includes('Grade A')
                            ? 'info'
                            : 'neutral'
                        }
                      >
                        {item.qualityGrade}
                      </Badge>
                    </div>

                    {/* Content: Specs & Metrics */}
                    <div className="p-4 space-y-3">
                      <div className="grid grid-cols-2 gap-3 bg-sand-50 p-3 rounded-lg border border-sand-200/60 text-xs">
                        <div>
                          <span className="text-sand-500 block">{t('marketplace.quantity_q')}</span>
                          <span className="font-bold text-sm text-sand-900">{item.quantity} {t('units.quintal')}</span>
                        </div>
                        <div>
                          <span className="text-sand-500 block">{t('marketplace.rate')}</span>
                          <span className="font-bold text-sm text-agri-forest-900">₹{item.pricePerQuintal.toLocaleString('en-IN')}{t('units.per_quintal')}</span>
                        </div>
                      </div>

                      {item.description && (
                        <p className="text-xs text-sand-600 line-clamp-2 italic">
                          "{item.description}"
                        </p>
                      )}

                      <div className="flex items-center justify-between text-xs text-sand-500 pt-1">
                        <span>{t('marketplace.seller')}: <strong>{item.farmerName}</strong></span>
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {item.farmerPhone}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Footer Action */}
                  <div className="p-4 pt-0">
                    <Button
                      variant="primary"
                      className="w-full flex items-center justify-center gap-2"
                      onClick={() => handleOpenBuyModal(item)}
                    >
                      <ShoppingBag className="h-4 w-4 text-agri-gold-400" />
                      <span>{t('marketplace.buy_directly')}</span>
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      ) : (
        /* My Orders View */
        <div className="space-y-4">
          <SectionHeader
            title={t('marketplace.my_orders')}
            icon={<Package className="h-5 w-5 text-agri-forest-800" />}
          />

          {orders.length === 0 ? (
            <EmptyState
              title={t('marketplace.no_orders')}
              description=""
              actionLabel={t('marketplace.browse_crops')}
              onAction={() => setActiveTab('listings')}
            />
          ) : (
            <div className="space-y-3">
              {orders.map((ord) => (
                <Card key={ord.id} className="p-4 border border-sand-200">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-sand-200">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-base text-sand-900">{ord.cropName}</span>
                        <Badge
                          variant={
                            ord.status === 'delivered'
                              ? 'success'
                              : ord.status === 'in_transit'
                              ? 'info'
                              : ord.status === 'confirmed'
                              ? 'warning'
                              : 'neutral'
                          }
                        >
                          {t(`marketplace.status.${ord.status}`, { defaultValue: ord.status.toUpperCase() })}
                        </Badge>
                      </div>
                      <p className="text-xs text-sand-500 mt-0.5">
                        Order #{ord.id} • Tracking Code: <strong className="text-sand-800">{ord.trackingCode || 'KISAN-TRK-PENDING'}</strong>
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-xs text-sand-500 block">{t('marketplace.total_amount')}</span>
                      <span className="text-base font-bold text-agri-forest-900">₹{ord.totalAmount.toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-sand-600 pt-3">
                    <div>
                      <span className="text-sand-400 block">{t('marketplace.quantity_q')} & {t('marketplace.rate')}</span>
                      <p className="font-medium text-sand-800">{ord.quantity}q @ ₹{ord.pricePerQuintal}/q</p>
                    </div>
                    <div>
                      <span className="text-sand-400 block">{t('marketplace.seller')}</span>
                      <p className="font-medium text-sand-800">{ord.farmerName} ({ord.farmerLocation})</p>
                    </div>
                    <div>
                      <span className="text-sand-400 block">{t('marketplace.delivery_address')}</span>
                      <p className="font-medium text-sand-800 line-clamp-1">{ord.deliveryAddress}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Buy Modal Dialog */}
      {selectedListing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-sand-900/60 backdrop-blur-sm animate-in fade-in">
          <Card className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden border border-sand-300">
            <div className="flex items-center justify-between p-4 border-b border-sand-200 bg-sand-50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-agri-forest-100 flex items-center justify-center text-agri-forest-800">
                  <ShoppingBag className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-sand-900">{t('marketplace.buy_dialog_title')}</h3>
                  <p className="text-xs text-sand-600">{selectedListing.cropName} — {selectedListing.variety}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedListing(null)}
                className="p-1 rounded-lg text-sand-400 hover:text-sand-700 hover:bg-sand-200 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmPurchase} className="p-5 space-y-4">
              {/* Farmer & Rate Info */}
              <div className="bg-sand-50 p-3 rounded-xl border border-sand-200 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-sand-500">{t('marketplace.seller')}:</span>
                  <span className="font-bold text-sand-900">{selectedListing.farmerName} ({selectedListing.location})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sand-500">{t('marketplace.quality_grade')}:</span>
                  <span className="font-bold text-sand-900">{selectedListing.qualityGrade}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sand-500">{t('marketplace.rate')}:</span>
                  <span className="font-bold text-agri-forest-900">₹{selectedListing.pricePerQuintal}{t('units.per_quintal')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sand-500">{t('marketplace.quantity_available', { qty: selectedListing.quantity })}</span>
                </div>
              </div>

              {/* Quantity Input */}
              <div>
                <label className="text-xs font-bold text-sand-800 mb-1 block">
                  {t('marketplace.quantity_needed')} *
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={selectedListing.quantity}
                    value={buyQuantity}
                    onChange={(e) => setBuyQuantity(Number(e.target.value))}
                    required
                    className="w-full px-3 py-2 text-base font-bold border border-sand-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-agri-forest-500"
                  />
                  <span className="text-sm font-semibold text-sand-600 whitespace-nowrap">{t('units.quintal')}</span>
                </div>
              </div>

              {/* Total Calculation */}
              <div className="p-3 bg-agri-forest-50 border border-agri-forest-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs text-agri-forest-700 block">{t('marketplace.total_amount')}:</span>
                  <span className="text-lg font-black text-agri-forest-900">
                    ₹{(buyQuantity * selectedListing.pricePerQuintal).toLocaleString('en-IN')}
                  </span>
                </div>
                <Badge variant="success">Zero Commission</Badge>
              </div>

              {/* Delivery Address */}
              <div>
                <label className="text-xs font-bold text-sand-800 mb-1 block">
                  {t('marketplace.delivery_address')} *
                </label>
                <textarea
                  required
                  rows={2}
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder={t('marketplace.address_placeholder')}
                  className="w-full px-3 py-2 text-xs border border-sand-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-agri-forest-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium text-sand-700 mb-1 block">{t('auth.name_label')}</label>
                  <input
                    type="text"
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-sand-300 rounded-lg focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-sand-700 mb-1 block">{t('marketplace.buyer_phone')}</label>
                  <input
                    type="tel"
                    value={buyerPhone}
                    onChange={(e) => setBuyerPhone(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-sand-300 rounded-lg focus:outline-none"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <Button type="submit" variant="primary" className="flex-1" isLoading={isSubmitting}>
                  {t('marketplace.confirm_order')}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setSelectedListing(null)}>
                  {t('buttons.cancel')}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
