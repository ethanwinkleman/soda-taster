import { useState, useRef, useEffect } from 'react';
import { LogOut, ChevronDown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export function UserMenu() {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  if (!user) return null;

  const avatarUrl = user.user_metadata?.avatar_url as string | undefined;
  const name = (user.user_metadata?.full_name ?? user.email ?? 'User') as string;
  const initials = name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt={name} className="w-7 h-7 rounded-full object-cover" />
        ) : (
          <div className="w-7 h-7 rounded-full bg-sky-500 text-white text-xs font-bold flex items-center justify-center">
            {initials}
          </div>
        )}
        <span className="hidden sm:block text-sm font-medium text-gray-700 dark:text-gray-300 max-w-[120px] truncate">
          {name.split(' ')[0]}
        </span>
        <ChevronDown size={14} className="text-gray-400" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-52 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-lg py-1 z-50">
          <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700">
            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{name}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
          </div>
          <button
            type="button"
            onClick={() => { setOpen(false); signOut(); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <LogOut size={15} />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
