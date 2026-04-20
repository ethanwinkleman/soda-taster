import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Logo } from '../components/Logo';

const PENDING_KEY = 'pendingStashCode';

export function JoinStashPage() {
  const { code } = useParams<{ code: string }>();
  const { user, loading: authLoading, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  const [stashName, setStashName] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    if (!code) return;
    supabase
      .rpc('lookup_stash_by_code', { code: code.toUpperCase() })
      .then(({ data }) => {
        const stash = Array.isArray(data) && data.length > 0 ? data[0] : null;
        if (stash) setStashName(stash.name);
        else setInvalid(true);
      });
  }, [code]);

  // Already logged in — stash code and let PendingJoinHandler process it
  useEffect(() => {
    if (!authLoading && user && code) {
      localStorage.setItem(PENDING_KEY, code.toUpperCase());
      navigate('/', { replace: true });
    }
  }, [authLoading, user, code, navigate]);

  function handleSignIn() {
    if (code) localStorage.setItem(PENDING_KEY, code.toUpperCase());
    signInWithGoogle();
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="animate-pulse opacity-60"><Logo size="md" /></div>
      </div>
    );
  }

  if (invalid) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="flex justify-center mb-8"><Logo size="lg" /></div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Invalid invite link</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            This link is no longer valid or the stash doesn't exist.
          </p>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-sky-500 hover:bg-sky-600 text-white font-semibold rounded-xl transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4">
      <div className="text-center max-w-sm w-full">
        <div className="flex justify-center mb-8"><Logo size="lg" /></div>

        {stashName ? (
          <>
            <p className="text-sm font-medium text-sky-500 uppercase tracking-wide mb-1">
              You've been invited to join
            </p>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">{stashName}</h2>
          </>
        ) : (
          <div className="h-16 flex items-center justify-center mb-6">
            <div className="w-6 h-6 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        <p className="text-gray-500 dark:text-gray-400 mb-8 text-sm">
          Sign in to accept this invite and start rating sodas together.
        </p>

        <button
          type="button"
          onClick={handleSignIn}
          className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-800 dark:text-gray-100 font-medium shadow-sm hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 transition-all"
        >
          <GoogleIcon />
          Continue with Google
        </button>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
      <path d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 6.293C4.672 4.166 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}
