import React from 'react';
import { motion } from 'framer-motion';

// Animation variants for Framer Motion
const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

const FeatureCard = ({ title, description, colSpan = 'sm:col-span-1', children }) => {
  return (
    <motion.div
      variants={cardVariants}
      className={`group relative rounded-xl p-6 glass-card ring-1 ring-white/10 transition-transform duration-200 hover:-translate-y-0.5 ${colSpan}`}
    >
      {/* Animated gradient glow on hover (non-interactive) */}
      <div className="pointer-events-none absolute -inset-px rounded-xl animated-gradient opacity-0 group-hover:opacity-60 transition-opacity duration-300 blur-sm"></div>

      <div className="relative z-10 h-full flex flex-col justify-between">
        <div>
          <h3 className="text-xl font-bold text-slate-100">{title}</h3>
          <p className="mt-2 text-white">{description}</p>
        </div>
        {children && <div className="mt-6">{children}</div>}
      </div>
    </motion.div>
  );
};

export default FeatureCard;