import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ToastProvider } from './components/ToastProvider.jsx'
import { GoogleOAuthProvider } from '@react-oauth/google'

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {googleClientId ? (
      <GoogleOAuthProvider clientId={googleClientId}>
        <ToastProvider>
          <App />
        </ToastProvider>
      </GoogleOAuthProvider>
    ) : (
      <ToastProvider>
        <App />
      </ToastProvider>
    )}
  </StrictMode>,
)
