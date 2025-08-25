import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { WalletIcon, ArrowRightOnRectangleIcon, LockClosedIcon, ChatBubbleLeftRightIcon, GiftIcon, ClockIcon } from '@heroicons/react/24/outline';
import AiChatInterface from './AiChatInterface';
import toast from 'react-hot-toast';

const Header = () => {
  const { isAuthenticated, principal, actor, login, logout, loading, refreshAuth } = useAuth();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [faucetLoading, setFaucetLoading] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  useEffect(() => {
    // Reset state and load last request time from localStorage for the current principal
    setCooldownRemaining(0); // Reset first
    
    const storedTime = localStorage.getItem(`faucet_last_request_${principal?.toString()}`);
    if (storedTime) {
      const lastTime = parseInt(storedTime);
      updateCooldown(lastTime);
    }
  }, [principal]);

  useEffect(() => {
    // Update cooldown every 5 seconds for header (less frequent than component)
    const interval = setInterval(() => {
      const storedTime = localStorage.getItem(`faucet_last_request_${principal?.toString()}`);
      if (storedTime) {
        updateCooldown(parseInt(storedTime));
      } else {
        // No stored time for this principal, ensure cooldown is 0
        setCooldownRemaining(0);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [principal]);

  const updateCooldown = (lastTime) => {
    const now = Date.now();
    const hourInMs = 60 * 60 * 1000; // 1 hour in milliseconds
    const timeSince = now - lastTime;
    const remaining = Math.max(0, hourInMs - timeSince);
    setCooldownRemaining(remaining);
  };

  const formatCooldownTime = (ms) => {
    const minutes = Math.floor(ms / (1000 * 60));
    return `${minutes}m`;
  };

  const handleGetTestTokens = async () => {
    if (!actor || !principal || cooldownRemaining > 0 || faucetLoading) return;

    try {
      setFaucetLoading(true);
      const result = await actor.faucet_get_test_tokens();

      if ('ok' in result) {
        const currentTime = Date.now();
        // Ensure principal exists before using it
        if (principal) {
          localStorage.setItem(`faucet_last_request_${principal.toString()}`, currentTime.toString());
        }
        updateCooldown(currentTime);
        
        toast.success('🎉 Got 100 USDX test tokens!', {
          duration: 3000,
          icon: '🪙',
        });

        // Refresh authentication state to ensure it persists
        await refreshAuth();
      } else {
        toast.error(result.err);
      }
    } catch (error) {
      console.error('Failed to get test tokens:', error);
      toast.error('Failed to get test tokens');
    } finally {
      setFaucetLoading(false);
    }
  };

  const formatPrincipal = (principal) => {
    if (!principal) return '';
    const str = principal.toString();
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
                {/* Test Token Faucet - Prominent header button */}
                {cooldownRemaining > 0 ? (
                  <div className="bg-orange-600 bg-opacity-70 text-white px-3 py-2 rounded-lg font-medium flex items-center space-x-2 cursor-not-allowed" title={`Faucet cooldown: ${formatCooldownTime(cooldownRemaining)} remaining`}>
                    <ClockIcon className="w-4 h-4" />
                    <span className="text-sm">{formatCooldownTime(cooldownRemaining)}</span>
                  </div>
                ) : (
                  <button
                    onClick={handleGetTestTokens}
                    disabled={faucetLoading}
                    className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-3 py-2 rounded-lg font-medium flex items-center space-x-2 transition-colors animate-pulse"
                    title="Get 100 USDX test tokens (1 hour cooldown)"
                  >
                    {faucetLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                        <span className="text-sm">Getting...</span>
                      </>
                    ) : (
                      <>
                        <GiftIcon className="w-4 h-4" />
                        <span className="text-sm">Get Tokens</span>
                      </>
                    )}
                  </button>
                )}

                {/* AI Chat Button - Only visible when authenticated */}
                <button
                  onClick={() => setIsChatOpen(true)}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium flex items-center space-x-2 transition-colors"
                  title="Chat with AI Assistant"
                >
                  <ChatBubbleLeftRightIcon className="w-4 h-4" />
                  <span>AI Chat</span>
                </button>
                
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
      
      {/* AI Chat Interface - Only render when authenticated */}
      {isAuthenticated && (
        <AiChatInterface 
          isOpen={isChatOpen} 
          onClose={() => setIsChatOpen(false)} 
        />
      )}
    </header>
  );
};

export default Header;
