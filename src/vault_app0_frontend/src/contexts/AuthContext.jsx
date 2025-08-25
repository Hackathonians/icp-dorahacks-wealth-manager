import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthClient } from '@dfinity/auth-client';
import { Actor, HttpAgent } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { idlFactory } from '../../../declarations/vault_app0_backend/vault_app0_backend.did.js';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authClient, setAuthClient] = useState(null);
  const [identity, setIdentity] = useState(null);
  const [principal, setPrincipal] = useState(null);
  const [actor, setActor] = useState(null);
  const [loading, setLoading] = useState(true);

  const canisterId = process.env.CANISTER_ID_VAULT_APP0_BACKEND || 'rdmx6-jaaaa-aaaah-qcaiq-cai';

  useEffect(() => {
    initAuth();
  }, []);

  useEffect(() => {
    // Refresh auth when window regains focus
    const handleFocus = () => {
      if (authClient) {
        refreshAuth();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [authClient]);

  const initAuth = async () => {
    try {
      const client = await AuthClient.create();
      setAuthClient(client);

      // Single check with proper error handling
      const isAuthenticated = await client.isAuthenticated();
      
      setIsAuthenticated(isAuthenticated);

      if (isAuthenticated) {
        const identity = client.getIdentity();
        setIdentity(identity);
        setPrincipal(identity.getPrincipal());
        await createActor(identity);
      }
    } catch (error) {
      console.error('Auth initialization failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const createActor = async (identity) => {
    try {
      const agent = new HttpAgent({
        identity,
        host: process.env.DFX_NETWORK === 'local' ? 'http://localhost:4943' : 'https://ic0.app',
      });

      if (process.env.DFX_NETWORK === 'local') {
        await agent.fetchRootKey();
      }

      const actor = Actor.createActor(idlFactory, {
        agent,
        canisterId,
      });

      setActor(actor);
    } catch (error) {
      console.error('Failed to create actor:', error);
    }
  };

  const login = async () => {
    try {
      setLoading(true);
      const identityProvider = process.env.DFX_NETWORK === 'ic' 
      ? 'https://identity.ic0.app' // Mainnet
      : 'http://rdmx6-jaaaa-aaaaa-aaadq-cai.localhost:4943'; // Local
      await authClient.login({
        identityProvider,
        // Set a longer session timeout (8 hours)
        maxTimeToLive: BigInt(8 * 60 * 60 * 1000 * 1000 * 1000),
        onSuccess: async () => {
          const identity = authClient.getIdentity();
          setIdentity(identity);
          setPrincipal(identity.getPrincipal());
          setIsAuthenticated(true);
          await createActor(identity);
        },
        onError: (error) => {
          console.error('Login failed:', error);
        },
      });
    } catch (error) {
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authClient.logout();
      setIsAuthenticated(false);
      setIdentity(null);
      setPrincipal(null);
      setActor(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Add a refresh method to re-check authentication without losing session
  const refreshAuth = async () => {
    if (!authClient) return;
    
    try {
      const isAuthenticated = await authClient.isAuthenticated();
      
      if (isAuthenticated) {
        const identity = authClient.getIdentity();
        setIdentity(identity);
        setPrincipal(identity.getPrincipal());
        setIsAuthenticated(true);
        await createActor(identity);
      } else {
        setIsAuthenticated(false);
        setIdentity(null);
        setPrincipal(null);
        setActor(null);
      }
    } catch (error) {
      console.error('Auth refresh failed:', error);
    }
  };

  const value = {
    isAuthenticated,
    identity,
    principal,
    actor,
    loading,
    login,
    logout,
    refreshAuth,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
