// Arquivo: src/index.js

import React from 'react';
import ReactDOM from 'react-dom/client';
import 'bootstrap/dist/css/bootstrap.min.css';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// CORREÇÃO: O caminho correto para o seu AuthContext é este:
import { AuthProvider } from './contexts/AuthContext'; 
import { GoogleOAuthProvider } from '@react-oauth/google';

const queryClient = new QueryClient();
const googleClientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;

const application = (
  <AuthProvider>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </AuthProvider>
);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    {googleClientId ? (
      <GoogleOAuthProvider clientId={googleClientId}>{application}</GoogleOAuthProvider>
    ) : application}
  </React.StrictMode>
);

reportWebVitals();
