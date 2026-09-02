import type {
  InventoryRow,
  InventorySummary,
  Location,
  Product,
} from "./inventory.models";

export interface InventoryRepository {
  createProduct(data: { sku: string; name: string }): Promise<Product>;
  createLocation(data: { code: string; name: string }): Promise<Location>;
  findProduct(id: string): Promise<Product | null>;
  findLocation(id: string): Promise<Location | null>;
  listProducts(): Promise<Product[]>;
  listLocations(): Promise<Location[]>;
  setStock(data: {
    productId: string;
    locationId: string;
    quantity: number;
  }): Promise<InventoryRow>;
  listInventory(locationId?: string): Promise<InventoryRow[]>;
  getSummary(): Promise<InventorySummary>;
}

