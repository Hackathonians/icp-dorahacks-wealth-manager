import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Principal } from '@dfinity/principal';
import toast from 'react-hot-toast';

const AdminPanel = ({ onRefresh }) => {
  const { actor } = useAuth();
  const [transferAmount, setTransferAmount] = useState('');
  const [transferTo, setTransferTo] = useState('');
  const [dividendAmount, setDividendAmount] = useState('');
  const [lockPeriod, setLockPeriod] = useState('');
  const [emergencyEntryId, setEmergencyEntryId] = useState('');
  const [loading, setLoading] = useState({
    transfer: false,
    dividend: false,
    lockPeriod: false,
    emergency: false,
  });

  const handleTransferTokens = async (e) => {
    e.preventDefault();
    
    if (!transferAmount || !transferTo) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      // Validate principal
      const toPrincipal = Principal.fromText(transferTo);
      
      setLoading(prev => ({ ...prev, transfer: true }));
      const amount = Math.floor(Number(transferAmount) * 1000000); // Convert to smallest unit
      const result = await actor.admin_transfer_tokens(toPrincipal, amount);
      
      if ('ok' in result) {
        toast.success(`Successfully transferred ${transferAmount} USDX!`);
        setTransferAmount('');
        setTransferTo('');
        onRefresh();
      } else {
        toast.error(result.err);
      }
    } catch (error) {
      console.error('Failed to transfer tokens:', error);
      if (error.message.includes('Invalid principal')) {
        toast.error('Invalid principal ID format');
      } else {
        toast.error('Failed to transfer tokens');
      }
    } finally {
      setLoading(prev => ({ ...prev, transfer: false }));
    }
  };

  const handleDistributeDividend = async (e) => {
    e.preventDefault();
    
    if (!dividendAmount || Number(dividendAmount) <= 0) {
      toast.error('Please enter a valid dividend amount');
      return;
    }

    try {
      setLoading(prev => ({ ...prev, dividend: true }));
      const amount = Math.floor(Number(dividendAmount) * 1000000); // Convert to smallest unit
      const result = await actor.admin_distribute_dividend(amount);
      
      if ('ok' in result) {
        const distributionId = Number(result.ok);
        toast.success(`Successfully distributed dividend! Distribution ID: ${distributionId}`);
        setDividendAmount('');
        onRefresh();
      } else {
        toast.error(result.err);
      }
    } catch (error) {
      console.error('Failed to distribute dividend:', error);
      toast.error('Failed to distribute dividend');
    } finally {
      setLoading(prev => ({ ...prev, dividend: false }));
    }
  };

  const handleSetLockPeriod = async (e) => {
    e.preventDefault();
    
    if (!lockPeriod || Number(lockPeriod) <= 0) {
      toast.error('Please enter a valid lock period in minutes');
      return;
    }

    try {
      setLoading(prev => ({ ...prev, lockPeriod: true }));
      const periodMinutes = Number(lockPeriod);
      const result = await actor.admin_set_lock_period(periodMinutes);
      
      if ('ok' in result) {
        toast.success(`Successfully set default lock period to ${lockPeriod} minutes!`);
        setLockPeriod('');
        onRefresh();
      } else {
        toast.error(result.err);
      }
    } catch (error) {
      console.error('Failed to set lock period:', error);
      toast.error('Failed to set lock period');
    } finally {
      setLoading(prev => ({ ...prev, lockPeriod: false }));
    }
  };

  const handleEmergencyWithdrawal = async (e) => {
    e.preventDefault();
    
    if (!emergencyEntryId || Number(emergencyEntryId) <= 0) {
      toast.error('Please enter a valid entry ID');
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to perform emergency withdrawal for entry #${emergencyEntryId}? This will immediately unlock the tokens and return them to the user.`
    );

    if (!confirmed) return;

    try {
      setLoading(prev => ({ ...prev, emergency: true }));
      const entryId = Number(emergencyEntryId);
      const result = await actor.admin_emergency_withdrawal(entryId);
      
      if ('ok' in result) {
        const withdrawnAmount = Number(result.ok) / 1000000;
        toast.success(`Emergency withdrawal successful! Returned ${withdrawnAmount.toFixed(2)} USDX from entry #${entryId}`);
        setEmergencyEntryId('');
        onRefresh();
      } else {
        toast.error(result.err);
      }
    } catch (error) {
      console.error('Failed to perform emergency withdrawal:', error);
      toast.error('Failed to perform emergency withdrawal');
    } finally {
      setLoading(prev => ({ ...prev, emergency: false }));
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-red-500">
      <div className="flex items-center mb-6">
        <svg className="h-6 w-6 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
        <h2 className="text-xl font-bold text-gray-900">Admin Panel</h2>
      </div>

      <div className="space-y-6">
        {/* Transfer Tokens Section */}
        <div className="bg-blue-50 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-blue-800 mb-4">Transfer Tokens</h3>
          <form onSubmit={handleTransferTokens} className="space-y-4">
            <div>
              <label htmlFor="transferTo" className="block text-sm font-medium text-gray-700 mb-2">
                Recipient Principal ID
              </label>
              <input
                type="text"
                id="transferTo"
                value={transferTo}
                onChange={(e) => setTransferTo(e.target.value)}
                placeholder="Enter principal ID (e.g., rdmx6-jaaaa-aaaah-qcaiq-cai)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            
            <div>
              <label htmlFor="transferAmount" className="block text-sm font-medium text-gray-700 mb-2">
                Amount (USDX)
              </label>
              <input
                type="number"
                id="transferAmount"
                value={transferAmount}
                onChange={(e) => setTransferAmount(e.target.value)}
                placeholder="Enter amount to transfer"
                step="0.01"
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            
            <button
              type="submit"
              disabled={loading.transfer}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-2 px-4 rounded-lg font-medium transition-colors"
            >
              {loading.transfer ? 'Transferring...' : 'Transfer Tokens'}
            </button>
          </form>
        </div>

        {/* Distribute Dividend Section */}
        <div className="bg-green-50 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-green-800 mb-4">Distribute Dividend</h3>
          <form onSubmit={handleDistributeDividend} className="space-y-4">
            <div>
              <label htmlFor="dividendAmount" className="block text-sm font-medium text-gray-700 mb-2">
                Total Dividend Amount (USDX)
              </label>
              <input
                type="number"
                id="dividendAmount"
                value={dividendAmount}
                onChange={(e) => setDividendAmount(e.target.value)}
                placeholder="Enter total dividend amount"
                step="0.01"
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                required
              />
            </div>
            
            <button
              type="submit"
              disabled={loading.dividend}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white py-2 px-4 rounded-lg font-medium transition-colors"
            >
              {loading.dividend ? 'Distributing...' : 'Distribute Dividend'}
            </button>
          </form>
          
          <div className="mt-3 text-sm text-green-700">
            <p>💡 Dividend will be distributed proportionally to all locked tokens</p>
          </div>
        </div>

        {/* Set Lock Period Section */}
        <div className="bg-purple-50 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-purple-800 mb-4">Set Default Lock Period</h3>
          <form onSubmit={handleSetLockPeriod} className="space-y-4">
            <div>
              <label htmlFor="lockPeriod" className="block text-sm font-medium text-gray-700 mb-2">
                Default Lock Period (Minutes)
              </label>
              <input
                type="number"
                id="lockPeriod"
                value={lockPeriod}
                onChange={(e) => setLockPeriod(e.target.value)}
                placeholder="Enter lock period in minutes (e.g., 60, 1440)"
                min="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                required
              />
            </div>
            
            <button
              type="submit"
              disabled={loading.lockPeriod}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white py-2 px-4 rounded-lg font-medium transition-colors"
            >
              {loading.lockPeriod ? 'Setting...' : 'Set Lock Period'}
            </button>
          </form>
          
          <div className="mt-3 text-sm text-purple-700">
            <p>⏰ This sets the default lock period for users who don't specify a custom duration</p>
            <p className="text-xs mt-1">Common values: 60 (1 hour), 1440 (1 day), 10080 (1 week)</p>
          </div>
        </div>

        {/* Emergency Withdrawal Section */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-red-800 mb-4">Emergency Withdrawal</h3>
          <form onSubmit={handleEmergencyWithdrawal} className="space-y-4">
            <div>
              <label htmlFor="emergencyEntryId" className="block text-sm font-medium text-gray-700 mb-2">
                Vault Entry ID
              </label>
              <input
                type="number"
                id="emergencyEntryId"
                value={emergencyEntryId}
                onChange={(e) => setEmergencyEntryId(e.target.value)}
                placeholder="Enter vault entry ID to unlock (e.g., 1, 2, 3)"
                min="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                required
              />
            </div>
            
            <button
              type="submit"
              disabled={loading.emergency}
              className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white py-2 px-4 rounded-lg font-medium transition-colors"
            >
              {loading.emergency ? 'Processing...' : 'Emergency Withdraw'}
            </button>
          </form>
          
          <div className="mt-3 text-sm text-red-700">
            <p>⚠️ This will immediately unlock any vault entry and return tokens to the user</p>
            <p className="text-xs mt-1">Use only in emergency situations. This action cannot be undone.</p>
          </div>
        </div>

        {/* Admin Info */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-medium text-yellow-800">Admin Privileges</h4>
              <ul className="text-sm text-yellow-700 mt-1 space-y-1">
                <li>• Transfer USDX tokens to any address</li>
                <li>• Distribute dividends to vault participants</li>
                <li>• Set default lock period for vault operations</li>
                <li>• Perform emergency withdrawals for any vault entry</li>
                <li>• All operations use your admin token balance</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
