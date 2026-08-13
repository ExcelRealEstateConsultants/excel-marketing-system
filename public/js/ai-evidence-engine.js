/**
 * ai-evidence-engine.js
 * RapportLink AI Platform
 *
 * Evidence Engine
 * ---------------------------------------------------------
 * Purpose:
 *   - Store every extracted fact as evidence
 *   - Track confidence and provenance
 *   - Reconcile conflicting evidence
 *   - Provide a trusted source of truth for reasoning
 *
 * The Transaction Brain must never invent facts.
 * It reasons only from evidence records stored here.
 */

"use strict";

function randomUUID() {
  if (
    typeof globalThis !== "undefined" &&
    globalThis.crypto &&
    typeof globalThis.crypto.randomUUID === "function"
  ) {
    return globalThis.crypto.randomUUID();
  }

  if (
    typeof require === "function" &&
    typeof module !== "undefined" &&
    module.exports
  ) {
    return require("crypto").randomUUID();
  }

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
    /[xy]/g,
    (character) => {
      const randomNumber = Math.floor(Math.random() * 16);
      const value =
        character === "x" ? randomNumber : (randomNumber & 0x3) | 0x8;

      return value.toString(16);
    },
  );
}

const ENGINE_VERSION = "1.0.0";

/* ==========================================================
   Evidence Types
========================================================== */

const EVIDENCE_TYPES = Object.freeze({
  FACT: "fact",
  DATE: "date",
  PARTY: "party",
  PROPERTY: "property",
  MONEY: "money",
  SIGNATURE: "signature",
  INITIAL: "initial",
  CHECKBOX: "checkbox",
  DEADLINE: "deadline",
  STATUS: "status",
  DOCUMENT: "document",
  OTHER: "other",
});

/* ==========================================================
   Evidence Status
========================================================== */

const EVIDENCE_STATUS = Object.freeze({
  ACTIVE: "active",
  SUPERSEDED: "superseded",
  CONFLICTED: "conflicted",
  REJECTED: "rejected",
});

/* ==========================================================
   Confidence Sources
========================================================== */

const CONFIDENCE_SOURCE = Object.freeze({
  OCR: "ocr",
  GPT: "gpt",
  HUMAN: "human",
  IMPORTED: "imported",
  SYSTEM: "system",
});

/* ==========================================================
   Utility Functions
========================================================== */

function normalizeString(value) {
  if (value === undefined || value === null) {
    return "";
  }

  return String(value).trim().replace(/\s+/g, " ").toLowerCase();
}

function clone(value) {
  if (value === undefined) {
    return undefined;
  }

  if (typeof structuredClone === "function") {
    try {
      return structuredClone(value);
    } catch (error) {
      // Fall through to JSON cloning.
    }
  }

  try {
    return JSON.parse(JSON.stringify(value));
  } catch (error) {
    return value;
  }
}

function clamp(value, min, max) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return min;
  }

  return Math.max(min, Math.min(max, number));
}

function normalizeEvidenceType(type) {
  const normalizedType = normalizeString(type);

  const validTypes = Object.values(EVIDENCE_TYPES);

  return validTypes.includes(normalizedType)
    ? normalizedType
    : EVIDENCE_TYPES.OTHER;
}

function normalizeEvidenceStatus(status) {
  const normalizedStatus = normalizeString(status);

  const validStatuses = Object.values(EVIDENCE_STATUS);

  return validStatuses.includes(normalizedStatus)
    ? normalizedStatus
    : EVIDENCE_STATUS.ACTIVE;
}

function normalizeConfidenceSource(source) {
  const normalizedSource = normalizeString(source);

  const validSources = Object.values(CONFIDENCE_SOURCE);

  return validSources.includes(normalizedSource)
    ? normalizedSource
    : CONFIDENCE_SOURCE.SYSTEM;
}

function normalizePageNumber(page) {
  if (page === undefined || page === null || page === "") {
    return null;
  }

  const pageNumber = Number(page);

  if (!Number.isFinite(pageNumber) || pageNumber < 1) {
    return null;
  }

  return Math.floor(pageNumber);
}

function normalizeTimestamp(value, fallback = null) {
  if (!value) {
    return fallback;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return fallback;
  }

  return date.toISOString();
}

/* ==========================================================
   Confidence Scoring
========================================================== */

function calculateConfidence(record = {}) {
  let confidence = clamp(record.confidence, 0, 100);

  const extractedBy = normalizeConfidenceSource(record.extractedBy);

  if (extractedBy === CONFIDENCE_SOURCE.HUMAN) {
    confidence += 15;
  }

  if (record.documentType) {
    confidence += 5;
  }

  if (normalizePageNumber(record.page) !== null) {
    confidence += 2;
  }

  if (record.boundingBox && typeof record.boundingBox === "object") {
    confidence += 3;
  }

  if (Array.isArray(record.reasoning) && record.reasoning.length > 0) {
    confidence += 2;
  }

  return clamp(confidence, 0, 100);
}

/* ==========================================================
   Evidence Record
========================================================== */

class EvidenceRecord {
  constructor(data = {}) {
    const now = new Date().toISOString();

    this.id =
      typeof data.id === "string" && data.id.trim()
        ? data.id.trim()
        : randomUUID();

    this.type = normalizeEvidenceType(data.type);

    this.key = typeof data.key === "string" ? data.key.trim() : "";

    this.value = clone(data.value);

    this.normalizedValue =
      data.normalizedValue !== undefined && data.normalizedValue !== null
        ? normalizeString(data.normalizedValue)
        : normalizeString(data.value);

    this.confidence = clamp(data.confidence, 0, 100);

    this.sourceConfidence = clamp(
      data.sourceConfidence ?? this.confidence,
      0,
      100,
    );

    this.status = normalizeEvidenceStatus(data.status);

    this.source =
      data.source &&
      typeof data.source === "object" &&
      !Array.isArray(data.source)
        ? clone(data.source)
        : {};

    this.documentId = data.documentId ?? this.source.documentId ?? null;

    this.documentName = data.documentName ?? this.source.documentName ?? null;

    this.documentType = data.documentType ?? this.source.documentType ?? null;

    this.page = normalizePageNumber(data.page ?? this.source.page);

    this.boundingBox =
      data.boundingBox && typeof data.boundingBox === "object"
        ? clone(data.boundingBox)
        : null;

    this.extractedBy = normalizeConfidenceSource(data.extractedBy);

    this.createdAt = normalizeTimestamp(data.createdAt, now);

    this.updatedAt = normalizeTimestamp(data.updatedAt, this.createdAt);

    this.reasoning = Array.isArray(data.reasoning)
      ? data.reasoning
          .filter((item) => item !== null && item !== undefined)
          .map((item) => String(item).trim())
          .filter(Boolean)
      : [];

    this.metadata =
      data.metadata &&
      typeof data.metadata === "object" &&
      !Array.isArray(data.metadata)
        ? clone(data.metadata)
        : {};

    this.confidence = calculateConfidence(this);
  }

  update(values = {}) {
    if (!values || typeof values !== "object") {
      return this;
    }

    if (Object.prototype.hasOwnProperty.call(values, "type")) {
      this.type = normalizeEvidenceType(values.type);
    }

    if (Object.prototype.hasOwnProperty.call(values, "key")) {
      this.key = typeof values.key === "string" ? values.key.trim() : this.key;
    }

    if (Object.prototype.hasOwnProperty.call(values, "value")) {
      this.value = clone(values.value);

      if (!Object.prototype.hasOwnProperty.call(values, "normalizedValue")) {
        this.normalizedValue = normalizeString(values.value);
      }
    }

    if (Object.prototype.hasOwnProperty.call(values, "normalizedValue")) {
      this.normalizedValue = normalizeString(values.normalizedValue);
    }

    if (Object.prototype.hasOwnProperty.call(values, "confidence")) {
      this.confidence = clamp(values.confidence, 0, 100);
    }

    if (Object.prototype.hasOwnProperty.call(values, "sourceConfidence")) {
      this.sourceConfidence = clamp(values.sourceConfidence, 0, 100);
    }

    if (Object.prototype.hasOwnProperty.call(values, "status")) {
      this.status = normalizeEvidenceStatus(values.status);
    }

    if (
      Object.prototype.hasOwnProperty.call(values, "source") &&
      values.source &&
      typeof values.source === "object" &&
      !Array.isArray(values.source)
    ) {
      this.source = clone(values.source);
    }

    if (Object.prototype.hasOwnProperty.call(values, "documentId")) {
      this.documentId = values.documentId ?? null;
    }

    if (Object.prototype.hasOwnProperty.call(values, "documentName")) {
      this.documentName = values.documentName ?? null;
    }

    if (Object.prototype.hasOwnProperty.call(values, "documentType")) {
      this.documentType = values.documentType ?? null;
    }

    if (Object.prototype.hasOwnProperty.call(values, "page")) {
      this.page = normalizePageNumber(values.page);
    }

    if (Object.prototype.hasOwnProperty.call(values, "boundingBox")) {
      this.boundingBox =
        values.boundingBox && typeof values.boundingBox === "object"
          ? clone(values.boundingBox)
          : null;
    }

    if (Object.prototype.hasOwnProperty.call(values, "extractedBy")) {
      this.extractedBy = normalizeConfidenceSource(values.extractedBy);
    }

    if (Object.prototype.hasOwnProperty.call(values, "reasoning")) {
      this.reasoning = Array.isArray(values.reasoning)
        ? values.reasoning
            .filter((item) => item !== null && item !== undefined)
            .map((item) => String(item).trim())
            .filter(Boolean)
        : [];
    }

    if (Object.prototype.hasOwnProperty.call(values, "metadata")) {
      this.metadata =
        values.metadata &&
        typeof values.metadata === "object" &&
        !Array.isArray(values.metadata)
          ? clone(values.metadata)
          : {};
    }

    this.updatedAt = new Date().toISOString();
    this.confidence = calculateConfidence(this);

    return this;
  }

  addReasoning(reason) {
    if (reason === undefined || reason === null) {
      return this;
    }

    const normalizedReason = String(reason).trim();

    if (normalizedReason && !this.reasoning.includes(normalizedReason)) {
      this.reasoning.push(normalizedReason);
      this.updatedAt = new Date().toISOString();
    }

    return this;
  }

  setStatus(status) {
    this.status = normalizeEvidenceStatus(status);
    this.updatedAt = new Date().toISOString();

    return this;
  }

  isActive() {
    return this.status === EVIDENCE_STATUS.ACTIVE;
  }

  isConflict() {
    return this.status === EVIDENCE_STATUS.CONFLICTED;
  }

  isSuperseded() {
    return this.status === EVIDENCE_STATUS.SUPERSEDED;
  }

  isRejected() {
    return this.status === EVIDENCE_STATUS.REJECTED;
  }

  toJSON() {
    return {
      id: this.id,
      type: this.type,
      key: this.key,
      value: clone(this.value),
      normalizedValue: this.normalizedValue,
      confidence: this.confidence,
      sourceConfidence: this.sourceConfidence,
      status: this.status,
      source: clone(this.source),
      documentId: this.documentId,
      documentName: this.documentName,
      documentType: this.documentType,
      page: this.page,
      boundingBox: clone(this.boundingBox),
      extractedBy: this.extractedBy,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      reasoning: [...this.reasoning],
      metadata: clone(this.metadata),
    };
  }
}

/* ==========================================================
   Evidence Collection
========================================================== */

class EvidenceCollection {
  constructor(records = []) {
    this.records = [];

    this.index = new Map();

    this.typeIndex = new Map();

    this.documentIndex = new Map();

    this.keyIndex = new Map();

    if (Array.isArray(records)) {
      records.forEach((record) => this.add(record));
    }
  }

  add(record) {
    const evidenceRecord =
      record instanceof EvidenceRecord ? record : new EvidenceRecord(record);

    const existingRecord = this.index.get(evidenceRecord.id);

    if (existingRecord) {
      this.remove(existingRecord.id);
    }

    this.records.push(evidenceRecord);

    this.indexRecord(evidenceRecord);

    return evidenceRecord;
  }

  addMany(records = []) {
    if (!Array.isArray(records)) {
      return [];
    }

    return records.map((record) => this.add(record));
  }

  indexRecord(record) {
    this.index.set(record.id, record);

    if (!this.typeIndex.has(record.type)) {
      this.typeIndex.set(record.type, []);
    }

    this.typeIndex.get(record.type).push(record);

    if (record.documentId) {
      if (!this.documentIndex.has(record.documentId)) {
        this.documentIndex.set(record.documentId, []);
      }

      this.documentIndex.get(record.documentId).push(record);
    }

    if (record.key) {
      const normalizedKey = normalizeString(record.key);

      if (!this.keyIndex.has(normalizedKey)) {
        this.keyIndex.set(normalizedKey, []);
      }

      this.keyIndex.get(normalizedKey).push(record);
    }
  }

