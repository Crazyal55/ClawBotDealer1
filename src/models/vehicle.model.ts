export interface Vehicle {
  id?: number;
  vin: string;
  year: number;
  make: string;
  model: string;
  trim?: string;
  price: number;
  mileage: number | null;
  stockNumber?: string;
  bodyType?: string;
  transmission?: string;
  drivetrain?: string;
  fuelType?: string;
  exteriorColor?: string;
  interiorColor?: string;
  features?: string[];
  images?: string[];
  description?: string;
  dealerName?: string;
  dealerAddress?: string;
  dealerPhone?: string;
  source?: string;
  url?: string;
  qualityScore?: number;
  qualityFlags?: QualityFlag[];
  scrapedAt?: Date;
  dealershipId?: string;
  embeddingId?: string;
}

export interface QualityFlag {
  type: 'error' | 'warning' | 'info';
  message: string;
  code?: string;
}

export interface VehicleInput {
  vin: string;
  year: number;
  make: string;
  model: string;
  trim?: string;
  price: number;
  mileage?: number;
  stockNumber?: string;
  bodyType?: string;
  transmission?: string;
  drivetrain?: string;
  fuelType?: string;
  exteriorColor?: string;
  interiorColor?: string;
  features?: string[];
  images?: string[];
  description?: string;
  dealerName?: string;
  dealerAddress?: string;
  dealerPhone?: string;
  source?: string;
  url?: string;
  dealershipId: string;
}

export interface VehicleFilter {
  dealershipId?: string;
  make?: string;
  model?: string;
  minYear?: number;
  maxYear?: number;
  minPrice?: number;
  maxPrice?: number;
  minQuality?: number;
  source?: string;
  limit?: number;
  offset?: number;
}

export interface VehicleUpdate {
  price?: number;
  mileage?: number;
  description?: string;
  images?: string[];
  features?: string[];
}

export interface VehicleSearchResult {
  vehicles: Vehicle[];
  total: number;
  filters: VehicleFilter;
}
