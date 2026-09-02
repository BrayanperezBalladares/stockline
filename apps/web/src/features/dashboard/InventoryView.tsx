import { AlertTriangle, Box, MapPin, Plus } from "lucide-react";
import type {
  InventoryRow,
  InventorySummary,
  Location,
} from "../../api/types";
import { getInventoryStatus } from "./inventory-status";

interface Props {
  isAdmin: boolean;
  rows: InventoryRow[];
  summary: InventorySummary;
  locations: Location[];
  selectedLocation: string;
  loading: boolean;
  canAdjust: boolean;
  onLocationChange(value: string): void;
  onAdjust(row: InventoryRow | null): void;
}

export function InventoryView({
  isAdmin,
  rows,
  summary,
  locations,
  selectedLocation,
  loading,
  canAdjust,
  onLocationChange,
  onAdjust,
}: Props) {
  return (
    <section aria-labelledby="inventory-title">
      <div className="page-heading-row">
        <div>
          <h1 id="inventory-title">Inventory by location</h1>
          <label htmlFor="location-filter">Location</label>
          <select
            id="location-filter"
            value={selectedLocation}
            onChange={(event) => onLocationChange(event.target.value)}
          >
            <option value="">All locations</option>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>{location.name}</option>
            ))}
          </select>
        </div>
        {isAdmin ? (
          <button
            className="secondary-accent-button"
            onClick={() => onAdjust(null)}
            disabled={!canAdjust}
          >
            <Plus size={17} /> Adjust stock
          </button>
        ) : null}
      </div>

      <div className="summary-strip" aria-label="Inventory summary">
        <div><Box aria-hidden="true" /><span>Products<strong>{summary.products}</strong></span></div>
        <div><MapPin aria-hidden="true" /><span>Locations<strong>{summary.locations}</strong></span></div>
        <div><AlertTriangle aria-hidden="true" /><span>Low stock<strong>{summary.lowStock}</strong></span></div>
      </div>

      <div className="table-frame">
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>SKU</th>
              <th>Location</th>
              <th className="numeric">Stock</th>
              <th>Status</th>
              {isAdmin ? <th aria-label="Actions" /> : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const status = getInventoryStatus(row.quantity);
              return (
                <tr key={row.id}>
                  <td className="primary-cell">{row.productName}</td>
                  <td>{row.sku}</td>
                  <td>{row.locationName}</td>
                  <td className="numeric">{row.quantity}</td>
                  <td><span className={`status ${status.className}`}><i />{status.label}</span></td>
                  {isAdmin ? <td className="action-cell"><button className="row-action" onClick={() => onAdjust(row)}>Adjust</button></td> : null}
                </tr>
              );
            })}
          </tbody>
        </table>
        {!loading && rows.length === 0 ? (
          <div className="empty-state">
            <Box size={28} aria-hidden="true" />
            <h2>No inventory records yet</h2>
            <p>Create a product and location, then set their stock quantity.</p>
          </div>
        ) : null}
        {loading ? <div className="loading-row">Loading inventory...</div> : null}
      </div>
    </section>
  );
}
