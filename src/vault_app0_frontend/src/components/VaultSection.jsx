import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const VaultSection = ({ userVaultInfo, onRefresh }) => {
  const { actor } = useAuth();
  const [lockAmount, setLockAmount] = useState('');
  const [lockDuration, setLockDuration] = useState('');
  const [useCustomDuration, setUseCustomDuration] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLockTokens = async (e) => {
    e.preventDefault();
    if (!lockAmount || isNaN(lockAmount) || Number(lockAmount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (useCustomDuration && (!lockDuration || isNaN(lockDuration) || Number(lockDuration) <= 0)) {
      toast.error('Please enter a valid lock duration in minutes');
      return;
    }

    try {
      setLoading(true);
      const amount = Math.floor(Number(lockAmount) * 1000000); // Convert to smallest unit
      const duration = useCustomDuration ? [Number(lockDuration)] : []; // Optional parameter
      const result = await actor.vault_lock_tokens(amount, duration);
      
      if ('ok' in result) {
        const durationText = useCustomDuration ? ` for ${lockDuration} minutes` : ' (default duration)';
        toast.success(`Tokens locked successfully${durationText}!`);
        setLockAmount('');
        setLockDuration('');
        onRefresh();
      } else {
        toast.error(result.err);
      }
    } catch (error) {
      console.error('Failed to lock tokens:', error);
      toast.error('Failed to lock tokens');
    } finally {
      setLoading(false);
    }
  };

  const handleUnlockTokens = async () => {
    try {
      setLoading(true);
      const result = await actor.vault_unlock_tokens();
      
      if ('ok' in result) {
        const unlockedAmount = Number(result.ok) / 1000000;
        toast.success(`Successfully unlocked ${unlockedAmount.toFixed(2)} USDX!`);
        onRefresh();
      } else {
        toast.error(result.err);
      }
    } catch (error) {
      console.error('Failed to unlock tokens:', error);
      toast.error('Failed to unlock tokens');
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(Number(timestamp) / 1000000); // Convert from nanoseconds
    return date.toLocaleString();
  };

  const getTimeUntilUnlock = (unlockTime) => {
    if (!unlockTime) return null;
    const now = Date.now() * 1000000; // Convert to nanoseconds
    const timeLeft = Number(unlockTime) - now;
    
    if (timeLeft <= 0) return 'Ready to unlock';
    
    const hours = Math.floor(timeLeft / (1000000 * 1000 * 3600));
    const minutes = Math.floor((timeLeft % (1000000 * 1000 * 3600)) / (1000000 * 1000 * 60));
    
    return `${hours}h ${minutes}m remaining`;
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-6">Vault Operations</h2>

      {userVaultInfo ? (
        <div className="space-y-6">
          {/* Current Lock Info */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-green-800 mb-3">Your Locked Tokens</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-green-700">Amount:</span>
                <span className="font-semibold text-green-900">
                  {(Number(userVaultInfo.amount) / 1000000).toFixed(2)} USDX
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-green-700">Locked At:</span>
                <span className="font-semibold text-green-900">
                  {formatTimestamp(userVaultInfo.locked_at)}
                </span>
              </div>
              {userVaultInfo.unlock_time && (
                <>
                  <div className="flex justify-between">
                    <span className="text-green-700">Unlock Time:</span>
                    <span className="font-semibold text-green-900">
                      {formatTimestamp(userVaultInfo.unlock_time)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-700">Status:</span>
                    <span className={`font-semibold ${userVaultInfo.can_unlock ? 'text-blue-600' : 'text-orange-600'}`}>
                      {getTimeUntilUnlock(userVaultInfo.unlock_time)}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Unlock Button */}
          <button
            onClick={handleUnlockTokens}
            disabled={!userVaultInfo.can_unlock || loading}
            className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
              userVaultInfo.can_unlock && !loading
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {loading ? 'Processing...' : 'Unlock Tokens'}
          </button>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-medium text-yellow-800">Note</h4>
                <p className="text-sm text-yellow-700">
                  You must unlock your current tokens before locking a new amount.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Lock Form */}
          <form onSubmit={handleLockTokens} className="space-y-4">
            <div>
              <label htmlFor="lockAmount" className="block text-sm font-medium text-gray-700 mb-2">
                Amount to Lock (USDX)
              </label>
              <input
                type="number"
                id="lockAmount"
                value={lockAmount}
                onChange={(e) => setLockAmount(e.target.value)}
                placeholder="Enter amount to lock"
                step="0.01"
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            {/* Lock Duration Options */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Lock Duration
              </label>
              <div className="space-y-3">
                <div className="flex items-center">
                  <input
                    type="radio"
                    id="defaultDuration"
                    name="durationType"
                    checked={!useCustomDuration}
                    onChange={() => setUseCustomDuration(false)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <label htmlFor="defaultDuration" className="ml-2 text-sm text-gray-700">
                    Use default duration (1 hour)
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="radio"
                    id="customDuration"
                    name="durationType"
                    checked={useCustomDuration}
                    onChange={() => setUseCustomDuration(true)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <label htmlFor="customDuration" className="ml-2 text-sm text-gray-700">
                    Custom duration (minutes)
                  </label>
                </div>
                
                {useCustomDuration && (
                  <div className="ml-6">
                    <input
                      type="number"
                      id="lockDuration"
                      value={lockDuration}
                      onChange={(e) => setLockDuration(e.target.value)}
                      placeholder="Enter duration in minutes (e.g., 5, 30, 60)"
                      min="1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required={useCustomDuration}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      For testing: try 1-5 minutes. For production: 60+ minutes recommended.
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-3 px-4 rounded-lg font-medium transition-colors"
            >
              {loading ? 'Locking...' : 'Lock Tokens'}
            </button>
          </form>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-medium text-blue-800">How it works</h4>
                <p className="text-sm text-blue-700">
                  Lock your USDX tokens in the vault to earn dividends. Tokens are locked for 1 hour by default (configurable).
                  During this time, you're eligible for any dividend distributions made by the admin.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VaultSection;
