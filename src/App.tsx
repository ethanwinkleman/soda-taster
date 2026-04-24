import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AuthGate } from './components/AuthGate';
import { useStashes } from './hooks/useStashes';
import { Sidebar } from './components/Sidebar';
import { MobileHeader } from './components/MobileHeader';
import { BottomNav } from './components/BottomNav';
import { PendingJoinHandler } from './components/PendingJoinHandler';
import { StashesPage } from './pages/StashesPage';
import { StashPage } from './pages/StashPage';
import { AddSodaPage } from './pages/AddSodaPage';
import { SodaDetailPage } from './pages/SodaDetailPage';
import { StashActivityPage } from './pages/StashActivityPage';
import { PublicProfilePage } from './pages/PublicProfilePage';
import { JoinStashPage } from './pages/JoinStashPage';

function AppRoutes() {
  const { user } = useAuth();
  const location = useLocation();
  const {
    stashes,
    createStash,
    renameStash,
    updateStashIcon,
    deleteStash,
    joinStash,
    leaveStash,
    getMembers,
    removeMember,
  } = useStashes(user?.id);

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <PendingJoinHandler onJoined={joinStash} />
      <Sidebar stashes={stashes} />
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen">
        <MobileHeader />
        <main className="flex-1 pb-20 md:pb-0">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            <Routes location={location}>
              <Route
                path="/"
                element={<StashesPage stashes={stashes} onCreate={createStash} onJoin={joinStash} />}
              />
              <Route
                path="/stash/:id"
                element={
                  <StashPage
                    stashes={stashes}
                    onRename={renameStash}
                    onUpdateIcon={updateStashIcon}
                    onDelete={deleteStash}
                    onLeave={leaveStash}
                    getMembers={getMembers}
                    removeMember={removeMember}
                  />
                }
              />
              <Route path="/stash/:id/add" element={<AddSodaPage />} />
              <Route path="/stash/:id/activity" element={<StashActivityPage />} />
              <Route path="/stash/:id/soda/:sodaId" element={<SodaDetailPage />} />
            </Routes>
          </motion.div>
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
      </AuthProvider>
    </BrowserRouter>
  );
}
