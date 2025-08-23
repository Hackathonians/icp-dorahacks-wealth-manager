import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const InvestmentReport = () => {
  const { actor, principal, isAuthenticated } = useAuth();
  const [userReport, setUserReport] = useState(null);
  const [adminReport, setAdminReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedTab, setSelectedTab] = useState('user');

  useEffect(() => {
    if (isAuthenticated && actor && principal) {
      checkAdminStatus();
      loadUserReport();
    }
  }, [isAuthenticated, actor, principal]);

  const checkAdminStatus = async () => {
    try {
      const adminStatus = await actor.is_admin(principal);
      setIsAdmin(adminStatus);
    } catch (err) {
      console.error('Error checking admin status:', err);
    }
  };

  const loadUserReport = async () => {
    if (!actor) return;
    
    setLoading(true);
    setError('');
    
    try {
      const result = await actor.get_user_investment_report();
      if ('ok' in result) {
        setUserReport(result.ok);
      } else {
        setError(result.err);
      }
    } catch (err) {
      setError('Failed to load investment report: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadAdminReport = async () => {
    if (!actor || !isAdmin) return;
    
    setLoading(true);
    setError('');
    
    try {
      const result = await actor.admin_get_investment_report();
      if ('ok' in result) {
        setAdminReport(result.ok);
      } else {
        setError(result.err);
      }
    } catch (err) {
      setError('Failed to load admin report: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatTokenAmount = (amount) => {
    return (Number(amount) / 1000000).toFixed(6);
  };

  const formatPercentage = (percentage) => {
    return Number(percentage).toFixed(2) + '%';
  };

  const formatTimestamp = (timestamp) => {
    return new Date(Number(timestamp) / 1000000).toLocaleString();
  };

  const getDurationText = (duration) => {
    let minutes;
    
    // Handle both object format and direct number format
    if (typeof duration === 'number') {
      minutes = duration;
    } else if (duration && duration.Minutes) {
      minutes = Number(duration.Minutes);
    } else {
      return 'Unknown';
    }
    
    if (minutes === -1) return 'Flexible';
    if (minutes < 60) return `${minutes} minutes`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)} hours`;
    return `${Math.floor(minutes / 1440)} days`;
  };

  const getStatusColor = (status) => {
    switch (Object.keys(status)[0]) {
      case 'Active': return 'text-green-600 bg-green-100';
      case 'Completed': return 'text-blue-600 bg-blue-100';
      case 'Cancelled': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getActivityTypeText = (activityType) => {
    const type = Object.keys(activityType)[0];
    switch (type) {
      case 'Lock': return 'Lock Tokens';
      case 'Unlock': return 'Unlock Tokens';
      case 'DividendClaim': return 'Claim Dividend';
      case 'DividendDistribution': return 'Dividend Distribution';
      default: return type;
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Investment Report</h2>
        <p className="text-gray-600">Please connect your wallet to view your investment report.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Investment Report</h2>
        <div className="flex space-x-2">
          <button
            onClick={() => setSelectedTab('user')}
            className={`px-4 py-2 rounded-lg font-medium ${
              selectedTab === 'user'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            My Investments
          </button>
          {isAdmin && (
            <button
              onClick={() => {
                setSelectedTab('admin');
                if (!adminReport) loadAdminReport();
              }}
              className={`px-4 py-2 rounded-lg font-medium ${
                selectedTab === 'admin'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Admin Dashboard
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}

      {selectedTab === 'user' && userReport && !loading && (
        <div className="space-y-6">
          {/* User Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-blue-600">Total Investments</h3>
              <p className="text-2xl font-bold text-blue-800">{userReport.summary.total_investments}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-green-600">Amount Invested</h3>
              <p className="text-2xl font-bold text-green-800">{formatTokenAmount(userReport.summary.total_amount_invested)} USDX</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-purple-600">Current Value</h3>
              <p className="text-2xl font-bold text-purple-800">{formatTokenAmount(userReport.summary.total_current_value)} USDX</p>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-yellow-600">Average ROI</h3>
              <p className="text-2xl font-bold text-yellow-800">{formatPercentage(userReport.summary.average_roi)}</p>
            </div>
          </div>

          {/* Dividends Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-indigo-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-indigo-600">Dividends Earned</h3>
              <p className="text-2xl font-bold text-indigo-800">{formatTokenAmount(userReport.summary.total_dividends_earned)} USDX</p>
            </div>
            <div className="bg-pink-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-pink-600">Dividends Claimed</h3>
              <p className="text-2xl font-bold text-pink-800">{formatTokenAmount(userReport.summary.total_dividends_claimed)} USDX</p>
            </div>
          </div>

          {/* Investment Details */}
          {userReport.investments.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Investment Details</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Current Value</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">ROI</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {userReport.investments.map((investment) => (
                      <tr key={investment.id}>
                        <td className="px-4 py-2 text-sm text-gray-900">{investment.product_name}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{formatTokenAmount(investment.initial_amount)} USDX</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{formatTokenAmount(investment.current_value)} USDX</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{formatPercentage(investment.roi_percentage)}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{getDurationText(investment.duration_type)}</td>
                        <td className="px-4 py-2">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(investment.status)}`}>
                            {Object.keys(investment.status)[0]}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">{formatTimestamp(investment.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Unclaimed Dividends */}
          {userReport.unclaimed_dividends.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Unclaimed Dividends</h3>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-yellow-800 mb-2">You have unclaimed dividends available:</p>
                <ul className="space-y-1">
                  {userReport.unclaimed_dividends.map(([distributionId, amount]) => (
                    <li key={distributionId} className="text-yellow-700">
                      Distribution #{distributionId}: {formatTokenAmount(amount)} USDX
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}

      {selectedTab === 'admin' && isAdmin && adminReport && !loading && (
        <div className="space-y-6">
          {/* Platform Summary */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Platform Overview</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-blue-600">Total Users</h4>
                <p className="text-2xl font-bold text-blue-800">{adminReport.total_users}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-green-600">Total Investments</h4>
                <p className="text-2xl font-bold text-green-800">{adminReport.platform_summary.total_investments}</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-purple-600">Total Value Locked</h4>
                <p className="text-2xl font-bold text-purple-800">{formatTokenAmount(adminReport.platform_summary.total_amount_invested)} USDX</p>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-yellow-600">Platform ROI</h4>
                <p className="text-2xl font-bold text-yellow-800">{formatPercentage(adminReport.platform_summary.average_roi)}</p>
              </div>
            </div>
          </div>

          {/* Top Investors */}
          {adminReport.top_investors.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Top Investors</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Rank</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Principal</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total Invested</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {adminReport.top_investors.map(([principal, amount], index) => (
                      <tr key={principal.toString()}>
                        <td className="px-4 py-2 text-sm text-gray-900">#{index + 1}</td>
                        <td className="px-4 py-2 text-sm text-gray-900 font-mono">{principal.toString().slice(0, 20)}...</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{formatTokenAmount(amount)} USDX</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Product Performance */}
          {adminReport.product_performance.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Product Performance</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total Locked</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Users</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {adminReport.product_performance.map(([productId, name, totalLocked, userCount]) => (
                      <tr key={productId}>
                        <td className="px-4 py-2 text-sm text-gray-900">{name}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{formatTokenAmount(totalLocked)} USDX</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{userCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Recent Activities */}
          {adminReport.recent_activities.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Activities</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Activity</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {adminReport.recent_activities.slice(0, 20).map((activity) => (
                      <tr kaey={activity.id}>
                        <td className="px-4 py-2 text-sm text-gray-900 font-mono">{activity.user.toString().slice(0, 15)}...</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{getActivityTypeText(activity.activity_type)}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{formatTokenAmount(activity.amount)} USDX</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{formatTimestamp(activity.timestamp)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {userReport && userReport.summary.total_investments === 0 && !loading && (
        <div className="text-center py-8">
          <p className="text-gray-600">You haven't made any investments yet.</p>
          <p className="text-gray-500 mt-2">Start investing to see your investment report here.</p>
        </div>
      )}
    </div>
  );
};

export default InvestmentReport;
