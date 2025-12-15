import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './packages/app/App';

// OAuth Callback Handler
// If opened as a popup with code/state in URL or Hash, notify opener and close
const urlParams = new URLSearchParams(window.location.search);
// Parse hash for Implicit Flow (access_token)
const hashParams = new URLSearchParams(window.location.hash.substring(1));

if ((urlParams.has('code') || hashParams.has('access_token') || urlParams.has('error') || hashParams.has('error')) && window.opener) {
  window.opener.postMessage({
    type: 'OAUTH_CALLBACK',
    code: urlParams.get('code'),
    accessToken: hashParams.get('access_token'), // From Implicit Flow
    state: urlParams.get('state') || hashParams.get('state'),
    error: urlParams.get('error') || hashParams.get('error'),
    errorDescription: urlParams.get('error_description') || hashParams.get('error_description')
  }, window.location.origin);
  window.close();
} else {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error("Could not find root element to mount to");
  }

  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}