import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const DividendSection = ({ onRefresh }) => {
  const { actor, principal } = useAuth();
  const [unclaimedDividends, setUnclaimedDividends] = useState([]);
  const [dividendHistory, setDividendHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [claimingId, setClaimingId] = useState(null);

  useEffect(() => {
    if (actor && principal) {
      loadDividendData();
    }
  }, [actor, principal]);

  const loadDividendData = async () => {
    try {
      setLoading(true);
      
      // Load unclaimed dividends
      const unclaimedResult = await actor.get_unclaimed_dividends(principal);
      setUnclaimedDividends(unclaimedResult);
      
      // Load dividend history
      const historyResult = await actor.get_dividend_history();
      setDividendHistory(historyResult);
      
    } catch (error) {
      console.error('Failed to load dividend data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClaimDividend = async (distributionId) => {
    try {
      setClaimingId(distributionId);
      const result = await actor.claim_dividend(Number(distributionId));
      
      if ('ok' in result) {
        const claimedAmount = Number(result.ok) / 1000000;
        toast.success(`Successfully claimed ${claimedAmount.toFixed(6)} USDX dividend!`);
        loadDividendData();
        onRefresh();
      } else {
        toast.error(result.err);
      }
    } catch (error) {
      console.error('Failed to claim dividend:', error);
      toast.error('Failed to claim dividend');
    } finally {
      setClaimingId(null);
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(Number(timestamp) / 1000000);
    return date.toLocaleString();
  };

  const formatTokenAmount = (amount) => {
    return (Number(amount) / 1000000).toFixed(6);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Dividends</h2>
        <button
          onClick={loadDividendData}
          disabled={loading}
          className="text-blue-600 hover:text-blue-800 font-medium disabled:text-gray-400"
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {/* Unclaimed Dividends */}
      {unclaimedDividends.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Unclaimed Dividends</h3>
          <div className="space-y-3">
            {unclaimedDividends.map(([distributionId, amount]) => (
              <div key={distributionId} className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-green-800">
                      Distribution #{Number(distributionId)}
                    </p>
                    <p className="text-green-600">
                      {formatTokenAmount(amount)} USDX
                    </p>
                  </div>
                  <button
                    onClick={() => handleClaimDividend(distributionId)}
                    disabled={claimingId === distributionId}
                    className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    {claimingId === distributionId ? 'Claiming...' : 'Claim'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dividend History */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Dividend History</h3>
        
        {dividendHistory.length === 0 ? (
          <div className="bg-gray-50 rounded-lg p-6 text-center">
            <svg className="h-12 w-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
            <p className="text-gray-600">No dividends distributed yet</p>
            <p className="text-sm text-gray-500 mt-1">
              Dividends will appear here when the admin distributes them
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {dividendHistory
              .sort((a, b) => Number(b[1].distributed_at) - Number(a[1].distributed_at))
              .map(([id, distribution]) => (
                <div key={id} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-gray-900">
                      Distribution #{Number(id)}
                    </span>
                    <span className="text-sm text-gray-600">
                      {formatTimestamp(distribution.distributed_at)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Total Amount:</span>
                      <p className="font-semibold">
                        {formatTokenAmount(distribution.total_amount)} USDX
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600">Per Token:</span>
                      <p className="font-semibold">
                        {formatTokenAmount(distribution.per_token_amount)} USDX
                      </p>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {unclaimedDividends.length === 0 && dividendHistory.length > 0 && (
        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-medium text-blue-800">All caught up!</h4>
              <p className="text-sm text-blue-700">
                You have no unclaimed dividends. Lock tokens to be eligible for future distributions.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DividendSection;
