import { describe, expect, it } from "vitest";
import { getInventoryStatus } from "./inventory-status";

describe("getInventoryStatus", () => {
  it("distinguishes out of stock, low stock, and available inventory", () => {
    expect(getInventoryStatus(0).label).toBe("Out of stock");
    expect(getInventoryStatus(5).label).toBe("Low stock");
    expect(getInventoryStatus(6).label).toBe("In stock");
  });
});

