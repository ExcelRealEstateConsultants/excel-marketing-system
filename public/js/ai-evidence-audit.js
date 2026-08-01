/**
 * ai-evidence-audit.js
 * RapportLink AI Platform
 *
 * Module 6
 * Evidence Audit & Version History
 */

"use strict";

function auditRandomUUID() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
    /[xy]/g,
    function (character) {
      const randomValue = Math.floor(Math.random() * 16);
      const value = character === "x" ? randomValue : (randomValue & 0x3) | 0x8;

      return value.toString(16);
    },
  );
}

const auditClone = window.clone;
const auditNormalizeString = window.normalizeString;
const auditNormalizeTimestamp = window.normalizeTimestamp;

/* ==========================================================
   Audit Event Types
========================================================== */

const AUDIT_EVENT_TYPES = Object.freeze({
  EVIDENCE_CREATED: "evidence_created",
  EVIDENCE_UPDATED: "evidence_updated",
  EVIDENCE_REMOVED: "evidence_removed",

  EVIDENCE_MERGED: "evidence_merged",
  EVIDENCE_SUPERSEDED: "evidence_superseded",
  EVIDENCE_REJECTED: "evidence_rejected",

  CONFLICT_CREATED: "conflict_created",
  CONFLICT_RESOLVED: "conflict_resolved",

  DECISION_CREATED: "decision_created",
  DECISION_CHANGED: "decision_changed",

  STATE_CHANGED: "state_changed",

  SNAPSHOT_CREATED: "snapshot_created",

  REPLAY_STARTED: "replay_started",
  REPLAY_COMPLETED: "replay_completed",
});

/* ==========================================================
   Audit Event
========================================================== */

class AuditEvent {
  constructor(data = {}) {
    const now = new Date().toISOString();

    this.id =
      typeof data.id === "string" && data.id.trim()
        ? data.id.trim()
        : auditRandomUUID();

    this.type = auditNormalizeString(data.type);

    this.transactionId = data.transactionId || null;

    this.evidenceId = data.evidenceId || null;

    this.documentId = data.documentId || null;

    this.timestamp = auditNormalizeTimestamp(data.timestamp, now);

    this.user = data.user || "system";

    this.aiModule = data.aiModule || null;

    this.reason = typeof data.reason === "string" ? data.reason.trim() : "";

    this.before = auditClone(data.before);

    this.after = auditClone(data.after);

    this.metadata =
      data.metadata && typeof data.metadata === "object"
        ? auditClone(data.metadata)
        : {};
  }

  toJSON() {
    return {
      id: this.id,
      type: this.type,
      transactionId: this.transactionId,
      evidenceId: this.evidenceId,
      documentId: this.documentId,
      timestamp: this.timestamp,
      user: this.user,
      aiModule: this.aiModule,
      reason: this.reason,
      before: auditClone(this.before),
      after: auditClone(this.after),
      metadata: auditClone(this.metadata),
    };
  }
}

/* ==========================================================
   Audit Log
========================================================== */

class EvidenceAuditLog {
  constructor(events = []) {
    this.events = [];

    if (Array.isArray(events)) {
      events.forEach((event) => this.add(event));
    }
  }

  add(event) {
    const auditEvent =
      event instanceof AuditEvent ? event : new AuditEvent(event);

    this.events.push(auditEvent);

    this.events.sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );

    return auditEvent;
  }

  getAll() {
    return [...this.events];
  }

  getById(eventId) {
    return this.events.find((event) => event.id === eventId) || null;
  }

  getByTransaction(transactionId) {
    return this.events.filter((event) => event.transactionId === transactionId);
  }

  getByEvidence(evidenceId) {
    return this.events.filter((event) => event.evidenceId === evidenceId);
  }

  getByDocument(documentId) {
    return this.events.filter((event) => event.documentId === documentId);
  }

  getByType(type) {
    const normalized = auditNormalizeString(type);

    return this.events.filter((event) => event.type === normalized);
  }

  clear() {
    this.events = [];
  }

  count() {
    return this.events.length;
  }

  toJSON() {
    return this.events.map((event) => event.toJSON());
  }
}

/* ==========================================================
   Version Snapshot
========================================================== */

class EvidenceVersionSnapshot {
  constructor(data = {}) {
    const now = new Date().toISOString();

    this.id =
      typeof data.id === "string" && data.id.trim()
        ? data.id.trim()
        : auditRandomUUID();

    this.transactionId = data.transactionId || null;

    this.version = Number.isFinite(Number(data.version))
      ? Math.max(1, Math.floor(Number(data.version)))
      : 1;

    this.createdAt = auditNormalizeTimestamp(data.createdAt, now);

    this.createdBy = data.createdBy || "system";

    this.reason = typeof data.reason === "string" ? data.reason.trim() : "";

    this.brain = auditClone(data.brain);

    this.evidence = auditClone(data.evidence);

    this.metadata =
      data.metadata && typeof data.metadata === "object"
        ? auditClone(data.metadata)
        : {};
  }

