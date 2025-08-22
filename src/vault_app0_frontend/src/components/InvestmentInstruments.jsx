import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const InvestmentInstruments = () => {
  const { actor, principal, isAuthenticated } = useAuth();
  const [instruments, setInstruments] = useState([]);
  const [instrumentInvestments, setInstrumentInvestments] = useState([]);
  const [vaultSummary, setVaultSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Form states
  const [newInstrument, setNewInstrument] = useState({
    name: '',
    description: '',
    instrumentType: 'OnChain',
    protocolOrProvider: '',
    contractAddressOrInstrument: '',
    expectedApy: '',
    riskLevel: '5',
    minInvestment: '',
    maxInvestment: '',
    lockPeriodDays: ''
  });

  const [investmentForm, setInvestmentForm] = useState({
    instrumentId: '',
    amount: ''
  });

  const [yieldForm, setYieldForm] = useState({
    investmentId: '',
    yieldAmount: '',
    yieldType: 'Interest'
  });

  useEffect(() => {
    if (isAuthenticated && actor && principal) {
      checkAdminStatus();
      loadData();
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

  const loadData = async () => {
    if (!actor) return;
    
    setLoading(true);
    try {
      const [instrumentsResult, investmentsResult] = await Promise.all([
        actor.get_all_investment_instruments(),
        actor.get_instrument_investments()
      ]);

      setInstruments(instrumentsResult);
      setInstrumentInvestments(investmentsResult);

      if (isAdmin) {
        const summaryResult = await actor.admin_get_vault_investment_summary();
        if ('ok' in summaryResult) {
          setVaultSummary(summaryResult.ok);
        }
      }
    } catch (err) {
      console.error('Error loading data:', err);
      toast.error('Failed to load investment instruments');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInstrument = async (e) => {
    e.preventDefault();
    if (!actor || !isAdmin) return;

    try {
      setLoading(true);

      // Prepare instrument type
      let instrumentType;
      if (newInstrument.instrumentType === 'OnChain') {
        instrumentType = {
          OnChain: {
            protocol: newInstrument.protocolOrProvider,
            contract_address: newInstrument.contractAddressOrInstrument ? [newInstrument.contractAddressOrInstrument] : []
          }
        };
      } else if (newInstrument.instrumentType === 'OffChain') {
        instrumentType = {
          OffChain: {
            provider: newInstrument.protocolOrProvider,
            instrument_name: newInstrument.contractAddressOrInstrument
          }
        };
      } else if (newInstrument.instrumentType === 'Liquidity') {
        instrumentType = {
          Liquidity: {
            dex: newInstrument.protocolOrProvider,
            pair: newInstrument.contractAddressOrInstrument
          }
        };
      } else if (newInstrument.instrumentType === 'Staking') {
        instrumentType = {
          Staking: {
            validator: newInstrument.protocolOrProvider,
            network: newInstrument.contractAddressOrInstrument
          }
        };
      } else {
        instrumentType = {
          Lending: {
            platform: newInstrument.protocolOrProvider,
            asset: newInstrument.contractAddressOrInstrument
          }
        };
      }

      const result = await actor.admin_create_investment_instrument(
        newInstrument.name,
        newInstrument.description,
        instrumentType,
        parseFloat(newInstrument.expectedApy),
        parseInt(newInstrument.riskLevel),
        parseInt(newInstrument.minInvestment) * 1000000, // Convert to base units
        newInstrument.maxInvestment ? [parseInt(newInstrument.maxInvestment) * 1000000] : [],
        newInstrument.lockPeriodDays ? [parseInt(newInstrument.lockPeriodDays)] : []
      );

      if ('ok' in result) {
        toast.success('Investment instrument created successfully');
        setShowCreateForm(false);
        setNewInstrument({
          name: '',
          description: '',
          instrumentType: 'OnChain',
          protocolOrProvider: '',
          contractAddressOrInstrument: '',
          expectedApy: '',
          riskLevel: '5',
          minInvestment: '',
          maxInvestment: '',
          lockPeriodDays: ''
        });
        loadData();
      } else {
        toast.error(result.err);
      }
    } catch (err) {
      console.error('Error creating instrument:', err);
      toast.error('Failed to create investment instrument');
    } finally {
      setLoading(false);
    }
  };

  const handleInvestInInstrument = async (e) => {
    e.preventDefault();
    if (!actor || !isAdmin) return;

    try {
      setLoading(true);
      const result = await actor.admin_invest_in_instrument(
        parseInt(investmentForm.instrumentId),
        parseInt(investmentForm.amount) * 1000000 // Convert to base units
      );

      if ('ok' in result) {
        toast.success('Investment made successfully');
        setInvestmentForm({ instrumentId: '', amount: '' });
        loadData();
      } else {
        toast.error(result.err);
      }
    } catch (err) {
      console.error('Error investing:', err);
      toast.error('Failed to make investment');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateYield = async (e) => {
    e.preventDefault();
    if (!actor || !isAdmin) return;

    try {
      setLoading(true);
      
      let yieldType;
      switch (yieldForm.yieldType) {
        case 'Interest': yieldType = { Interest: null }; break;
        case 'Dividends': yieldType = { Dividends: null }; break;
        case 'TradingFees': yieldType = { TradingFees: null }; break;
        case 'StakingRewards': yieldType = { StakingRewards: null }; break;
        case 'LiquidityMining': yieldType = { LiquidityMining: null }; break;
        default: yieldType = { Other: yieldForm.yieldType };
      }

      const result = await actor.admin_update_instrument_yield(
        parseInt(yieldForm.investmentId),
        parseInt(yieldForm.yieldAmount) * 1000000, // Convert to base units
        yieldType
      );

      if ('ok' in result) {
        toast.success('Yield updated successfully');
        setYieldForm({ investmentId: '', yieldAmount: '', yieldType: 'Interest' });
        loadData();
      } else {
        toast.error(result.err);
      }
    } catch (err) {
      console.error('Error updating yield:', err);
      toast.error('Failed to update yield');
    } finally {
      setLoading(false);
    }
  };

  const handleExitInvestment = async (investmentId) => {
    if (!actor || !isAdmin) return;

    try {
      setLoading(true);
      const result = await actor.admin_exit_instrument_investment(
        investmentId,
        { Immediate: null }
      );

      if ('ok' in result) {
        toast.success('Investment exited successfully');
        loadData();
      } else {
        toast.error(result.err);
      }
    } catch (err) {
      console.error('Error exiting investment:', err);
      toast.error('Failed to exit investment');
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

  const getInstrumentTypeText = (instrumentType) => {
    const type = Object.keys(instrumentType)[0];
    const data = instrumentType[type];
    
    switch (type) {
      case 'OnChain':
        return `On-Chain: ${data.protocol}`;
      case 'OffChain':
        return `Off-Chain: ${data.provider}`;
      case 'Liquidity':
        return `Liquidity: ${data.dex} (${data.pair})`;
      case 'Staking':
        return `Staking: ${data.validator}`;
      case 'Lending':
        return `Lending: ${data.platform}`;
      default:
        return type;
    }
  };

  const getRiskLevelColor = (riskLevel) => {
    if (riskLevel <= 3) return 'text-green-600 bg-green-100';
    if (riskLevel <= 6) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getStatusColor = (status) => {
    switch (Object.keys(status)[0]) {
      case 'Active': return 'text-green-600 bg-green-100';
      case 'Paused': return 'text-yellow-600 bg-yellow-100';
      case 'Liquidating': return 'text-orange-600 bg-orange-100';
      case 'Closed': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Investment Instruments</h2>
        <p className="text-gray-600">Please connect your wallet to view investment instruments.</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Investment Instruments</h2>
        <p className="text-gray-600">Only administrators can manage investment instruments.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Investment Instruments</h2>
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === 'overview'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('instruments')}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === 'instruments'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Instruments
          </button>
          <button
            onClick={() => setActiveTab('investments')}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === 'investments'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Active Investments
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Overview Tab */}
      {activeTab === 'overview' && vaultSummary && !loading && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-blue-600">Total Vault Balance</h3>
              <p className="text-2xl font-bold text-blue-800">{formatTokenAmount(vaultSummary.total_vault_balance)} USDX</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-green-600">Invested in Instruments</h3>
              <p className="text-2xl font-bold text-green-800">{formatTokenAmount(vaultSummary.total_invested_in_instruments)} USDX</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-purple-600">Available for Investment</h3>
              <p className="text-2xl font-bold text-purple-800">{formatTokenAmount(vaultSummary.total_available_for_investment)} USDX</p>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-yellow-600">Total Yield Earned</h3>
              <p className="text-2xl font-bold text-yellow-800">{formatTokenAmount(vaultSummary.total_yield_earned)} USDX</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-indigo-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-indigo-600">Weighted Average APY</h3>
              <p className="text-2xl font-bold text-indigo-800">{formatPercentage(vaultSummary.weighted_average_apy)}</p>
            </div>
            <div className="bg-pink-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-pink-600">Active Instruments</h3>
              <p className="text-2xl font-bold text-pink-800">{vaultSummary.active_instruments}</p>
            </div>
            <div className="bg-teal-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-teal-600">Diversity Score</h3>
              <p className="text-2xl font-bold text-teal-800">{vaultSummary.investment_diversity_score.toFixed(1)}/100</p>
            </div>
          </div>
        </div>
      )}

      {/* Instruments Tab */}
      {activeTab === 'instruments' && !loading && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-800">Investment Instruments</h3>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              {showCreateForm ? 'Cancel' : 'Create New Instrument'}
            </button>
          </div>

          {showCreateForm && (
            <div className="bg-gray-50 p-6 rounded-lg">
              <h4 className="text-lg font-medium text-gray-800 mb-4">Create New Investment Instrument</h4>
              <form onSubmit={handleCreateInstrument} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <input
                      type="text"
                      value={newInstrument.name}
                      onChange={(e) => setNewInstrument({...newInstrument, name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Instrument Type</label>
                    <select
                      value={newInstrument.instrumentType}
                      onChange={(e) => setNewInstrument({...newInstrument, instrumentType: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="OnChain">On-Chain</option>
                      <option value="OffChain">Off-Chain</option>
                      <option value="Liquidity">Liquidity</option>
                      <option value="Staking">Staking</option>
                      <option value="Lending">Lending</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={newInstrument.description}
                    onChange={(e) => setNewInstrument({...newInstrument, description: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    rows="3"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {newInstrument.instrumentType === 'OnChain' ? 'Protocol' : 
                       newInstrument.instrumentType === 'OffChain' ? 'Provider' :
                       newInstrument.instrumentType === 'Liquidity' ? 'DEX' :
                       newInstrument.instrumentType === 'Staking' ? 'Validator' : 'Platform'}
                    </label>
                    <input
                      type="text"
                      value={newInstrument.protocolOrProvider}
                      onChange={(e) => setNewInstrument({...newInstrument, protocolOrProvider: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {newInstrument.instrumentType === 'OnChain' ? 'Contract Address' : 
                       newInstrument.instrumentType === 'OffChain' ? 'Instrument Name' :
                       newInstrument.instrumentType === 'Liquidity' ? 'Trading Pair' :
                       newInstrument.instrumentType === 'Staking' ? 'Network' : 'Asset'}
                    </label>
                    <input
                      type="text"
                      value={newInstrument.contractAddressOrInstrument}
                      onChange={(e) => setNewInstrument({...newInstrument, contractAddressOrInstrument: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Expected APY (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newInstrument.expectedApy}
                      onChange={(e) => setNewInstrument({...newInstrument, expectedApy: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Risk Level (1-10)</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={newInstrument.riskLevel}
                      onChange={(e) => setNewInstrument({...newInstrument, riskLevel: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Min Investment (USDX)</label>
                    <input
                      type="number"
                      value={newInstrument.minInvestment}
                      onChange={(e) => setNewInstrument({...newInstrument, minInvestment: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Investment (USDX, optional)</label>
                    <input
                      type="number"
                      value={newInstrument.maxInvestment}
                      onChange={(e) => setNewInstrument({...newInstrument, maxInvestment: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Lock Period (days, optional)</label>
                    <input
                      type="number"
                      value={newInstrument.lockPeriodDays}
                      onChange={(e) => setNewInstrument({...newInstrument, lockPeriodDays: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="px-4 py-2 text-gray-600 bg-gray-200 rounded-lg hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    Create Instrument
                  </button>
                </div>
              </form>
            </div>
          )}

          {instruments.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">APY</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Risk</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total Invested</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {instruments.map((instrument) => (
                    <tr key={instrument.id}>
                      <td className="px-4 py-2 text-sm text-gray-900">{instrument.name}</td>
                      <td className="px-4 py-2 text-sm text-gray-900">{getInstrumentTypeText(instrument.instrument_type)}</td>
                      <td className="px-4 py-2 text-sm text-gray-900">{formatPercentage(instrument.expected_apy)}</td>
                      <td className="px-4 py-2">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRiskLevelColor(instrument.risk_level)}`}>
                          {instrument.risk_level}/10
                        </span>
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900">{formatTokenAmount(instrument.total_invested)} USDX</td>
                      <td className="px-4 py-2">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(instrument.status)}`}>
                          {Object.keys(instrument.status)[0]}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-sm">
                        <button
                          onClick={() => setInvestmentForm({...investmentForm, instrumentId: instrument.id.toString()})}
                          className="text-blue-600 hover:text-blue-800 mr-2"
                        >
                          Invest
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Investment Form */}
          {investmentForm.instrumentId && (
            <div className="bg-gray-50 p-6 rounded-lg">
              <h4 className="text-lg font-medium text-gray-800 mb-4">Invest in Instrument</h4>
              <form onSubmit={handleInvestInInstrument} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount (USDX)</label>
                  <input
                    type="number"
                    value={investmentForm.amount}
                    onChange={(e) => setInvestmentForm({...investmentForm, amount: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setInvestmentForm({instrumentId: '', amount: ''})}
                    className="px-4 py-2 text-gray-600 bg-gray-200 rounded-lg hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    Invest
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Active Investments Tab */}
      {activeTab === 'investments' && !loading && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-800">Active Investments</h3>
          </div>

          {instrumentInvestments.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Instrument</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Amount Invested</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Current Value</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Yield Earned</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Invested At</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {instrumentInvestments.map((investment) => {
                    const instrument = instruments.find(i => i.id === investment.instrument_id);
                    return (
                      <tr key={investment.id}>
                        <td className="px-4 py-2 text-sm text-gray-900">{instrument?.name || 'Unknown'}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{formatTokenAmount(investment.amount_invested)} USDX</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{formatTokenAmount(investment.current_value)} USDX</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{formatTokenAmount(investment.yield_earned)} USDX</td>
                        <td className="px-4 py-2">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(investment.status)}`}>
                            {Object.keys(investment.status)[0]}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">{formatTimestamp(investment.invested_at)}</td>
                        <td className="px-4 py-2 text-sm">
                          <button
                            onClick={() => setYieldForm({...yieldForm, investmentId: investment.id.toString()})}
                            className="text-green-600 hover:text-green-800 mr-2"
                          >
                            Add Yield
                          </button>
                          {Object.keys(investment.status)[0] === 'Active' && (
                            <button
                              onClick={() => handleExitInvestment(investment.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              Exit
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Yield Update Form */}
          {yieldForm.investmentId && (
            <div className="bg-gray-50 p-6 rounded-lg">
              <h4 className="text-lg font-medium text-gray-800 mb-4">Update Investment Yield</h4>
              <form onSubmit={handleUpdateYield} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Yield Amount (USDX)</label>
                    <input
                      type="number"
                      step="0.000001"
                      value={yieldForm.yieldAmount}
                      onChange={(e) => setYieldForm({...yieldForm, yieldAmount: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Yield Type</label>
                    <select
                      value={yieldForm.yieldType}
                      onChange={(e) => setYieldForm({...yieldForm, yieldType: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="Interest">Interest</option>
                      <option value="Dividends">Dividends</option>
                      <option value="TradingFees">Trading Fees</option>
                      <option value="StakingRewards">Staking Rewards</option>
                      <option value="LiquidityMining">Liquidity Mining</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setYieldForm({investmentId: '', yieldAmount: '', yieldType: 'Interest'})}
                    className="px-4 py-2 text-gray-600 bg-gray-200 rounded-lg hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    Update Yield
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default InvestmentInstruments;
