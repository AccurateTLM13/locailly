const SECTIONS = {
  home: { title: "Home", render: renderHome },
  runs: { title: "Runs", render: renderRuns },
  workflows: { title: "Workflows", render: renderWorkflows },
  capabilities: { title: "Capabilities", render: renderCapabilities },
  models: { title: "Models", render: renderModels },
  nodes: { title: "Nodes", render: renderNodes },
  evidence: { title: "Evidence", render: renderEvidence },
  reviews: { title: "Reviews", render: renderReviews },
  memory: { title: "Memory", render: renderMemory },
  jobs: { title: "Jobs", render: renderJobs },
  settings: { title: "Settings", render: renderSettings }
};

let currentSection = null;
let healthCache = null;

function qs(id) { return document.getElementById(id); }

function showLoading(show) {
  qs("shellLoading").style.display = show ? "block" : "none";
}

function getContent() { return qs("shellSection"); }

function setContent(html) {
  getContent().innerHTML = html;
  showLoading(false);
}

async function fetchJson(path) {
  const res = await fetch(path);
  const body = await res.json();
  if (!res.ok || !body.ok) throw new Error(body.message || body.error?.message || `HTTP ${res.status}`);
  return body;
}

async function navigate(section) {
  if (section === currentSection) return;
  currentSection = section;
  history.replaceState(null, "", `#${section}`);
  document.querySelectorAll(".shell-nav__link").forEach(el => {
    el.classList.toggle("shell-nav__link--active", el.dataset.section === section);
  });
  showLoading(true);
  const renderer = SECTIONS[section];
  if (renderer) {
    document.title = `${renderer.title} — Locaily`;
    await renderer.render();
  }
}

// --- Home ---
async function renderHome() {
  try {
    const demo = await fetchJson("/console/demo");
    let statusHtml = "";
    try {
      const s = await fetchJson("/console/status");
      const brainOk = s.engine?.running;
      statusHtml = `
        <div class="status-grid">
          <div class="status-card ${brainOk ? 'status-card--ok' : 'status-card--fail'}">
            <div class="status-card__label">Local Brain</div>
            <div class="status-card__value">${brainOk ? 'Online' : 'Offline'}</div>
          </div>
          <div class="status-card ${s.ollama?.available ? 'status-card--ok' : 'status-card--warn'}">
            <div class="status-card__label">Ollama</div>
            <div class="status-card__value">${s.ollama?.available ? 'Available' : 'Not running'}</div>
          </div>
          <div class="status-card ${s.model?.ready ? 'status-card--ok' : 'status-card--warn'}">
            <div class="status-card__label">Model</div>
            <div class="status-card__value">${s.model?.ready ? s.model.name : 'Not ready'}</div>
          </div>
          <div class="status-card status-card--info">
            <div class="status-card__label">Tools</div>
            <div class="status-card__value">${s.tools?.count || 0} registered</div>
          </div>
        </div>
      `;
    } catch {}
    setContent(`
      <h2>Welcome to Locaily</h2>
      <p class="shell-subtitle">Local-first AI coordination stack.</p>
      ${statusHtml}
      <div class="shell-cta">
        <p>Try a built-in example to see capability routing, validation, and evidence in action.</p>
        <button class="btn btn--primary" onclick="runDemo()">Run Example Workflow</button>
      </div>
      <div id="demoResult" class="shell-demo-result" style="display:none"></div>
    `);
  } catch (e) {
    setContent(`<h2>Welcome</h2><p>Could not load status: ${e.message}</p>`);
  }
}

window.runDemo = async function() {
  const resultDiv = qs("demoResult");
  resultDiv.style.display = "block";
  resultDiv.innerHTML = "<p>Starting demo…</p>";
  try {
    const demo = await fetchJson("/console/demo", { method: "POST" });
    resultDiv.innerHTML = "<p>Demo started. Polling for completion…</p>";
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 1000));
      const res = await fetch(`/console/runs/${encodeURIComponent(demo.runId)}`);
      const body = await res.json();
      if (body.run?.status === "success" || body.run?.status === "failed") {
        const status = body.run.status === "success" ? "Passed" : "Failed";
        const steps = (body.run.steps || []).map(s => `${s.label || s.step_id}: ${s.status}`).join("<br>");
        resultDiv.innerHTML = `
          <div class="result-card result-card--${body.run.status}">
            <h3>Demo ${status}</h3>
            <p>${body.run.durationMs ? `Completed in ${(body.run.durationMs / 1000).toFixed(1)}s` : ""}</p>
            <p class="shell-meta">Run ID: ${demo.runId}</p>
            <details><summary>Steps</summary><pre class="code-block">${steps}</pre></details>
          </div>
          <div class="shell-cta" style="margin-top:12px">
            <a href="#runs" class="btn btn--secondary">View Full Run Details</a>
            <a href="#evidence" class="btn btn--secondary">View Evidence</a>
          </div>`;
        return;
      }
    }
    resultDiv.innerHTML = "<p>Demo timed out.</p>";
  } catch (e) {
    resultDiv.innerHTML = `<p>Demo failed: ${e.message}</p>`;
  }
};

