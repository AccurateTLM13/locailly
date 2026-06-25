const fs = require("node:fs");
const path = require("node:path");

function createModelQualificationLoader(options = {}) {
  const qualificationDir = options.qualificationDir
    || path.resolve(__dirname, "..", "..", "benchmark-lab", "qualifications", "models");
  const checksumDir = options.checksumDir
    || path.resolve(__dirname, "..", "..", "benchmark-lab", "evidence", "checksums");

  return {
    list() {
      return loadQualificationRecords(qualificationDir);
    },
    getStatus() {
      const scan = scanQualificationRecords(qualificationDir);
      const checksumCount = countJsonFiles(checksumDir);
      const byStatus = {};
      const byRole = {};
      let latestGeneratedAt = null;

      for (const record of scan.records) {
        const status = record.status || "unknown";
        byStatus[status] = (byStatus[status] || 0) + 1;

        for (const entry of record.qualifiedFor || []) {
          const role = entry.role || "unknown";
          byRole[role] = (byRole[role] || 0) + 1;
        }

        if (record.generatedAt && (!latestGeneratedAt || record.generatedAt > latestGeneratedAt)) {
          latestGeneratedAt = record.generatedAt;
        }
      }

      return {
        enabled: true,
        qualificationDir,
        checksumDir,
        records: scan.records.length,
        invalidRecords: scan.errors.length,
        checksums: checksumCount,
        byStatus,
        byRole,
        latestGeneratedAt,
        errors: scan.errors
      };
    },
    findByModel(modelId) {
      const normalizedModelId = normalizeId(modelId);
      return loadQualificationRecords(qualificationDir)
        .filter((record) => matchesModel(record, normalizedModelId));
    },
    findForRole({ modelId, role, trackId = null, contractId = null }) {
      const normalizedModelId = normalizeId(modelId);
      const normalizedRole = normalizeId(role);
      const normalizedTrackId = normalizeId(trackId);
      const normalizedContractId = normalizeId(contractId);
      const matches = [];

      for (const record of loadQualificationRecords(qualificationDir)) {
        if (!matchesModel(record, normalizedModelId)) {
          continue;
        }

        for (const entry of record.qualifiedFor || []) {
          if (normalizeId(entry.role) !== normalizedRole) {
            continue;
          }

          if (normalizedTrackId && normalizeId(entry.trackId) !== normalizedTrackId) {
            continue;
          }

          if (normalizedContractId && normalizeId(entry.contractId) !== normalizedContractId) {
            continue;
          }

          matches.push({
            recordId: record.recordId,
            modelId: record.subject.id,
            status: entry.status,
            role: entry.role,
            trackId: entry.trackId,
            contractId: entry.contractId,
            score: typeof entry.score === "number" ? entry.score : null,
            evidenceIds: record.evidence ? record.evidence.evidenceIds || [] : [],
            generatedAt: record.generatedAt
          });
        }
      }

      return matches;
    }
  };
}

function loadQualificationRecords(qualificationDir) {
  return scanQualificationRecords(qualificationDir).records;
}

function scanQualificationRecords(qualificationDir) {
  if (!fs.existsSync(qualificationDir)) {
    return {
      records: [],
      errors: []
    };
  }

  const records = [];
  const errors = [];
  const entries = fs.readdirSync(qualificationDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) {
      continue;
    }

    const filePath = path.join(qualificationDir, entry.name);
    let parsed;

    try {
      parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
    } catch (error) {
      errors.push({
        file: filePath,
        code: "QUALIFICATION_RECORD_INVALID_JSON",
        message: error.message
      });
      continue;
    }

    if (parsed && parsed.schemaVersion === "benchmark.qualification.v1") {
      records.push(parsed);
    } else {
      errors.push({
        file: filePath,
        code: "QUALIFICATION_RECORD_SCHEMA_UNSUPPORTED",
        message: "Qualification record schemaVersion is missing or unsupported."
      });
    }
  }

  return {
    records,
    errors
  };
}

function countJsonFiles(dir) {
  if (!fs.existsSync(dir)) {
    return 0;
  }

  return fs.readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .length;
}

function normalizeId(value) {
  return typeof value === "string" ? value.trim() : "";
}

function matchesModel(record, normalizedModelId) {
  const subject = record.subject || {};
  return normalizeId(subject.id) === normalizedModelId
    || normalizeId(subject.runtimeModelName) === normalizedModelId;
}

module.exports = {
  createModelQualificationLoader,
  loadQualificationRecords,
  scanQualificationRecords
};
