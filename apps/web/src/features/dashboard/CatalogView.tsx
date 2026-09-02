import { useState, type FormEvent } from "react";
import type { Location, Product } from "../../api/types";

type CatalogKind = "products" | "locations";

interface Props {
  kind: CatalogKind;
  isAdmin: boolean;
  products: Product[];
  locations: Location[];
  onCreateProduct(sku: string, name: string): Promise<void>;
  onCreateLocation(code: string, name: string): Promise<void>;
}

export function CatalogView({
  kind,
  isAdmin,
  products,
  locations,
  onCreateProduct,
  onCreateLocation,
}: Props) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const isProducts = kind === "products";
  const items = isProducts ? products : locations;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      if (isProducts) await onCreateProduct(code, name);
      else await onCreateLocation(code, name);
      setCode("");
      setName("");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section aria-labelledby="catalog-title">
      <div className="page-heading-row catalog-heading">
        <div>
          <h1 id="catalog-title">{isProducts ? "Products" : "Locations"}</h1>
          <p>Manage the {isProducts ? "product catalog" : "places where inventory is stored"}.</p>
        </div>
      </div>
      {isAdmin ? (
        <form className="inline-create-form" onSubmit={submit}>
          <div>
            <label htmlFor="catalog-code">{isProducts ? "SKU" : "Code"}</label>
            <input id="catalog-code" value={code} onChange={(event) => setCode(event.target.value)} required />
          </div>
          <div>
            <label htmlFor="catalog-name">Name</label>
            <input id="catalog-name" value={name} onChange={(event) => setName(event.target.value)} required />
          </div>
          <button className="primary-button" disabled={saving}>{saving ? "Creating..." : `Create ${isProducts ? "product" : "location"}`}</button>
        </form>
      ) : null}
      <div className="table-frame catalog-table">
        <table>
          <thead><tr><th>{isProducts ? "SKU" : "Code"}</th><th>Name</th><th>Status</th></tr></thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td className="primary-cell">{"sku" in item ? item.sku : item.code}</td>
                <td>{item.name}</td>
                <td><span className="status success"><i />Active</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 ? <div className="empty-state"><h2>No records yet</h2></div> : null}
      </div>
    </section>
  );
}

