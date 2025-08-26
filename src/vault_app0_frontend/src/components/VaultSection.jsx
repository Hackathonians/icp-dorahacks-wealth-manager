import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import ProductSelector from './ProductSelector';
import { formatDuration } from '../utils/utils';

const VaultSection = ({ userVaultEntries, onRefresh }) => {
  const { actor } = useAuth();
  const [lockAmount, setLockAmount] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedDuration, setSelectedDuration] = useState(null);
  const [loading, setLoading] = useState(false);


  const handleLockTokens = async (e) => {
    e.preventDefault();
    
    if (!lockAmount || isNaN(lockAmount) || Number(lockAmount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (!selectedProduct) {
      toast.error('Please select a staking product');
      return;
    }

    if (!selectedDuration) {
      toast.error('Please select a lock duration');
      return;
    }

    try {
      setLoading(true);
      const amount = BigInt(Math.floor(Number(lockAmount) * 1000000)); // Convert to smallest unit
      const result = await actor.vault_lock_tokens(amount, BigInt(selectedProduct.id), selectedDuration);
      
      if ('ok' in result) {
        const entryId = Number(result.ok);
        const durationText = (selectedDuration.Minutes === -1) ? 'flexible staking' : 
          `time-locked for ${formatDuration(selectedDuration)}`;
        toast.success(`Tokens locked successfully in "${selectedProduct.name}" with ${durationText}! Entry ID: ${entryId}`);
        setLockAmount('');
        setSelectedProduct(null);
        setSelectedDuration(null);
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

  const handleUnlockTokens = async (entryId) => {
    try {
      setLoading(true);
      const result = await actor.vault_unlock_tokens(BigInt(entryId));
      
      if ('ok' in result) {
        const unlockedAmount = Number(result.ok) / 1000000;
        toast.success(`Successfully unlocked ${unlockedAmount.toFixed(2)} USDX from entry ${entryId}!`);
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
    <div className="card">
      <h2 className="text-xl font-bold text-slate-900 mb-6">Vault Operations</h2>

      {/* Existing Vault Entries */}
      {userVaultEntries && userVaultEntries.length > 0 && (
        <div className="space-y-4 mb-6">
          <h3 className="text-lg font-semibold text-slate-900">Your Staking Positions</h3>
          {userVaultEntries.map((entry) => (
            <div key={entry.id} className="glass rounded-lg p-4 border border-slate-200/60">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="text-md font-semibold text-slate-900">
                    Entry #{entry.id} - {entry.is_flexible ? 'Flexible Staking' : 'Time-Locked Staking'}
                  </h4>
                  {entry.product_id && (
                    <p className="text-sm text-slate-700">
                      Product ID: {entry.product_id} | Duration: {formatDuration(entry.selected_duration)}
                    </p>
                  )}
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  entry.can_unlock 
                    ? 'bg-blue-50 text-blue-600 border border-blue-300' 
                    : 'bg-orange-50 text-orange-600 border border-orange-300'
                }`}>
                  {entry.can_unlock ? 'Ready to Unlock' : 'Locked'}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                <div>
                  <span className="text-slate-700">Amount:</span>
                  <span className="font-semibold text-slate-900 ml-2">
                    {(Number(entry.amount) / 1000000).toFixed(2)} USDX
                  </span>
                </div>
                <div>
                  <span className="text-slate-700">Locked At:</span>
                  <span className="font-semibold text-slate-900 ml-2">
                    {formatTimestamp(entry.locked_at)}
                  </span>
                </div>
                {entry.unlock_time && (
                  <>
                    <div>
                      <span className="text-slate-700">Unlock Time:</span>
                      <span className="font-semibold text-slate-900 ml-2">
                        {formatTimestamp(entry.unlock_time)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-700">Status:</span>
                      <span className={`font-semibold ml-2 ${entry.can_unlock ? 'text-blue-600' : 'text-orange-600'}`}>
                        {getTimeUntilUnlock(entry.unlock_time)}
                      </span>
                    </div>
                  </>
                )}
                {entry.is_flexible && (
                  <div className="col-span-2">
                    <span className="text-slate-700">Type:</span>
                    <span className="font-semibold text-blue-600 ml-2">
                      Flexible - Can withdraw anytime
                    </span>
                  </div>
                )}
              </div>

              <button
                onClick={() => handleUnlockTokens(entry.id)}
                disabled={!entry.can_unlock || loading}
                className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                  entry.can_unlock && !loading
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-white/70 text-slate-500 cursor-not-allowed'
                }`}
              >
                {loading ? 'Processing...' : `Unlock Entry #${entry.id}`}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* New Staking Form */}
      <div className="space-y-6">
        <div className="border-t border-slate-200/60 pt-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Create New Staking Position</h3>
          
          {/* Amount Input */}
          <div className="glass rounded-lg p-4 mb-6">
            <label htmlFor="lockAmount" className="block text-sm font-medium text-slate-800 mb-2">
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
              className="w-full px-3 py-2 bg-white/90 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 placeholder-slate-400"
              required
            />
          </div>

          {/* Product Selection */}
          <ProductSelector
            onProductSelect={setSelectedProduct}
            selectedProduct={selectedProduct}
            selectedDuration={selectedDuration}
            onDurationSelect={setSelectedDuration}
          />

          {/* Lock Button */}
          <form onSubmit={handleLockTokens}>
            <button
              type="submit"
              disabled={loading || !lockAmount || !selectedProduct || !selectedDuration}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-3 px-4 rounded-lg font-medium transition-colors"
            >
              {loading ? 'Locking...' : 'Lock Tokens'}
            </button>
          </form>

          <div className="bg-blue-50 border border-blue-300 rounded-lg p-4 mt-4">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-medium text-blue-700">How it works</h4>
                <p className="text-sm text-blue-700">
                  Choose from available staking products, each with different duration options and features. 
                  All staked tokens are eligible for dividend distributions based on the product terms.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VaultSection;
