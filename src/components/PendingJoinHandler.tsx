import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const PENDING_KEY = 'pendingStashCode';

interface Props {
  onJoined: (code: string) => Promise<{ stashId: string | null; error: string | null }>;
}

export function PendingJoinHandler({ onJoined }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const code = localStorage.getItem(PENDING_KEY);
    if (!code || !user) return;

    localStorage.removeItem(PENDING_KEY);

    onJoined(code).then(({ stashId }) => {
      if (stashId) navigate(`/stash/${stashId}`, { replace: true });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return null;
}
