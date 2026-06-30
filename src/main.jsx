import { useState, useEffect } from 'react'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'

function Root() {
  var [hash, setHash] = useState(window.location.hash);
  useEffect(function() {
    function onHash() { setHash(window.location.hash); }
    window.addEventListener("hashchange", onHash);
    return function() { window.removeEventListener("hashchange", onHash); };
  }, []);
  if (hash === "#journal") { window.location.hash = ""; return null; }
  return <App />;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
