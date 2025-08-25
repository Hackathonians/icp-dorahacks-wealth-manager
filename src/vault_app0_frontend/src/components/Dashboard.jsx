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
            <div className="w-16 h-16 bg-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-6">
              <WalletIcon className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">Welcome to USDX Vault</h2>
            <p className="text-white text-opacity-80 mb-8">
              Connect your Internet Identity to start using the USDX token vault system.
              Lock your tokens to earn dividends.
            </p>
            
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="glass rounded-lg p-4">
                <WalletIcon className="w-8 h-8 text-indigo-400 mx-auto mb-2" />
                <h3 className="text-white font-medium text-sm">ICRC Token</h3>
              </div>
              <div className="glass rounded-lg p-4">
                <LockClosedIcon className="w-8 h-8 text-green-400 mx-auto mb-2" />
                <h3 className="text-white font-medium text-sm">Secure Vault</h3>
              </div>
              <div className="glass rounded-lg p-4">
                <CurrencyDollarIcon className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                <h3 className="text-white font-medium text-sm">Dividends</h3>
              </div>
              <div className="glass rounded-lg p-4">
                <CogIcon className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                <h3 className="text-white font-medium text-sm">Admin Panel</h3>
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
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-opacity-30 border-t-white mx-auto mb-4"></div>
          <p className="text-white">Loading vault data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Navigation Tabs */}
      <div className="card">
        <div className="flex space-x-1 bg-white bg-opacity-10 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center px-4 py-2 rounded-md font-medium transition-all ${
              activeTab === 'dashboard'
                ? 'bg-white bg-opacity-20 text-white shadow-sm'
                : 'text-white text-opacity-70 hover:text-white hover:bg-white hover:bg-opacity-10'
            }`}
          >
            <ChartBarIcon className="w-5 h-5 mr-2" />
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`flex items-center px-4 py-2 rounded-md font-medium transition-all ${
              activeTab === 'reports'
                ? 'bg-white bg-opacity-20 text-white shadow-sm'
                : 'text-white text-opacity-70 hover:text-white hover:bg-white hover:bg-opacity-10'
            }`}
          >
            <DocumentChartBarIcon className="w-5 h-5 mr-2" />
            Investment Reports
          </button>
          {isAdmin && (
            <button
              onClick={() => setActiveTab('instruments')}
              className={`flex items-center px-4 py-2 rounded-md font-medium transition-all ${
                activeTab === 'instruments'
                  ? 'bg-white bg-opacity-20 text-white shadow-sm'
                  : 'text-white text-opacity-70 hover:text-white hover:bg-white hover:bg-opacity-10'
              }`}
            >
              <CubeTransparentIcon className="w-5 h-5 mr-2" />
              Investment Instruments
            </button>
          )}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'dashboard' && (
        <>
          {/* Vault Overview */}
          {vaultInfo && (
            <div className="card">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center">
                <ChartBarIcon className="w-6 h-6 mr-2" />
                Vault Overview
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="glass rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <LockClosedIcon className="w-8 h-8 text-blue-400" />
                    <div className="text-right">
                      <p className="text-2xl font-bold text-white">
                        {(Number(vaultInfo.total_locked) / 1000000).toFixed(2)}
                      </p>
                      <p className="text-white text-opacity-70 text-sm">USDX Locked</p>
                    </div>
                  </div>
                </div>
                
                <div className="glass rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <ShoppingBagIcon className="w-8 h-8 text-purple-400" />
                    <div className="text-right">
                      <p className="text-2xl font-bold text-white">
                        {vaultInfo.active_products || 0}
                      </p>
                      <p className="text-white text-opacity-70 text-sm">Active Products</p>
                    </div>
                  </div>
                </div>
                
                <div className="glass rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <ClockIcon className="w-8 h-8 text-green-400" />
                    <div className="text-right">
                      <p className="text-2xl font-bold text-white">
                        {Number(vaultInfo.lock_period_seconds) / 3600}
                      </p>
                      <p className="text-white text-opacity-70 text-sm">Default Hours</p>
                    </div>
                  </div>
                </div>
                
                <div className="glass rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <GiftIcon className="w-8 h-8 text-yellow-400" />
                    <div className="text-right">
                      <p className="text-2xl font-bold text-white">
                        {Number(vaultInfo.dividend_count)}
                      </p>
                      <p className="text-white text-opacity-70 text-sm">Dividends</p>
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
