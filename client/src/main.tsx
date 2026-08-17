import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { PreviewApp } from './preview/PreviewApp.tsx';
import { initTheme } from './theme';

initTheme();

const isPreview = window.location.pathname.startsWith('/preview');

createRoot(document.getElementById('root')!).render(
  <StrictMode>{isPreview ? <PreviewApp /> : <App />}</StrictMode>
);
