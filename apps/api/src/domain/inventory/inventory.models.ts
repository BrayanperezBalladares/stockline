export interface Product {
  id: string;
  sku: string;
  name: string;
  isActive: boolean;
}

export interface Location {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
}

export interface InventoryRow {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  locationId: string;
  locationCode: string;
  locationName: string;
  quantity: number;
  updatedAt: Date;
}

export interface InventorySummary {
  products: number;
  locations: number;
  lowStock: number;
}

