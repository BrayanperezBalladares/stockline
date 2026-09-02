import {
  Boxes,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  Package,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError, apiRequest } from "../../api/client";
import type {
  InventoryRow,
  InventorySummary,
  Location,
  Product,
  User,
} from "../../api/types";
import { useAuth } from "../../auth/AuthContext";
import { AdjustStockDialog } from "./AdjustStockDialog";
import { CatalogView } from "./CatalogView";
import { InventoryView } from "./InventoryView";
import { UsersView } from "./UsersView";

type View = "overview" | "inventory" | "products" | "locations" | "users";

const EMPTY_SUMMARY: InventorySummary = { products: 0, locations: 0, lowStock: 0 };

export function Dashboard() {
  const { user, logout } = useAuth();
  const [view, setView] = useState<View>("overview");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [rows, setRows] = useState<InventoryRow[]>([]);
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [selectedLocation, setSelectedLocation] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(false);
  const [adjusting, setAdjusting] = useState<InventoryRow | null | undefined>(undefined);
  const [message, setMessage] = useState<string | null>(null);
  const isAdmin = user?.role === "ADMIN";

  const loadCommonData = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const [loadedProducts, loadedLocations, loadedRows, loadedSummary] =
        await Promise.all([
          apiRequest<Product[]>("/products"),
          apiRequest<Location[]>("/locations"),
          apiRequest<InventoryRow[]>("/inventory"),
          apiRequest<InventorySummary>("/inventory/summary"),
        ]);
      setProducts(loadedProducts);
      setLocations(loadedLocations);
      setRows(loadedRows);
      setSummary(loadedSummary);
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "Unable to load inventory.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCommonData();
  }, [loadCommonData]);

  useEffect(() => {
    let cancelled = false;
    async function filterInventory() {
      setLoading(true);
      const query = selectedLocation ? `?locationId=${encodeURIComponent(selectedLocation)}` : "";
      try {
        const loaded = await apiRequest<InventoryRow[]>(`/inventory${query}`);
        if (!cancelled) setRows(loaded);
      } catch (error) {
        if (!cancelled) setMessage(error instanceof ApiError ? error.message : "Unable to filter inventory.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void filterInventory();
    return () => { cancelled = true; };
  }, [selectedLocation]);

  useEffect(() => {
    if (view !== "users" || !isAdmin) return;
    let cancelled = false;
    setUsersLoading(true);
    apiRequest<User[]>("/users")
      .then((loaded) => { if (!cancelled) setUsers(loaded); })
      .catch((error: unknown) => { if (!cancelled) setMessage(error instanceof ApiError ? error.message : "Unable to load users."); })
      .finally(() => { if (!cancelled) setUsersLoading(false); });
    return () => { cancelled = true; };
  }, [view, isAdmin]);

  const navigation = useMemo(() => [
    { id: "overview" as const, label: "Overview", icon: LayoutDashboard },
    { id: "inventory" as const, label: "Inventory", icon: Boxes },
    { id: "products" as const, label: "Products", icon: Package },
    { id: "locations" as const, label: "Locations", icon: MapPin },
    ...(isAdmin ? [{ id: "users" as const, label: "Users", icon: Users }] : []),
  ], [isAdmin]);

  async function saveStock(productId: string, locationId: string, quantity: number) {
    setMessage(null);
    try {
      await apiRequest(`/inventory/products/${productId}/locations/${locationId}`, {
        method: "PUT",
        body: JSON.stringify({ quantity }),
      });
      await loadCommonData();
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "Unable to update stock.");
      throw error;
    }
  }

  async function createProduct(sku: string, name: string) {
    try {
      await apiRequest("/products", { method: "POST", body: JSON.stringify({ sku, name }) });
      await loadCommonData();
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "Unable to create product.");
      throw error;
    }
  }

  async function createLocation(code: string, name: string) {
    try {
      await apiRequest("/locations", { method: "POST", body: JSON.stringify({ code, name }) });
      await loadCommonData();
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "Unable to create location.");
      throw error;
    }
  }

  async function toggleActivity(target: User) {
    try {
      const updated = await apiRequest<User>(`/users/${target.id}/activity`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !target.isActive }),
      });
      setUsers((current) => current.map((item) => item.id === updated.id ? updated : item));
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "Unable to update user.");
    }
  }

  function selectView(next: View) {
    setView(next);
    setMobileNavOpen(false);
  }

  return (
    <div className="app-shell">
      <aside className={mobileNavOpen ? "sidebar open" : "sidebar"}>
        <div className="sidebar-brand">Stockline</div>
        <nav aria-label="Primary navigation">
          {navigation.map((item) => {
            const Icon = item.icon;
            return <button key={item.id} className={view === item.id ? "active" : ""} onClick={() => selectView(item.id)}><Icon size={18} />{item.label}</button>;
          })}
        </nav>
      </aside>
      <div className="main-column">
        <header className="topbar">
          <button className="icon-button menu-button" onClick={() => setMobileNavOpen((open) => !open)} aria-label="Toggle navigation"><Menu size={20} /></button>
          <div className="account-block">
            <span className="avatar">{user?.email.slice(0, 2).toUpperCase()}</span>
            <span><strong>{user?.email}</strong><small>{isAdmin ? "Administrator" : "Subscription L1"}</small></span>
            <ChevronDown size={16} aria-hidden="true" />
            <button className="icon-button" onClick={() => void logout()} aria-label="Sign out"><LogOut size={18} /></button>
          </div>
        </header>
        <main className="workspace">
          {message ? <div className="alert" role="alert">{message}<button onClick={() => setMessage(null)}>Dismiss</button></div> : null}
          {view === "overview" || view === "inventory" ? (
            <InventoryView isAdmin={isAdmin} rows={rows} summary={summary} locations={locations} selectedLocation={selectedLocation} loading={loading} canAdjust={products.length > 0 && locations.length > 0} onLocationChange={setSelectedLocation} onAdjust={(row) => setAdjusting(row)} />
          ) : null}
          {view === "products" ? <CatalogView kind="products" isAdmin={isAdmin} products={products} locations={locations} onCreateProduct={createProduct} onCreateLocation={createLocation} /> : null}
          {view === "locations" ? <CatalogView kind="locations" isAdmin={isAdmin} products={products} locations={locations} onCreateProduct={createProduct} onCreateLocation={createLocation} /> : null}
          {view === "users" && user ? <UsersView users={users} loading={usersLoading} currentUserId={user.id} onToggleActivity={toggleActivity} /> : null}
        </main>
      </div>
      {adjusting !== undefined ? <AdjustStockDialog products={products} locations={locations} initialRow={adjusting} onClose={() => setAdjusting(undefined)} onSave={saveStock} /> : null}
    </div>
  );
}
