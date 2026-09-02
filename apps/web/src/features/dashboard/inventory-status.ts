export interface InventoryStatus {
  label: "In stock" | "Low stock" | "Out of stock";
  className: "success" | "warning" | "danger";
}

export function getInventoryStatus(quantity: number): InventoryStatus {
  if (quantity === 0) return { label: "Out of stock", className: "danger" };
  if (quantity <= 5) return { label: "Low stock", className: "warning" };
  return { label: "In stock", className: "success" };
}

