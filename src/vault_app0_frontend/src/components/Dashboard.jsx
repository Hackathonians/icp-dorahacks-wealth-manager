import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import TokenBalance from './TokenBalance';
import VaultSection from './VaultSection';
import AdminPanel from './AdminPanel';
import DividendSection from './DividendSection';
import InvestmentReport from './InvestmentReport';
import InvestmentInstruments from './InvestmentInstruments';
import { 
  WalletIcon, 
  LockClosedIcon, 
  CurrencyDollarIcon, 
  CogIcon,
  ChartBarIcon,
  ClockIcon,
  GiftIcon,
  ShoppingBagIcon,
  DocumentChartBarIcon,
  CubeTransparentIcon
} from '@heroicons/react/24/outline';

const Dashboard = () => {
  const { isAuthenticated, actor, principal } = useAuth();
  const [vaultInfo, setVaultInfo] = useState(null);
  const [userVaultEntries, setUserVaultEntries] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    if (isAuthenticated && actor) {
      loadData();
    }
  }, [isAuthenticated, actor, principal]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load vault info
      const vaultInfoResult = await actor.get_vault_info();
      setVaultInfo(vaultInfoResult);
      
      // Check if user is admin (check against all admins)
      const userPrincipalStr = principal.toString();
      const isUserAdmin = vaultInfoResult.admins ? 
        vaultInfoResult.admins.some(admin => admin.toString() === userPrincipalStr) :
        vaultInfoResult.admin.toString() === userPrincipalStr; // Fallback for backward compatibility
      setIsAdmin(isUserAdmin);
      
      // Load user vault entries
      const userVaultResult = await actor.get_user_vault_entries(principal);
      setUserVaultEntries(userVaultResult || []);
      
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load vault data');
    } finally {
      setLoading(false);
    }
  };

  const refreshData = () => {
    loadData();
  };

  if (!isAuthenticated) {
    return (
      <div className="text-center py-12 animate-fadeIn">
        <div className="max-w-lg mx-auto">
          <div className="card">
            <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 via-orange-500 to-pink-500 rounded-xl flex items-center justify-center mx-auto mb-6">
              <WalletIcon className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Welcome to NeuroVault</h2>
            <p className="text-slate-700 mb-8">
              Connect your Internet Identity to use secure, AI-assisted token vaults and earn dividends.
            </p>
            
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="glass rounded-lg p-4">
                <WalletIcon className="w-8 h-8 text-indigo-500 mx-auto mb-2" />
                <h3 className="text-slate-800 font-medium text-sm">ICRC Token</h3>
              </div>
              <div className="glass rounded-lg p-4">
                <LockClosedIcon className="w-8 h-8 text-green-500 mx-auto mb-2" />
                <h3 className="text-slate-800 font-medium text-sm">Secure Vault</h3>
              </div>
              <div className="glass rounded-lg p-4">
                <CurrencyDollarIcon className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                <h3 className="text-slate-800 font-medium text-sm">Dividends</h3>
              </div>
              <div className="glass rounded-lg p-4">
                <CogIcon className="w-8 h-8 text-purple-500 mx-auto mb-2" />
                <h3 className="text-slate-800 font-medium text-sm">Admin Panel</h3>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="card text-center">
          <div className="animated-gradient p-[2px] rounded-full mx-auto mb-4">
            <div className="rounded-full h-12 w-12 bg-white flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-slate-300 border-t-white"></div>
            </div>
          </div>
          <p className="text-slate-800">Loading vault data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Navigation Tabs */}
      <div className="card">
        <div className="relative flex bg-white/80 rounded-lg p-1 ring-1 ring-slate-200/60 shadow-sm divide-x divide-slate-200/60">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`relative flex items-center px-4 py-2 rounded-md font-medium transition-all ${
              activeTab === 'dashboard'
                ? 'bg-white text-slate-900 shadow-sm ring-2 ring-orange-400'
                : 'text-slate-700 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <ChartBarIcon className={`w-5 h-5 mr-2 ${activeTab === 'dashboard' ? 'text-orange-500' : 'text-slate-600'}`} />
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`relative flex items-center px-4 py-2 rounded-md font-medium transition-all ${
              activeTab === 'reports'
                ? 'bg-white text-slate-900 shadow-sm ring-2 ring-orange-400'
                : 'text-slate-700 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <DocumentChartBarIcon className={`w-5 h-5 mr-2 ${activeTab === 'reports' ? 'text-orange-500' : 'text-slate-600'}`} />
            Investment Reports
          </button>
          {isAdmin && (
            <button
              onClick={() => setActiveTab('instruments')}
              className={`relative flex items-center px-4 py-2 rounded-md font-medium transition-all ${
                activeTab === 'instruments'
                  ? 'bg-white text-slate-900 shadow-sm ring-2 ring-orange-400'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <CubeTransparentIcon className={`w-5 h-5 mr-2 ${activeTab === 'instruments' ? 'text-orange-500' : 'text-slate-600'}`} />
              Investment Instruments
            </button>
          )}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'dashboard' && (
        <>
          {/* Assets Overview */}
          {vaultInfo && (
            <div className="card ring-1 ring-slate-200/80">
              <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center">
                <ChartBarIcon className="w-6 h-6 mr-2" />
                Assets Overview
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="glass rounded-lg p-4 ring-1 ring-slate-200/70 transition-shadow hover:shadow-md">
                  <div className="flex items-center justify-between">
                    <div className="animated-gradient w-10 h-10 rounded-lg flex items-center justify-center">
                      <LockClosedIcon className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-slate-900">
                        {(Number(vaultInfo.total_locked) / 1000000).toFixed(2)}
                      </p>
                      <p className="text-slate-700 text-sm">Total Locked (USDX)</p>
                    </div>
                  </div>
                </div>
                
                <div className="glass rounded-lg p-4 ring-1 ring-slate-200/70 transition-shadow hover:shadow-md">
                  <div className="flex items-center justify-between">
                    <div className="animated-gradient w-10 h-10 rounded-lg flex items-center justify-center">
                      <ShoppingBagIcon className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-slate-900">
                        {vaultInfo?.active_products?.toString() ?? "0"}
                      </p>
                      <p className="text-slate-700 text-sm">Active Products</p>
                    </div>
                  </div>
                </div>
                
                <div className="glass rounded-lg p-4 ring-1 ring-slate-200/70 transition-shadow hover:shadow-md">
                  <div className="flex items-center justify-between">
                    <div className="animated-gradient w-10 h-10 rounded-lg flex items-center justify-center">
                      <ClockIcon className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-slate-900">
                        {Number(vaultInfo.lock_period_seconds) / 3600}
                      </p>
                      <p className="text-slate-700 text-sm">Default Lock Hours</p>
                    </div>
                  </div>
                </div>
                
                <div className="glass rounded-lg p-4 ring-1 ring-slate-200/70 transition-shadow hover:shadow-md">
                  <div className="flex items-center justify-between">
                    <div className="animated-gradient w-10 h-10 rounded-lg flex items-center justify-center">
                      <GiftIcon className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-slate-900">
                        {Number(vaultInfo.dividend_count)}
                      </p>
                      <p className="text-slate-700 text-sm">Dividends Issued</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-6">
              <TokenBalance onRefresh={refreshData} />
              <VaultSection 
                userVaultEntries={userVaultEntries} 
                onRefresh={refreshData} 
              />
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              <DividendSection onRefresh={refreshData} />
              {isAdmin && <AdminPanel onRefresh={refreshData} />}
            </div>
          </div>
        </>
      )}

      {activeTab === 'reports' && (
        <InvestmentReport />
      )}

      {activeTab === 'instruments' && isAdmin && (
        <InvestmentInstruments />
      )}
    </div>
  );
};

export default Dashboard;
