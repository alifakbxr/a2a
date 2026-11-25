/**
 * PILAH MCP App - Interactive UI for Google Antigravity (SEP-1865)
 * Standalone, zero-dependency, self-contained HTML application.
 */

export function getMcpAppHtml() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PILAH Dashboard</title>
  <style>
    :root {
      --bg: #121417;
      --surface: #1a1d24;
      --surface-border: #2b303c;
      --text: #e6edf3;
      --text-muted: #8b949e;
      --accent: #388bfd;
      --accent-hover: #58a6ff;
      --success: #2ea043;
      --warning: #d29922;
      --danger: #f85149;
      --font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    @media (prefers-color-scheme: light) {
      :root {
        --bg: #ffffff;
        --surface: #f6f8fa;
        --surface-border: #d0d7de;
        --text: #1f2328;
        --text-muted: #656d76;
        --accent: #0969da;
        --accent-hover: #218bff;
        --success: #1a7f37;
        --warning: #9a6700;
        --danger: #cf222e;
      }
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: var(--font);
      background: var(--bg);
      color: var(--text);
      line-height: 1.5;
      padding: 16px;
      font-size: 13px;
    }
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--surface-border);
      margin-bottom: 16px;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 600;
      font-size: 15px;
    }
    .badge {
      background: var(--surface-border);
      color: var(--text-muted);
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 500;
    }
    .status-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 3px 8px;
      border-radius: 12px;
      background: rgba(46, 160, 67, 0.15);
      color: var(--success);
      font-size: 12px;
      font-weight: 500;
    }
    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: currentColor;
    }
    .tabs {
      display: flex;
      gap: 4px;
      margin-bottom: 16px;
      border-bottom: 1px solid var(--surface-border);
    }
    .tab {
      background: transparent;
      border: none;
      color: var(--text-muted);
      padding: 8px 12px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      border-bottom: 2px solid transparent;
      transition: color 0.15s, border-color 0.15s;
    }
    .tab:hover { color: var(--text); }
    .tab.active {
      color: var(--accent);
      border-bottom-color: var(--accent);
    }
    .panel { display: none; }
    .panel.active { display: block; }
    .card {
      background: var(--surface);
      border: 1px solid var(--surface-border);
      border-radius: 6px;
      padding: 12px 16px;
      margin-bottom: 12px;
    }
    .card-title {
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 6px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 12px;
      margin-bottom: 16px;
    }
    .stat-box {
      background: var(--surface);
      border: 1px solid var(--surface-border);
      border-radius: 6px;
      padding: 10px 14px;
    }
    .stat-label { font-size: 11px; color: var(--text-muted); }
    .stat-value { font-size: 18px; font-weight: 600; margin-top: 2px; }
    pre {
      background: var(--bg);
      border: 1px solid var(--surface-border);
      padding: 10px;
      border-radius: 4px;
      font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
      font-size: 12px;
      overflow-x: auto;
    }
    svg { width: 100%; height: auto; }
  </style>
</head>
<body>
  <header>
    <div class="brand">
      <span>PILAH</span>
      <span class="badge">v1.0.3</span>
    </div>
    <div class="status-pill">
      <span class="status-dot"></span>
      <span>Native-First Active</span>
    </div>
  </header>

  <div class="tabs">
    <button class="tab active" onclick="showTab('overview')">Overview</button>
    <button class="tab" onclick="showTab('graph')">Graph & Impact</button>
    <button class="tab" onclick="showTab('verification')">Verification</button>
    <button class="tab" onclick="showTab('tokens')">Tokens & Health</button>
  </div>

  <div id="overview" class="panel active">
    <div class="grid">
      <div class="stat-box">
        <div class="stat-label">Operational Mode</div>
        <div class="stat-value" id="mode-val">On-Demand</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">Compact Mode</div>
        <div class="stat-value" id="compact-val">Enabled (70% cut)</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">Tools Registered</div>
        <div class="stat-value">4 Tools (1 Eager)</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">Security Boundaries</div>
        <div class="stat-value" style="color:var(--success)">Enforced</div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">Native-First Execution Guidance</div>
      <p style="color:var(--text-muted);font-size:12px;margin-bottom:8px;">
        PILAH operates on a strict zero-call principle for clear, isolated changes. Scoped tool calls are made only when resolving cross-file risk or structuring verification plans.
      </p>
      <pre><code>0 Calls → Clear single-file edits, known bugs, trivial styling
