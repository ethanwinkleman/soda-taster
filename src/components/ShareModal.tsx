import { useState, useEffect } from 'react';
import { X, Copy, Check, Globe, Lock } from 'lucide-react';
import type { Profile } from '../types/profile';
import type { User } from '@supabase/supabase-js';

interface Props {
  user: User;
  profile: Profile | null;
  onSave: (updates: { username?: string; is_public?: boolean }) => Promise<string | null>;
  onClose: () => void;
}

function slugify(name: string) {
  return name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '').slice(0, 20);
}

export function ShareModal({ user, profile, onSave, onClose }: Props) {
  const suggested = slugify(
    (user.user_metadata?.full_name as string | undefined)?.split(' ')[0] ?? ''
  );

  const [username, setUsername] = useState(profile?.username ?? suggested);
  const [isPublic, setIsPublic] = useState(profile?.is_public ?? false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (profile) {
      setUsername(profile.username ?? suggested);
      setIsPublic(profile.is_public);
    }
  }, [profile]);

  const shareUrl = `${window.location.origin}/u/${username}`;
  const usernameValid = /^[a-z0-9_]{3,20}$/.test(username);

  async function handleSave() {
    if (!usernameValid) return;
    setSaving(true);
    setError(null);
    const err = await onSave({ username, is_public: isPublic });
    setSaving(false);
    if (err) {
      setError(err.includes('unique') ? 'That username is already taken.' : err);
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-sm max-h-[85vh] bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="font-bold text-gray-900 dark:text-white">Share Profile</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-5 space-y-5 overflow-y-auto">
          {/* Username */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Username
            </label>
            <div className="flex items-center rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden focus-within:ring-2 focus-within:ring-sky-400">
              <span className="pl-3 text-sm text-gray-400 dark:text-gray-500 select-none whitespace-nowrap">
                /u/
              </span>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                maxLength={20}
                placeholder="your_name"
                className="flex-1 px-2 py-3 text-base bg-transparent text-gray-900 dark:text-gray-100 focus:outline-none"
              />
            </div>
            <p className={`mt-1 text-xs ${usernameValid ? 'text-gray-400' : 'text-red-500'}`}>
              {usernameValid
                ? `${20 - username.length} characters remaining`
                : 'Letters, numbers, underscores only — 3 to 20 characters'}
            </p>
          </div>

          {/* Public toggle */}
          <div className="flex items-center justify-between py-1">
            <div className="flex items-center gap-2.5">
              {isPublic
                ? <Globe size={18} className="text-sky-500" />
                : <Lock size={18} className="text-gray-400" />}
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {isPublic ? 'Public' : 'Private'}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  {isPublic ? 'Anyone with the link can view your ratings' : 'Only you can see your ratings'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsPublic((p) => !p)}
              className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${isPublic ? 'bg-sky-500' : 'bg-gray-200 dark:bg-gray-700'}`}
              aria-label="Toggle public"
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${isPublic ? 'translate-x-5' : ''}`} />
            </button>
          </div>

          {/* Share URL (only when public + saved username matches current input) */}
          {isPublic && profile?.username && profile.username === username && (
            <div className="bg-sky-50 dark:bg-sky-900/20 rounded-xl px-4 py-3 flex items-center gap-2">
              <p className="flex-1 text-sm text-sky-700 dark:text-sky-300 truncate font-mono">
                {shareUrl}
              </p>
              <button
                type="button"
                onClick={handleCopy}
                className="shrink-0 p-1.5 rounded-lg text-sky-500 hover:bg-sky-100 dark:hover:bg-sky-900/40 transition-colors"
                aria-label="Copy link"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}

          {/* Save */}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !usernameValid}
            className="w-full py-3 bg-sky-500 hover:bg-sky-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
