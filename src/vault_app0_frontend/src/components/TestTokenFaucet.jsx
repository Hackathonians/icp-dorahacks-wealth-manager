import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { GiftIcon, ClockIcon, BeakerIcon } from '@heroicons/react/24/outline';

const TestTokenFaucet = ({ onTokensReceived }) => {
  const { actor, principal, refreshAuth } = useAuth();
  const [loading, setLoading] = useState(false);
  const [lastRequestTime, setLastRequestTime] = useState(null);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  useEffect(() => {
    // Load last request time from localStorage
    const storedTime = localStorage.getItem(`faucet_last_request_${principal?.toString()}`);
    if (storedTime) {
      const lastTime = parseInt(storedTime);
      setLastRequestTime(lastTime);
      updateCooldown(lastTime);
    } else {
      // Reset state for new principal
      setLastRequestTime(null);
      setCooldownRemaining(0);
    }
  }, [principal]);

  useEffect(() => {
    // Update cooldown every second
    const interval = setInterval(() => {
      if (lastRequestTime) {
        updateCooldown(lastRequestTime);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [lastRequestTime]);

  const updateCooldown = (lastTime) => {
    const now = Date.now();
    const hourInMs = 60 * 60 * 1000; // 1 hour in milliseconds
    const timeSince = now - lastTime;
    const remaining = Math.max(0, hourInMs - timeSince);
    setCooldownRemaining(remaining);
  };

  const formatCooldownTime = (ms) => {
    const minutes = Math.floor(ms / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  const handleGetTestTokens = async () => {
    if (!actor || !principal || cooldownRemaining > 0) return;

    try {
      setLoading(true);
      
      const result = await actor.faucet_get_test_tokens();

      if ('ok' in result) {
        const currentTime = Date.now();
        setLastRequestTime(currentTime);
        // Ensure principal exists before using it
        if (principal) {
          localStorage.setItem(`faucet_last_request_${principal.toString()}`, currentTime.toString());
        }
        
        toast.success('🎉 Successfully received 100 USDX test tokens!', {
          duration: 4000,
          icon: '🪙',
        });
        
        // Refresh authentication state to ensure it persists
        await refreshAuth();
        
        // Notify parent component to refresh balance
        if (onTokensReceived) {
          onTokensReceived();
        }
      } else {
        toast.error(result.err);
      }
    } catch (error) {
      console.error('Failed to get test tokens:', error);
      toast.error('Failed to get test tokens. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isOnCooldown = cooldownRemaining > 0;

  return (
    <div className="glass rounded-lg p-4 border border-slate-200 border-opacity-60">
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <div className="animated-gradient w-10 h-10 rounded-lg flex items-center justify-center">
            <BeakerIcon className="w-6 h-6 text-white" />
          </div>
        </div>
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <h4 className="text-slate-900 font-medium">Test Token Faucet</h4>
            <span className="inline-block px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full font-medium">
              HACKATHON
            </span>
          </div>
          <p className="text-slate-700 text-sm mb-4">
            Get 100 USDX test tokens to try out the vault and dividend features. 
            Available once per hour for testing purposes.
          </p>
          
          {isOnCooldown ? (
            <div className="bg-orange-50 rounded-lg p-3 border border-orange-200">
              <div className="flex items-center space-x-2">
                <ClockIcon className="w-5 h-5 text-orange-600" />
                <div>
                  <p className="text-orange-800 text-sm font-medium">Cooldown Active</p>
                  <p className="text-slate-700 text-xs">
                    Next request available in: {formatCooldownTime(cooldownRemaining)}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={handleGetTestTokens}
              disabled={loading}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  <span>Getting Tokens...</span>
                </>
              ) : (
                <>
                  <GiftIcon className="w-5 h-5" />
                  <span>Get 100 USDX Test Tokens</span>
                </>
              )}
            </button>
          )}
          
          <div className="mt-3 text-xs text-slate-600">
            <p>💡 Perfect for testing vault locking and dividend claiming features</p>
            <p>🔒 One request per hour per user - managed by smart contract</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestTokenFaucet;