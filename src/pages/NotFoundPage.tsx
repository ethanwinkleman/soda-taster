import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CupSoda } from 'lucide-react';
import { FloatingBubbles } from '../components/FloatingBubbles';

export function NotFoundPage() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 px-6 text-center"
    >
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="relative inline-flex items-center justify-center mb-6"
      >
        <CupSoda size={40} className="text-gray-300 dark:text-gray-700" />
        <FloatingBubbles size={40} className="absolute inset-0" />
      </motion.div>

      <motion.p
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.34, 1.4, 0.64, 1], delay: 0.05 }}
        className="font-display text-[7rem] font-bold leading-none text-gray-200 dark:text-gray-800 select-none"
      >
        404
      </motion.p>

      <motion.h1
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.12 }}
        className="font-display text-2xl font-bold text-gray-900 dark:text-white mt-4 mb-2"
      >
        Page not found
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.18 }}
        className="font-sans text-sm text-gray-500 dark:text-gray-400 mb-10"
      >
        This soda has been discontinued.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.24 }}
        whileTap={{ scale: 0.97 }}
      >
        <NavLink
          to="/"
          className="inline-block px-6 py-2.5 rounded-xl font-sans text-sm font-bold uppercase tracking-wider text-white bg-sky-600 dark:bg-sky-400 dark:text-gray-950 hover:bg-sky-700 dark:hover:bg-sky-300 transition-colors shadow-[0_4px_14px_-4px_rgba(255,61,120,0.35)]"
        >
          Back to Collections
        </NavLink>
      </motion.div>
    </motion.div>
  );
}
