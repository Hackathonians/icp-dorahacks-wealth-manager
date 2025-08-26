import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { CurrencyDollarIcon, ArrowPathIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import TestTokenFaucet from './TestTokenFaucet';

const TokenBalance = ({ onRefresh }) => {
  const { actor, principal } = useAuth();
  const [balance, setBalance] = useState(0);
  const [tokenInfo, setTokenInfo] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (actor && principal) {
      loadBalance();
      loadTokenInfo();
    }
  }, [actor, principal]);

  const loadBalance = async () => {
    try {
      const account = { owner: principal, subaccount: [] };
      const balanceResult = await actor.icrc1_balance_of(account);
      setBalance(Number(balanceResult));
    } catch (error) {
      console.error('Failed to load balance:', error);
    }
  };

  const loadTokenInfo = async () => {
    try {
      const [name, symbol, decimals, totalSupply] = await Promise.all([
        actor.icrc1_name(),
        actor.icrc1_symbol(),
        actor.icrc1_decimals(),
        actor.icrc1_total_supply()
      ]);
      
      setTokenInfo({
        name,
        symbol,
        decimals: Number(decimals),
        totalSupply: Number(totalSupply)
      });
    } catch (error) {
      console.error('Failed to load token info:', error);
    }
  };

  const formatTokenAmount = (amount, decimals = 6) => {
    return (amount / Math.pow(10, decimals)).toFixed(2);
  };

  const handleTokensReceived = () => {
    loadBalance();
    if (onRefresh) {
      onRefresh();
    }
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-slate-900 flex items-center">
          <CurrencyDollarIcon className="w-6 h-6 mr-2" />
          Token Balance
        </h2>
        <button
          onClick={() => {
            loadBalance();
            onRefresh();
          }}
          className="bg-white/70 hover:bg-white text-slate-900 px-3 py-1 rounded-lg text-sm flex items-center space-x-2 ring-1 ring-slate-200"
        >
          <ArrowPathIcon className="w-4 h-4" />
          <span>Refresh</span>
        </button>
      </div>

      {tokenInfo && (
        <div className="space-y-4">
          <div className="animated-gradient rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold">{tokenInfo.name}</h3>
                <p className="text-white/90">{tokenInfo.symbol}</p>
              </div>
              <CurrencyDollarIcon className="w-12 h-12 text-white/90" />
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold">
                {formatTokenAmount(balance, tokenInfo.decimals)}
              </p>
              <p className="text-white/90">{tokenInfo.symbol}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="glass rounded-lg p-4">
              <p className="text-slate-600 text-sm">Decimals</p>
              <p className="text-slate-900 font-bold text-lg">{tokenInfo.decimals}</p>
            </div>
            <div className="glass rounded-lg p-4">
              <p className="text-slate-600 text-sm">Total Supply</p>
              <p className="text-slate-900 font-bold text-lg">
                {formatTokenAmount(tokenInfo.totalSupply, tokenInfo.decimals)}
              </p>
            </div>
          </div>

          <div className="glass rounded-lg p-4 border border-yellow-400/40">
            <div className="flex items-start space-x-3">
              <InformationCircleIcon className="w-6 h-6 text-yellow-500 flex-shrink-0" />
              <div>
                <h4 className="text-slate-900 font-medium mb-1">Need tokens?</h4>
                <p className="text-slate-700 text-sm">
                  Use the test token faucet below or contact the admin to receive USDX tokens for testing.
                </p>
              </div>
            </div>
          </div>

          {/* Test Token Faucet - Only show for hackathon testing */}
          <TestTokenFaucet onTokensReceived={handleTokensReceived} />
        </div>
      )}
    </div>
  );
};

export default TokenBalance;