  get(id) {
    return this.index.get(id) || null;
  }

  getAll() {
    return [...this.records];
  }

  getActive() {
    return this.records.filter((record) => record.isActive());
  }

  getByType(type) {
    const normalizedType = normalizeEvidenceType(type);

    return [...(this.typeIndex.get(normalizedType) || [])];
  }

  getByDocument(documentId) {
    if (!documentId) {
      return [];
    }

    return [...(this.documentIndex.get(documentId) || [])];
  }

  getByKey(key) {
    const normalizedKey = normalizeString(key);

    if (!normalizedKey) {
      return [];
    }

    return [...(this.keyIndex.get(normalizedKey) || [])];
  }

  has(id) {
    return this.index.has(id);
  }

  remove(id) {
    const record = this.index.get(id);

    if (!record) {
      return false;
    }

    this.records = this.records.filter((item) => item.id !== id);

    this.rebuildIndexes();

    return true;
  }

  removeByDocument(documentId) {
    if (!documentId) {
      return 0;
    }

    const originalCount = this.records.length;

    this.records = this.records.filter(
      (record) => record.documentId !== documentId,
    );

    const removedCount = originalCount - this.records.length;

    if (removedCount > 0) {
      this.rebuildIndexes();
    }

    return removedCount;
  }

  rebuildIndexes() {
    this.index.clear();
    this.typeIndex.clear();
    this.documentIndex.clear();
    this.keyIndex.clear();

    for (const record of this.records) {
      this.indexRecord(record);
    }

    return this;
  }

  clear() {
    this.records = [];

    this.index.clear();

    this.typeIndex.clear();

    this.documentIndex.clear();

    this.keyIndex.clear();

    return this;
  }

  count() {
    return this.records.length;
  }

  toJSON() {
    return this.records.map((record) => record.toJSON());
  }
}

/* ==========================================================
   Public API

   Important:
   Do not recursively freeze this export object.

   EvidenceRecord and EvidenceCollection must remain usable
   as normal classes, and future engine parts may add static
   helpers or extend behavior safely.
========================================================== */

const EVIDENCE_ENGINE_API = {
  ENGINE_VERSION,

  EVIDENCE_TYPES,

  EVIDENCE_STATUS,

  CONFIDENCE_SOURCE,

  EvidenceRecord,

  EvidenceCollection,

  calculateConfidence,

  normalizeString,

  normalizeEvidenceType,

  normalizeEvidenceStatus,

  normalizeConfidenceSource,

  normalizeTimestamp,

  clone,

  clamp,
};
/* ==========================================================
   Evidence Comparison Utilities
========================================================== */

const RECONCILIATION_ACTIONS = Object.freeze({
  ADDED: "added",
  DUPLICATE: "duplicate",
  MERGED: "merged",
  CONFLICT: "conflict",
  SUPERSEDED: "superseded",
  REJECTED: "rejected",
  UNCHANGED: "unchanged",
});

const CONFLICT_TYPES = Object.freeze({
  VALUE_MISMATCH: "value_mismatch",
  DATE_MISMATCH: "date_mismatch",
  MONEY_MISMATCH: "money_mismatch",
  STATUS_MISMATCH: "status_mismatch",
  PARTY_MISMATCH: "party_mismatch",
  SOURCE_MISMATCH: "source_mismatch",
  OTHER: "other",
});

const SOURCE_WEIGHTS = Object.freeze({
  [CONFIDENCE_SOURCE.HUMAN]: 1.0,
  [CONFIDENCE_SOURCE.SYSTEM]: 0.95,
  [CONFIDENCE_SOURCE.GPT]: 0.9,
  [CONFIDENCE_SOURCE.IMPORTED]: 0.85,
  [CONFIDENCE_SOURCE.OCR]: 0.75,
});

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function normalizeKey(value) {
  return normalizeString(value)
    .replace(/[^\w.\-:/ ]+/g, "")
    .replace(/\s+/g, ".")
    .replace(/\.+/g, ".")
    .replace(/^\.+|\.+$/g, "");
}

function normalizeComparableValue(value) {
  if (value === undefined || value === null) {
    return "";
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "";
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeComparableValue(item))
      .sort()
      .join("|");
  }

  if (isPlainObject(value)) {
    const normalizedObject = {};

    Object.keys(value)
      .sort()
      .forEach((key) => {
        normalizedObject[key] = normalizeComparableValue(value[key]);
      });

    return JSON.stringify(normalizedObject);
  }

  return normalizeString(value)
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function parseDateValue(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : new Date(value.getTime());
  }

  if (typeof value === "number") {
    const numericDate = new Date(value);

    return Number.isNaN(numericDate.getTime()) ? null : numericDate;
  }

  const text = String(value).trim();

  if (!text) {
    return null;
  }

  const directDate = new Date(text);

  if (!Number.isNaN(directDate.getTime())) {
    return directDate;
  }

  const numericMatch = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2}|\d{4})$/);

  if (!numericMatch) {
    return null;
  }

  let year = Number(numericMatch[3]);

  if (year < 100) {
    year += year >= 70 ? 1900 : 2000;
  }

  const month = Number(numericMatch[1]);
  const day = Number(numericMatch[2]);

  const parsedDate = new Date(Date.UTC(year, month - 1, day));

  if (
    parsedDate.getUTCFullYear() !== year ||
    parsedDate.getUTCMonth() !== month - 1 ||
    parsedDate.getUTCDate() !== day
  ) {
    return null;
  }

  return parsedDate;
}

function normalizeDateValue(value) {
  const parsedDate = parseDateValue(value);

  if (!parsedDate) {
    return "";
  }

  return parsedDate.toISOString().slice(0, 10);
}

function parseMoneyValue(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const text = String(value)
    .trim()
    .replace(/\(([^)]+)\)/g, "-$1")
    .replace(/[$,\s]/g, "");

  if (!text) {
    return null;
  }

  const number = Number(text);

  return Number.isFinite(number) ? number : null;
}

function normalizeMoneyValue(value) {
  const amount = parseMoneyValue(value);

  if (amount === null) {
    return "";
  }

  return amount.toFixed(2);
}

function valuesAreEqual(firstValue, secondValue, type = EVIDENCE_TYPES.FACT) {
  const normalizedType = normalizeEvidenceType(type);

  if (
    normalizedType === EVIDENCE_TYPES.DATE ||
    normalizedType === EVIDENCE_TYPES.DEADLINE
  ) {
    const firstDate = normalizeDateValue(firstValue);
    const secondDate = normalizeDateValue(secondValue);

    return Boolean(firstDate && secondDate && firstDate === secondDate);
  }

  if (normalizedType === EVIDENCE_TYPES.MONEY) {
    const firstAmount = parseMoneyValue(firstValue);
    const secondAmount = parseMoneyValue(secondValue);

    if (firstAmount === null || secondAmount === null) {
      return false;
    }

    return Math.abs(firstAmount - secondAmount) < 0.01;
  }

  return (
    normalizeComparableValue(firstValue) ===
    normalizeComparableValue(secondValue)
  );
}

function evidenceKeysMatch(firstRecord, secondRecord) {
  if (!firstRecord || !secondRecord) {
    return false;
  }

  const firstKey = normalizeKey(firstRecord.key);
  const secondKey = normalizeKey(secondRecord.key);

  if (!firstKey || !secondKey) {
    return false;
  }

  return firstKey === secondKey;
}

function evidenceTypesMatch(firstRecord, secondRecord) {
  if (!firstRecord || !secondRecord) {
    return false;
  }

  return (
    normalizeEvidenceType(firstRecord.type) ===
    normalizeEvidenceType(secondRecord.type)
  );
}

function evidenceValuesMatch(firstRecord, secondRecord) {
  if (!firstRecord || !secondRecord) {
    return false;
  }

  if (!evidenceTypesMatch(firstRecord, secondRecord)) {
    return false;
  }

  return valuesAreEqual(
    firstRecord.value,
    secondRecord.value,
    firstRecord.type,
  );
}

function evidenceSourcesMatch(firstRecord, secondRecord) {
  if (!firstRecord || !secondRecord) {
    return false;
  }

  const firstDocumentId = firstRecord.documentId || "";

  const secondDocumentId = secondRecord.documentId || "";

  const firstPage = normalizePageNumber(firstRecord.page);

  const secondPage = normalizePageNumber(secondRecord.page);

  return firstDocumentId === secondDocumentId && firstPage === secondPage;
}

function buildEvidenceFingerprint(record = {}) {
  const type = normalizeEvidenceType(record.type);
  const key = normalizeKey(record.key);

  let value;

  if (type === EVIDENCE_TYPES.DATE || type === EVIDENCE_TYPES.DEADLINE) {
    value = normalizeDateValue(record.value);
  } else if (type === EVIDENCE_TYPES.MONEY) {
    value = normalizeMoneyValue(record.value);
  } else {
    value = normalizeComparableValue(record.value);
  }

  return [type, key, value].join("::");
}

function buildSourceFingerprint(record = {}) {
  return [
    record.documentId || "",
    normalizePageNumber(record.page) || "",
    normalizeString(record.documentType),
    normalizeString(record.extractedBy),
  ].join("::");
}

function recordsAreExactDuplicates(firstRecord, secondRecord) {
  if (!firstRecord || !secondRecord) {
    return false;
  }

  return (
    buildEvidenceFingerprint(firstRecord) ===
      buildEvidenceFingerprint(secondRecord) &&
    buildSourceFingerprint(firstRecord) === buildSourceFingerprint(secondRecord)
  );
}

function recordsAreSemanticDuplicates(firstRecord, secondRecord) {
  if (!firstRecord || !secondRecord) {
    return false;
  }

  return (
    evidenceTypesMatch(firstRecord, secondRecord) &&
    evidenceKeysMatch(firstRecord, secondRecord) &&
    evidenceValuesMatch(firstRecord, secondRecord)
  );
}

/* ==========================================================
   Source and Evidence Weighting
========================================================== */

function getSourceWeight(source) {
  const normalizedSource = normalizeConfidenceSource(source);

  return (
    SOURCE_WEIGHTS[normalizedSource] ?? SOURCE_WEIGHTS[CONFIDENCE_SOURCE.SYSTEM]
  );
}

function calculateEvidenceStrength(record = {}) {
  const confidence = clamp(record.confidence, 0, 100);

  const sourceConfidence = clamp(record.sourceConfidence ?? confidence, 0, 100);

  const sourceWeight = getSourceWeight(record.extractedBy);

  let strength =
    confidence * 0.55 + sourceConfidence * 0.35 + sourceWeight * 100 * 0.1;

  if (record.status === EVIDENCE_STATUS.REJECTED) {
    strength = 0;
  }

  if (record.status === EVIDENCE_STATUS.SUPERSEDED) {
    strength *= 0.25;
  }

  if (record.status === EVIDENCE_STATUS.CONFLICTED) {
    strength *= 0.75;
  }

  if (record.documentId) {
    strength += 1;
  }

  if (record.page !== null) {
    strength += 1;
  }

  if (Array.isArray(record.reasoning) && record.reasoning.length > 0) {
    strength += Math.min(record.reasoning.length, 3);
  }

  return clamp(strength, 0, 100);
}

function compareEvidenceStrength(firstRecord, secondRecord) {
  const firstStrength = calculateEvidenceStrength(firstRecord);

  const secondStrength = calculateEvidenceStrength(secondRecord);

  if (firstStrength > secondStrength) {
    return -1;
  }

  if (firstStrength < secondStrength) {
    return 1;
  }

  const firstUpdatedAt = new Date(
    firstRecord.updatedAt || firstRecord.createdAt || 0,
  ).getTime();

  const secondUpdatedAt = new Date(
    secondRecord.updatedAt || secondRecord.createdAt || 0,
  ).getTime();

  if (firstUpdatedAt > secondUpdatedAt) {
    return -1;
  }

  if (firstUpdatedAt < secondUpdatedAt) {
    return 1;
  }

  return String(firstRecord.id).localeCompare(String(secondRecord.id));
}

/* ==========================================================
   Conflict Detection
========================================================== */

function determineConflictType(firstRecord, secondRecord) {
  const type = normalizeEvidenceType(firstRecord?.type);

  if (type === EVIDENCE_TYPES.DATE || type === EVIDENCE_TYPES.DEADLINE) {
    return CONFLICT_TYPES.DATE_MISMATCH;
  }

  if (type === EVIDENCE_TYPES.MONEY) {
    return CONFLICT_TYPES.MONEY_MISMATCH;
  }

  if (type === EVIDENCE_TYPES.STATUS) {
    return CONFLICT_TYPES.STATUS_MISMATCH;
  }

  if (type === EVIDENCE_TYPES.PARTY) {
    return CONFLICT_TYPES.PARTY_MISMATCH;
  }

  return CONFLICT_TYPES.VALUE_MISMATCH;
}

