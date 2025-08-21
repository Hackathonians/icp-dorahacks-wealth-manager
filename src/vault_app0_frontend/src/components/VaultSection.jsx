import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const VaultSection = ({ userVaultEntries, onRefresh }) => {
  const { actor } = useAuth();
  const [lockAmount, setLockAmount] = useState('');
  const [lockDuration, setLockDuration] = useState('');
  const [useCustomDuration, setUseCustomDuration] = useState(false);
  const [isFlexibleStaking, setIsFlexibleStaking] = useState(false);
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
      const flexible = [isFlexibleStaking]; // Optional parameter for flexible staking
      const result = await actor.vault_lock_tokens(amount, duration, flexible);
      
      if ('ok' in result) {
        const entryId = Number(result.ok);
        const stakingType = isFlexibleStaking ? 'flexible staking' : 'time-locked staking';
        const durationText = isFlexibleStaking ? '' : (useCustomDuration ? ` for ${lockDuration} minutes` : ' (default duration)');
        toast.success(`Tokens locked successfully as ${stakingType}${durationText}! Entry ID: ${entryId}`);
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

  const handleUnlockTokens = async (entryId) => {
    try {
      setLoading(true);
      const result = await actor.vault_unlock_tokens(entryId);
      
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
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-6">Vault Operations</h2>

      {/* Existing Vault Entries */}
      {userVaultEntries && userVaultEntries.length > 0 && (
        <div className="space-y-4 mb-6">
          <h3 className="text-lg font-semibold text-gray-800">Your Staking Positions</h3>
          {userVaultEntries.map((entry) => (
            <div key={entry.id} className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex justify-between items-start mb-3">
                <h4 className="text-md font-semibold text-green-800">
                  Entry #{entry.id} - {entry.is_flexible ? 'Flexible Staking' : 'Time-Locked Staking'}
                </h4>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  entry.can_unlock 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'bg-orange-100 text-orange-800'
                }`}>
                  {entry.can_unlock ? 'Ready to Unlock' : 'Locked'}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                <div>
                  <span className="text-green-700">Amount:</span>
                  <span className="font-semibold text-green-900 ml-2">
                    {(Number(entry.amount) / 1000000).toFixed(2)} USDX
                  </span>
                </div>
                <div>
                  <span className="text-green-700">Locked At:</span>
                  <span className="font-semibold text-green-900 ml-2">
                    {formatTimestamp(entry.locked_at)}
                  </span>
                </div>
                {entry.unlock_time && (
                  <>
                    <div>
                      <span className="text-green-700">Unlock Time:</span>
                      <span className="font-semibold text-green-900 ml-2">
                        {formatTimestamp(entry.unlock_time)}
                      </span>
                    </div>
                    <div>
                      <span className="text-green-700">Status:</span>
                      <span className={`font-semibold ml-2 ${entry.can_unlock ? 'text-blue-600' : 'text-orange-600'}`}>
                        {getTimeUntilUnlock(entry.unlock_time)}
                      </span>
                    </div>
                  </>
                )}
                {entry.is_flexible && (
                  <div className="col-span-2">
                    <span className="text-green-700">Type:</span>
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
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
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
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Create New Staking Position</h3>
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

            {/* Staking Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Staking Type
              </label>
              <div className="space-y-3">
                <div className="flex items-center">
                  <input
                    type="radio"
                    id="flexibleStaking"
                    name="stakingType"
                    checked={isFlexibleStaking}
                    onChange={() => setIsFlexibleStaking(true)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <label htmlFor="flexibleStaking" className="ml-2 text-sm text-gray-700">
                    <span className="font-medium text-blue-600">Flexible Staking</span> - Withdraw anytime
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="radio"
                    id="timeLockedStaking"
                    name="stakingType"
                    checked={!isFlexibleStaking}
                    onChange={() => setIsFlexibleStaking(false)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <label htmlFor="timeLockedStaking" className="ml-2 text-sm text-gray-700">
                    <span className="font-medium text-green-600">Time-Locked Staking</span> - Higher rewards, locked period
                  </label>
                </div>
              </div>
            </div>

            {/* Lock Duration Options (only for time-locked staking) */}
            {!isFlexibleStaking && (
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
            )}
            
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
                  Stake your USDX tokens to earn dividends. Choose between flexible staking (withdraw anytime) or 
                  time-locked staking (higher rewards, locked period). All staked tokens are eligible for dividend distributions.
                </p>
              </div>
            </div>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VaultSection;
