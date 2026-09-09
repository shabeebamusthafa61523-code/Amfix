import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const OpeningLoader = ({ onComplete, duration = 1200 }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      if (typeof onComplete === 'function') {
        setTimeout(onComplete, 400);
      }
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onComplete]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.4, ease: 'easeInOut' } }}
          className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-[#4d2796] text-white select-none overflow-hidden"
        >
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="relative mb-8 flex items-center justify-center px-6"
          >
            <img
              src="/splash_logo.png"
              alt="AMFIX ACADEMY Logo"
              className="h-28 max-w-full w-auto object-contain relative z-10"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 180 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="h-1.5 w-44 bg-purple-900/60 rounded-full overflow-hidden relative border border-purple-400/30 shadow-inner"
          >
            <motion.div
              animate={{ x: ['-100%', '100%'] }}
              transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}
              className="h-full w-1/2 bg-gradient-to-r from-white via-purple-200 to-indigo-100 rounded-full shadow-lg"
            />
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-4 text-[11px] font-bold tracking-[0.2em] uppercase text-purple-100/90"
          >
            Initializing AMFIX Academy...
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default OpeningLoader;
