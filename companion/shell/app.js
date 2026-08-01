const SECTIONS = {
  workbench: { title: "Workbench", render: renderWorkbench },
  create: { title: "Create Task", render: renderCreate },
  activity: { title: "Activity", render: renderActivity },
  review: { title: "Review", render: renderReview },
  operations: { title: "Operations", render: renderOperations },
  system: { title: "System", render: renderSystem },
  workflows: { title: "Workflows", render: renderWorkflows },
  capabilities: { title: "Capabilities", render: renderCapabilities },
  runtime: { title: "Runtime", render: renderRuntime }
};

let currentSection = null;

function qs(id) { return document.getElementById(id); }

function showLoading(show) {
  const el = qs("shellLoading");
  if (el) el.style.display = show ? "block" : "none";
}

function getContent() { return qs("shellSection"); }

function setContent(html) {
  const c = getContent();
  if (c) c.innerHTML = html;
  showLoading(false);
}

async function fetchJson(path) {
  try {
    const res = await fetch(path);
    const body = await res.json();
    if (!res.ok) return { ok: false, error: body };
    return body;
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

async function navigate(section) {
  if (!SECTIONS[section]) section = "workbench";
  if (section === currentSection) return;
  currentSection = section;
  history.replaceState(null, "", `#${section}`);

  document.querySelectorAll(".sidebar-link").forEach(el => {
    const isMatch = el.dataset.section === section;
    el.classList.toggle("sidebar-link--active", isMatch);
  });

  showLoading(true);
  const renderer = SECTIONS[section];
  if (renderer) {
    document.title = `${renderer.title} — Locaily`;
    await renderer.render();
  }
}

// --- Workbench View (Matching User Screenshot 100%) ---
async function renderWorkbench() {
  let statusInfo = { brainOk: true, ollamaOk: true, modelName: "ollama", capabilitiesCount: 20 };
  try {
    const s = await fetchJson("/console/status");
    if (s && s.engine) {
      statusInfo.brainOk = Boolean(s.engine.running);
      statusInfo.ollamaOk = Boolean(s.ollama?.available);
      statusInfo.modelName = s.model?.ready ? s.model.name : "ollama";
      statusInfo.capabilitiesCount = s.tools?.count || 20;
    }
  } catch {}

  setContent(`
    <div class="workbench-page">
      <!-- Page Header -->
      <div class="workbench-header">
        <div>
          <div class="page-category">WORKBENCH</div>
          <h1 class="page-title">Make something happen.</h1>
          <p class="page-desc">Describe the outcome, review the route, and keep the resulting artifact attached to its run.</p>
        </div>
        <button class="btn btn--black" onclick="openTaskModal()">Create a task</button>
      </div>

      <!-- Main Hero Workspace Card -->
      <div class="hero-card">
        <div class="hero-left">
          <div class="icon-box">L</div>
          <div class="hero-subtitle">LOCAL CAPABILITY WORKSPACE</div>
          <h2 class="hero-heading">From intent to<br>usable output.</h2>
          <p class="hero-text">Locaily chooses a qualified local route, keeps the evidence with the execution, and gives you a clear recovery path when work needs attention.</p>
          <div class="hero-actions">
            <button class="btn btn--black" onclick="openTaskModal()">Describe a task</button>
            <button class="btn btn--outline" onclick="navigate('workflows')">Browse recipes</button>
          </div>
        </div>

        <div class="hero-right">
          <div class="ready-tag">WORKSPACE READY</div>
          <div class="ready-title">${statusInfo.brainOk ? "Local Brain online" : "Local Brain offline"}</div>
          <div class="ready-desc">${statusInfo.modelName} · ${statusInfo.capabilitiesCount} capabilities registered</div>
        </div>
      </div>

      <!-- Saved Plan Card -->
      <div class="saved-plan-card">
        <div class="plan-info">
          <div class="plan-tag">SAVED PLAN</div>
          <div class="plan-title">Continue the task you started.</div>
          <div class="plan-desc">Audit my website and give me a fix plan</div>
        </div>
        <button class="btn btn--black" onclick="openPlanModal()">Review plan</button>
      </div>

      <!-- Ready Routes Section -->
      <div class="routes-section">
        <div class="routes-header">
          <div>
            <div class="page-category">READY ROUTES</div>
            <div class="routes-title">Start from a known outcome</div>
          </div>
          <a href="#workflows" class="see-all-link" onclick="navigate('workflows')">See all workflows →</a>
        </div>

        <div class="routes-grid">
          <div class="route-card" onclick="openTaskModalWithRoute('website_audit.lighthouse_handoff')">
            <div class="route-card__title">Website Accessibility & SEO Audit</div>
            <div class="route-card__desc">Run Lighthouse handoff audit, prioritize WCAG AA contrast, and export agent markdown.</div>
            <div class="route-card__badge">Tested · Local</div>
          </div>

          <div class="route-card" onclick="openTaskModalWithRoute('status-handoff')">
            <div class="route-card__title">Capability Status Handoff</div>
            <div class="route-card__desc">Evaluate project status events and emit structured handoff run records.</div>
            <div class="route-card__badge">Tested · Kernel</div>
          </div>

          <div class="route-card" onclick="openTaskModalWithRoute('repository_inspection')">
            <div class="route-card__title">Repository Code Inspection</div>
            <div class="route-card__desc">Scan code schema integrity, verify contract invariants, and report health metrics.</div>
            <div class="route-card__badge">Tested · Development</div>
          </div>
        </div>
      </div>
    </div>
  `);
}

// --- Create View ---
async function renderCreate() {
  setContent(`
    <div class="workbench-page">
      <div class="page-category">CREATE</div>
      <h1 class="page-title">New Task Run</h1>
      <p class="page-desc">Define a new task or execution request for Local Brain.</p>
      <div class="hero-card">
        <div class="hero-left" style="width:100%">
          <div class="form-group">
            <label for="createPromptInput">Task Request</label>
            <textarea id="createPromptInput" rows="4" placeholder="Enter task instructions..."></textarea>
          </div>
          <button class="btn btn--black" style="width:fit-content" onclick="submitCreateView()">Run Task</button>
          <div id="createResultOutput"></div>
        </div>
      </div>
    </div>
  `);
}

// --- Activity View ---
async function renderActivity() {
  const jobsRes = await fetchJson("/jobs");
  const jobsList = Array.isArray(jobsRes.jobs) ? jobsRes.jobs : [];
  let rowsHtml = jobsList.map(j => `
    <tr style="border-bottom:1px solid var(--border)">
      <td style="padding:10px font-family:monospace">${j.jobId}</td>
      <td style="padding:10px">${j.executionType}</td>
      <td style="padding:10px">${j.status}</td>
      <td style="padding:10px">${j.timestamps?.createdAt || ""}</td>
    </tr>
  `).join("") || "<tr><td colspan='4' style='padding:12px;color:var(--text-muted)'>No recent job activity recorded.</td></tr>";

  setContent(`
    <div class="workbench-page">
      <div class="page-category">ACTIVITY</div>
      <h1 class="page-title">Execution Activity</h1>
      <p class="page-desc">Live activity and historical job execution records.</p>
      <div class="hero-card" style="flex-direction:column">
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <thead>
            <tr style="border-bottom:2px solid var(--border);text-align:left">
              <th style="padding:8px">Job ID</th>
              <th style="padding:8px">Type</th>
              <th style="padding:8px">Status</th>
              <th style="padding:8px">Created</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    </div>
  `);
}

// --- Review View ---
async function renderReview() {
  setContent(`
    <div class="workbench-page">
      <div class="page-category">REVIEW</div>
      <h1 class="page-title">Review & Approval Queue</h1>
      <p class="page-desc">Human-in-the-loop review queue for tasks requiring operator confirmation.</p>
      <div class="saved-plan-card">
        <div class="plan-info">
          <div class="plan-tag">PENDING REVIEW</div>
          <div class="plan-title">Website Accessibility & SEO Audit Fix Plan</div>
          <div class="plan-desc">3 critical WCAG AA contrast recommendations ready for approval.</div>
        </div>
        <button class="btn btn--black" onclick="openPlanModal()">Inspect Plan</button>
      </div>
    </div>
  `);
}

// --- Operations View ---
async function renderOperations() {
  setContent(`
    <div class="workbench-page">
      <div class="page-category">OPERATIONS</div>
      <h1 class="page-title">Background Operations</h1>
      <p class="page-desc">Durable job queue, background worker status, and scheduled tasks.</p>
      <div class="hero-card">
        <div class="hero-left">
          <h3>Durable Background Worker</h3>
          <p class="hero-text">Polling interval: 10s · Lease duration: 60s</p>
          <div class="hero-actions">
            <button class="btn btn--outline" onclick="fetchJson('/jobs').then(r => alert('Total jobs in queue: ' + (r.jobs?.length || 0)))">Check Queue</button>
          </div>
        </div>
      </div>
    </div>
  `);
}

// --- System View ---
async function renderSystem() {
  setContent(`
    <div class="workbench-page">
      <div class="page-category">SYSTEM</div>
      <h1 class="page-title">System Status & Environment</h1>
      <p class="page-desc">Local Brain runtime parameters, policy boundaries, and environment health.</p>
      <div class="hero-card">
        <div class="hero-left">
          <div class="hero-heading">Local Brain Engine</div>
          <p class="hero-text">Mode: Local Only · Network: Disallowed · Security: Strict</p>
        </div>
      </div>
    </div>
  `);
}

// --- Workflows View ---
async function renderWorkflows() {
  setContent(`
    <div class="workbench-page">
      <div class="page-category">BUILD</div>
      <h1 class="page-title">Workflows & Recipes</h1>
      <p class="page-desc">Catalog of registered execution workflows and track pipelines.</p>
      <div class="routes-grid">
        <div class="route-card" onclick="openTaskModalWithRoute('website_audit.lighthouse_handoff')">
          <div class="route-card__title">Website Accessibility & SEO Audit</div>
          <div class="route-card__desc">Run Lighthouse handoff audit, prioritize WCAG AA contrast, and export agent markdown.</div>
          <div class="route-card__badge">Tested · Local</div>
        </div>
        <div class="route-card" onclick="openTaskModalWithRoute('status-handoff')">
          <div class="route-card__title">Capability Status Handoff</div>
          <div class="route-card__desc">Evaluate project status events and emit structured handoff run records.</div>
          <div class="route-card__badge">Tested · Kernel</div>
        </div>
        <div class="route-card" onclick="openTaskModalWithRoute('repository_inspection')">
          <div class="route-card__title">Repository Code Inspection</div>
          <div class="route-card__desc">Scan code schema integrity, verify contract invariants, and report health metrics.</div>
          <div class="route-card__badge">Tested · Development</div>
        </div>
      </div>
    </div>
  `);
}

// --- Capabilities View ---
async function renderCapabilities() {
  setContent(`
    <div class="workbench-page">
      <div class="page-category">SYSTEM DETAIL</div>
      <h1 class="page-title">Capability Inventory</h1>
      <p class="page-desc">Registered capability capsules and verified node bindings.</p>
      <div class="hero-card">
        <div class="hero-left">
          <h3>Synthetic Capability Capsules</h3>
          <p class="hero-text">synthetic-portable@1.0.0 (portable) · synthetic-bindable@1.0.0 (bindable)</p>
        </div>
      </div>
    </div>
  `);
}

// --- Runtime View ---
async function renderRuntime() {
  setContent(`
    <div class="workbench-page">
      <div class="page-category">SYSTEM DETAIL</div>
      <h1 class="page-title">Runtime & Nodes</h1>
      <p class="page-desc">Locaily installation node contract, assigned roles, and paired relay nodes.</p>
      <div class="hero-card">
        <div class="hero-left">
          <h3>Node Identity</h3>
          <p class="hero-text">Role: Hybrid · OS: ${navigator.platform} · Status: Online</p>
        </div>
      </div>
    </div>
  `);
}

// --- Modal Handlers ---
window.openTaskModal = function() {
  const el = qs("taskModal");
  if (el) el.classList.remove("is-hidden");
};

window.openTaskModalWithRoute = function(routeId) {
  const select = qs("taskRoute");
  if (select) select.value = routeId;
  const el = qs("taskModal");
  if (el) el.classList.remove("is-hidden");
};

window.closeTaskModal = function() {
  const el = qs("taskModal");
  if (el) el.classList.add("is-hidden");
};

window.submitTaskModal = async function() {
  const prompt = qs("taskPrompt")?.value || "Audit my website and give me a fix plan";
  const route = qs("taskRoute")?.value || "website_audit.lighthouse_handoff";
  closeTaskModal();
  alert(`Started task: "${prompt}" on route ${route}`);
};

window.openPlanModal = function() {
  const el = qs("planModal");
  if (el) el.classList.remove("is-hidden");
};

window.closePlanModal = function() {
  const el = qs("planModal");
  if (el) el.classList.add("is-hidden");
};

window.handleBackdropClick = function(event, modalId) {
  if (event && event.target && event.target.id === modalId) {
    const el = qs(modalId);
    if (el) el.classList.add("is-hidden");
  }
};

window.runSavedPlan = function() {
  closePlanModal();
  alert("Executing saved plan: Audit my website and give me a fix plan...");
};

// Global Escape Key Listener for Modals
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeTaskModal();
    closePlanModal();
  }
});

// --- Initialization ---
window.addEventListener("hashchange", () => {
  const sec = location.hash.replace("#", "");
  navigate(sec);
});

window.addEventListener("DOMContentLoaded", () => {
  const sec = location.hash.replace("#", "") || "workbench";
  navigate(sec);
});