1 Call  → pilah_context (eager) or pilah_impact (lazy) on uncertainty
Verify  → pilah_verify(operation="plan") for Given/When/Then acceptance</code></pre>
    </div>
  </div>

  <div id="graph" class="panel">
    <div class="card">
      <div class="card-title">Static Dependency Graph</div>
      <p style="color:var(--text-muted);font-size:12px;margin-bottom:12px;">
        Visualizing symbol dependencies, directional imports (ESM/CJS, Composer PSR-4), and blast-radius tracking.
      </p>
      <div style="background:var(--bg);border:1px solid var(--surface-border);border-radius:4px;padding:24px;text-align:center;">
        <svg viewBox="0 0 400 120" style="max-width:360px;">
          <circle cx="60" cy="60" r="24" fill="rgba(56,139,253,0.2)" stroke="var(--accent)" stroke-width="2"/>
          <text x="60" y="64" text-anchor="middle" fill="var(--text)" font-size="11" font-weight="600">Module</text>
          
          <line x1="84" y1="60" x2="176" y2="60" stroke="var(--text-muted)" stroke-width="1.5" stroke-dasharray="4"/>
          
          <circle cx="200" cy="60" r="24" fill="rgba(46,160,67,0.2)" stroke="var(--success)" stroke-width="2"/>
          <text x="200" y="64" text-anchor="middle" fill="var(--text)" font-size="11" font-weight="600">Consumer</text>
          
          <line x1="224" y1="60" x2="316" y2="60" stroke="var(--text-muted)" stroke-width="1.5" stroke-dasharray="4"/>
          
          <circle cx="340" cy="60" r="24" fill="rgba(210,153,34,0.2)" stroke="var(--warning)" stroke-width="2"/>
          <text x="340" y="64" text-anchor="middle" fill="var(--text)" font-size="11" font-weight="600">Test Spec</text>
        </svg>
      </div>
    </div>
  </div>

  <div id="verification" class="panel">
    <div class="card">
      <div class="card-title">Given / When / Then Acceptance Matrix</div>
      <p style="color:var(--text-muted);font-size:12px;margin-bottom:8px;">
        Verification plans remain <code>not_tested</code> until machine test evidence is recorded via native test runners.
      </p>
      <pre><code>{
  "operation": "plan",
  "criteria": [
    {
      "id": "rbac-tenant-isolation",
      "given": "User belongs to Tenant A",
      "when": "Attempting to query Tenant B records",
      "then": "Return HTTP 403 Forbidden with zero data disclosure",
      "evidence_type": "integration",
      "negative": true
    }
  ]
}</code></pre>
    </div>
  </div>

  <div id="tokens" class="panel">
    <div class="card">
      <div class="card-title">Token Provenance & Context Health</div>
      <p style="color:var(--text-muted);font-size:12px;margin-bottom:8px;">
        Local transcript diagnostics monitor cumulative token growth without making ungrounded pricing claims.
      </p>
      <pre><code>$ node scripts/pilah.mjs tokens --limit 5 --json
$ node scripts/context-guardian.mjs status</code></pre>
    </div>
  </div>

  <script>
    function showTab(id) {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
      const activeBtn = Array.from(document.querySelectorAll('.tab')).find(b => b.getAttribute('onclick')?.includes(id));
      if (activeBtn) activeBtn.classList.add('active');
      const targetPanel = document.getElementById(id);
      if (targetPanel) targetPanel.classList.add('active');
    }

    // SEP-1865 JSON-RPC postMessage interface
    window.addEventListener('message', (event) => {
      try {
        const data = event.data;
        if (data && data.method === 'update' && data.params) {
          if (data.params.mode) document.getElementById('mode-val').textContent = data.params.mode;
        }
      } catch (e) {}
    });
  </script>
</body>
</html>`;
}