  toJSON() {
    return {
      id: this.id,
      transactionId: this.transactionId,
      version: this.version,
      createdAt: this.createdAt,
      createdBy: this.createdBy,
      reason: this.reason,
      brain: auditClone(this.brain),
      evidence: auditClone(this.evidence),
      metadata: auditClone(this.metadata),
    };
  }
}

/* ==========================================================
   Version Manager
========================================================== */

class EvidenceVersionManager {
  constructor(options = {}) {
    this.snapshots = [];

    this.auditLog =
      options.auditLog instanceof EvidenceAuditLog
        ? options.auditLog
        : new EvidenceAuditLog(options.auditEvents);

    if (Array.isArray(options.snapshots)) {
      options.snapshots.forEach((snapshot) => {
        this.addSnapshot(snapshot, {
          writeAuditEvent: false,
        });
      });
    }
  }

  getNextVersion(transactionId) {
    const transactionSnapshots = this.getByTransaction(transactionId);

    if (transactionSnapshots.length === 0) {
      return 1;
    }

    const highestVersion = Math.max(
      ...transactionSnapshots.map((snapshot) => snapshot.version),
    );

    return highestVersion + 1;
  }

  createSnapshot(data = {}) {
    const transactionId = data.transactionId || null;

    const snapshot = new EvidenceVersionSnapshot({
      ...data,
      transactionId,
      version:
        data.version !== undefined
          ? data.version
          : this.getNextVersion(transactionId),
    });

    return this.addSnapshot(snapshot);
  }

  addSnapshot(snapshot, options = {}) {
    const versionSnapshot =
      snapshot instanceof EvidenceVersionSnapshot
        ? snapshot
        : new EvidenceVersionSnapshot(snapshot);

    const duplicateId = this.snapshots.some(
      (existingSnapshot) => existingSnapshot.id === versionSnapshot.id,
    );

    if (duplicateId) {
      throw new Error(
        `Snapshot with id "${versionSnapshot.id}" already exists.`,
      );
    }

    const duplicateVersion = this.snapshots.some(
      (existingSnapshot) =>
        existingSnapshot.transactionId === versionSnapshot.transactionId &&
        existingSnapshot.version === versionSnapshot.version,
    );

    if (duplicateVersion) {
      throw new Error(
        `Version ${versionSnapshot.version} already exists for transaction "${versionSnapshot.transactionId}".`,
      );
    }

    this.snapshots.push(versionSnapshot);

    this.sortSnapshots();

    if (options.writeAuditEvent !== false) {
      this.auditLog.add({
        type: AUDIT_EVENT_TYPES.SNAPSHOT_CREATED,
        transactionId: versionSnapshot.transactionId,
        timestamp: versionSnapshot.createdAt,
        user: versionSnapshot.createdBy,
        aiModule: "ai-evidence-audit",
        reason:
          versionSnapshot.reason ||
          `Created transaction snapshot version ${versionSnapshot.version}.`,
        before: null,
        after: versionSnapshot.toJSON(),
        metadata: {
          snapshotId: versionSnapshot.id,
          version: versionSnapshot.version,
        },
      });
    }

    return versionSnapshot;
  }

  sortSnapshots() {
    this.snapshots.sort((a, b) => {
      if (a.transactionId !== b.transactionId) {
        return String(a.transactionId).localeCompare(String(b.transactionId));
      }

      return a.version - b.version;
    });
  }

  getAll() {
    return [...this.snapshots];
  }

  getById(snapshotId) {
    return (
      this.snapshots.find((snapshot) => snapshot.id === snapshotId) || null
    );
  }

  getByTransaction(transactionId) {
    return this.snapshots.filter(
      (snapshot) => snapshot.transactionId === transactionId,
    );
  }

  getByVersion(transactionId, version) {
    const normalizedVersion = Number(version);

    return (
      this.snapshots.find(
        (snapshot) =>
          snapshot.transactionId === transactionId &&
          snapshot.version === normalizedVersion,
      ) || null
    );
  }

  getLatest(transactionId) {
    const transactionSnapshots = this.getByTransaction(transactionId);

    if (transactionSnapshots.length === 0) {
      return null;
    }

    return transactionSnapshots.reduce((latest, snapshot) =>
      snapshot.version > latest.version ? snapshot : latest,
    );
  }

