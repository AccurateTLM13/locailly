const fs = require("node:fs");
const path = require("node:path");

const TRACKS_DIR = path.join(__dirname, "tracks");

function listTracks() {
  if (!fs.existsSync(TRACKS_DIR)) {
    return [];
  }

  return fs.readdirSync(TRACKS_DIR)
    .filter((file) => file.endsWith(".track.json"))
    .map((file) => {
      const track = loadTrackFile(path.join(TRACKS_DIR, file));
      return {
        track_id: track.track_id,
        version: track.version,
        name: track.name,
        description: track.description,
        steps: Array.isArray(track.steps) ? track.steps.map((step) => step.id) : []
      };
    });
}

function loadTrack(trackId) {
  if (!trackId || typeof trackId !== "string") {
    throw trackError("INVALID_TRACK", "Track id is required.", "Send track_id in the request body.");
  }

  const normalized = trackId.trim();
  const directPath = path.join(TRACKS_DIR, `${normalized}.track.json`);

  if (fs.existsSync(directPath)) {
    return loadTrackFile(directPath);
  }

  const entries = fs.readdirSync(TRACKS_DIR).filter((file) => file.endsWith(".track.json"));

  for (const file of entries) {
    const track = loadTrackFile(path.join(TRACKS_DIR, file));
    if (track.track_id === normalized) {
      return track;
    }
  }

  throw trackError(
    "TRACK_NOT_FOUND",
    `Track '${normalized}' was not found.`,
    "Use GET /tracks to list available track ids."
  );
}

function loadTrackFile(filePath) {
  let track;

  try {
    track = JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (err) {
    throw trackError("TRACK_CONFIG_INVALID", `Failed to parse track config: ${err.message}`, "Fix the track JSON file.");
  }

  if (!track.track_id || !Array.isArray(track.steps) || track.steps.length === 0) {
    throw trackError("TRACK_CONFIG_INVALID", "Track config requires track_id and a non-empty steps array.", "Fix the track JSON file.");
  }

  for (const step of track.steps) {
    if (!step.id || !step.executor || !step.executor.type) {
      throw trackError("TRACK_CONFIG_INVALID", "Each track step requires id and executor.type.", "Fix the track JSON file.");
    }
  }

  return track;
}

function trackError(code, message, nextStep) {
  const error = new Error(message);
  error.code = code;
  error.nextStep = nextStep;
  return error;
}

module.exports = {
  listTracks,
  loadTrack
};