function recordsConflict(firstRecord, secondRecord) {
  if (!firstRecord || !secondRecord) {
    return false;
  }

  if (!evidenceTypesMatch(firstRecord, secondRecord)) {
    return false;
  }

  if (!evidenceKeysMatch(firstRecord, secondRecord)) {
    return false;
  }

  if (evidenceValuesMatch(firstRecord, secondRecord)) {
    return false;
  }

  if (
    firstRecord.status === EVIDENCE_STATUS.REJECTED ||
    secondRecord.status === EVIDENCE_STATUS.REJECTED
  ) {
    return false;
  }

  return true;
}

/* ==========================================================
   Evidence Merge Utilities
========================================================== */

function mergeUniqueStrings(firstValues = [], secondValues = []) {
  const combined = [
    ...(Array.isArray(firstValues) ? firstValues : []),
    ...(Array.isArray(secondValues) ? secondValues : []),
  ];

  const seen = new Set();

  return combined
    .map((item) => String(item).trim())
    .filter(Boolean)
    .filter((item) => {
      const normalizedItem = normalizeString(item);

      if (seen.has(normalizedItem)) {
        return false;
      }

      seen.add(normalizedItem);
      return true;
    });
}

function mergeMetadata(firstMetadata = {}, secondMetadata = {}) {
  const first = isPlainObject(firstMetadata) ? clone(firstMetadata) : {};

  const second = isPlainObject(secondMetadata) ? clone(secondMetadata) : {};

  const merged = {
    ...first,
    ...second,
  };

  const sourceIds = mergeUniqueStrings(first.sourceIds, second.sourceIds);

  if (sourceIds.length > 0) {
    merged.sourceIds = sourceIds;
  }

  const documentIds = mergeUniqueStrings(first.documentIds, second.documentIds);

  if (documentIds.length > 0) {
    merged.documentIds = documentIds;
  }

  return merged;
}

function combineConfidence(firstConfidence, secondConfidence) {
  const first = clamp(firstConfidence, 0, 100) / 100;
  const second = clamp(secondConfidence, 0, 100) / 100;

  const combined = 1 - (1 - first) * (1 - second);

  return clamp(Math.round(combined * 100), 0, 100);
}

function mergeEvidenceRecords(targetRecord, incomingRecord) {
  if (!(targetRecord instanceof EvidenceRecord)) {
    throw new TypeError("targetRecord must be an EvidenceRecord.");
  }

  const incoming =
    incomingRecord instanceof EvidenceRecord
      ? incomingRecord
      : new EvidenceRecord(incomingRecord);

  const mergedMetadata = mergeMetadata(
    targetRecord.metadata,
    incoming.metadata,
  );

  mergedMetadata.sourceIds = mergeUniqueStrings(mergedMetadata.sourceIds, [
    targetRecord.id,
    incoming.id,
  ]);

  mergedMetadata.documentIds = mergeUniqueStrings(
    mergedMetadata.documentIds,
    [targetRecord.documentId, incoming.documentId].filter(Boolean),
  );

  const mergedReasoning = mergeUniqueStrings(
    targetRecord.reasoning,
    incoming.reasoning,
  );

  const strongerRecord =
    compareEvidenceStrength(targetRecord, incoming) <= 0
      ? targetRecord
      : incoming;

  targetRecord.update({
    value: clone(strongerRecord.value),

    normalizedValue: strongerRecord.normalizedValue,

    confidence: combineConfidence(targetRecord.confidence, incoming.confidence),

    sourceConfidence: combineConfidence(
      targetRecord.sourceConfidence,
      incoming.sourceConfidence,
    ),

    documentId:
      strongerRecord.documentId ||
      targetRecord.documentId ||
      incoming.documentId,

    documentName:
      strongerRecord.documentName ||
      targetRecord.documentName ||
      incoming.documentName,

    documentType:
      strongerRecord.documentType ||
      targetRecord.documentType ||
      incoming.documentType,

    page: strongerRecord.page || targetRecord.page || incoming.page,

    boundingBox:
      strongerRecord.boundingBox ||
      targetRecord.boundingBox ||
      incoming.boundingBox,

    extractedBy: strongerRecord.extractedBy,

    reasoning: mergedReasoning,

    metadata: mergedMetadata,

    status: EVIDENCE_STATUS.ACTIVE,
  });

  targetRecord.addReasoning(
    `Merged corroborating evidence record ${incoming.id}.`,
  );

  return targetRecord;
}

/* ==========================================================
   Reconciliation Result
========================================================== */

class ReconciliationResult {
  constructor(data = {}) {
    this.action = data.action || RECONCILIATION_ACTIONS.UNCHANGED;

    this.recordId = data.recordId || null;

    this.incomingRecordId = data.incomingRecordId || null;

    this.canonicalRecordId = data.canonicalRecordId || null;

    this.conflictingRecordIds = Array.isArray(data.conflictingRecordIds)
      ? [...data.conflictingRecordIds]
      : [];

    this.conflictType = data.conflictType || null;

    this.reason = data.reason || "";

    this.timestamp = data.timestamp || new Date().toISOString();

    this.metadata = isPlainObject(data.metadata) ? clone(data.metadata) : {};
  }

  toJSON() {
    return {
      action: this.action,
      recordId: this.recordId,
      incomingRecordId: this.incomingRecordId,
      canonicalRecordId: this.canonicalRecordId,
      conflictingRecordIds: [...this.conflictingRecordIds],
      conflictType: this.conflictType,
      reason: this.reason,
      timestamp: this.timestamp,
      metadata: clone(this.metadata),
    };
  }
}

/* ==========================================================
   Evidence Reconciliation Engine
========================================================== */

class EvidenceReconciliationEngine {
  constructor(collection = null, options = {}) {
    this.collection =
      collection instanceof EvidenceCollection
        ? collection
        : new EvidenceCollection();

    this.options = {
      mergeDuplicates: options.mergeDuplicates !== false,

      markConflicts: options.markConflicts !== false,

      supersedeWeakerEvidence: options.supersedeWeakerEvidence === true,

      rejectBelowConfidence: Number.isFinite(
        Number(options.rejectBelowConfidence),
      )
        ? clamp(options.rejectBelowConfidence, 0, 100)
        : 0,

      conflictStrengthDifference: Number.isFinite(
        Number(options.conflictStrengthDifference),
      )
        ? clamp(options.conflictStrengthDifference, 0, 100)
        : 20,
    };

    this.history = [];
  }

  addHistory(result) {
    const reconciliationResult =
      result instanceof ReconciliationResult
        ? result
        : new ReconciliationResult(result);

    this.history.push(reconciliationResult);

    return reconciliationResult;
  }

  findExactDuplicate(incomingRecord) {
    return (
      this.collection
        .getAll()
        .find((existingRecord) =>
          recordsAreExactDuplicates(existingRecord, incomingRecord),
        ) || null
    );
  }

  findSemanticDuplicates(incomingRecord) {
    return this.collection
      .getByKey(incomingRecord.key)
      .filter(
        (existingRecord) =>
          existingRecord.id !== incomingRecord.id &&
          recordsAreSemanticDuplicates(existingRecord, incomingRecord),
      );
  }

  findConflicts(incomingRecord) {
    return this.collection
      .getByKey(incomingRecord.key)
      .filter(
        (existingRecord) =>
          existingRecord.id !== incomingRecord.id &&
          recordsConflict(existingRecord, incomingRecord),
      );
  }

  chooseCanonical(records = []) {
    const validRecords = records.filter(
      (record) =>
        record instanceof EvidenceRecord &&
        record.status !== EVIDENCE_STATUS.REJECTED,
    );

    if (validRecords.length === 0) {
      return null;
    }

    return [...validRecords].sort(compareEvidenceStrength)[0];
  }

  reconcile(record) {
    const incomingRecord =
      record instanceof EvidenceRecord ? record : new EvidenceRecord(record);

    if (incomingRecord.confidence < this.options.rejectBelowConfidence) {
      incomingRecord.setStatus(EVIDENCE_STATUS.REJECTED);

      incomingRecord.addReasoning(
        `Evidence confidence ${incomingRecord.confidence} was below the minimum threshold of ${this.options.rejectBelowConfidence}.`,
      );

      this.collection.add(incomingRecord);

      return this.addHistory({
        action: RECONCILIATION_ACTIONS.REJECTED,

        recordId: incomingRecord.id,

        incomingRecordId: incomingRecord.id,

        reason:
          "Incoming evidence was below the configured confidence threshold.",
      });
    }

    const exactDuplicate = this.findExactDuplicate(incomingRecord);

    if (exactDuplicate) {
      if (this.options.mergeDuplicates) {
        mergeEvidenceRecords(exactDuplicate, incomingRecord);

        this.collection.rebuildIndexes();

        return this.addHistory({
          action: RECONCILIATION_ACTIONS.MERGED,

          recordId: exactDuplicate.id,

          incomingRecordId: incomingRecord.id,

          canonicalRecordId: exactDuplicate.id,

          reason:
            "Exact duplicate evidence was merged into the existing record.",
        });
      }

      return this.addHistory({
        action: RECONCILIATION_ACTIONS.DUPLICATE,

        recordId: exactDuplicate.id,

        incomingRecordId: incomingRecord.id,

        canonicalRecordId: exactDuplicate.id,

        reason: "Exact duplicate evidence already exists.",
      });
    }

    const semanticDuplicates = this.findSemanticDuplicates(incomingRecord);

    if (semanticDuplicates.length > 0 && this.options.mergeDuplicates) {
      const canonicalRecord = this.chooseCanonical([
        ...semanticDuplicates,
        incomingRecord,
      ]);

      if (canonicalRecord && canonicalRecord.id !== incomingRecord.id) {
        mergeEvidenceRecords(canonicalRecord, incomingRecord);

        semanticDuplicates
          .filter((recordItem) => recordItem.id !== canonicalRecord.id)
          .forEach((duplicateRecord) => {
            mergeEvidenceRecords(canonicalRecord, duplicateRecord);

            duplicateRecord.setStatus(EVIDENCE_STATUS.SUPERSEDED);

            duplicateRecord.addReasoning(
              `Superseded by canonical evidence record ${canonicalRecord.id}.`,
            );
          });

        this.collection.rebuildIndexes();

        return this.addHistory({
          action: RECONCILIATION_ACTIONS.MERGED,

          recordId: canonicalRecord.id,

          incomingRecordId: incomingRecord.id,

          canonicalRecordId: canonicalRecord.id,

          reason: "Matching evidence from multiple sources was merged.",
        });
      }

      if (canonicalRecord && canonicalRecord.id === incomingRecord.id) {
        this.collection.add(incomingRecord);

        semanticDuplicates.forEach((duplicateRecord) => {
          mergeEvidenceRecords(incomingRecord, duplicateRecord);

          duplicateRecord.setStatus(EVIDENCE_STATUS.SUPERSEDED);

          duplicateRecord.addReasoning(
            `Superseded by stronger evidence record ${incomingRecord.id}.`,
          );
        });

        this.collection.rebuildIndexes();

        return this.addHistory({
          action: RECONCILIATION_ACTIONS.MERGED,

          recordId: incomingRecord.id,

          incomingRecordId: incomingRecord.id,

          canonicalRecordId: incomingRecord.id,

          reason: "Incoming evidence became the canonical merged record.",
        });
      }
    }

    const conflicts = this.findConflicts(incomingRecord);

    if (conflicts.length > 0 && this.options.markConflicts) {
      this.collection.add(incomingRecord);

      const conflictSet = [incomingRecord, ...conflicts];

      const canonicalRecord = this.chooseCanonical(conflictSet);

      conflictSet.forEach((conflictRecord) => {
        if (conflictRecord.id === canonicalRecord?.id) {
          conflictRecord.setStatus(EVIDENCE_STATUS.ACTIVE);

          conflictRecord.addReasoning(
            `Selected as the strongest current evidence among ${conflictSet.length} conflicting records.`,
          );

          return;
        }

        const strengthDifference = canonicalRecord
          ? calculateEvidenceStrength(canonicalRecord) -
            calculateEvidenceStrength(conflictRecord)
          : 0;

        if (
          this.options.supersedeWeakerEvidence &&
          strengthDifference >= this.options.conflictStrengthDifference
        ) {
          conflictRecord.setStatus(EVIDENCE_STATUS.SUPERSEDED);

          conflictRecord.addReasoning(
            `Superseded by stronger conflicting evidence record ${canonicalRecord.id}.`,
          );
        } else {
          conflictRecord.setStatus(EVIDENCE_STATUS.CONFLICTED);

          conflictRecord.addReasoning(
            `Conflicts with evidence record ${canonicalRecord?.id || incomingRecord.id}.`,
          );
        }
      });

      this.collection.rebuildIndexes();

      return this.addHistory({
        action: RECONCILIATION_ACTIONS.CONFLICT,

        recordId: incomingRecord.id,

        incomingRecordId: incomingRecord.id,

        canonicalRecordId: canonicalRecord?.id || null,

        conflictingRecordIds: conflictSet
          .filter((conflictRecord) => conflictRecord.id !== canonicalRecord?.id)
          .map((conflictRecord) => conflictRecord.id),

        conflictType: determineConflictType(incomingRecord, conflicts[0]),

        reason: "Evidence with the same key contains conflicting values.",
      });
    }

    this.collection.add(incomingRecord);

    return this.addHistory({
      action: RECONCILIATION_ACTIONS.ADDED,

      recordId: incomingRecord.id,

      incomingRecordId: incomingRecord.id,

      canonicalRecordId: incomingRecord.id,

      reason: "Evidence was added as a new record.",
    });
  }

