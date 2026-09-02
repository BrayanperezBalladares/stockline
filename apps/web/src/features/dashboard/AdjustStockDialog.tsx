import { X } from "lucide-react";
import { useState, type FormEvent } from "react";
import type { InventoryRow, Location, Product } from "../../api/types";

interface Props {
  products: Product[];
  locations: Location[];
  initialRow: InventoryRow | null;
  onClose(): void;
  onSave(productId: string, locationId: string, quantity: number): Promise<void>;
}

export function AdjustStockDialog({
  products,
  locations,
  initialRow,
  onClose,
  onSave,
}: Props) {
  const [productId, setProductId] = useState(initialRow?.productId ?? products[0]?.id ?? "");
  const [locationId, setLocationId] = useState(initialRow?.locationId ?? locations[0]?.id ?? "");
  const [quantity, setQuantity] = useState(initialRow?.quantity ?? 0);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      await onSave(productId, locationId, quantity);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="adjust-stock-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <h2 id="adjust-stock-title">Adjust stock</h2>
            <p>Set the current quantity for one product and location.</p>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close dialog">
            <X size={19} />
          </button>
        </header>
        <form onSubmit={handleSubmit} className="stack-form">
          <label htmlFor="stock-product">Product</label>
          <select id="stock-product" value={productId} onChange={(event) => setProductId(event.target.value)} required>
            {products.map((product) => <option value={product.id} key={product.id}>{product.name} · {product.sku}</option>)}
          </select>
          <label htmlFor="stock-location">Location</label>
          <select id="stock-location" value={locationId} onChange={(event) => setLocationId(event.target.value)} required>
            {locations.map((location) => <option value={location.id} key={location.id}>{location.name}</option>)}
          </select>
          <label htmlFor="stock-quantity">Quantity</label>
          <input id="stock-quantity" type="number" min="0" step="1" value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} required />
          <footer>
            <button type="button" className="secondary-button" onClick={onClose}>Cancel</button>
            <button className="primary-button" disabled={saving || !productId || !locationId}>{saving ? "Saving..." : "Save stock"}</button>
          </footer>
        </form>
      </section>
    </div>
  );
}