  restoreVersion(transactionId, version) {
    const snapshot = this.getByVersion(transactionId, version);

    if (!snapshot) {
      return null;
    }

    return {
      snapshotId: snapshot.id,
      transactionId: snapshot.transactionId,
      version: snapshot.version,
      restoredAt: new Date().toISOString(),
      brain: auditClone(snapshot.brain),
      evidence: auditClone(snapshot.evidence),
      metadata: auditClone(snapshot.metadata),
    };
  }

  removeSnapshot(snapshotId) {
    const snapshotIndex = this.snapshots.findIndex(
      (snapshot) => snapshot.id === snapshotId,
    );

    if (snapshotIndex === -1) {
      return null;
    }

    const [removedSnapshot] = this.snapshots.splice(snapshotIndex, 1);

    return removedSnapshot;
  }

  clearTransaction(transactionId) {
    const removedSnapshots = this.getByTransaction(transactionId);

    this.snapshots = this.snapshots.filter(
      (snapshot) => snapshot.transactionId !== transactionId,
    );

    return removedSnapshots;
  }

  clear() {
    this.snapshots = [];
  }

  count(transactionId = null) {
    if (transactionId === null) {
      return this.snapshots.length;
    }

    return this.getByTransaction(transactionId).length;
  }

  toJSON() {
    return {
      snapshots: this.snapshots.map((snapshot) => snapshot.toJSON()),
      auditEvents: this.auditLog.toJSON(),
    };
  }
}

/* ==========================================================
   Module Validation
========================================================== */

function validateEvidenceAuditModule() {
  const errors = [];

  try {
    const auditLog = new EvidenceAuditLog();

    const event = auditLog.add({
      type: AUDIT_EVENT_TYPES.EVIDENCE_CREATED,
      transactionId: "test-transaction",
      evidenceId: "test-evidence",
      reason: "Validation test",
      before: null,
      after: {
        value: "test",
      },
    });

    if (!(event instanceof AuditEvent)) {
      errors.push("Audit event was not created correctly.");
    }

    if (auditLog.count() !== 1) {
      errors.push("Audit log did not store the event.");
    }

    if (auditLog.getByEvidence("test-evidence").length !== 1) {
      errors.push("Evidence audit lookup failed.");
    }

    const versionManager = new EvidenceVersionManager({
      auditLog,
    });

    const firstSnapshot = versionManager.createSnapshot({
      transactionId: "test-transaction",
      reason: "Initial validation snapshot",
      brain: {
        transactionState: "active",
      },
      evidence: [
        {
          id: "test-evidence",
          value: "test",
        },
      ],
    });

    const secondSnapshot = versionManager.createSnapshot({
      transactionId: "test-transaction",
      reason: "Second validation snapshot",
      brain: {
        transactionState: "under_contract",
      },
      evidence: [
        {
          id: "test-evidence",
          value: "updated-test",
        },
      ],
    });

    if (!(firstSnapshot instanceof EvidenceVersionSnapshot)) {
      errors.push("Version snapshot was not created correctly.");
    }

    if (firstSnapshot.version !== 1) {
      errors.push("First snapshot did not receive version 1.");
    }

    if (secondSnapshot.version !== 2) {
      errors.push("Second snapshot did not receive version 2.");
    }

    if (versionManager.count("test-transaction") !== 2) {
      errors.push("Version manager did not store both snapshots.");
    }

    const latestSnapshot = versionManager.getLatest("test-transaction");

    if (!latestSnapshot || latestSnapshot.version !== 2) {
      errors.push("Version manager did not return the latest snapshot.");
    }

    const restoredVersion = versionManager.restoreVersion(
      "test-transaction",
      1,
    );

    if (
      !restoredVersion ||
      restoredVersion.version !== 1 ||
      restoredVersion.brain.transactionState !== "active"
    ) {
      errors.push("Version restoration failed.");
    }

    if (auditLog.getByType(AUDIT_EVENT_TYPES.SNAPSHOT_CREATED).length !== 2) {
      errors.push("Snapshot audit events were not created.");
    }
  } catch (error) {
    errors.push(error.message);
  }

  return {
    valid: errors.length === 0,
    module: "ai-evidence-audit",
    errors,
    checkedAt: new Date().toISOString(),
  };
}

/* ==========================================================
   Exports
========================================================== */

const EVIDENCE_AUDIT_API = {
  AUDIT_EVENT_TYPES,

  AuditEvent,

  EvidenceAuditLog,

  EvidenceVersionSnapshot,

  EvidenceVersionManager,

  validateEvidenceAuditModule,
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = EVIDENCE_AUDIT_API;
}

if (typeof window !== "undefined") {
  Object.assign(window, EVIDENCE_AUDIT_API);
}