  reconcileMany(records = []) {
    if (!Array.isArray(records)) {
      return [];
    }

    return records.map((record) => this.reconcile(record));
  }

  reconcileCollection() {
    const originalRecords = this.collection.getAll();

    this.collection.clear();

    const results = originalRecords.map((record) => this.reconcile(record));

    return results;
  }

  getCanonicalEvidence(key) {
    const records = this.collection.getByKey(key);

    return this.chooseCanonical(records);
  }

  getConflicts(key = null) {
    const records = key
      ? this.collection.getByKey(key)
      : this.collection.getAll();

    return records.filter(
      (record) => record.status === EVIDENCE_STATUS.CONFLICTED,
    );
  }

  getHistory() {
    return this.history.map((result) => result.toJSON());
  }

  clearHistory() {
    this.history = [];

    return this;
  }
}

/* ==========================================================
   Evidence Query Helpers
========================================================== */

function filterEvidence(records = [], criteria = {}) {
  if (!Array.isArray(records)) {
    return [];
  }

  return records.filter((record) => {
    if (!record) {
      return false;
    }

    if (criteria.id && record.id !== criteria.id) {
      return false;
    }

    if (
      criteria.type &&
      normalizeEvidenceType(record.type) !==
        normalizeEvidenceType(criteria.type)
    ) {
      return false;
    }

    if (
      criteria.key &&
      normalizeKey(record.key) !== normalizeKey(criteria.key)
    ) {
      return false;
    }

    if (
      criteria.status &&
      normalizeEvidenceStatus(record.status) !==
        normalizeEvidenceStatus(criteria.status)
    ) {
      return false;
    }

    if (criteria.documentId && record.documentId !== criteria.documentId) {
      return false;
    }

    if (
      criteria.extractedBy &&
      normalizeConfidenceSource(record.extractedBy) !==
        normalizeConfidenceSource(criteria.extractedBy)
    ) {
      return false;
    }

    if (
      criteria.minimumConfidence !== undefined &&
      record.confidence < clamp(criteria.minimumConfidence, 0, 100)
    ) {
      return false;
    }

    if (
      criteria.activeOnly === true &&
      record.status !== EVIDENCE_STATUS.ACTIVE
    ) {
      return false;
    }

    if (
      criteria.value !== undefined &&
      !valuesAreEqual(record.value, criteria.value, record.type)
    ) {
      return false;
    }

    return true;
  });
}

function groupEvidenceByKey(records = []) {
  const groups = new Map();

  if (!Array.isArray(records)) {
    return groups;
  }

  records.forEach((record) => {
    const key = normalizeKey(record?.key);

    if (!key) {
      return;
    }

    if (!groups.has(key)) {
      groups.set(key, []);
    }

    groups.get(key).push(record);
  });

  return groups;
}

function selectCanonicalEvidence(records = []) {
  if (!Array.isArray(records)) {
    return null;
  }

  const eligibleRecords = records.filter(
    (record) =>
      record &&
      record.status !== EVIDENCE_STATUS.REJECTED &&
      record.status !== EVIDENCE_STATUS.SUPERSEDED,
  );

  if (eligibleRecords.length === 0) {
    return null;
  }

  return [...eligibleRecords].sort(compareEvidenceStrength)[0];
}

function buildCanonicalEvidenceMap(records = []) {
  const groups = groupEvidenceByKey(records);
  const canonicalMap = {};

  groups.forEach((groupRecords, key) => {
    const canonicalRecord = selectCanonicalEvidence(groupRecords);

    if (canonicalRecord) {
      canonicalMap[key] = canonicalRecord.toJSON
        ? canonicalRecord.toJSON()
        : clone(canonicalRecord);
    }
  });

  return canonicalMap;
}

/* ==========================================================
   Part 2 Public API
========================================================== */

Object.assign(EVIDENCE_ENGINE_API, {
  RECONCILIATION_ACTIONS,

  CONFLICT_TYPES,

  SOURCE_WEIGHTS,

  ReconciliationResult,

  EvidenceReconciliationEngine,

  normalizeKey,

  normalizeComparableValue,

  parseDateValue,

  normalizeDateValue,

  parseMoneyValue,

  normalizeMoneyValue,

  valuesAreEqual,

  evidenceKeysMatch,

  evidenceTypesMatch,

  evidenceValuesMatch,

  evidenceSourcesMatch,

  buildEvidenceFingerprint,

  buildSourceFingerprint,

  recordsAreExactDuplicates,

  recordsAreSemanticDuplicates,

  recordsConflict,

  determineConflictType,

  getSourceWeight,

  calculateEvidenceStrength,

  compareEvidenceStrength,

  combineConfidence,

  mergeMetadata,

  mergeEvidenceRecords,

  filterEvidence,

  groupEvidenceByKey,

  selectCanonicalEvidence,

  buildCanonicalEvidenceMap,
});

/* ==========================================================
   Evidence Authority Levels
========================================================== */

const AUTHORITY_LEVELS = Object.freeze({
  USER_CONFIRMED: 100,
  FULLY_EXECUTED_DOCUMENT: 95,
  RECORDED_DOCUMENT: 94,
  SETTLEMENT_DOCUMENT: 92,
  SIGNED_AMENDMENT: 90,
  SIGNED_CONTRACT: 88,
  SIGNED_DISCLOSURE: 85,
  OFFICIAL_CORRESPONDENCE: 78,
  UNSIGNED_DOCUMENT: 65,
  AI_INTERPRETATION: 55,
  OCR_ONLY: 40,
  INFERRED: 25,
  UNKNOWN: 10,
});

const DOCUMENT_AUTHORITY_TYPES = Object.freeze({
  USER_CONFIRMED: "user_confirmed",
  FULLY_EXECUTED_DOCUMENT: "fully_executed_document",
  RECORDED_DOCUMENT: "recorded_document",
  SETTLEMENT_DOCUMENT: "settlement_document",
  SIGNED_AMENDMENT: "signed_amendment",
  SIGNED_CONTRACT: "signed_contract",
  SIGNED_DISCLOSURE: "signed_disclosure",
  OFFICIAL_CORRESPONDENCE: "official_correspondence",
  UNSIGNED_DOCUMENT: "unsigned_document",
  AI_INTERPRETATION: "ai_interpretation",
  OCR_ONLY: "ocr_only",
  INFERRED: "inferred",
  UNKNOWN: "unknown",
});

/* ==========================================================
   Evidence Relationship Types
========================================================== */

const EVIDENCE_RELATIONSHIP_TYPES = Object.freeze({
  SUPPORTS: "supports",
  CONTRADICTS: "contradicts",
  SUPERSEDES: "supersedes",
  AMENDS: "amends",
  REPLACES: "replaces",
  CONFIRMS: "confirms",
  DERIVED_FROM: "derived_from",
  DUPLICATES: "duplicates",
  REFERENCES: "references",
  DEPENDS_ON: "depends_on",
});

/* ==========================================================
   Evidence Decision Types
========================================================== */

const EVIDENCE_DECISION_TYPES = Object.freeze({
  ACCEPTED: "accepted",
  REJECTED: "rejected",
  SUPERSEDED: "superseded",
  CONFLICTED: "conflicted",
  CONFIRMED: "confirmed",
  INFERRED: "inferred",
  UNRESOLVED: "unresolved",
});

/* ==========================================================
   Authority Utilities
========================================================== */

function normalizeAuthorityType(value) {
  const normalizedValue = normalizeString(value);

  const validTypes = Object.values(DOCUMENT_AUTHORITY_TYPES);

  return validTypes.includes(normalizedValue)
    ? normalizedValue
    : DOCUMENT_AUTHORITY_TYPES.UNKNOWN;
}

function getAuthorityLevel(authorityType) {
  const normalizedType = normalizeAuthorityType(authorityType);

  const authorityMap = {
    [DOCUMENT_AUTHORITY_TYPES.USER_CONFIRMED]: AUTHORITY_LEVELS.USER_CONFIRMED,

    [DOCUMENT_AUTHORITY_TYPES.FULLY_EXECUTED_DOCUMENT]:
      AUTHORITY_LEVELS.FULLY_EXECUTED_DOCUMENT,

    [DOCUMENT_AUTHORITY_TYPES.RECORDED_DOCUMENT]:
      AUTHORITY_LEVELS.RECORDED_DOCUMENT,

    [DOCUMENT_AUTHORITY_TYPES.SETTLEMENT_DOCUMENT]:
      AUTHORITY_LEVELS.SETTLEMENT_DOCUMENT,

    [DOCUMENT_AUTHORITY_TYPES.SIGNED_AMENDMENT]:
      AUTHORITY_LEVELS.SIGNED_AMENDMENT,

    [DOCUMENT_AUTHORITY_TYPES.SIGNED_CONTRACT]:
      AUTHORITY_LEVELS.SIGNED_CONTRACT,

    [DOCUMENT_AUTHORITY_TYPES.SIGNED_DISCLOSURE]:
      AUTHORITY_LEVELS.SIGNED_DISCLOSURE,

    [DOCUMENT_AUTHORITY_TYPES.OFFICIAL_CORRESPONDENCE]:
      AUTHORITY_LEVELS.OFFICIAL_CORRESPONDENCE,

    [DOCUMENT_AUTHORITY_TYPES.UNSIGNED_DOCUMENT]:
      AUTHORITY_LEVELS.UNSIGNED_DOCUMENT,

    [DOCUMENT_AUTHORITY_TYPES.AI_INTERPRETATION]:
      AUTHORITY_LEVELS.AI_INTERPRETATION,

    [DOCUMENT_AUTHORITY_TYPES.OCR_ONLY]: AUTHORITY_LEVELS.OCR_ONLY,

    [DOCUMENT_AUTHORITY_TYPES.INFERRED]: AUTHORITY_LEVELS.INFERRED,

    [DOCUMENT_AUTHORITY_TYPES.UNKNOWN]: AUTHORITY_LEVELS.UNKNOWN,
  };

  return authorityMap[normalizedType] ?? AUTHORITY_LEVELS.UNKNOWN;
}

function inferAuthorityType(record = {}) {
  if (
    record.metadata?.userConfirmed === true ||
    record.extractedBy === CONFIDENCE_SOURCE.HUMAN
  ) {
    return DOCUMENT_AUTHORITY_TYPES.USER_CONFIRMED;
  }

  const normalizedDocumentType = normalizeString(record.documentType);

  const metadata = isPlainObject(record.metadata) ? record.metadata : {};

  const executionStatus = normalizeString(
    metadata.executionStatus ||
      metadata.signatureStatus ||
      metadata.documentExecutionStatus,
  );

  const isFullyExecuted =
    metadata.fullyExecuted === true ||
    executionStatus === "fully executed" ||
    executionStatus === "fully_executed" ||
    executionStatus === "executed";

  const isSigned =
    metadata.signed === true ||
    metadata.hasSignatures === true ||
    isFullyExecuted;

  const isRecorded =
    metadata.recorded === true ||
    normalizedDocumentType.includes("recorded") ||
    normalizedDocumentType.includes("deed");

  if (isRecorded) {
    return DOCUMENT_AUTHORITY_TYPES.RECORDED_DOCUMENT;
  }

  if (
    normalizedDocumentType.includes("settlement") ||
    normalizedDocumentType.includes("closing disclosure") ||
    normalizedDocumentType.includes("hud-1") ||
    normalizedDocumentType.includes("hud 1") ||
    normalizedDocumentType.includes("alta")
  ) {
    return isSigned
      ? DOCUMENT_AUTHORITY_TYPES.SETTLEMENT_DOCUMENT
      : DOCUMENT_AUTHORITY_TYPES.UNSIGNED_DOCUMENT;
  }

  if (
    normalizedDocumentType.includes("amendment") ||
    normalizedDocumentType.includes("addendum")
  ) {
    return isSigned
      ? DOCUMENT_AUTHORITY_TYPES.SIGNED_AMENDMENT
      : DOCUMENT_AUTHORITY_TYPES.UNSIGNED_DOCUMENT;
  }

  if (
    normalizedDocumentType.includes("purchase agreement") ||
    normalizedDocumentType.includes("sales contract") ||
    normalizedDocumentType.includes("contract")
  ) {
    return isSigned
      ? DOCUMENT_AUTHORITY_TYPES.SIGNED_CONTRACT
      : DOCUMENT_AUTHORITY_TYPES.UNSIGNED_DOCUMENT;
  }

  if (normalizedDocumentType.includes("disclosure")) {
    return isSigned
      ? DOCUMENT_AUTHORITY_TYPES.SIGNED_DISCLOSURE
      : DOCUMENT_AUTHORITY_TYPES.UNSIGNED_DOCUMENT;
  }

  if (
    normalizedDocumentType.includes("email") ||
    normalizedDocumentType.includes("letter") ||
    normalizedDocumentType.includes("notice")
  ) {
    return DOCUMENT_AUTHORITY_TYPES.OFFICIAL_CORRESPONDENCE;
  }

  if (record.extractedBy === CONFIDENCE_SOURCE.OCR) {
    return DOCUMENT_AUTHORITY_TYPES.OCR_ONLY;
  }

  if (record.metadata?.inferred === true || record.metadata?.derived === true) {
    return DOCUMENT_AUTHORITY_TYPES.INFERRED;
  }

  if (
    record.extractedBy === CONFIDENCE_SOURCE.GPT ||
    record.extractedBy === CONFIDENCE_SOURCE.SYSTEM
  ) {
    return DOCUMENT_AUTHORITY_TYPES.AI_INTERPRETATION;
  }

  return DOCUMENT_AUTHORITY_TYPES.UNKNOWN;
}

