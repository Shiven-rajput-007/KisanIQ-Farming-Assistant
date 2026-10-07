import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Truck,
  CheckCircle2,
  Plus,
  Package,
  Trash2,
  X,
  Store,
  MapPin,
  Building,
} from 'lucide-react';
import { SectionHeader } from '@/components/ui/section-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { EmptyState } from '@/components/ui/empty-state';
import { MarketCard } from '@/components/domain/market-card';
import { PartialSellingCard } from '@/components/domain/partial-selling-card';
import { SellingDecisionCard } from '@/components/domain/selling-decision-card';
import { WhyExplanation } from '@/components/domain/why-explanation';
import { useMarket } from '@/hooks/useMarket';
import { useActiveLocation } from '@/context/LocationContext';
import { useAuth } from '@/context/AuthContext';
import { useCrops } from '@/hooks/useCrops';
import { useOrders } from '@/hooks/useOrders';
import { marketApi, listingsApi, marketplaceApi, type CropListing, type MarketplaceOrder } from '@/api';

export default function MarketPage() {
  const { t } = useTranslation('market');
  const { location } = useActiveLocation();
  const { farmer } = useAuth();
  const { data: cropsData } = useCrops();
  const [selectedCrop, setSelectedCrop] = useState('Wheat');
  const [selectedQuantity, setSelectedQuantity] = useState(50);

  useEffect(() => {
    if (cropsData?.crops && cropsData.crops.length > 0 && cropsData.crops[0].name) {
      setSelectedCrop(cropsData.crops[0].name);
      if (cropsData.crops[0].expectedYield && Number(cropsData.crops[0].expectedYield) > 0) {
        setSelectedQuantity(Number(cropsData.crops[0].expectedYield));
      }
    }
  }, [cropsData]);

  const { data, isLoading, error, refetch } = useMarket(selectedCrop, selectedQuantity);
  const { orders, refetch: refetchOrders } = useOrders();

  const [activeTab, setActiveTab] = useState<'mandi' | 'direct-selling'>('mandi');
  const [showWhy, setShowWhy] = useState<string | null>(null);
  const [sellingModal, setSellingModal] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Farmer's direct crop listings and buyer orders
  const [myListings, setMyListings] = useState<CropListing[]>([]);
  const [incomingOrders, setIncomingOrders] = useState<MarketplaceOrder[]>([]);
  const [isLoadingDirect, setIsLoadingDirect] = useState(false);
  const [showAddListingModal, setShowAddListingModal] = useState(false);

  // New listing form state
  const [newCropName, setNewCropName] = useState('Wheat');
  const [newVariety, setNewVariety] = useState('Sharbati HD-2967');
  const [newQuantity, setNewQuantity] = useState<number>(50);
  const [newPrice, setNewPrice] = useState<number>(2600);
  const [newGrade, setNewGrade] = useState('Grade A');
  const [newDescription, setNewDescription] = useState('');

  const fetchFarmerDirectData = async () => {
    setIsLoadingDirect(true);
    try {
      const res = await listingsApi.getFarmerListings();
      setMyListings(res.listings || []);
      setIncomingOrders(res.incomingOrders || []);
    } catch (e) {
      console.warn('Failed to load farmer direct data:', e);
    } finally {
      setIsLoadingDirect(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'direct-selling') {
      fetchFarmerDirectData();
    }
  }, [activeTab]);

  const handleCreateListing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuantity || !newPrice) {
      alert('Quantity and Price are required');
      return;
    }

    setIsSubmitting(true);
    try {
      await listingsApi.createListing({
        cropName: newCropName,
        variety: newVariety,
        quantityQuintals: Number(newQuantity),
        pricePerQuintal: Number(newPrice),
        qualityGrade: newGrade,
        description: newDescription,
      });

      setSuccessMessage(t('direct.modal_add_title') + ': ' + t('common:status.good'));
      setShowAddListingModal(false);
      fetchFarmerDirectData();
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      alert(`Could not create listing: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteListing = async (listingId: string) => {
    if (!confirm('Are you sure you want to remove this listing?')) return;
    try {
      await listingsApi.deleteListing(listingId);
      fetchFarmerDirectData();
    } catch (err: any) {
      alert(`Could not delete listing: ${err.message}`);
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      await marketplaceApi.updateOrderStatus(orderId, newStatus);
      setSuccessMessage(`Order #${orderId} status updated to ${newStatus}`);
      fetchFarmerDirectData();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      alert(`Could not update order status: ${err.message}`);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-44 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error && !data) {
    return <ErrorState onRetry={refetch} description={error} />;
  }

  if (!data) return null;
  const { cropName, availableQuantity, markets, partialSelling, whyExplanation, apiStatus, userCoordinates, sellingDecision } = data;

  const handlePlaceOrder = async (market: any, quantity: number) => {
    setIsSubmitting(true);
    try {
      await marketApi.createOrder({
        marketId: market.id,
        cropName,
        quantity,
        agreedPrice: market.price,
      });
      setSuccessMessage(`Order placed! Transport shipment scheduled to ${market.name}.`);
      setSellingModal(null);
      refetchOrders();
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      alert(`Could not place order: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Page Header with Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-sand-900 flex items-center gap-2">
            <span>💰</span> {t('title')}
          </h1>
          <p className="text-sm text-sand-600 mt-1">
            {cropName} — {t('available', { quantity: availableQuantity })}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-sand-200 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab('mandi')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'mandi'
                ? 'bg-white text-agri-forest-900 shadow-xs'
                : 'text-sand-700 hover:text-sand-900'
            }`}
          >
            {t('tabs.mandi')}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('direct-selling')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'direct-selling'
                ? 'bg-white text-agri-forest-900 shadow-xs'
                : 'text-sand-700 hover:text-sand-900'
            }`}
          >
            {t('tabs.direct_selling')}
          </button>
        </div>
      </div>

      {successMessage && (
        <div className="p-4 bg-agri-leaf-50 border border-agri-leaf-400 rounded-xl flex items-center gap-3 text-agri-leaf-800">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <p className="text-sm font-medium">{successMessage}</p>
        </div>
      )}

      {activeTab === 'mandi' ? (
        /* MANDI COMPARISON & LOGISTICS VIEW */
        <>
          {/* CROP & QUANTITY FILTERS */}
          <div className="bg-white p-3.5 rounded-xl border border-sand-200 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex-1">
                <label className="block text-xs font-semibold text-sand-700 mb-1">
                  🌾 {t('select_commodity')}
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {['Wheat', 'Soybean', 'Cotton', 'Mustard', 'Gram', 'Maize', 'Onion', 'Paddy', 'Potato', 'Tomato', 'Sugarcane', 'Bajra', 'Jowar', 'Groundnut'].map((cropId) => (
                    <button
                      key={cropId}
                      type="button"
                      onClick={() => setSelectedCrop(cropId)}
                      className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
                        selectedCrop === cropId
                          ? 'bg-agri-forest-800 text-white shadow-xs'
                          : 'bg-sand-100 text-sand-700 hover:bg-sand-200'
                      }`}
                    >
                      {t(`commodities.${cropId}`, { defaultValue: cropId })}
                    </button>
                  ))}
                </div>
              </div>

              <div className="w-full sm:w-40">
                <label className="block text-xs font-semibold text-sand-700 mb-1">
                  ⚖️ {t('sale_quantity')}
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="1"
                    max="10000"
                    value={selectedQuantity}
                    onChange={(e) => setSelectedQuantity(Math.max(1, Number(e.target.value) || 1))}
                    className="w-full px-3 py-1.5 text-xs font-bold border border-sand-300 rounded-lg bg-sand-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-agri-forest-500"
                  />
                  <span className="text-xs text-sand-500 font-medium whitespace-nowrap">{t('common:units.quintal')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Coordinates & Agmarknet benchmark banner */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 bg-sand-100 border border-sand-200 rounded-xl text-xs text-sand-700">
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-agri-forest-700" />
              <span>
                {t('farmer_location', {
                  location: location.district && location.state
                    ? `${location.district}, ${location.state}`
                    : (userCoordinates ? `${userCoordinates.lat.toFixed(4)}, ${userCoordinates.lon.toFixed(4)}` : t('location_not_set'))
                })}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 font-semibold text-agri-forest-900 bg-white px-2 py-0.5 rounded-md border border-sand-300">
                <Building className="h-3.5 w-3.5 text-agri-gold-600" />
                {t('source_ceda')}
              </span>
              <span className="text-sand-500">
                {t('rate_date', { date: data.lastUpdated ? new Date(data.lastUpdated).toLocaleDateString() : t('todays_rates') })}
              </span>
              {apiStatus?.isStale && (
                <span className="text-risk-amber-700 bg-risk-amber-100 px-2 py-0.5 rounded text-[11px] font-medium">
                  {t('update_pending')}
                </span>
              )}
            </div>
          </div>

          {/* Broader geographic scope note badge */}
          {apiStatus?.scopeNote && (
            <div className="flex items-center gap-2 px-3.5 py-2.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800">
              <span className="font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-900 text-[10px] uppercase tracking-wide">
                {apiStatus.scope === 'national' ? 'National Tier' : apiStatus.scope === 'state' ? 'State Tier' : 'District Tier'}
              </span>
              <span className="font-medium">{apiStatus.scopeNote}</span>
            </div>
          )}

          {/* Important note */}
          <Card className="bg-agri-gold-50 border-agri-gold-300/50">
            <CardContent>
              <p className="text-sm text-agri-gold-700 font-medium">
                💡 {t('not_always_best')}
              </p>
            </CardContent>
          </Card>

          {/* Selling Intelligence Decision Engine (Hold / Wait / Sell / Partial Sell) */}
          {sellingDecision ? (
            <SellingDecisionCard
              decision={sellingDecision}
              totalQuantity={selectedQuantity}
              onQuickSell={(qty) => {
                const m = markets.find(item => item.id === partialSelling?.sellNow?.marketId) || markets[0];
                if (m) setSellingModal({ market: m, quantity: qty });
              }}
            />
          ) : (
            partialSelling && markets && markets.length > 0 && (
              <PartialSellingCard
                data={partialSelling}
                onSeeCalculation={() => {
                  const m = markets.find(item => item.id === partialSelling.sellNow.marketId) || markets[0];
                  setSellingModal({ market: m, quantity: partialSelling.sellNow.quantity });
                }}
              />
            )
          )}

          {/* Quick Sell Modal / Action Box */}
          {sellingModal && (
            <Card className="p-4 border-2 border-agri-forest-800 bg-agri-forest-50/50">
              <h3 className="font-bold text-base text-sand-900 mb-2">
                {t('confirm_sale_title', { market: sellingModal.market.name })}
              </h3>
              <div className="space-y-2 text-sm mb-4">
                <p className="text-sand-700">{t('sale_quantity')}: <strong>{sellingModal.quantity} {t('common:units.quintal')}</strong></p>
                <p className="text-sand-700">{t('card.price')}: <strong>₹{sellingModal.market.price}/{t('common:units.quintal')}</strong></p>
                <p className="text-sand-700">{t('est_net_return')}: <strong>₹{(sellingModal.market.price * sellingModal.quantity).toLocaleString()}</strong></p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="primary"
                  onClick={() => handlePlaceOrder(sellingModal.market, sellingModal.quantity)}
                  isLoading={isSubmitting}
                >
                  {t('btn_confirm_sale')}
                </Button>
                <Button variant="ghost" onClick={() => setSellingModal(null)}>
                  {t('common:buttons.cancel')}
                </Button>
              </div>
            </Card>
          )}

          {/* Active Logistics / Orders */}
          {orders && orders.length > 0 && (
            <div>
              <SectionHeader title={t('direct.logistics_title')} icon={<Truck className="h-5 w-5 text-agri-forest-800" />} />
              <div className="space-y-2">
                {orders.map((ord: any) => (
                  <Card key={ord.id} className="p-3 bg-white border border-sand-200">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-bold text-sand-900">{ord.cropName} — {ord.quantity}q to {ord.marketName}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-agri-leaf-100 text-agri-leaf-800 font-semibold uppercase">{ord.status}</span>
                    </div>
                    {ord.shipment && (
                      <div className="text-xs text-sand-600 space-y-0.5">
                        <p>{t('direct.label_tracking')}: <strong>{ord.shipment.trackingCode}</strong></p>
                        <p>Driver: <strong>{ord.shipment.driverName} ({ord.shipment.vehicleNumber})</strong></p>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Market Comparison */}
          <div>
            <SectionHeader title={t('comparison.title')} icon={<span>📊</span>} />
            {markets && markets.length > 0 ? (
              <div className="space-y-3">
                {markets.map((market, index) => (
                  <div key={market.id}>
                    <MarketCard
                      market={market}
                      rank={index + 1}
                      onWhyClick={() => setShowWhy(showWhy === market.id ? null : market.id)}
                      onClick={() => setSellingModal({ market, quantity: 50 })}
                    />
                    {showWhy === market.id && (
                      <WhyExplanation
                        explanation={whyExplanation}
                        className="mt-2 animate-in slide-in-from-top-2"
                      />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <Card className="p-8 text-center bg-sand-50 border border-sand-200 rounded-xl my-4">
                <div className="w-14 h-14 rounded-full bg-agri-gold-100 flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl">🌾</span>
                </div>
                <h3 className="text-base font-bold text-sand-900 mb-1">
                  {t('empty_mandi_title')}
                </h3>
                <p className="text-xs text-sand-600 max-w-md mx-auto mb-4">
                  {t('empty_mandi_desc', { crop: t(`commodities.${selectedCrop}`, { defaultValue: selectedCrop }) })}
                </p>
                <div className="flex justify-center">
                  <Button variant="secondary" size="sm" onClick={() => refetch()}>
                    {t('common:buttons.retry')}
                  </Button>
                </div>
              </Card>
            )}
          </div>
        </>
      ) : (
        /* DIRECT BUYER SELLING & LISTINGS VIEW */
        <div className="space-y-6">
          {/* Header Action Card */}
          <Card className="p-4 bg-gradient-to-r from-agri-forest-800 to-agri-forest-900 text-white border-0 shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold">{t('direct.banner_title')}</h3>
                <p className="text-xs text-sand-200 mt-1 max-w-lg">
                  {t('direct.banner_desc')}
                </p>
              </div>
              <Button
                variant="gold"
                className="flex items-center gap-2 whitespace-nowrap self-start sm:self-auto"
                onClick={() => setShowAddListingModal(true)}
              >
                <Plus className="h-4 w-4" />
                <span>{t('direct.btn_add_listing')}</span>
              </Button>
            </div>
          </Card>

          {/* My Active Listings */}
          <div>
            <SectionHeader
              title={t('direct.my_listings_title')}
              icon={<Store className="h-5 w-5 text-agri-forest-800" />}
            />

            {isLoadingDirect ? (
              <Skeleton className="h-32 w-full rounded-xl" />
            ) : myListings.length === 0 ? (
              <EmptyState
                title={t('direct.empty_listings_title')}
                description={t('direct.empty_listings_desc')}
                actionLabel={t('direct.empty_listings_cta')}
                onAction={() => setShowAddListingModal(true)}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {myListings.map((item) => (
                  <Card key={item.id} className="p-4 border border-sand-200 relative">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-base text-sand-900">{item.cropName}</span>
                          <span className="text-xs text-sand-500 font-medium">({item.variety})</span>
                        </div>
                        <p className="text-xs text-sand-500 mt-0.5">{item.location}</p>
                      </div>
                      <Badge variant={item.status === 'active' ? 'success' : 'neutral'}>
                        {item.status.toUpperCase()}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 my-3 bg-sand-50 p-2.5 rounded-lg text-xs">
                      <div>
                        <span className="text-sand-500 block">{t('direct.col_quantity')}</span>
                        <span className="font-bold text-sand-900">{item.quantity} {t('common:units.quintal')}</span>
                      </div>
                      <div>
                        <span className="text-sand-500 block">{t('direct.col_price')}</span>
                        <span className="font-bold text-agri-forest-900">₹{item.pricePerQuintal}/q</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1 border-t border-sand-200">
                      <span className="text-sand-600">{t('direct.col_grade')}: <strong>{item.qualityGrade}</strong></span>
                      <button
                        type="button"
                        onClick={() => handleDeleteListing(item.id)}
                        className="text-risk-red-600 hover:text-risk-red-700 flex items-center gap-1 font-medium"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>{t('direct.btn_remove')}</span>
                      </button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Incoming Orders From Buyers */}
          <div>
            <SectionHeader
              title={t('direct.incoming_orders_title')}
              icon={<Package className="h-5 w-5 text-agri-forest-800" />}
            />

            {incomingOrders.length === 0 ? (
              <Card className="p-6 text-center text-xs text-sand-500 border border-sand-200">
                {t('direct.empty_orders_desc')}
              </Card>
            ) : (
              <div className="space-y-3">
                {incomingOrders.map((ord) => (
                  <Card key={ord.id} className="p-4 border border-sand-200">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-sand-200">
                      <div>
                        <span className="font-bold text-sm text-sand-900">
                          {ord.quantity}q {ord.cropName} — ₹{ord.totalAmount.toLocaleString('en-IN')}
                        </span>
                        <p className="text-xs text-sand-500 mt-0.5">
                          Buyer: <strong>{ord.buyerName}</strong> ({ord.buyerPhone})
                        </p>
                      </div>

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
                        {ord.status.toUpperCase()}
                      </Badge>
                    </div>

                    <div className="text-xs text-sand-600 pt-2 space-y-1">
                      <p>{t('direct.label_delivery_address')}: {ord.deliveryAddress}</p>
                      <p>{t('direct.label_tracking')}: <strong>{ord.trackingCode}</strong></p>
                    </div>

                    {/* Order Action Controls */}
                    <div className="flex gap-2 pt-3 border-t border-sand-200 mt-2">
                      {ord.status === 'placed' && (
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => handleUpdateOrderStatus(ord.id, 'confirmed')}
                        >
                          {t('direct.btn_accept_order')}
                        </Button>
                      )}
                      {ord.status === 'confirmed' && (
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => handleUpdateOrderStatus(ord.id, 'in_transit')}
                        >
                          {t('direct.btn_mark_in_transit')}
                        </Button>
                      )}
                      {ord.status === 'in_transit' && (
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => handleUpdateOrderStatus(ord.id, 'delivered')}
                        >
                          {t('direct.btn_mark_delivered')}
                        </Button>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Crop Listing Modal */}
      {showAddListingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-sand-900/60 backdrop-blur-sm animate-in fade-in">
          <Card className="w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden border border-sand-300">
            <div className="flex items-center justify-between p-4 border-b border-sand-200 bg-sand-50">
              <div className="flex items-center gap-2">
                <Store className="h-5 w-5 text-agri-forest-800" />
                <h3 className="font-bold text-base text-sand-900">{t('direct.modal_add_title')}</h3>
              </div>
              <button
                onClick={() => setShowAddListingModal(false)}
                className="p-1 rounded-lg text-sand-400 hover:text-sand-700 hover:bg-sand-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateListing} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-sand-800 mb-1 block">{t('direct.field_crop')} *</label>
                  <select
                    value={newCropName}
                    onChange={(e) => setNewCropName(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-sand-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-agri-forest-500"
                  >
                    <option value="Wheat">Wheat</option>
                    <option value="Mustard">Mustard</option>
                    <option value="Soybean">Soybean</option>
                    <option value="Rice">Rice</option>
                    <option value="Potato">Potato</option>
                    <option value="Cotton">Cotton</option>
                    <option value="Maize">Maize</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-sand-800 mb-1 block">{t('direct.field_variety')} *</label>
                  <input
                    type="text"
                    required
                    value={newVariety}
                    onChange={(e) => setNewVariety(e.target.value)}
                    placeholder="e.g. Sharbati, Pusa Bold"
                    className="w-full px-3 py-2 text-sm border border-sand-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-agri-forest-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-sand-800 mb-1 block">{t('direct.field_quantity')} *</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={newQuantity}
                    onChange={(e) => setNewQuantity(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-sand-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-agri-forest-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-sand-800 mb-1 block">{t('direct.field_price')} *</label>
                  <input
                    type="number"
                    min={100}
                    required
                    value={newPrice}
                    onChange={(e) => setNewPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-sand-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-agri-forest-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-sand-800 mb-1 block">{t('direct.field_grade')}</label>
                <select
                  value={newGrade}
                  onChange={(e) => setNewGrade(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-sand-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-agri-forest-500"
                >
                  <option value="Grade A">Grade A (High Quality)</option>
                  <option value="Grade B">Grade B (Standard)</option>
                  <option value="Grade A (Aromatic)">Grade A (Aromatic)</option>
                  <option value="Organic Certified">Organic Certified</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-sand-800 mb-1 block">{t('direct.field_description')}</label>
                <textarea
                  rows={2}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="..."
                  className="w-full px-3 py-2 text-xs border border-sand-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-agri-forest-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="submit" variant="primary" className="flex-1" isLoading={isSubmitting}>
                  {t('direct.btn_publish')}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setShowAddListingModal(false)}>
                  {t('common:buttons.cancel')}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
