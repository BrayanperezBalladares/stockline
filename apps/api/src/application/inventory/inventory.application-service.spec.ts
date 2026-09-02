import { describe, expect, it } from "vitest";
import { InventoryApplicationService } from "./inventory.application-service";
import type { InventoryRepository } from "../../domain/inventory/inventory.ports";
import type { InventoryRow, Location, Product } from "../../domain/inventory/inventory.models";

class FakeInventory implements InventoryRepository {
  products: Product[] = [];
  locations: Location[] = [];
  rows: InventoryRow[] = [];
  async createProduct(data: { sku: string; name: string }) { const item = { ...data, id: `product-${this.products.length + 1}`, isActive: true }; this.products.push(item); return item; }
  async createLocation(data: { code: string; name: string }) { const item = { ...data, id: `location-${this.locations.length + 1}`, isActive: true }; this.locations.push(item); return item; }
  async findProduct(id: string) { return this.products.find((item) => item.id === id) ?? null; }
  async findLocation(id: string) { return this.locations.find((item) => item.id === id) ?? null; }
  async listProducts() { return this.products; }
  async listLocations() { return this.locations; }
  async setStock(data: { productId: string; locationId: string; quantity: number }) {
    const product = (await this.findProduct(data.productId))!;
    const location = (await this.findLocation(data.locationId))!;
    const row = { id: "balance-1", ...data, productName: product.name, sku: product.sku, locationCode: location.code, locationName: location.name, updatedAt: new Date() };
    this.rows = [row];
    return row;
  }
  async listInventory(locationId?: string) { return locationId ? this.rows.filter((row) => row.locationId === locationId) : this.rows; }
  async getSummary() { return { products: this.products.length, locations: this.locations.length, lowStock: this.rows.filter((row) => row.quantity <= 5).length }; }
}

describe("InventoryApplicationService", () => {
  it("models stock as a product-location balance", async () => {
    const repository = new FakeInventory();
    const service = new InventoryApplicationService(repository);
    const product = await service.createProduct(" cof-001 ", "Coffee beans");
    const location = await service.createLocation(" warehouse ", "Central warehouse");
    const balance = await service.setStock(product.id, location.id, 12);
    expect(balance).toMatchObject({ sku: "COF-001", locationCode: "WAREHOUSE", quantity: 12 });
  });

  it("rejects negative stock before persistence", async () => {
    const repository = new FakeInventory();
    const service = new InventoryApplicationService(repository);
    const product = await service.createProduct("COF-001", "Coffee beans");
    const location = await service.createLocation("WAREHOUSE", "Central warehouse");
    await expect(service.setStock(product.id, location.id, -1)).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });
});

