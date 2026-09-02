import type { InventoryRepository } from "../../domain/inventory/inventory.ports";
import type {
  InventoryRow,
  InventorySummary,
  Location,
  Product,
} from "../../domain/inventory/inventory.models";
import { ApplicationError } from "../../domain/common/application-error";

export class InventoryApplicationService {
  constructor(private readonly inventory: InventoryRepository) {}

  async createProduct(sku: string, name: string): Promise<Product> {
    const normalizedSku = sku.trim().toUpperCase();
    const normalizedName = name.trim();
    if (!normalizedSku || !normalizedName) {
      throw new ApplicationError(
        "VALIDATION_ERROR",
        "SKU and product name are required.",
      );
    }
    return this.inventory.createProduct({ sku: normalizedSku, name: normalizedName });
  }

  async createLocation(code: string, name: string): Promise<Location> {
    const normalizedCode = code.trim().toUpperCase();
    const normalizedName = name.trim();
    if (!normalizedCode || !normalizedName) {
      throw new ApplicationError(
        "VALIDATION_ERROR",
        "Location code and name are required.",
      );
    }
    return this.inventory.createLocation({ code: normalizedCode, name: normalizedName });
  }

  async setStock(
    productId: string,
    locationId: string,
    quantity: number,
  ): Promise<InventoryRow> {
    if (!Number.isInteger(quantity) || quantity < 0) {
      throw new ApplicationError(
        "VALIDATION_ERROR",
        "Stock quantity must be a non-negative integer.",
      );
    }

    const [product, location] = await Promise.all([
      this.inventory.findProduct(productId),
      this.inventory.findLocation(locationId),
    ]);
    if (!product || !product.isActive) {
      throw new ApplicationError("NOT_FOUND", "Product not found.");
    }
    if (!location || !location.isActive) {
      throw new ApplicationError("NOT_FOUND", "Location not found.");
    }
    return this.inventory.setStock({ productId, locationId, quantity });
  }

  listProducts(): Promise<Product[]> {
    return this.inventory.listProducts();
  }

  listLocations(): Promise<Location[]> {
    return this.inventory.listLocations();
  }

  listInventory(locationId?: string): Promise<InventoryRow[]> {
    return this.inventory.listInventory(locationId);
  }

  getSummary(): Promise<InventorySummary> {
    return this.inventory.getSummary();
  }
}