function calculateAuthorityScore(record = {}) {
  const authorityType =
    record.metadata?.authorityType || inferAuthorityType(record);

  let score = getAuthorityLevel(authorityType);

  const metadata = isPlainObject(record.metadata) ? record.metadata : {};

  if (metadata.fullyExecuted === true) {
    score += 3;
  }

  if (metadata.allRequiredSignaturesPresent === true) {
    score += 2;
  }

  if (metadata.allRequiredInitialsPresent === true) {
    score += 1;
  }

  if (metadata.documentDateVerified === true) {
    score += 1;
  }

  if (metadata.userConfirmed === true) {
    score = AUTHORITY_LEVELS.USER_CONFIRMED;
  }

  if (metadata.inferred === true) {
    score = Math.min(score, AUTHORITY_LEVELS.INFERRED);
  }

  return clamp(score, 0, 100);
}

function calculateTrustedEvidenceScore(record = {}) {
  const evidenceStrength = calculateEvidenceStrength(record);

  const authorityScore = calculateAuthorityScore(record);

  const confidence = clamp(record.confidence, 0, 100);

  let trustedScore =
    evidenceStrength * 0.4 + authorityScore * 0.45 + confidence * 0.15;

  if (record.status === EVIDENCE_STATUS.REJECTED) {
    trustedScore = 0;
  }

  if (record.status === EVIDENCE_STATUS.SUPERSEDED) {
    trustedScore *= 0.2;
  }

  if (record.status === EVIDENCE_STATUS.CONFLICTED) {
    trustedScore *= 0.7;
  }

  return clamp(Math.round(trustedScore * 100) / 100, 0, 100);
}

function compareTrustedEvidence(firstRecord, secondRecord) {
  /*
   * Evidence precedence:
   *
   * 1. User-confirmed evidence
   * 2. Later executed amendments or change documents
   * 3. Executed original agreements
   * 4. Other trusted document evidence
   * 5. Extraction confidence and corroboration
   *
   * This logic relies on document meaning and legal effect,
   * not state-specific form titles or filenames.
   */

  const metadataFor = (record) =>
    record?.metadata &&
    typeof record.metadata === "object" &&
    !Array.isArray(record.metadata)
      ? record.metadata
      : {};

  const semanticTextFor = (record) => {
    const metadata = metadataFor(record);

    return normalizeString(
      [
        record?.documentType,
        record?.type,
        record?.key,
        metadata.documentFamily,
        metadata.documentPurpose,
        metadata.documentEffect,
        metadata.parentEvidenceType,
        metadata.originalFactKey,
        metadata.legalEffect,
        metadata.documentRole,
      ].join(" "),
    );
  };

  const isUserConfirmed = (record) => {
    const metadata = metadataFor(record);

    return (
      metadata.userConfirmed === true ||
      record?.extractedBy === CONFIDENCE_SOURCE.HUMAN
    );
  };

  const isAmendmentEvidence = (record) => {
    const semanticText = semanticTextFor(record);

    const amendmentTerms = [
      "amendment",
      "amended",
      "modifies",
      "modified",
      "modification",
      "changes",
      "changed",
      "change form",
      "status change",
      "price change",
      "updates",
      "updated",
      "revision",
      "revised",
      "corrects",
      "corrected",
      "extends",
      "extended",
      "replaces",
      "replacement",
      "supersedes",

      /*
       * Counter offers are change instruments.
       *
       * When accepted/executed, they can modify terms from the
       * original offer just like an amendment or addendum.
       */
      "counter offer",
      "counteroffer",
      "counter-offer",
      "counter proposal",
      "counterproposal",
    ];

    return amendmentTerms.some((term) =>
      semanticText.includes(normalizeString(term)),
    );
  };

  const isNewValueEvidence = (record) => {
    const metadata = metadataFor(record);

    const originalFactKey = normalizeString(
      metadata.originalFactKey || "",
    ).replace(/[^a-z0-9]/g, "");

    return (
      originalFactKey.startsWith("new") ||
      originalFactKey.startsWith("revised") ||
      originalFactKey.startsWith("updated") ||
      originalFactKey.startsWith("amended") ||
      originalFactKey.startsWith("changed")
    );
  };

  const hasExecutionSupport = (record) => {
    const metadata = metadataFor(record);

    return (
      metadata.fullyExecuted === true ||
      metadata.executed === true ||
      metadata.signed === true ||
      metadata.signaturesComplete === true ||
      metadata.allRequiredSignaturesPresent === true ||
      metadata.effective === true ||
      Number(record?.confidence || 0) >= 70
    );
  };

  const amendmentPriority = (record) => {
    if (!isAmendmentEvidence(record)) {
      return 0;
    }

    let score = 100;

    if (isNewValueEvidence(record)) {
      score += 25;
    }

    if (hasExecutionSupport(record)) {
      score += 20;
    }

    return score;
  };

  const evidenceDate = (record) => {
    const metadata = metadataFor(record);

    const candidates = [
      metadata.effectiveDate,
      metadata.executionDate,
      metadata.signedDate,
      metadata.documentDate,
      metadata.eventDate,
      record?.eventDate,
      record?.updatedAt,
      record?.createdAt,
    ];

    for (const candidate of candidates) {
      const parsedDate = parseDateValue(candidate);

      if (parsedDate) {
        return parsedDate.getTime();
      }
    }

    return 0;
  };

  /*
   * Explicit human confirmation always wins.
   */

  const firstUserConfirmed = isUserConfirmed(firstRecord);
  const secondUserConfirmed = isUserConfirmed(secondRecord);

  if (firstUserConfirmed !== secondUserConfirmed) {
    return firstUserConfirmed ? -1 : 1;
  }

  /*
   * A supported amendment or change document supersedes an
   * earlier agreement value for the same canonical fact.
   */

  const firstAmendmentPriority = amendmentPriority(firstRecord);
  const secondAmendmentPriority = amendmentPriority(secondRecord);

  if (firstAmendmentPriority !== secondAmendmentPriority) {
    return firstAmendmentPriority > secondAmendmentPriority ? -1 : 1;
  }

  /*
   * When both records are amendments, the later effective
   * amendment controls.
   */

  if (firstAmendmentPriority > 0 && secondAmendmentPriority > 0) {
    const firstDate = evidenceDate(firstRecord);
    const secondDate = evidenceDate(secondRecord);

    if (firstDate !== secondDate) {
      return firstDate > secondDate ? -1 : 1;
    }
  }

  /*
   * Fall back to the existing trusted-evidence calculation.
   */

  const firstScore = calculateTrustedEvidenceScore(firstRecord);
  const secondScore = calculateTrustedEvidenceScore(secondRecord);

  if (firstScore > secondScore) {
    return -1;
  }

  if (firstScore < secondScore) {
    return 1;
  }

  /*
   * For equally trusted evidence, prefer the later supported
   * document fact.
   */

  const firstDate = evidenceDate(firstRecord);
  const secondDate = evidenceDate(secondRecord);

  if (firstDate !== secondDate) {
    return firstDate > secondDate ? -1 : 1;
  }

  return compareEvidenceStrength(firstRecord, secondRecord);
}

/* ==========================================================
   Evidence Relationship
========================================================== */

class EvidenceRelationship {
  constructor(data = {}) {
    this.id =
      typeof data.id === "string" && data.id.trim()
        ? data.id.trim()
        : randomUUID();

    this.fromEvidenceId = data.fromEvidenceId || null;

    this.toEvidenceId = data.toEvidenceId || null;

    this.type = Object.values(EVIDENCE_RELATIONSHIP_TYPES).includes(
      normalizeString(data.type),
    )
      ? normalizeString(data.type)
      : EVIDENCE_RELATIONSHIP_TYPES.REFERENCES;

    this.confidence = clamp(data.confidence ?? 100, 0, 100);

    this.reason = typeof data.reason === "string" ? data.reason.trim() : "";

    this.createdAt = normalizeTimestamp(
      data.createdAt,
      new Date().toISOString(),
    );

    this.metadata = isPlainObject(data.metadata) ? clone(data.metadata) : {};
  }

  toJSON() {
    return {
      id: this.id,
      fromEvidenceId: this.fromEvidenceId,
      toEvidenceId: this.toEvidenceId,
      type: this.type,
      confidence: this.confidence,
      reason: this.reason,
      createdAt: this.createdAt,
      metadata: clone(this.metadata),
    };
  }
}

/* ==========================================================
   Evidence Decision
========================================================== */

class EvidenceDecision {
  constructor(data = {}) {
    this.id =
      typeof data.id === "string" && data.id.trim()
        ? data.id.trim()
        : randomUUID();

    this.key = typeof data.key === "string" ? data.key.trim() : "";

    this.decisionType = Object.values(EVIDENCE_DECISION_TYPES).includes(
      normalizeString(data.decisionType),
    )
      ? normalizeString(data.decisionType)
      : EVIDENCE_DECISION_TYPES.UNRESOLVED;

    this.canonicalEvidenceId = data.canonicalEvidenceId || null;

    this.consideredEvidenceIds = Array.isArray(data.consideredEvidenceIds)
      ? [...new Set(data.consideredEvidenceIds.filter(Boolean))]
      : [];

    this.rejectedEvidenceIds = Array.isArray(data.rejectedEvidenceIds)
      ? [...new Set(data.rejectedEvidenceIds.filter(Boolean))]
      : [];

    this.confidence = clamp(data.confidence, 0, 100);

    this.reasoning = Array.isArray(data.reasoning)
      ? data.reasoning.map((item) => String(item).trim()).filter(Boolean)
      : [];

    this.createdAt = normalizeTimestamp(
      data.createdAt,
      new Date().toISOString(),
    );

    this.updatedAt = normalizeTimestamp(data.updatedAt, this.createdAt);

    this.metadata = isPlainObject(data.metadata) ? clone(data.metadata) : {};
  }

  addReasoning(reason) {
    if (reason === undefined || reason === null) {
      return this;
    }

    const normalizedReason = String(reason).trim();

    if (normalizedReason && !this.reasoning.includes(normalizedReason)) {
      this.reasoning.push(normalizedReason);
      this.updatedAt = new Date().toISOString();
    }

    return this;
  }

  toJSON() {
    return {
      id: this.id,
      key: this.key,
      decisionType: this.decisionType,
      canonicalEvidenceId: this.canonicalEvidenceId,
      consideredEvidenceIds: [...this.consideredEvidenceIds],
      rejectedEvidenceIds: [...this.rejectedEvidenceIds],
      confidence: this.confidence,
      reasoning: [...this.reasoning],
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      metadata: clone(this.metadata),
    };
  }
}

/* ==========================================================
   Evidence Ledger
========================================================== */

class EvidenceLedger {
  constructor(data = {}) {
    this.collection =
      data.collection instanceof EvidenceCollection
        ? data.collection
        : new EvidenceCollection(
            Array.isArray(data.records) ? data.records : [],
          );

    this.relationships = new Map();

    this.decisions = new Map();

    this.transactionId = data.transactionId || null;

    this.createdAt = normalizeTimestamp(
      data.createdAt,
      new Date().toISOString(),
    );

    this.updatedAt = normalizeTimestamp(data.updatedAt, this.createdAt);

    if (Array.isArray(data.relationships)) {
      data.relationships.forEach((relationship) =>
        this.addRelationship(relationship),
      );
    }

    if (Array.isArray(data.decisions)) {
      data.decisions.forEach((decision) => this.addDecision(decision));
    }
  }

  addEvidence(record) {
    const addedRecord = this.collection.add(record);

    this.updatedAt = new Date().toISOString();

    return addedRecord;
  }