// --- Runs ---
async function renderRuns() {
  try {
    const data = await fetchJson("/console/runs");
    const runs = data.runs || [];
    let html = `<h2>Runs</h2>`;
    if (runs.length === 0) {
      html += `<p>No runs yet. <a href="#" onclick="navigate('home');return false">Run a demo</a> to get started.</p>`;
    } else {
      html += `<div class="run-list">`;
      for (const r of runs) {
        const statusClass = r.status === "success" ? "passed" : r.status === "failed" ? "failed" : "pending";
        html += `<div class="run-item">
          <div class="run-item__status run-item__status--${statusClass}">${statusClass}</div>
          <div class="run-item__info">
            <div class="run-item__url">${r.url || "—"}</div>
            <div class="run-item__meta">${r.mode || "standard"} · ${r.createdAt ? new Date(r.createdAt).toLocaleString() : "—"}</div>
          </div>
          <div class="run-item__duration">${r.durationMs ? (r.durationMs / 1000).toFixed(1) + "s" : "—"}</div>
        </div>`;
      }
      html += `</div>`;
    }
    html += `<div class="shell-cta"><a href="/console" class="btn btn--secondary" target="_blank">Open Console</a></div>`;
    setContent(html);
  } catch (e) {
    setContent(`<h2>Runs</h2><p>Could not load runs: ${e.message}</p>`);
  }
}

// --- Generic renderers using existing endpoints ---
async function renderPlaceholder(title, endpoints) {
  try {
    let html = `<h2>${title}</h2>`;
    for (const ep of endpoints) {
      try {
        const data = await fetchJson(ep);
        const preview = JSON.stringify(data).slice(0, 300);
        html += `<details><summary>${ep}</summary><pre class="code-block">${preview}</pre></details>`;
      } catch (e) {
        html += `<details><summary>${ep}</summary><p class="text-muted">${e.message}</p></details>`;
      }
    }
    setContent(html);
  } catch (e) {
    setContent(`<h2>${title}</h2><p>${e.message}</p>`);
  }
}

async function renderWorkflows() { await renderPlaceholder("Workflows", ["/orchestration/workflows", "/orchestration/tracks", "/tracks"]); }
async function renderCapabilities() { await renderPlaceholder("Capabilities", ["/capabilities", "/qualifications/capabilities", "/qualifications/dashboard", "/qualifications/status"]); }
async function renderModels() { await renderPlaceholder("Models", ["/models/roles", "/models/profiles", "/providers/status"]); }
async function renderNodes() { await renderPlaceholder("Nodes", ["/relay/nodes", "/relay/protocol"]); }
async function renderEvidence() { await renderPlaceholder("Evidence", ["/evidence/learning", "/enforcement/review", "/enforcement/status", "/benchmark/status"]); }
async function renderReviews() { await renderPlaceholder("Reviews", ["/enforcement/quality-summary", "/enforcement/pilot"]); }
async function renderMemory() { await renderPlaceholder("Memory", ["/memory/status", "/memory/projects", "/memory/projects/health", "/memory/capture/status"]); }
async function renderJobs() { await renderPlaceholder("Jobs", ["/jobs", "/enforcement/decisions"]); }
async function renderSettings() { await renderPlaceholder("Settings", []); }

// --- Nav ---
document.addEventListener("click", e => {
  const link = e.target.closest(".shell-nav__link");
  if (link) { e.preventDefault(); navigate(link.dataset.section); }
});

// --- Init ---
(async function init() {
  const hash = location.hash.replace("#", "") || "home";
  if (SECTIONS[hash]) await navigate(hash);
  else await navigate("home");
  // Update topbar status
  try {
    const s = await fetchJson("/console/status");
    const dot = qs("shellStatusDot");
    const label = qs("shellStatusLabel");
    if (s.engine?.running) {
      dot.className = "status-dot status-dot--ok";
      label.textContent = "Online";
    } else {
      dot.className = "status-dot status-dot--fail";
      label.textContent = "Offline";
    }
  } catch {}
})();
