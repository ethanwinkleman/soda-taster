import { BrowserRouter, Routes, Route, useParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AuthGate } from './components/AuthGate';
import { useSodas } from './hooks/useSodas';
import { useInventory } from './hooks/useInventory';
import { Sidebar } from './components/Sidebar';
import { MobileHeader } from './components/MobileHeader';
import { BottomNav } from './components/BottomNav';
import { HomePage } from './pages/HomePage';
import { AddSodaPage } from './pages/AddSodaPage';
import { SodaDetailPage } from './pages/SodaDetailPage';
import { FavoritesPage } from './pages/FavoritesPage';
import { ChartsPage } from './pages/ChartsPage';
import { InventoryPage } from './pages/InventoryPage';
import { PublicProfilePage } from './pages/PublicProfilePage';
import type { SodaEntry } from './types/soda';

function EditSodaWrapper({
  sodas,
  onUpdate,
}: {
  sodas: SodaEntry[];
  onUpdate: (soda: SodaEntry) => void;
}) {
  const { id } = useParams<{ id: string }>();
  const soda = sodas.find((s) => s.id === id);
  if (!soda) return <div className="text-center py-20 text-gray-400">Soda not found.</div>;
  return <AddSodaPage onAdd={() => {}} existingSoda={soda} onUpdate={onUpdate} />;
}

function AppRoutes() {
  const { user } = useAuth();
  const { sodas, error, add, update, remove, toggleFavorite } = useSodas(user?.id);
  const { items, loading: invLoading, add: invAdd, setQuantity: invSetQty, remove: invRemove, link: invLink, unlink: invUnlink } = useInventory(user?.id);

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <Sidebar />
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen">
        <MobileHeader />
        {error && (
          <div className="max-w-4xl mx-auto w-full px-4 mt-3">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-sm text-red-600 dark:text-red-400">
              <strong>Database error:</strong> {error} — make sure the <code>sodas</code> table has been created in Supabase.
            </div>
          </div>
        )}
        <main className="flex-1 pb-20 md:pb-0">
          <Routes>
            <Route path="/" element={<HomePage sodas={sodas} onToggleFavorite={toggleFavorite} />} />
            <Route path="/add" element={<AddSodaPage onAdd={add} onLink={invLink} />} />
            <Route path="/edit/:id" element={<EditSodaWrapper sodas={sodas} onUpdate={update} />} />
            <Route
              path="/soda/:id"
              element={
                <SodaDetailPage sodas={sodas} onToggleFavorite={toggleFavorite} onDelete={remove} />
              }
            />
            <Route path="/favorites" element={<FavoritesPage sodas={sodas} onToggleFavorite={toggleFavorite} />} />
            <Route path="/inventory" element={<InventoryPage items={items} sodas={sodas} loading={invLoading} onAdd={invAdd} onSetQuantity={invSetQty} onRemove={invRemove} onLink={invLink} onUnlink={invUnlink} />} />
            <Route path="/charts" element={<ChartsPage sodas={sodas} />} />
          </Routes>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public — no auth required */}
          <Route path="/u/:username" element={<PublicProfilePage />} />
          {/* Everything else requires sign-in */}
          <Route path="/*" element={
            <AuthGate>
              <AppRoutes />
            </AuthGate>
          } />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
