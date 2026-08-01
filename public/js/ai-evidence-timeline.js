/**
 * ai-evidence-timeline.js
 * RapportLink AI Platform
 *
 * Module 2
 * Evidence Timeline Engine
 */

"use strict";

function timelineRandomUUID() {
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

/* ==========================================================
   Timeline Event Types
========================================================== */

const TIMELINE_EVENT_TYPES = Object.freeze({
  DOCUMENT_ADDED: "document_added",
  DOCUMENT_UPDATED: "document_updated",
  DOCUMENT_REMOVED: "document_removed",

  EVIDENCE_CREATED: "evidence_created",
  EVIDENCE_UPDATED: "evidence_updated",
  EVIDENCE_REMOVED: "evidence_removed",

  FACT_CREATED: "fact_created",
  FACT_CHANGED: "fact_changed",

  STATE_CHANGED: "state_changed",

  SNAPSHOT_CREATED: "snapshot_created",

  DECISION_CREATED: "decision_created",

  OTHER: "other",
});

/* ==========================================================
   Timeline Event
========================================================== */

class TimelineEvent {
  constructor(data = {}) {
    const now = new Date().toISOString();

    this.id =
      typeof data.id === "string" && data.id.trim()
        ? data.id.trim()
        : randomUUID();

    this.transactionId = data.transactionId || null;

    this.documentId = data.documentId || null;

    this.evidenceId = data.evidenceId || null;

    this.type = normalizeString(data.type) || TIMELINE_EVENT_TYPES.OTHER;

    this.timestamp = normalizeTimestamp(data.timestamp, now);

    this.title = typeof data.title === "string" ? data.title.trim() : "";

    this.description =
      typeof data.description === "string" ? data.description.trim() : "";

    this.user = data.user || "system";

    this.aiModule = data.aiModule || null;

    this.before = clone(data.before);

    this.after = clone(data.after);

    this.metadata =
      data.metadata && typeof data.metadata === "object"
        ? clone(data.metadata)
        : {};
  }

  toJSON() {
    return {
      id: this.id,
      transactionId: this.transactionId,
      documentId: this.documentId,
      evidenceId: this.evidenceId,
      type: this.type,
      timestamp: this.timestamp,
      title: this.title,
      description: this.description,
      user: this.user,
      aiModule: this.aiModule,
      before: clone(this.before),
      after: clone(this.after),
      metadata: clone(this.metadata),
    };
  }
}

/* ==========================================================
   Evidence Timeline
========================================================== */

class EvidenceTimeline {
  constructor(events = []) {
    this.events = [];

    if (Array.isArray(events)) {
      events.forEach((event) => this.add(event));
    }
  }

  add(event) {
    const timelineEvent =
      event instanceof TimelineEvent ? event : new TimelineEvent(event);

    this.events.push(timelineEvent);

    this.events.sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );

    return timelineEvent;
  }

  importAuditLog(auditLog) {
    if (!(auditLog instanceof EvidenceAuditLog)) {
      return;
    }

    auditLog.getAll().forEach((auditEvent) => {
      this.addFromAuditEvent(auditEvent);
    });
  }

  addFromAuditEvent(auditEvent) {
    if (!(auditEvent instanceof AuditEvent)) {
      auditEvent = new AuditEvent(auditEvent);
    }

    this.add({
      transactionId: auditEvent.transactionId,
      documentId: auditEvent.documentId,
      evidenceId: auditEvent.evidenceId,
      timestamp: auditEvent.timestamp,
      type: normalizeString(auditEvent.type) || TIMELINE_EVENT_TYPES.OTHER,
      title: auditEvent.type,
      description: auditEvent.reason,
      user: auditEvent.user,
      aiModule: auditEvent.aiModule,
      before: auditEvent.before,
      after: auditEvent.after,
      metadata: auditEvent.metadata,
    });
  }

  getAll() {
    return [...this.events];
  }

  count() {
    return this.events.length;
  }

  clear() {
    this.events = [];
  }

  getById(eventId) {
    return this.events.find((event) => event.id === eventId) || null;
  }

  getByTransaction(transactionId) {
    return this.events.filter((event) => event.transactionId === transactionId);
  }

  getByDocument(documentId) {
    return this.events.filter((event) => event.documentId === documentId);
  }

  getByEvidence(evidenceId) {
    return this.events.filter((event) => event.evidenceId === evidenceId);
  }

  getByType(type) {
    const normalized = normalizeString(type);

    return this.events.filter((event) => event.type === normalized);
  }

  getBetween(startDate, endDate) {
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();

    return this.events.filter((event) => {
      const timestamp = new Date(event.timestamp).getTime();

      return timestamp >= start && timestamp <= end;
    });
  }

  getLatest() {
    if (this.events.length === 0) {
      return null;
    }

    return this.events[this.events.length - 1];
  }

  getEarliest() {
    if (this.events.length === 0) {
      return null;
    }

    return this.events[0];
  }

  replay(untilTimestamp = null) {
    if (!untilTimestamp) {
      return this.getAll();
    }

    const end = new Date(untilTimestamp).getTime();

    return this.events.filter(
      (event) => new Date(event.timestamp).getTime() <= end,
    );
  }

  summarize(transactionId = null) {
    const events = transactionId
      ? this.getByTransaction(transactionId)
      : this.events;

    return {
      totalEvents: events.length,

      firstEvent: events.length > 0 ? events[0].timestamp : null,

      latestEvent:
        events.length > 0 ? events[events.length - 1].timestamp : null,

      eventTypes: [...new Set(events.map((e) => e.type))],

      documents: [...new Set(events.map((e) => e.documentId).filter(Boolean))],

      evidence: [...new Set(events.map((e) => e.evidenceId).filter(Boolean))],
    };
  }

  toJSON() {
    return this.events.map((event) => event.toJSON());
  }
}