  addEvidenceMany(records = []) {
    const addedRecords = this.collection.addMany(records);

    if (addedRecords.length > 0) {
      this.updatedAt = new Date().toISOString();
    }

    return addedRecords;
  }

  removeEvidence(id) {
    const removed = this.collection.remove(id);

    if (!removed) {
      return false;
    }

    for (const [relationshipId, relationship] of this.relationships.entries()) {
      if (
        relationship.fromEvidenceId === id ||
        relationship.toEvidenceId === id
      ) {
        this.relationships.delete(relationshipId);
      }
    }

    for (const decision of this.decisions.values()) {
      decision.consideredEvidenceIds = decision.consideredEvidenceIds.filter(
        (evidenceId) => evidenceId !== id,
      );

      decision.rejectedEvidenceIds = decision.rejectedEvidenceIds.filter(
        (evidenceId) => evidenceId !== id,
      );

      if (decision.canonicalEvidenceId === id) {
        decision.canonicalEvidenceId = null;
        decision.decisionType = EVIDENCE_DECISION_TYPES.UNRESOLVED;

        decision.addReasoning(`Canonical evidence record ${id} was removed.`);
      }
    }

    this.updatedAt = new Date().toISOString();

    return true;
  }

  addRelationship(relationship) {
    const evidenceRelationship =
      relationship instanceof EvidenceRelationship
        ? relationship
        : new EvidenceRelationship(relationship);

    if (
      !evidenceRelationship.fromEvidenceId ||
      !evidenceRelationship.toEvidenceId
    ) {
      throw new Error(
        "Evidence relationships require both fromEvidenceId and toEvidenceId.",
      );
    }

    if (
      !this.collection.has(evidenceRelationship.fromEvidenceId) ||
      !this.collection.has(evidenceRelationship.toEvidenceId)
    ) {
      throw new Error(
        "Evidence relationship references an evidence record that does not exist.",
      );
    }

    this.relationships.set(evidenceRelationship.id, evidenceRelationship);

    this.updatedAt = new Date().toISOString();

    return evidenceRelationship;
  }

  getRelationshipsForEvidence(evidenceId) {
    return [...this.relationships.values()].filter(
      (relationship) =>
        relationship.fromEvidenceId === evidenceId ||
        relationship.toEvidenceId === evidenceId,
    );
  }

  getRelationshipsByType(type) {
    const normalizedType = normalizeString(type);

    return [...this.relationships.values()].filter(
      (relationship) => relationship.type === normalizedType,
    );
  }

  removeRelationship(id) {
    const removed = this.relationships.delete(id);

    if (removed) {
      this.updatedAt = new Date().toISOString();
    }

    return removed;
  }

  addDecision(decision) {
    const evidenceDecision =
      decision instanceof EvidenceDecision
        ? decision
        : new EvidenceDecision(decision);

    this.decisions.set(evidenceDecision.id, evidenceDecision);

    this.updatedAt = new Date().toISOString();

    return evidenceDecision;
  }

  getDecision(id) {
    return this.decisions.get(id) || null;
  }

  getDecisionsByKey(key) {
    const normalizedKey = normalizeKey(key);

    return [...this.decisions.values()].filter(
      (decision) => normalizeKey(decision.key) === normalizedKey,
    );
  }

  getLatestDecisionByKey(key) {
    const decisions = this.getDecisionsByKey(key);

    if (decisions.length === 0) {
      return null;
    }

    return [...decisions].sort(
      (firstDecision, secondDecision) =>
        new Date(
          secondDecision.updatedAt || secondDecision.createdAt,
        ).getTime() -
        new Date(firstDecision.updatedAt || firstDecision.createdAt).getTime(),
    )[0];
  }

  removeDecision(id) {
    const removed = this.decisions.delete(id);

    if (removed) {
      this.updatedAt = new Date().toISOString();
    }

    return removed;
  }

  getEvidence(id) {
    return this.collection.get(id);
  }

  getAllEvidence() {
    return this.collection.getAll();
  }

  getCanonicalEvidence(key) {
    const decision = this.getLatestDecisionByKey(key);

    if (decision?.canonicalEvidenceId) {
      const decisionRecord = this.collection.get(decision.canonicalEvidenceId);

      if (decisionRecord) {
        return decisionRecord;
      }
    }

    const records = this.collection.getByKey(key);

    return selectTrustedCanonicalEvidence(records);
  }

  toJSON() {
    return {
      transactionId: this.transactionId,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      records: this.collection.toJSON(),
      relationships: [...this.relationships.values()].map((relationship) =>
        relationship.toJSON(),
      ),
      decisions: [...this.decisions.values()].map((decision) =>
        decision.toJSON(),
      ),
    };
  }

  static fromJSON(data = {}) {
    return new EvidenceLedger(data);
  }
}

/* ==========================================================
   Trusted Canonical Selection
========================================================== */

function selectTrustedCanonicalEvidence(records = []) {
  if (!Array.isArray(records)) {
    return null;
  }

  const eligibleRecords = records.filter(
    (record) =>
      record &&
      record.status !== EVIDENCE_STATUS.REJECTED &&
      record.status !== EVIDENCE_STATUS.SUPERSEDED,
  );

  if (eligibleRecords.length === 0) {
    return null;
  }

  return [...eligibleRecords].sort(compareTrustedEvidence)[0];
}

function buildTrustedCanonicalEvidenceMap(records = []) {
  const groups = groupEvidenceByKey(records);
  const canonicalMap = {};

  groups.forEach((groupRecords, key) => {
    const canonicalRecord = selectTrustedCanonicalEvidence(groupRecords);

    if (canonicalRecord) {
      canonicalMap[key] = canonicalRecord.toJSON
        ? canonicalRecord.toJSON()
        : clone(canonicalRecord);
    }
  });

  return canonicalMap;
}

/* ==========================================================
   Evidence Conflict Set
========================================================== */

class EvidenceConflictSet {
  constructor(data = {}) {
    this.id =
      typeof data.id === "string" && data.id.trim()
        ? data.id.trim()
        : randomUUID();

    this.key = typeof data.key === "string" ? data.key.trim() : "";

    this.evidenceIds = Array.isArray(data.evidenceIds)
      ? [...new Set(data.evidenceIds.filter(Boolean))]
      : [];

    this.canonicalEvidenceId = data.canonicalEvidenceId || null;

    this.conflictType = data.conflictType || CONFLICT_TYPES.OTHER;

    this.resolved = data.resolved === true;

    this.resolutionReason =
      typeof data.resolutionReason === "string"
        ? data.resolutionReason.trim()
        : "";

    this.createdAt = normalizeTimestamp(
      data.createdAt,
      new Date().toISOString(),
    );

    this.resolvedAt = normalizeTimestamp(data.resolvedAt, null);

    this.metadata = isPlainObject(data.metadata) ? clone(data.metadata) : {};
  }

  resolve(canonicalEvidenceId, resolutionReason = "") {
    if (!this.evidenceIds.includes(canonicalEvidenceId)) {
      throw new Error("Canonical evidence must belong to this conflict set.");
    }

    this.canonicalEvidenceId = canonicalEvidenceId;

    this.resolved = true;

    this.resolutionReason = String(resolutionReason || "").trim();

    this.resolvedAt = new Date().toISOString();

    return this;
  }

  toJSON() {
    return {
      id: this.id,
      key: this.key,
      evidenceIds: [...this.evidenceIds],
      canonicalEvidenceId: this.canonicalEvidenceId,
      conflictType: this.conflictType,
      resolved: this.resolved,
      resolutionReason: this.resolutionReason,
      createdAt: this.createdAt,
      resolvedAt: this.resolvedAt,
      metadata: clone(this.metadata),
    };
  }
}

/* ==========================================================
   Conflict Resolution Engine
========================================================== */

class EvidenceConflictResolver {
  constructor(ledger, options = {}) {
    if (!(ledger instanceof EvidenceLedger)) {
      throw new TypeError(
        "EvidenceConflictResolver requires an EvidenceLedger.",
      );
    }

    this.ledger = ledger;

    this.options = {
      minimumCanonicalScore: Number.isFinite(
        Number(options.minimumCanonicalScore),
      )
        ? clamp(options.minimumCanonicalScore, 0, 100)
        : 50,

      automaticResolutionDifference: Number.isFinite(
        Number(options.automaticResolutionDifference),
      )
        ? clamp(options.automaticResolutionDifference, 0, 100)
        : 15,

      markNonCanonicalAsSuperseded:
        options.markNonCanonicalAsSuperseded === true,
    };

    this.conflictSets = new Map();
  }

  buildConflictSet(key) {
    const records = this.ledger.collection.getByKey(key);

    const conflictingRecords = records.filter(
      (record) =>
        record.status === EVIDENCE_STATUS.CONFLICTED ||
        records.some(
          (otherRecord) =>
            otherRecord.id !== record.id &&
            recordsConflict(record, otherRecord),
        ),
    );

    if (conflictingRecords.length < 2) {
      return null;
    }

    const conflictSet = new EvidenceConflictSet({
      key,
      evidenceIds: conflictingRecords.map((record) => record.id),
      conflictType: determineConflictType(
        conflictingRecords[0],
        conflictingRecords[1],
      ),
    });

    this.conflictSets.set(conflictSet.id, conflictSet);

    return conflictSet;
  }

  buildAllConflictSets() {
    const groups = groupEvidenceByKey(this.ledger.getAllEvidence());

    const conflictSets = [];

    groups.forEach((records, key) => {
      const hasConflict = records.some((record, index) =>
        records
          .slice(index + 1)
          .some((otherRecord) => recordsConflict(record, otherRecord)),
      );

      if (!hasConflict) {
        return;
      }

      const conflictSet = this.buildConflictSet(key);

      if (conflictSet) {
        conflictSets.push(conflictSet);
      }
    });

    return conflictSets;
  }

  resolveConflictSet(conflictSetOrId) {
    const conflictSet =
      conflictSetOrId instanceof EvidenceConflictSet
        ? conflictSetOrId
        : this.conflictSets.get(conflictSetOrId);

    if (!conflictSet) {
      return null;
    }

    const records = conflictSet.evidenceIds
      .map((id) => this.ledger.collection.get(id))
      .filter(Boolean);

    if (records.length < 2) {
      return null;
    }

    const sortedRecords = [...records].sort(compareTrustedEvidence);

    const strongestRecord = sortedRecords[0];
    const secondStrongestRecord = sortedRecords[1];

    const strongestScore = calculateTrustedEvidenceScore(strongestRecord);

    const secondStrongestScore = calculateTrustedEvidenceScore(
      secondStrongestRecord,
    );

    const scoreDifference = strongestScore - secondStrongestScore;

    if (
      strongestScore < this.options.minimumCanonicalScore ||
      scoreDifference < this.options.automaticResolutionDifference
    ) {
      records.forEach((record) => {
        record.setStatus(EVIDENCE_STATUS.CONFLICTED);

        record.addReasoning(
          "Conflict remains unresolved because no evidence record has sufficient authority over the alternatives.",
        );
      });

      const unresolvedDecision = this.ledger.addDecision({
        key: conflictSet.key,
        decisionType: EVIDENCE_DECISION_TYPES.UNRESOLVED,
        canonicalEvidenceId: null,
        consideredEvidenceIds: records.map((record) => record.id),
        confidence: strongestScore,
        reasoning: [
          "The evidence conflict could not be resolved automatically.",
          `The strongest evidence score was ${strongestScore}.`,
          `The difference between the two strongest records was ${scoreDifference}.`,
        ],
      });

      return {
        resolved: false,
        conflictSet,
        decision: unresolvedDecision,
        canonicalRecord: null,
      };
    }

    strongestRecord.setStatus(EVIDENCE_STATUS.ACTIVE);

    strongestRecord.addReasoning(
      `Selected as canonical evidence with trusted score ${strongestScore}.`,
    );

    const rejectedEvidenceIds = [];

    sortedRecords.slice(1).forEach((record) => {
      if (this.options.markNonCanonicalAsSuperseded) {
        record.setStatus(EVIDENCE_STATUS.SUPERSEDED);
      } else {
        record.setStatus(EVIDENCE_STATUS.CONFLICTED);
      }

      record.addReasoning(
        `Not selected because evidence record ${strongestRecord.id} had greater authority and trust.`,
      );

      rejectedEvidenceIds.push(record.id);

      this.ledger.addRelationship({
        fromEvidenceId: strongestRecord.id,
        toEvidenceId: record.id,
        type: EVIDENCE_RELATIONSHIP_TYPES.SUPERSEDES,
        confidence: strongestScore,
        reason:
          "The canonical evidence had a materially stronger trusted evidence score.",
      });
    });

    conflictSet.resolve(
      strongestRecord.id,
      `Automatically resolved because the canonical evidence score exceeded the next strongest evidence by ${scoreDifference} points.`,
    );

    const decision = this.ledger.addDecision({
      key: conflictSet.key,
      decisionType: EVIDENCE_DECISION_TYPES.ACCEPTED,
      canonicalEvidenceId: strongestRecord.id,
      consideredEvidenceIds: records.map((record) => record.id),
      rejectedEvidenceIds,
      confidence: strongestScore,
      reasoning: [
        "The evidence conflict was resolved using source authority, execution status, extraction confidence, and corroboration strength.",
        `Canonical trusted score: ${strongestScore}.`,
        `Next strongest trusted score: ${secondStrongestScore}.`,
      ],
    });

    return {
      resolved: true,
      conflictSet,
      decision,
      canonicalRecord: strongestRecord,
    };
  }

