import { useAuth } from "./auth/AuthContext";
import { LoginScreen } from "./features/auth/LoginScreen";
import { Dashboard } from "./features/dashboard/Dashboard";

export function App() {
  const { user, loading } = useAuth();
  if (loading) return <div className="app-loading" role="status">Loading Stockline...</div>;
  return user ? <Dashboard /> : <LoginScreen />;
}

