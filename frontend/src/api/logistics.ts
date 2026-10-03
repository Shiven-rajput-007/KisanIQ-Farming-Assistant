import { api } from './client';

export interface CropListing {
  id: string;
  farmerId: string;
  farmerName: string;
  farmerPhone?: string;
  district: string;
  state: string;
  cropName: string;
  variety: string;
  quantityQuintals: number;
  pricePerQuintal: number;
  qualityGrade: string;
  harvestDate?: string;
  location?: string;
  description?: string;
  status: string;
  createdAt: string;
}

export interface MarketplaceOrder {
  id: string;
  listingId?: string;
  buyerId: string;
  farmerId: string;
  cropName: string;
  quantityQuintals: number;
  pricePerQuintal: number;
  totalAmount: number;
  deliveryAddress: string;
  buyerName: string;
  buyerPhone: string;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  trackingCode?: string;
  notes?: string;
  createdAt: string;
}

export const orderApi = {
  createOrder: (data: {
    marketId: string;
    cropName: string;
    quantityQuintals: number;
    agreedPricePerQuintal: number;
    pickupLocation: string;
    notes?: string;
  }) =>
    api.post<{
      success: boolean;
      order: any;
      shipment: any;
      vehicle: any;
      message: string;
    }>('/market/orders', data),
  getOrders: () =>
    api.get<{ success: boolean; orders: any[]; shipments: any[] }>('/orders'),
  getOrderById: (id: string) =>
    api.get<{ success: boolean; order: any; shipment: any }>('/orders/' + id),
};

export const marketplaceApi = {
  getListings: (params?: { crop?: string; district?: string; minQty?: number }) => {
    const sp = new URLSearchParams();
    if (params?.crop) sp.append('crop', params.crop);
    if (params?.district) sp.append('district', params.district);
    if (params?.minQty) sp.append('minQty', params.minQty.toString());
    const qs = sp.toString();
    return api.get<{ success: boolean; listings: CropListing[] }>(`/marketplace/listings${qs ? `?${qs}` : ''}`);
  },
  getMyListings: () =>
    api.get<{ success: boolean; listings: CropListing[] }>('/marketplace/my-listings'),
  createListing: (data: Partial<CropListing>) =>
    api.post<{ success: boolean; listing: CropListing; message: string }>('/marketplace/listings', data),
  updateListingStatus: (id: string, status: string) =>
    api.put<{ success: boolean; listing: CropListing }>(`/marketplace/listings/${id}/status`, { status }),
  deleteListing: (id: string) =>
    api.delete<{ success: boolean; message: string }>(`/marketplace/listings/${id}`),
  createOrder: (data: {
    listingId: string;
    quantityQuintals: number;
    deliveryAddress: string;
    buyerName: string;
    buyerPhone: string;
    notes?: string;
  }) =>
    api.post<{ success: boolean; order: MarketplaceOrder; message: string }>('/marketplace/orders', data),
  getOrders: () =>
    api.get<{ success: boolean; orders: MarketplaceOrder[] }>('/marketplace/orders'),
  updateOrderStatus: (id: string, status: string) =>
    api.put<{ success: boolean; order: MarketplaceOrder }>(`/marketplace/orders/${id}/status`, { status }),
};