  resolveAll() {
    const conflictSets = this.buildAllConflictSets();

    return conflictSets.map((conflictSet) =>
      this.resolveConflictSet(conflictSet),
    );
  }

  getConflictSets() {
    return [...this.conflictSets.values()];
  }

  getUnresolvedConflictSets() {
    return this.getConflictSets().filter(
      (conflictSet) => conflictSet.resolved !== true,
    );
  }
}

/* ==========================================================
   Evidence Provenance Trace
========================================================== */

function buildEvidenceProvenanceTrace(ledger, evidenceId, visited = new Set()) {
  if (!(ledger instanceof EvidenceLedger)) {
    throw new TypeError(
      "buildEvidenceProvenanceTrace requires an EvidenceLedger.",
    );
  }

  if (visited.has(evidenceId)) {
    return {
      evidenceId,
      cycleDetected: true,
      record: null,
      relationships: [],
    };
  }

  visited.add(evidenceId);

  const record = ledger.getEvidence(evidenceId);

  if (!record) {
    return {
      evidenceId,
      missing: true,
      record: null,
      relationships: [],
    };
  }

  const relationships = ledger.getRelationshipsForEvidence(evidenceId);

  const incomingRelationships = relationships.filter(
    (relationship) => relationship.toEvidenceId === evidenceId,
  );

  const provenance = {
    evidenceId,
    record: record.toJSON(),
    authorityType: record.metadata?.authorityType || inferAuthorityType(record),
    authorityScore: calculateAuthorityScore(record),
    trustedScore: calculateTrustedEvidenceScore(record),
    relationships: relationships.map((relationship) => relationship.toJSON()),
    derivedFrom: incomingRelationships
      .filter(
        (relationship) =>
          relationship.type === EVIDENCE_RELATIONSHIP_TYPES.DERIVED_FROM ||
          relationship.type === EVIDENCE_RELATIONSHIP_TYPES.CONFIRMS ||
          relationship.type === EVIDENCE_RELATIONSHIP_TYPES.SUPPORTS,
      )
      .map((relationship) =>
        buildEvidenceProvenanceTrace(
          ledger,
          relationship.fromEvidenceId,
          new Set(visited),
        ),
      ),
  };

  return provenance;
}

/* ==========================================================
   Evidence Explanation
========================================================== */

function explainEvidenceDecision(ledger, key) {
  if (!(ledger instanceof EvidenceLedger)) {
    throw new TypeError("explainEvidenceDecision requires an EvidenceLedger.");
  }

  const records = ledger.collection.getByKey(key);

  const canonicalRecord = ledger.getCanonicalEvidence(key);

  const decision = ledger.getLatestDecisionByKey(key);

  if (records.length === 0) {
    return {
      key,
      found: false,
      conclusion: null,
      confidence: 0,
      explanation: "No evidence was found for this key.",
      evidence: [],
      conflicts: [],
    };
  }

  const conflicts = records.filter(
    (record) => record.status === EVIDENCE_STATUS.CONFLICTED,
  );

  if (!canonicalRecord) {
    return {
      key,
      found: true,
      conclusion: null,
      confidence: 0,
      explanation:
        "Evidence exists, but no canonical conclusion could be selected.",
      evidence: records.map((record) => ({
        id: record.id,
        value: clone(record.value),
        status: record.status,
        confidence: record.confidence,
        authorityScore: calculateAuthorityScore(record),
        trustedScore: calculateTrustedEvidenceScore(record),
      })),
      conflicts: conflicts.map((record) => record.id),
    };
  }

  const canonicalTrustedScore = calculateTrustedEvidenceScore(canonicalRecord);

  const supportingRecords = records.filter(
    (record) =>
      record.id !== canonicalRecord.id &&
      evidenceValuesMatch(record, canonicalRecord),
  );

  const contradictoryRecords = records.filter(
    (record) =>
      record.id !== canonicalRecord.id &&
      recordsConflict(record, canonicalRecord),
  );

  const explanationParts = [
    `The current conclusion for "${key}" is based on evidence record ${canonicalRecord.id}.`,
    `Its trusted evidence score is ${canonicalTrustedScore}.`,
    `Its authority type is ${canonicalRecord.metadata?.authorityType || inferAuthorityType(canonicalRecord)}.`,
  ];

  if (supportingRecords.length > 0) {
    explanationParts.push(
      `${supportingRecords.length} additional evidence record(s) support the same conclusion.`,
    );
  }

  if (contradictoryRecords.length > 0) {
    explanationParts.push(
      `${contradictoryRecords.length} contradictory evidence record(s) were considered.`,
    );
  }

  if (decision?.reasoning?.length) {
    explanationParts.push(...decision.reasoning);
  }

  return {
    key,
    found: true,
    conclusion: clone(canonicalRecord.value),
    confidence: canonicalTrustedScore,
    canonicalEvidenceId: canonicalRecord.id,
    explanation: explanationParts.join(" "),
    evidence: records.map((record) => ({
      id: record.id,
      value: clone(record.value),
      type: record.type,
      status: record.status,
      confidence: record.confidence,
      authorityType:
        record.metadata?.authorityType || inferAuthorityType(record),
      authorityScore: calculateAuthorityScore(record),
      trustedScore: calculateTrustedEvidenceScore(record),
      documentId: record.documentId,
      documentName: record.documentName,
      documentType: record.documentType,
      page: record.page,
      reasoning: [...record.reasoning],
    })),
    supportingEvidenceIds: supportingRecords.map((record) => record.id),
    contradictoryEvidenceIds: contradictoryRecords.map((record) => record.id),
    decision: decision ? decision.toJSON() : null,
  };
}

/* ==========================================================
   Evidence Verification
========================================================== */

