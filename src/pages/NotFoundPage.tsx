import { NavLink } from 'react-router-dom';
import { CupSoda } from 'lucide-react';

export function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 px-6 text-center">
      <CupSoda size={40} className="text-gray-300 dark:text-gray-700 mb-6" />
      <p className="font-display text-[7rem] font-bold leading-none text-gray-200 dark:text-gray-800 select-none">
        404
      </p>
      <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white mt-4 mb-2">
        Page not found
      </h1>
      <p className="font-sans text-sm text-gray-500 dark:text-gray-400 mb-10">
        This soda has been discontinued.
      </p>
      <NavLink
        to="/"
        className="px-6 py-2.5 rounded-xl font-sans text-sm font-bold uppercase tracking-wider text-white bg-sky-600 dark:bg-sky-400 dark:text-gray-950 hover:bg-sky-700 dark:hover:bg-sky-300 transition-colors shadow-[0_4px_14px_-4px_rgba(255,61,120,0.35)]"
      >
        Back to Collections
      </NavLink>
    </div>
  );
}
