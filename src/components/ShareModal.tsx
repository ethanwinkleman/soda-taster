import { useState } from 'react';
import { motion } from 'framer-motion';
import { Copy, Check, Globe, Lock } from 'lucide-react';
import leoProfanity from 'leo-profanity';
import { Button, Modal } from './ui';
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

  // The profile arrives asynchronously, so these layer any edit over whatever has
  // loaded so far rather than copying the profile into state once it turns up —
  // which used to re-render the whole modal a second time on load.
  const [usernameEdit, setUsernameEdit] = useState<string | null>(null);
  const [isPublicEdit, setIsPublicEdit] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const username = usernameEdit ?? profile?.username ?? suggested;
  const isPublic = isPublicEdit ?? profile?.is_public ?? false;
  const setUsername = setUsernameEdit;

  // Toggles off the derived value, not the raw edit — the raw one is null until the
  // user touches it, and !null would flip a public profile back to public.
  function toggleIsPublic() {
    setIsPublicEdit(!isPublic);
  }

  const shareUrl = `${window.location.origin}/u/${username}`;
  const usernameValid = /^[a-z0-9_]{3,20}$/.test(username);
  const usernameClean = usernameValid && !leoProfanity.check(username.replace(/_/g, ' '));

  async function handleSave() {
    if (!usernameValid) return;
    if (!usernameClean) { setError('That username isn\'t allowed.'); return; }
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
    <Modal open onClose={onClose} title="Share Profile" variant="dialog">
      <div className="px-5 py-5 space-y-5">
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
              autoCapitalize="none"
              autoComplete="off"
              spellCheck={false}
              enterKeyHint="done"
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
            onClick={toggleIsPublic}
            className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${isPublic ? 'bg-sky-500' : 'bg-gray-200 dark:bg-gray-700'}`}
            aria-label="Toggle public"
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${isPublic ? 'translate-x-5' : ''}`} />
          </button>
        </div>

        {/* Share URL */}
        {isPublic && profile?.username && profile.username === username && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-sky-50 dark:bg-sky-900/20 rounded-xl px-4 py-3 flex items-center gap-2"
          >
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
          </motion.div>
        )}

        {error && <p className="text-sm text-red-500">{error}</p>}

        {/* Actions */}
        <div className="flex gap-3">
          <Button variant="secondary" size="md" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="md"
            className="flex-1"
            onClick={handleSave}
            disabled={saving || !usernameValid || !usernameClean}
          >
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
