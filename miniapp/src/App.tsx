import React from 'react';

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        ready: () => void;
        initData: string;
        initDataUnsafe: any;
        colorScheme: 'light' | 'dark';
        themeParams: any;
      };
    };
  }
}

export default function App() {
  const tg = window.Telegram?.WebApp;
  const userName = tg?.initDataUnsafe?.user?.first_name || 'User';
  const theme = tg?.colorScheme || 'light';
  const initData = tg?.initData;

  const checkVersion = React.useCallback(async () => {
    try {
      const response = await fetch('/miniapp/version');
      const data = await response.json();
      document.getElementById('status')!.innerHTML = `<span class="success">✓ Version: ${data.version || 'unknown'}</span>`;
    } catch (error) {
      document.getElementById('status')!.innerHTML = `<span class="error">✗ Version check failed</span>`;
    }
  }, []);

  const verifyInitData = React.useCallback(async () => {
    try {
      if (!initData) {
        document.getElementById('status')!.innerHTML = `<span class="error">✗ No initData available</span>`;
        return;
      }

      const response = await fetch('/verify-initdata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData })
      });
      
      if (response.ok) {
        const data = await response.json();
        document.getElementById('status')!.innerHTML = `<span class="success">✓ InitData verified: ${data.valid ? 'Valid' : 'Invalid'}</span>`;
      } else {
        document.getElementById('status')!.innerHTML = `<span class="error">✗ Verification failed: ${response.status}</span>`;
      }
    } catch (error) {
      document.getElementById('status')!.innerHTML = `<span class="error">✗ Verification error</span>`;
    }
  }, [initData]);

  React.useEffect(() => {
    // Update UI with Telegram data
    const userNameEl = document.getElementById('userName');
    const themeEl = document.getElementById('theme');
    const miniUrlEl = document.getElementById('miniUrl');

    if (userNameEl) userNameEl.textContent = userName;
    if (themeEl) themeEl.textContent = theme;
    if (miniUrlEl) miniUrlEl.textContent = window.location.href;

    // Add event listeners
    const versionBtn = document.getElementById('btn-version');
    const verifyBtn = document.getElementById('btn-verify');

    if (versionBtn) versionBtn.addEventListener('click', checkVersion);
    if (verifyBtn) verifyBtn.addEventListener('click', verifyInitData);

    // Initial status
    const statusEl = document.getElementById('status');
    if (statusEl) statusEl.innerHTML = 'Ready for testing. Use buttons above to verify backend.';

    return () => {
      if (versionBtn) versionBtn.removeEventListener('click', checkVersion);
      if (verifyBtn) verifyBtn.removeEventListener('click', verifyInitData);
    };
  }, [userName, theme, checkVersion, verifyInitData]);

  return (
    <div className="wrap">
      <div className="card">
        <h1>Dynamic Capital VIP</h1>
        <p className="muted">Welcome to the Mini App. Use the buttons below to verify the backend and your Telegram WebApp context.</p>
        <div className="row">
          <button id="btn-version" className="btn">Check /miniapp/version</button>
          <button id="btn-verify" className="btn secondary" title="Calls /verify-initdata if deployed">Verify initData</button>
        </div>
        <div className="kv"><div>WebApp user</div><div><span id="userName" className="muted">—</span></div></div>
        <div className="kv"><div>Theme</div><div><span id="theme" className="muted">—</span></div></div>
        <div className="kv"><div>Mini App URL</div><div><code id="miniUrl">—</code></div></div>
      </div>

      <div className="card">
        <h2>Status</h2>
        <div id="status" className="muted">No checks yet.</div>
      </div>

      <div className="card">
        <p className="muted">
          Tip: Your bot's WebApp button should link to this exact HTTPS page.<br />
          Example: <code>https://&lt;project-ref&gt;.functions.supabase.co/miniapp/</code>
        </p>
      </div>
    </div>
  );
}