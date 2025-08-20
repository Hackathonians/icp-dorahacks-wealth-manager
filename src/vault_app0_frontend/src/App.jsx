import React from 'react';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import './index.scss';

function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen">
        <Header />
        <main className="container mx-auto px-4 py-8 animate-fadeIn">
          <Dashboard />
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
    </AuthProvider>
  );
}

export default App;
