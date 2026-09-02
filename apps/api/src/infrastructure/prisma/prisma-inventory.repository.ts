import { Injectable } from "@nestjs/common";
import { ApplicationError } from "../../domain/common/application-error";
import type {
  InventoryRow,
  InventorySummary,
  Location,
  Product,
} from "../../domain/inventory/inventory.models";
import type { InventoryRepository } from "../../domain/inventory/inventory.ports";
import { PrismaService } from "./prisma.service";

interface BalanceRecord {
  id: string;
  productId: string;
  locationId: string;
  quantity: number;
  updatedAt: Date;
  product: { name: string; sku: string };
  location: { code: string; name: string };
}

@Injectable()
export class PrismaInventoryRepository implements InventoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createProduct(data: { sku: string; name: string }): Promise<Product> {
    try {
      return await this.prisma.product.create({ data });
    } catch (error) {
      this.rethrowUnique(error, "A product with this SKU already exists.");
    }
  }

  async createLocation(data: { code: string; name: string }): Promise<Location> {
    try {
      return await this.prisma.location.create({ data });
    } catch (error) {
      this.rethrowUnique(error, "A location with this code already exists.");
    }
  }

  findProduct(id: string): Promise<Product | null> {
    return this.prisma.product.findUnique({ where: { id } });
  }

  findLocation(id: string): Promise<Location | null> {
    return this.prisma.location.findUnique({ where: { id } });
  }

  listProducts(): Promise<Product[]> {
    return this.prisma.product.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });
  }

  listLocations(): Promise<Location[]> {
    return this.prisma.location.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });
  }

  async setStock(data: {
    productId: string;
    locationId: string;
    quantity: number;
  }): Promise<InventoryRow> {
    const record = await this.prisma.inventoryBalance.upsert({
      where: {
        productId_locationId: {
          productId: data.productId,
          locationId: data.locationId,
        },
      },
      create: data,
      update: { quantity: data.quantity },
      include: {
        product: { select: { name: true, sku: true } },
        location: { select: { code: true, name: true } },
      },
    });
    return this.toRow(record);
  }

  async listInventory(locationId?: string): Promise<InventoryRow[]> {
    const records = await this.prisma.inventoryBalance.findMany({
      where: locationId ? { locationId } : {},
      include: {
        product: { select: { name: true, sku: true } },
        location: { select: { code: true, name: true } },
      },
      orderBy: [{ product: { name: "asc" } }, { location: { name: "asc" } }],
    });
    return records.map((record) => this.toRow(record));
  }

  async getSummary(): Promise<InventorySummary> {
    const [products, locations, lowStock] = await Promise.all([
      this.prisma.product.count({ where: { isActive: true } }),
      this.prisma.location.count({ where: { isActive: true } }),
      this.prisma.inventoryBalance.count({ where: { quantity: { lte: 5 } } }),
    ]);
    return { products, locations, lowStock };
  }

  private toRow(record: BalanceRecord): InventoryRow {
    return {
      id: record.id,
      productId: record.productId,
      productName: record.product.name,
      sku: record.product.sku,
      locationId: record.locationId,
      locationCode: record.location.code,
      locationName: record.location.name,
      quantity: record.quantity,
      updatedAt: record.updatedAt,
    };
  }

  private rethrowUnique(error: unknown, message: string): never {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      throw new ApplicationError("CONFLICT", message);
    }
    throw error;
  }
}

