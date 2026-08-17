import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { SandboxApp } from './sandbox/SandboxApp.tsx';
import { initTheme } from './theme';

initTheme();

const isSandbox = window.location.pathname.startsWith('/sandbox');

createRoot(document.getElementById('root')!).render(
  <StrictMode>{isSandbox ? <SandboxApp /> : <App />}</StrictMode>
);
