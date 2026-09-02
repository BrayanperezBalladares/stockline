import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common";
import type { InventoryApplicationService } from "../../../application/inventory/inventory.application-service";
import { TOKENS } from "../../../app.tokens";
import { UserRole } from "../../../domain/auth/auth.models";
import { Roles } from "../decorators/roles.decorator";
import {
  CreateLocationDto,
  CreateProductDto,
  SetStockDto,
} from "../dto/inventory.dto";
import { JwtAuthGuard } from "../guards/jwt-auth.guard";
import { RolesGuard } from "../guards/roles.guard";

@Controller()
@UseGuards(JwtAuthGuard)
export class InventoryController {
  constructor(
    @Inject(TOKENS.inventoryApplication)
    private readonly inventory: InventoryApplicationService,
  ) {}

  @Get("products")
  products() {
    return this.inventory.listProducts();
  }

  @Post("products")
  @Roles(UserRole.Admin)
  @UseGuards(RolesGuard)
  createProduct(@Body() dto: CreateProductDto) {
    return this.inventory.createProduct(dto.sku, dto.name);
  }

  @Get("locations")
  locations() {
    return this.inventory.listLocations();
  }

  @Post("locations")
  @Roles(UserRole.Admin)
  @UseGuards(RolesGuard)
  createLocation(@Body() dto: CreateLocationDto) {
    return this.inventory.createLocation(dto.code, dto.name);
  }

  @Get("inventory")
  listInventory(@Query("locationId") locationId?: string) {
    return this.inventory.listInventory(locationId);
  }

  @Get("inventory/summary")
  summary() {
    return this.inventory.getSummary();
  }

  @Put("inventory/products/:productId/locations/:locationId")
  @Roles(UserRole.Admin)
  @UseGuards(RolesGuard)
  setStock(
    @Param("productId") productId: string,
    @Param("locationId") locationId: string,
    @Body() dto: SetStockDto,
  ) {
    return this.inventory.setStock(productId, locationId, dto.quantity);
  }
}

