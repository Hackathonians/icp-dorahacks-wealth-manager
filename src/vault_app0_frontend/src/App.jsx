import React from 'react';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import LandingPage from './components/LandingPage';
import './index.scss';

const AppContent = () => {
  const { isAuthenticated } = useAuth();
  return (
    <div className="min-h-screen">
      <Header />
      <main className="container mx-auto px-4 py-8 animate-fadeIn">
        {isAuthenticated ? <Dashboard /> : <LandingPage />}
      </main>
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'rgba(255, 255, 255, 0.9)',
            color: '#374151',
            borderRadius: '8px',
          },
        }}
      />
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
