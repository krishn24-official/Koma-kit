import { Analytics } from '@vercel/analytics/react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/index.css';
import { initGoogleAnalytics } from './utils/googleAnalytics';

initGoogleAnalytics();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    {/* Anonymous page-view counts for the Vercel dashboard (no cookies). Only sends data on Vercel deployments. */}
    <Analytics />
  </StrictMode>,
);
