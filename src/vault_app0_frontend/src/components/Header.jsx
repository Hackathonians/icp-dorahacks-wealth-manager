import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { WalletIcon, ArrowRightOnRectangleIcon, LockClosedIcon } from '@heroicons/react/24/outline';

const Header = () => {
  const { isAuthenticated, principal, login, logout, loading } = useAuth();

  const formatPrincipal = (principal) => {
    if (!principal) return '';
    const str = principal.toString();
    console.log('str', str);
    return `${str.slice(0, 8)}...${str.slice(-8)}`;
  };

  return (
    <header className="glass sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
              <WalletIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-green-500">USDX Vault</h1>
              <p className="text-white text-opacity-70 text-sm">Token Vault & Dividends</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <div className="flex items-center space-x-4">
                <div className="glass rounded-lg px-4 py-2">
                  <p className="text-white text-sm font-medium">Connected</p>
                  <p className="text-white text-opacity-70 text-xs font-mono">
                    {formatPrincipal(principal)}
                  </p>
                </div>
                <button
                  onClick={logout}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium flex items-center space-x-2"
                >
                  <ArrowRightOnRectangleIcon className="w-4 h-4" />
                  <span>Disconnect</span>
                </button>
              </div>
            ) : (
              <button
                onClick={login}
                disabled={loading}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white px-6 py-2 rounded-lg font-medium flex items-center space-x-2"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <LockClosedIcon className="w-4 h-4" />
                )}
                <span>{loading ? 'Connecting...' : 'Connect Wallet'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
