export interface Farmer {
  id: string;
  name: string;
  phone?: string;
  location: FarmerLocation;
  preferredLanguage: string;
  profileComplete: boolean;
  createdAt: string;
}

export interface FarmerLocation {
  village?: string;
  district: string;
  state: string;
  pincode?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface FarmProfile {
  id: string;
  farmerId: string;
  totalArea: number; // in acres
  fields: Field[];
  soilType: SoilType;
  irrigationSource: IrrigationType;
  crops: string[]; // crop IDs
}

export interface Field {
  id: string;
  name: string;
  area: number; // in acres
  cropId?: string;
  soilType?: SoilType;
  irrigationType?: IrrigationType;
}

export type SoilType =
  | 'alluvial'
  | 'black'
  | 'red'
  | 'laterite'
  | 'sandy'
  | 'clayey'
  | 'loamy';

export type IrrigationType =
  | 'canal'
  | 'borewell'
  | 'well'
  | 'drip'
  | 'sprinkler'
  | 'rainfed'
  | 'river';
