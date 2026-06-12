const fs = require("node:fs");
const path = require("node:path");

const SCOREBOARD_PATH = path.join(__dirname, "../../data/scoreboard.jsonl");

function recordScoreboardEntry({ track, mode, durationMs, schemaValid, steps }) {
  // Estimated RAM (GB) and Cost ($) based on the LFM2.5 model footprints vs Monolithic generalist
  let estimatedRamGb = 3.0; // Default for baseline (e.g., Llama 3.2 3B)
  if (mode === "orchestrated") {
    // Orchestrated uses a sequence of LFM2.5-350M (~0.3GB) and LFM2.5-1.2B (~0.9GB)
    estimatedRamGb = 1.2;
  } else if (mode === "mock") {
    estimatedRamGb = 0.1;
  }

  const entry = {
    timestamp: new Date().toISOString(),
    track,
    mode,
    durationMs,
    schemaValid,
    stepsCount: Array.isArray(steps) ? steps.length : 0,
    estimatedRamGb,
    estimatedCostUsd: 0.0, // Always $0 since it runs on local hardware!
    steps: Array.isArray(steps) ? steps.map(s => ({
      name: s.name,
      model: s.model,
      role: s.role,
      durationMs: s.durationMs
    })) : []
  };

  try {
    const dataDir = path.dirname(SCOREBOARD_PATH);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.appendFileSync(SCOREBOARD_PATH, JSON.stringify(entry) + "\n", "utf8");
  } catch (err) {
    console.error(`[Scoreboard] Failed to write scoreboard entry: ${err.message}`);
  }

  return entry;
}

function getScoreboardSummary() {
  const summary = {
    lighthouse_handoff: {
      orchestrated: { count: 0, totalDurationMs: 0, validCount: 0, avgRamGb: 0 },
      baseline: { count: 0, totalDurationMs: 0, validCount: 0, avgRamGb: 0 }
    }
  };

  if (!fs.existsSync(SCOREBOARD_PATH)) {
    return summary;
  }

  try {
    const raw = fs.readFileSync(SCOREBOARD_PATH, "utf8");
    const lines = raw.split("\n").filter(line => line.trim());

    for (const line of lines) {
      const entry = JSON.parse(line);
      const track = entry.track || "lighthouse_handoff";
      const mode = entry.mode;

      if (!summary[track]) {
        summary[track] = {
          orchestrated: { count: 0, totalDurationMs: 0, validCount: 0, avgRamGb: 0 },
          baseline: { count: 0, totalDurationMs: 0, validCount: 0, avgRamGb: 0 }
        };
      }

      if (summary[track][mode]) {
        const stats = summary[track][mode];
        stats.count++;
        stats.totalDurationMs += entry.durationMs;
        stats.validCount += entry.schemaValid ? 1 : 0;
        stats.avgRamGb += entry.estimatedRamGb;
      }
    }

    // Calculate averages
    for (const track of Object.keys(summary)) {
      for (const mode of Object.keys(summary[track])) {
        const stats = summary[track][mode];
        if (stats.count > 0) {
          stats.avgDurationMs = Math.round(stats.totalDurationMs / stats.count);
          stats.schemaAccuracy = parseFloat((stats.validCount / stats.count).toFixed(2));
          stats.avgRamGb = parseFloat((stats.avgRamGb / stats.count).toFixed(1));
          stats.costUsd = 0.0;
        } else {
          stats.avgDurationMs = 0;
          stats.schemaAccuracy = 0.0;
          stats.avgRamGb = mode === "orchestrated" ? 1.2 : 3.0;
          stats.costUsd = 0.0;
        }
      }
    }
  } catch (err) {
    console.error(`[Scoreboard] Failed to read scoreboard: ${err.message}`);
  }

  return summary;
}

module.exports = {
  recordScoreboardEntry,
  getScoreboardSummary
};
