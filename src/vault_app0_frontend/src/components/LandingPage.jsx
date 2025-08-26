import React from 'react';
import { motion } from 'framer-motion';
import FeatureCard from './FeatureCard';
import { useAuth } from '../contexts/AuthContext';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

const LandingPage = () => {
  const { login, loading } = useAuth();

  return (
    <div className="flex flex-col items-center justify-center p-4 overflow-hidden">
      {/* Background Decorations */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 rounded-full animated-gradient opacity-20 blur-3xl floating"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full animated-gradient opacity-20 blur-3xl floating" style={{ animationDelay: '2s' }}></div>
        <div className="absolute inset-0 grid-overlay grid-animate"></div>
      </div>
      
      {/* Main Content Container with Stagger Animation */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 w-full max-w-5xl mx-auto"
      >
        {/* Hero Section */}
        <motion.div variants={itemVariants} className="text-center">
          <div className="gradient-border rounded-xl bg-white/85 backdrop-blur-md p-6 sm:p-10 shadow-xl">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-yellow-500 via-orange-500 to-pink-500">
              NeuroVault: Revolutionizing Wealth Management
            </h1>
            <p className="mt-6 max-w-3xl mx-auto text-slate-800 text-base sm:text-lg leading-relaxed">
              NeuroVault combines secure, compliant token vaults with autonomous AI managers to actively grow your crypto wealth. Experience real-time adaptation, transparent control, and a new era of optimized investing.
            </p>
            <div className="mt-10 flex items-center justify-center gap-4">
            <motion.button
              onClick={login}
              disabled={loading}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              className="px-8 py-3 rounded-lg text-white font-semibold bg-gradient-to-r from-yellow-500 via-orange-500 to-pink-500 hover:brightness-110 disabled:opacity-60 shadow-lg shadow-orange-500/20 transition-all"
            >
              {loading ? 'Connecting...' : 'Launch App'}
            </motion.button>
            <motion.a
              href="#features"
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              className="px-8 py-3 rounded-lg font-semibold bg-white text-slate-800 hover:bg-white/90 shadow ring-1 ring-orange-300 transition-all"
            >
              Learn More
            </motion.a>
            </div>
          </div>
        </motion.div>

        {/* Features Section */}
        <motion.div 
          id="features" 
          className="relative mt-24 grid md:grid-cols-12 gap-6"
          // This will trigger the stagger animation for cards when they scroll into view
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={containerVariants}
        >
          <FeatureCard
            colSpan="md:col-span-5"
            title="Secure, Compliant Vaults"
            description="Custody tokens with robust security, governance, and auditability."
          >
             <a href="#" className="inline-flex items-center text-pink-400 font-semibold hover:text-pink-300">
               Explore Vault Security <span className="ml-1">→</span>
             </a>
          </FeatureCard>
          
          <div className="md:col-span-7 grid sm:grid-cols-2 gap-6">
            <FeatureCard
              title="Autonomous AI Managers"
              description="Adapt portfolios in real-time based on market signals and risk."
            />
            <FeatureCard
              title="Transparent & Controllable"
              description="User-controlled parameters, full transparency, and clear reporting."
            />
            <FeatureCard
              colSpan="sm:col-span-2"
              title="From Passive to Active Growth"
              description="Turn idle holdings into optimized, risk-aware wealth growth."
            />
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default LandingPage;


