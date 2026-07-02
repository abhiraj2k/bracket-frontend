import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { initApiClient } from '@et/api';
import { useAuthStore } from '@et/store';
import { queryClient } from './lib/queryClient';
import App from './App';
import './styles/index.css';

initApiClient({
  getToken: () => useAuthStore.getState().accessToken,
  onUnauthorized: () => {
    const currentPath = window.location.pathname + window.location.search;
    if (!currentPath.startsWith('/login')) {
      sessionStorage.setItem('returnTo', currentPath);
    }
    useAuthStore.getState().clearAuth();
    window.location.replace('/login?unauthorized=1');
  },
});

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

const app = (
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);

ReactDOM.createRoot(document.getElementById('root')!).render(
  googleClientId ? <GoogleOAuthProvider clientId={googleClientId}>{app}</GoogleOAuthProvider> : app
);
