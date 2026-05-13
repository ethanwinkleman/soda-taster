import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Keep unused query data for 24 h so the persisted cache survives app relaunches
      gcTime: 24 * 60 * 60 * 1000,
    },
  },
});

const persister = createSyncStoragePersister({
  storage: window.localStorage,
  key: 'soda-taster-rq',
});

const StashesPage       = lazy(() => import('./pages/StashesPage').then(m => ({ default: m.StashesPage })));
const StashPage         = lazy(() => import('./pages/StashPage').then(m => ({ default: m.StashPage })));
const AddSodaPage       = lazy(() => import('./pages/AddSodaPage').then(m => ({ default: m.AddSodaPage })));
const SodaDetailPage    = lazy(() => import('./pages/SodaDetailPage').then(m => ({ default: m.SodaDetailPage })));
const StashActivityPage = lazy(() => import('./pages/StashActivityPage').then(m => ({ default: m.StashActivityPage })));
const PublicProfilePage = lazy(() => import('./pages/PublicProfilePage').then(m => ({ default: m.PublicProfilePage })));
const JoinStashPage     = lazy(() => import('./pages/JoinStashPage').then(m => ({ default: m.JoinStashPage })));
const BarcodeScanPage   = lazy(() => import('./pages/BarcodeScanPage').then(m => ({ default: m.BarcodeScanPage })));
const BarcodeResultPage = lazy(() => import('./pages/BarcodeResultPage').then(m => ({ default: m.BarcodeResultPage })));
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AuthGate } from './components/AuthGate';
import { useStashes } from './hooks/useStashes';
import { Sidebar } from './components/Sidebar';
import { MobileHeader } from './components/MobileHeader';
import { BottomNav } from './components/BottomNav';
import { PendingJoinHandler } from './components/PendingJoinHandler';

function AppRoutes() {
  const { user } = useAuth();
  const location = useLocation();
  const {
    stashes,
    loading: stashesLoading,
    recentActivity,
    createStash,
    renameStash,
    updateStashIcon,
    updateAccentColor,
    deleteStash,
    joinStash,
    leaveStash,
    toggleFavorite,
    getMembers,
    removeMember,
  } = useStashes(user?.id);

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <PendingJoinHandler onJoined={joinStash} />
      <Sidebar stashes={stashes} loading={stashesLoading} onToggleFavorite={toggleFavorite} />
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen overflow-x-hidden">
        <MobileHeader />
        <main className="flex-1 pb-20 md:pb-0">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <Suspense>
            <Routes location={location}>
              <Route
                path="/"
                element={<StashesPage stashes={stashes} loading={stashesLoading} recentActivity={recentActivity} onCreate={createStash} onJoin={joinStash} />}
              />
              <Route
                path="/stash/:id"
                element={
                  <StashPage
                    stashes={stashes}
                    onRename={renameStash}
                    onUpdateIcon={updateStashIcon}
                    onUpdateAccentColor={updateAccentColor}
                    onDelete={deleteStash}
                    onLeave={leaveStash}
                    getMembers={getMembers}
                    removeMember={removeMember}
                  />
                }
              />
              <Route path="/stash/:id/add" element={<AddSodaPage />} />
              <Route path="/stash/:id/scan" element={<BarcodeScanPage />} />
              <Route path="/stash/:id/scan/result" element={<BarcodeResultPage />} />
              <Route path="/stash/:id/activity" element={<StashActivityPage />} />
              <Route path="/stash/:id/soda/:sodaId" element={<SodaDetailPage />} />
            </Routes>
            </Suspense>
          </motion.div>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}

export default function App() {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister, maxAge: 24 * 60 * 60 * 1000, buster: 'v1' }}
    >
      <BrowserRouter>
        <AuthProvider>
          <Suspense>
          <Routes>
            <Route path="/u/:username" element={<PublicProfilePage />} />
            <Route path="/join/:code" element={<JoinStashPage />} />
            <Route
              path="/*"
              element={
                <AuthGate>
                  <AppRoutes />
                </AuthGate>
              }
            />
          </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </PersistQueryClientProvider>
  );
}
