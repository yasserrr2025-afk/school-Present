import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { getSchoolSettings } from './services/storage';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

// Fetch school settings from Supabase on every app load
// This ensures all devices (phone, computer) always get the latest settings
getSchoolSettings().then(settings => {
  // Update browser title
  if (settings.schoolName && settings.schoolName !== 'المدرسة') {
    document.title = settings.schoolName;
    const metaTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]');
    if (metaTitle) (metaTitle as HTMLMetaElement).content = settings.schoolName;
  }
  // Update favicon with school logo
  if (settings.schoolLogo) {
    const favicon = document.getElementById('favicon') as HTMLLinkElement | null;
    const appleTouchIcon = document.getElementById('apple-touch-icon') as HTMLLinkElement | null;
    if (favicon) favicon.href = settings.schoolLogo;
    if (appleTouchIcon) appleTouchIcon.href = settings.schoolLogo;
  }
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}).catch(() => {
  // If settings fetch fails, still render the app
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});