import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import '@/i18n/config';
import '@/styles/globals.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-sand-50">
        <div className="text-center">
          <div className="text-2xl font-bold text-agri-forest-800 mb-2">KisanIQ</div>
          <div className="text-sm text-sand-600">Loading...</div>
        </div>
      </div>
    }>
      <App />
    </Suspense>
  </React.StrictMode>
);