function verifyEvidenceIntegrity(ledger) {
  if (!(ledger instanceof EvidenceLedger)) {
    throw new TypeError("verifyEvidenceIntegrity requires an EvidenceLedger.");
  }

  const errors = [];
  const warnings = [];

  const records = ledger.getAllEvidence();

  const seenIds = new Set();

  records.forEach((record) => {
    if (seenIds.has(record.id)) {
      errors.push(`Duplicate evidence id detected: ${record.id}.`);
    }

    seenIds.add(record.id);

    if (!record.key) {
      warnings.push(`Evidence record ${record.id} has no key.`);
    }

    if (
      record.value === undefined ||
      record.value === null ||
      record.normalizedValue === ""
    ) {
      warnings.push(`Evidence record ${record.id} has no usable value.`);
    }

    if (record.confidence < 0 || record.confidence > 100) {
      errors.push(
        `Evidence record ${record.id} has an invalid confidence value.`,
      );
    }

    if (!Object.values(EVIDENCE_STATUS).includes(record.status)) {
      errors.push(`Evidence record ${record.id} has an invalid status.`);
    }
  });

  for (const relationship of ledger.relationships.values()) {
    if (!ledger.collection.has(relationship.fromEvidenceId)) {
      errors.push(
        `Relationship ${relationship.id} references missing source evidence ${relationship.fromEvidenceId}.`,
      );
    }

    if (!ledger.collection.has(relationship.toEvidenceId)) {
      errors.push(
        `Relationship ${relationship.id} references missing target evidence ${relationship.toEvidenceId}.`,
      );
    }

    if (relationship.fromEvidenceId === relationship.toEvidenceId) {
      warnings.push(
        `Relationship ${relationship.id} references the same evidence record on both sides.`,
      );
    }
  }

  for (const decision of ledger.decisions.values()) {
    if (
      decision.canonicalEvidenceId &&
      !ledger.collection.has(decision.canonicalEvidenceId)
    ) {
      errors.push(
        `Decision ${decision.id} references missing canonical evidence ${decision.canonicalEvidenceId}.`,
      );
    }

    decision.consideredEvidenceIds.forEach((evidenceId) => {
      if (!ledger.collection.has(evidenceId)) {
        errors.push(
          `Decision ${decision.id} references missing considered evidence ${evidenceId}.`,
        );
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    recordCount: records.length,
    relationshipCount: ledger.relationships.size,
    decisionCount: ledger.decisions.size,
    checkedAt: new Date().toISOString(),
  };
}

/* ==========================================================
   Part 3 Public API
========================================================== */

Object.assign(EVIDENCE_ENGINE_API, {
  AUTHORITY_LEVELS,

  DOCUMENT_AUTHORITY_TYPES,

  EVIDENCE_RELATIONSHIP_TYPES,

  EVIDENCE_DECISION_TYPES,

  EvidenceRelationship,

  EvidenceDecision,

  EvidenceLedger,

  EvidenceConflictSet,

  EvidenceConflictResolver,

  normalizeAuthorityType,

  getAuthorityLevel,

  inferAuthorityType,

  calculateAuthorityScore,

  calculateTrustedEvidenceScore,

  compareTrustedEvidence,

  selectTrustedCanonicalEvidence,

  buildTrustedCanonicalEvidenceMap,

  buildEvidenceProvenanceTrace,

  explainEvidenceDecision,

  verifyEvidenceIntegrity,
});

/* ==========================================================
   Evidence Ingestion Types
========================================================== */

const INGESTION_SOURCE_TYPES = Object.freeze({
  UNIVERSAL_DOCUMENT_ENGINE: "universal_document_engine",
  DOCUMENT_INTELLIGENCE: "document_intelligence",
  TRANSACTION_DATA: "transaction_data",
  USER_CONFIRMED: "user_confirmed",
  IMPORTED: "imported",
  SYSTEM: "system",
});

/* ==========================================================
   Evidence Key Aliases
========================================================== */

const EVIDENCE_KEY_ALIASES = Object.freeze({
  purchasePrice: "transaction.purchase_price",

  salesPrice: "transaction.purchase_price",

  contractPrice: "transaction.purchase_price",

  closingDate: "transaction.closing_date",

  settlementDate: "transaction.closing_date",

  propertyAddress: "property.address",

  address: "property.address",

  effectiveDate: "contract.effective_date",

  contractDate: "contract.effective_date",

  acceptanceDate: "contract.acceptance_date",

  earnestMoney: "transaction.earnest_money",

  earnestMoneyAmount: "transaction.earnest_money",

  optionFee: "transaction.option_fee",

  optionPeriodEnd: "transaction.option_period_end",

  inspectionDeadline: "transaction.inspection_deadline",

  appraisalDeadline: "transaction.appraisal_deadline",

  financingDeadline: "transaction.financing_deadline",

  loanDeadline: "transaction.financing_deadline",

  walkthroughDate: "transaction.final_walkthrough_date",

  finalWalkthroughDate: "transaction.final_walkthrough_date",

  listingDate: "listing.start_date",

  listingExpirationDate: "listing.expiration_date",

  mlsNumber: "listing.mls_number",

  mlsStatus: "listing.status",

  buyerNames: "party.buyers",

  sellerNames: "party.sellers",

  buyer: "party.buyers",

  seller: "party.sellers",

  transactionStatus: "transaction.status",

  documentType: "document.type",

  fullyExecuted: "document.fully_executed",

  signed: "document.signed",

  terminated: "transaction.terminated",

  cancelled: "transaction.cancelled",

  canceled: "transaction.cancelled",

  closed: "transaction.closed",
});

/* ==========================================================
   Ingestion Utilities
========================================================== */

function normalizeIngestionSourceType(value) {
  const normalizedValue = normalizeString(value);

  return Object.values(INGESTION_SOURCE_TYPES).includes(normalizedValue)
    ? normalizedValue
    : INGESTION_SOURCE_TYPES.SYSTEM;
}

function resolveEvidenceKey(key, fallback = "") {
  if (key === undefined || key === null || key === "") {
    return normalizeKey(fallback);
  }

  const rawKey = String(key).trim();

  if (Object.prototype.hasOwnProperty.call(EVIDENCE_KEY_ALIASES, rawKey)) {
    return EVIDENCE_KEY_ALIASES[rawKey];
  }

  const normalizedRawKey = normalizeString(rawKey);

  const matchingAlias = Object.keys(EVIDENCE_KEY_ALIASES).find(
    (alias) => normalizeString(alias) === normalizedRawKey,
  );

  if (matchingAlias) {
    return EVIDENCE_KEY_ALIASES[matchingAlias];
  }

  return normalizeKey(rawKey);
}

function inferEvidenceTypeFromKey(key, value = undefined) {
  const normalizedKey = resolveEvidenceKey(key);

  if (
    normalizedKey.includes("date") ||
    normalizedKey.includes("deadline") ||
    normalizedKey.includes("expiration") ||
    normalizedKey.includes("effective")
  ) {
    return normalizedKey.includes("deadline")
      ? EVIDENCE_TYPES.DEADLINE
      : EVIDENCE_TYPES.DATE;
  }

  if (
    normalizedKey.includes("price") ||
    normalizedKey.includes("amount") ||
    normalizedKey.includes("fee") ||
    normalizedKey.includes("credit") ||
    normalizedKey.includes("commission") ||
    normalizedKey.includes("earnest_money")
  ) {
    return EVIDENCE_TYPES.MONEY;
  }

  if (
    normalizedKey.startsWith("party.") ||
    normalizedKey.includes("buyer") ||
    normalizedKey.includes("seller") ||
    normalizedKey.includes("agent") ||
    normalizedKey.includes("lender") ||
    normalizedKey.includes("escrow")
  ) {
    return EVIDENCE_TYPES.PARTY;
  }

  if (normalizedKey.startsWith("property.")) {
    return EVIDENCE_TYPES.PROPERTY;
  }

  if (normalizedKey.includes("signature") || normalizedKey.includes("signed")) {
    return EVIDENCE_TYPES.SIGNATURE;
  }

  if (normalizedKey.includes("initial")) {
    return EVIDENCE_TYPES.INITIAL;
  }

  if (normalizedKey.includes("checkbox")) {
    return EVIDENCE_TYPES.CHECKBOX;
  }

  if (
    normalizedKey.includes("status") ||
    normalizedKey.includes("closed") ||
    normalizedKey.includes("cancelled") ||
    normalizedKey.includes("terminated") ||
    normalizedKey.includes("pending") ||
    normalizedKey.includes("active")
  ) {
    return EVIDENCE_TYPES.STATUS;
  }

  if (normalizedKey.startsWith("document.")) {
    return EVIDENCE_TYPES.DOCUMENT;
  }

  if (typeof value === "number") {
    return EVIDENCE_TYPES.FACT;
  }

  return EVIDENCE_TYPES.FACT;
}

function inferExtractionSource(ingestionSourceType) {
  const sourceType = normalizeIngestionSourceType(ingestionSourceType);

  switch (sourceType) {
    case INGESTION_SOURCE_TYPES.USER_CONFIRMED:
      return CONFIDENCE_SOURCE.HUMAN;

    case INGESTION_SOURCE_TYPES.IMPORTED:
      return CONFIDENCE_SOURCE.IMPORTED;

    case INGESTION_SOURCE_TYPES.UNIVERSAL_DOCUMENT_ENGINE:
    case INGESTION_SOURCE_TYPES.DOCUMENT_INTELLIGENCE:
      return CONFIDENCE_SOURCE.GPT;

    default:
      return CONFIDENCE_SOURCE.SYSTEM;
  }
}

function normalizeEvidenceInput(input = {}, context = {}) {
  const sourceType = normalizeIngestionSourceType(
    context.sourceType || input.sourceType,
  );

  const key = resolveEvidenceKey(
    input.key || input.name || input.field || input.label,
  );

  const value =
    input.value !== undefined
      ? input.value
      : input.answer !== undefined
        ? input.answer
        : input.result !== undefined
          ? input.result
          : null;

  const type = input.type
    ? normalizeEvidenceType(input.type)
    : inferEvidenceTypeFromKey(key, value);

  const confidence =
    input.confidence ?? input.score ?? context.confidence ?? 70;

  const documentId = input.documentId ?? context.documentId ?? null;

  const documentName = input.documentName ?? context.documentName ?? null;

  const documentType = input.documentType ?? context.documentType ?? null;

  const page = input.page ?? input.pageNumber ?? context.page ?? null;

  const extractedBy =
    input.extractedBy ||
    context.extractedBy ||
    inferExtractionSource(sourceType);

  const metadata = {
    ...(isPlainObject(context.metadata) ? clone(context.metadata) : {}),

    ...(isPlainObject(input.metadata) ? clone(input.metadata) : {}),

    ingestionSourceType: sourceType,
  };

  if (
    context.userConfirmed === true ||
    sourceType === INGESTION_SOURCE_TYPES.USER_CONFIRMED
  ) {
    metadata.userConfirmed = true;
  }

  if (context.fullyExecuted === true) {
    metadata.fullyExecuted = true;
  }

  if (context.hasSignatures === true) {
    metadata.hasSignatures = true;
  }

  return new EvidenceRecord({
    id: input.id,

    type,

    key,

    value,

    confidence,

    sourceConfidence:
      input.sourceConfidence ?? context.sourceConfidence ?? confidence,

    status: input.status || EVIDENCE_STATUS.ACTIVE,

    source: {
      ...(isPlainObject(context.source) ? clone(context.source) : {}),

      ...(isPlainObject(input.source) ? clone(input.source) : {}),

      sourceType,
    },

    documentId,

    documentName,

    documentType,

    page,

    boundingBox: input.boundingBox || null,

    extractedBy,

    reasoning: Array.isArray(input.reasoning)
      ? input.reasoning
      : input.reason
        ? [input.reason]
        : [],

    metadata,

    createdAt: input.createdAt,

    updatedAt: input.updatedAt,
  });
}

function flattenObjectToEvidence(value, options = {}, path = "") {
  const records = [];

  const {
    context = {},
    includeNull = false,
    maximumDepth = 8,
    currentDepth = 0,
  } = options;

  if (currentDepth > maximumDepth) {
    return records;
  }

  if (value === null || value === undefined) {
    if (includeNull && path) {
      records.push(
        normalizeEvidenceInput(
          {
            key: path,
            value,
          },
          context,
        ),
      );
    }

    return records;
  }

  if (Array.isArray(value)) {
    if (!path) {
      value.forEach((item, index) => {
        records.push(
          ...flattenObjectToEvidence(
            item,
            {
              ...options,
              currentDepth: currentDepth + 1,
            },
            String(index),
          ),
        );
      });

      return records;
    }

    const containsObjects = value.some(
      (item) => isPlainObject(item) || Array.isArray(item),
    );

    if (!containsObjects) {
      records.push(
        normalizeEvidenceInput(
          {
            key: path,
            value,
          },
          context,
        ),
      );

      return records;
    }

    value.forEach((item, index) => {
      records.push(
        ...flattenObjectToEvidence(
          item,
          {
            ...options,
            currentDepth: currentDepth + 1,
          },
          `${path}.${index}`,
        ),
      );
    });

    return records;
  }

  if (isPlainObject(value)) {
    Object.entries(value).forEach(([childKey, childValue]) => {
      const childPath = path ? `${path}.${childKey}` : childKey;

      records.push(
        ...flattenObjectToEvidence(
          childValue,
          {
            ...options,
            currentDepth: currentDepth + 1,
          },
          childPath,
        ),
      );
    });

    return records;
  }

  if (path) {
    records.push(
      normalizeEvidenceInput(
        {
          key: path,
          value,
        },
        context,
      ),
    );
  }

  return records;
}

/* ==========================================================
   Universal Document Analysis Adapter
========================================================== */

function extractEvidenceFromUniversalAnalysis(analysis = {}, document = {}) {
  const records = [];

  const documentId = document.id || analysis.documentId || null;

  const documentName =
    document.name || document.fileName || analysis.documentName || null;

  const classification = analysis.classification || {};

  const documentType =
    classification.documentType ||
    classification.type ||
    analysis.documentType ||
    document.documentType ||
    null;

  const baseConfidence = classification.confidence ?? analysis.confidence ?? 75;

  const execution = analysis.execution || analysis.signatures || {};

  const context = {
    sourceType: INGESTION_SOURCE_TYPES.UNIVERSAL_DOCUMENT_ENGINE,

    documentId,

    documentName,

    documentType,

    confidence: baseConfidence,

    sourceConfidence: baseConfidence,

    fullyExecuted:
      execution.fullyExecuted === true ||
      execution.executionStatus === "fully_executed" ||
      analysis.fullyExecuted === true,

    hasSignatures:
      execution.hasSignatures === true ||
      (Array.isArray(execution.signatures) && execution.signatures.length > 0),

    metadata: {
      schemaVersion: analysis.schemaVersion || null,

      classification: clone(classification),

      executionStatus: execution.executionStatus || null,
    },
  };

  const directEvidence = Array.isArray(analysis.evidence)
    ? analysis.evidence
    : [];

  directEvidence.forEach((item) => {
    if (!item || typeof item !== "object") {
      return;
    }

    records.push(
      normalizeEvidenceInput(item, {
        ...context,
        page: item.page || item.pageNumber || null,
      }),
    );
  });

  const factContainers = [
    analysis.facts,
    analysis.dates,
    analysis.amounts,
    analysis.properties,
    analysis.parties,
    analysis.statuses,
    analysis.deadlines,
  ];

  factContainers.forEach((container) => {
    if (!container || typeof container !== "object") {
      return;
    }

    records.push(
      ...flattenObjectToEvidence(container, {
        context,
      }),
    );
  });

  if (documentType) {
    records.push(
      normalizeEvidenceInput(
        {
          key: "document.type",
          value: documentType,
          type: EVIDENCE_TYPES.DOCUMENT,
          confidence: baseConfidence,
        },
        context,
      ),
    );
  }

  if (context.fullyExecuted) {
    records.push(
      normalizeEvidenceInput(
        {
          key: "document.fully_executed",
          value: true,
          type: EVIDENCE_TYPES.STATUS,
          confidence: Math.max(Number(baseConfidence), 85),
          metadata: {
            fullyExecuted: true,
          },
        },
        context,
      ),
    );
  }

  if (context.hasSignatures) {
    records.push(
      normalizeEvidenceInput(
        {
          key: "document.signed",
          value: true,
          type: EVIDENCE_TYPES.SIGNATURE,
          confidence: Math.max(Number(baseConfidence), 80),
          metadata: {
            hasSignatures: true,
          },
        },
        context,
      ),
    );
  }

  return records.filter(
    (record) =>
      record.key &&
      record.value !== undefined &&
      record.value !== null &&
      (typeof record.value !== "string" || record.value.trim() !== ""),
  );
}

/* ==========================================================
   User-Confirmed Evidence Adapter
========================================================== */

function createUserConfirmedEvidence(key, value, options = {}) {
  return normalizeEvidenceInput(
    {
      key,
      value,

      type: options.type,

      confidence: 100,

      sourceConfidence: 100,

      reasoning: options.reasoning || ["Confirmed directly by the user."],

      metadata: {
        ...(isPlainObject(options.metadata) ? clone(options.metadata) : {}),

        userConfirmed: true,
      },
    },
    {
      sourceType: INGESTION_SOURCE_TYPES.USER_CONFIRMED,

      documentId: options.documentId || null,

      documentName: options.documentName || null,

      documentType: options.documentType || null,

      userConfirmed: true,

      extractedBy: CONFIDENCE_SOURCE.HUMAN,
    },
  );
}

/* ==========================================================
   Engine Validation
========================================================== */

function validateEvidenceEngine() {
  const requiredExports = [
    "EvidenceRecord",
    "EvidenceCollection",
    "EvidenceLedger",
    "EvidenceReconciliationEngine",
    "EvidenceConflictResolver",
  ];

  const errors = [];

  if (typeof randomUUID !== "function") {
    errors.push("randomUUID is unavailable.");
  }

  if (typeof ENGINE_VERSION !== "string" || !ENGINE_VERSION) {
    errors.push("ENGINE_VERSION is invalid.");
  }

  const missingExports = requiredExports.filter(
    (exportName) => !EVIDENCE_ENGINE_API[exportName],
  );

  if (missingExports.length > 0) {
    errors.push(`Missing required exports: ${missingExports.join(", ")}.`);
  }

  return {
    valid: errors.length === 0,

    engineVersion: ENGINE_VERSION,

    errors,

    checkedAt: new Date().toISOString(),
  };
}

/* ==========================================================
   Part 5 Public API
========================================================== */

Object.assign(EVIDENCE_ENGINE_API, {
  INGESTION_SOURCE_TYPES,

  EVIDENCE_KEY_ALIASES,

  normalizeIngestionSourceType,

  resolveEvidenceKey,

  inferEvidenceTypeFromKey,

  inferExtractionSource,

  normalizeEvidenceInput,

  flattenObjectToEvidence,

  extractEvidenceFromUniversalAnalysis,

  createUserConfirmedEvidence,

  validateEvidenceEngine,
});

/* ==========================================================
   Environment Exports
========================================================== */

if (typeof module !== "undefined" && module.exports) {
  module.exports = EVIDENCE_ENGINE_API;
}

if (typeof globalThis !== "undefined") {
  globalThis.RapportLinkEvidenceEngine = EVIDENCE_ENGINE_API;
}
