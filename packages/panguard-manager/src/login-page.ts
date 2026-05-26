/**
 * Server-side rendered /login page. Deliberately minimal: no client JS,
 * no external assets, no framework. The form posts JSON to
 * /api/auth/login via a small inline script (allowed by the CSP nonce).
 *
 * @module @panguard-ai/panguard-manager/login-page
 */

import type { ServerResponse } from 'node:http';

export interface RenderLoginOptions {
  /** Optional pre-filled error message / 可選的預填錯誤訊息 */
  readonly error: string | null;
}

/** Encode untrusted strings into HTML attribute / text context / 將不可信字串編碼以放入 HTML */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function renderLoginPage(
  res: ServerResponse,
  nonce: string,
  options: RenderLoginOptions
): void {
  const errorHtml = options.error
    ? `<div class="err">${escapeHtml(options.error)}</div>`
    : '';

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>PanGuard Manager — Sign in</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style nonce="${nonce}">
    :root { color-scheme: light dark; }
    body {
      margin: 0; min-height: 100vh; display: grid; place-items: center;
      font: 15px/1.5 system-ui, -apple-system, sans-serif;
      background: #0b0c0f; color: #e7e9ee;
    }
    .card {
      width: 360px; max-width: 92vw; padding: 28px 32px;
      background: #14171c; border: 1px solid #232831; border-radius: 12px;
      box-shadow: 0 10px 30px rgba(0,0,0,.35);
    }
    h1 { margin: 0 0 6px; font-size: 18px; letter-spacing: .04em; }
    .sub { margin: 0 0 22px; color: #8a93a3; font-size: 12px; letter-spacing: .12em; text-transform: uppercase; }
    label { display: block; font-size: 12px; color: #8a93a3; margin-bottom: 6px; }
    input {
      width: 100%; box-sizing: border-box;
      padding: 10px 12px; margin-bottom: 14px;
      font: inherit; color: inherit;
      background: #0b0c0f; border: 1px solid #232831; border-radius: 8px;
    }
    input:focus { outline: 2px solid #5b8def; outline-offset: 1px; border-color: #5b8def; }
    button {
      width: 100%; padding: 10px 12px; margin-top: 6px;
      font: inherit; font-weight: 600; color: #0b0c0f;
      background: #e7e9ee; border: 0; border-radius: 8px; cursor: pointer;
    }
    button:hover { background: #fff; }
    .err {
      margin-bottom: 16px; padding: 10px 12px;
      background: rgba(255, 70, 70, .12);
      border: 1px solid rgba(255, 70, 70, .4); border-radius: 8px;
      color: #ffb3b3; font-size: 13px;
    }
    .foot { margin-top: 18px; color: #5d6573; font-size: 11px; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <h1>PanGuard Manager</h1>
    <p class="sub">Operator sign in</p>
    ${errorHtml}
    <form id="login-form" autocomplete="on">
      <label for="username">Username</label>
      <input id="username" name="username" type="text" autocomplete="username" required autofocus />
      <label for="password">Password</label>
      <input id="password" name="password" type="password" autocomplete="current-password" required />
      <button type="submit">Sign in</button>
    </form>
    <p class="foot">Sessions expire after 14 days.</p>
  </div>
  <script nonce="${nonce}">
    document.getElementById('login-form').addEventListener('submit', async function(ev) {
      ev.preventDefault();
      var u = document.getElementById('username').value;
      var p = document.getElementById('password').value;
      try {
        var r = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: u, password: p })
        });
        if (r.ok) { window.location.href = '/'; return; }
        var card = document.querySelector('.card');
        var prev = card.querySelector('.err');
        if (prev) prev.remove();
        var div = document.createElement('div');
        div.className = 'err';
        div.textContent = r.status === 401 ? 'Invalid username or password' : ('Error ' + r.status);
        card.insertBefore(div, document.getElementById('login-form'));
      } catch (e) {
        alert('Network error: ' + e.message);
      }
    });
  </script>
</body>
</html>`;

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
}