/* ==========================================================
   Timeline Validation
========================================================== */

function validateEvidenceTimelineModule() {
  const errors = [];

  try {
    const auditLog = new EvidenceAuditLog();

    auditLog.add({
      type: AUDIT_EVENT_TYPES.EVIDENCE_CREATED,
      transactionId: "txn-1",
      documentId: "doc-1",
      evidenceId: "ev-1",
      reason: "Purchase agreement uploaded.",
    });

    auditLog.add({
      type: AUDIT_EVENT_TYPES.STATE_CHANGED,
      transactionId: "txn-1",
      reason: "Transaction moved to Under Contract.",
    });

    const timeline = new EvidenceTimeline();

    timeline.importAuditLog(auditLog);

    if (timeline.count() !== 2) {
      errors.push("Timeline did not import audit events.");
    }

    if (timeline.getByTransaction("txn-1").length !== 2) {
      errors.push("Transaction lookup failed.");
    }

    if (timeline.getByEvidence("ev-1").length !== 1) {
      errors.push("Evidence lookup failed.");
    }

    if (!timeline.getLatest()) {
      errors.push("Latest event retrieval failed.");
    }

    if (timeline.summarize("txn-1").totalEvents !== 2) {
      errors.push("Timeline summary failed.");
    }
  } catch (error) {
    errors.push(error.message);
  }

  return {
    valid: errors.length === 0,
    module: "ai-evidence-timeline",
    errors,
    checkedAt: new Date().toISOString(),
  };
}

/* ==========================================================
   Exports
========================================================== */

const EVIDENCE_TIMELINE_API = {
  TIMELINE_EVENT_TYPES,
  TimelineEvent,
  EvidenceTimeline,
  validateEvidenceTimelineModule,
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = EVIDENCE_TIMELINE_API;
}

if (typeof window !== "undefined") {
  Object.assign(window, EVIDENCE_TIMELINE_API);
}
