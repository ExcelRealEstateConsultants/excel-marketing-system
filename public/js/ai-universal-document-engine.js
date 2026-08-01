/**
Those responsibilities belong downstream:

  Document Intelligence
          ↓
    Evidence Engine
          ↓
    Situation Engine
          ↓
   Transaction Brain
          ↓
AI Transaction Coordinator

The filename is retained only for source traceability. It must never be
used to classify a document or determine what the document proves.
======================================================================
*/

"use strict";

require("dotenv").config();

const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const ENGINE_NAME = "RapportLink Universal Document Intelligence Engine";
const ENGINE_VERSION = "2.0.0";
const SCHEMA_VERSION = 2;

const AI_DOCUMENT_ENGINE_VERSION = ENGINE_VERSION;
const UNIVERSAL_DOCUMENT_SCHEMA_VERSION = String(SCHEMA_VERSION);

const UNIVERSAL_DOCUMENT_MODEL = process.env.OPENAI_DOCUMENT_MODEL || "gpt-5.6";

/* ------------------------------------------------------------------
   Directly Observable Evidence Types
------------------------------------------------------------------- */

const EVIDENCE_TYPES = Object.freeze({
  FACT: "fact",
  DATE: "date",
  MONEY: "money",
  PARTY: "party",
  PROPERTY: "property",
  SIGNATURE: "signature",
  INITIAL: "initial",
  CHECKBOX: "checkbox",
  HANDWRITING: "handwriting",
  OBLIGATION: "obligation",
  CONTINGENCY: "contingency",
  AMENDMENT: "amendment",
  NOTICE: "notice",
  APPROVAL: "approval",
  WAIVER: "waiver",
  RECEIPT: "receipt",
  FUNDING: "funding",
  RECORDING: "recording",
  POSSESSION: "possession",
  TERMINATION: "termination",
  SETTLEMENT: "settlement",
  TITLE: "title",
  RISK: "risk",
  DOCUMENT_CLASSIFICATION: "documentClassification",
  DOCUMENT_PURPOSE: "documentPurpose",
  DOCUMENT_EFFECT: "documentEffect",
  OTHER: "other",
});

/* ------------------------------------------------------------------
   Utility Functions
------------------------------------------------------------------- */

function normalizeString(value) {
  return String(value ?? "").trim();
}

function normalizeNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizeConfidence(value) {
  const number = normalizeNumber(value, 0);

  if (number > 0 && number <= 1) {
    return Math.round(number * 100);
  }

  return Math.max(0, Math.min(100, Math.round(number)));
}

function normalizePage(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const page = Number(value);

  if (!Number.isFinite(page) || page < 1) {
    return null;
  }

  return Math.round(page);
}

function normalizePageCount(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const pageCount = Number(value);

  if (!Number.isFinite(pageCount) || pageCount < 1) {
    return null;
  }

  return Math.round(pageCount);
}

function normalizePrimitive(value) {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (value === undefined) {
    return null;
  }

  return normalizeString(value);
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeBoolean(value) {
  return value === true;
}

function createEvidenceRecord({
  type = EVIDENCE_TYPES.OTHER,
  category = "",
  key = "",
  value = null,
  confidence = 0,
  page = null,
  supportingText = "",
  sourceDocumentId = null,
  eventDate = "",
  facts = [],
} = {}) {
  return {
    type: normalizeEvidenceType(type),
    category: normalizeString(category),
    key: normalizeString(key),
    value: normalizePrimitive(value),
    confidence: normalizeConfidence(confidence),
    page: normalizePage(page),
    supportingText: normalizeString(supportingText),
    sourceDocumentId,
    eventDate: normalizeString(eventDate),
    facts: normalizeEvidenceFacts(facts),
  };
}

function normalizeEvidenceType(value) {
  const requestedType = normalizeString(value);

  return Object.values(EVIDENCE_TYPES).includes(requestedType)
    ? requestedType
    : EVIDENCE_TYPES.OTHER;
}

function normalizeEvidenceFacts(facts) {
  return ensureArray(facts)
    .map((fact) => ({
      name: normalizeString(fact?.name),
      value: normalizePrimitive(fact?.value),
    }))
    .filter((fact) => fact.name);
}

function normalizeEvidenceRecord(record = {}, sourceDocumentId = null) {
  return {
    type: normalizeEvidenceType(record.type),
    category: normalizeString(record.category),
    key: normalizeString(record.key),
    value: normalizePrimitive(record.value),
    confidence: normalizeConfidence(record.confidence),
    page: normalizePage(record.page),
    supportingText: normalizeString(record.supportingText),
    eventDate: normalizeString(record.eventDate),
    facts: normalizeEvidenceFacts(record.facts),
    sourceDocumentId,
  };
}

function isUsableEvidenceRecord(record = {}) {
  const hasIdentity = Boolean(
    normalizeString(record.key) || normalizeString(record.category),
  );

  const hasValue =
    record.value !== null &&
    record.value !== undefined &&
    !(typeof record.value === "string" && !record.value.trim());

  const hasFacts = ensureArray(record.facts).length > 0;
  const hasSupport = Boolean(normalizeString(record.supportingText));

  return hasIdentity && (hasValue || hasFacts) && hasSupport;
}

/* ------------------------------------------------------------------
   AI Instructions
------------------------------------------------------------------- */

function universalDocumentInstructions() {
  return `
You are RapportLink's Universal Real Estate Document Intelligence Engine.

Read the actual document content provided to you. Do not use the filename or
source label to classify the document or determine what it proves.

The document may concern residential, commercial, industrial, agricultural,
land, leasing, title, escrow, lending, inspection, construction, insurance,
legal, tax, HOA, disclosure, brokerage, or another transaction domain in any
state, province, country, or jurisdiction.

YOUR ONLY JOB IS DOCUMENT OBSERVATION AND EVIDENCE EXTRACTION.

You must not determine the transaction's overall state, health, confidence,
risk level, completion percentage, missing requirements, recommendations,
priorities, or tasks. Downstream engines make those decisions across all
available evidence.

Extract all material information directly supported by the document, including:

- document family, type, purpose, and stated effect;
- jurisdiction;
- parties and roles;
- property addresses, legal descriptions, and parcel identifiers;
- dates and deadlines;
- amounts, credits, deposits, fees, proceeds, and adjustments;
- signatures, initials, execution dates, and signature methods;
- selected and unselected checkboxes;
- handwriting, added terms, crossed-out language, and margin notes;
- obligations and stated statuses;
- contingencies and their stated dispositions;
- amendments and changed terms;
- notices, approvals, waivers, and receipts;
- funding, recording, possession, termination, settlement, and title facts;
- document-supported risks or conflicts.

STRICT EVIDENCE RULES

1. Never invent a fact.
2. Do not infer from a filename.
3. A planned date is not proof that an event occurred.
4. An unsigned or blank form is not proof of execution.
5. A document prepared for closing is not proof that closing occurred.
6. A settlement statement alone is not proof of disbursement, recording, or
   title transfer unless the document itself directly establishes those facts.
7. A reference to another document or event is not the same as observing that
   document or event.
8. Use empty strings, empty arrays, null, or false when the document does not
   support a value.
9. Every material observation must include confidence and concise supporting
   text from or accurately describing the document content.
10. The evidence array must contain raw, directly observable evidence records.
    Do not create transaction-state conclusions or semantic-effect conclusions.

Good evidence examples:

- buyerSignature = true because a visible buyer signature appears on page 9;
- closingDate = 2026-08-17 because the contract states that date on page 5;
- deedRecorded = true because a recording stamp and instrument number appear;
- terminationSignedByBuyer = true because the buyer signature is visible;
- settlementFundsShownAsDisbursed = true because the document expressly marks
  funds as disbursed.

Bad evidence examples:

- transactionState = Closed;
- contractExecuted = true merely because a purchase agreement exists;
- settlementCompleted = true merely because a settlement statement exists;
- titleTransferred = true without direct title or recording evidence.

Return only valid JSON matching the requested schema.
`;
}

/* ------------------------------------------------------------------
   Build AI Input
------------------------------------------------------------------- */

function buildUniversalDocumentInput(txn = {}, doc = {}) {
  const documentText = normalizeString(
    doc.text || doc.extractedText || doc.ocrText || "",
  );

  return {
    transactionContext: {
      side: normalizeString(txn.side),
      propertyAddress: normalizeString(txn.address || txn.propertyAddress),
      country: normalizeString(txn.country),
      state: normalizeString(txn.state),
    },

    document: {
      sourceDocumentId: doc.id || null,

      /*
       * Retained for user-interface traceability only.
       * The AI is explicitly prohibited from classifying from it.
       */
      sourceDocumentLabel: normalizeString(doc.name) || "Uploaded Document",

      extractedText: documentText,
      extractionMethod: normalizeString(doc.extraction?.method),
      pageCount: normalizeNumber(doc.extraction?.pages, 0),
    },
  };
}

/* ------------------------------------------------------------------
   JSON Schema Helpers
------------------------------------------------------------------- */

function nullablePrimitiveSchema() {
  return {
    type: ["string", "number", "boolean", "null"],
  };
}

function pageSchema() {
  return {
    type: ["number", "null"],
  };
}

function jurisdictionSchema() {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      country: { type: "string" },
      stateOrProvince: { type: "string" },
      countyOrRegion: { type: "string" },
      city: { type: "string" },
    },
    required: ["country", "stateOrProvince", "countyOrRegion", "city"],
  };
}

function classificationSchema() {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      documentFamily: { type: "string" },
      documentType: { type: "string" },
      documentPurpose: { type: "string" },
      documentEffect: { type: "string" },
      confidence: { type: "number" },
      supportingText: { type: "string" },
      jurisdiction: jurisdictionSchema(),
    },
    required: [
      "documentFamily",
      "documentType",
      "documentPurpose",
      "documentEffect",
      "confidence",
      "supportingText",
      "jurisdiction",
    ],
  };
}

function partySchema() {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      name: { type: "string" },
      role: { type: "string" },
      organization: { type: "string" },
      address: { type: "string" },
      email: { type: "string" },
      phone: { type: "string" },
      confidence: { type: "number" },
      page: pageSchema(),
      supportingText: { type: "string" },
    },
    required: [
      "name",
      "role",
      "organization",
      "address",
      "email",
      "phone",
      "confidence",
      "page",
      "supportingText",
    ],
  };
}

function propertySchema() {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      address: { type: "string" },
      legalDescription: { type: "string" },
      parcelNumber: { type: "string" },
      propertyType: { type: "string" },
      unitNumber: { type: "string" },
      confidence: { type: "number" },
      page: pageSchema(),
      supportingText: { type: "string" },
    },
    required: [
      "address",
      "legalDescription",
      "parcelNumber",
      "propertyType",
      "unitNumber",
      "confidence",
      "page",
      "supportingText",
    ],
  };
}

function dateSchema() {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      dateType: { type: "string" },
      value: { type: "string" },
      isDeadline: { type: "boolean" },
      responsibleParty: { type: "string" },
      relatedClause: { type: "string" },
      confidence: { type: "number" },
      page: pageSchema(),
      supportingText: { type: "string" },
    },
    required: [
      "dateType",
      "value",
      "isDeadline",
      "responsibleParty",
      "relatedClause",
      "confidence",
      "page",
      "supportingText",
    ],
  };
}

function amountSchema() {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      amountType: { type: "string" },
      value: { type: "number" },
      currency: { type: "string" },
      payer: { type: "string" },
      payee: { type: "string" },
      relatedClause: { type: "string" },
      confidence: { type: "number" },
      page: pageSchema(),
      supportingText: { type: "string" },
    },
    required: [
      "amountType",
      "value",
      "currency",
      "payer",
      "payee",
      "relatedClause",
      "confidence",
      "page",
      "supportingText",
    ],
  };
}

function signatureSchema() {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      signerName: { type: "string" },
      signerRole: { type: "string" },
      signed: { type: "boolean" },
      signedDate: { type: "string" },
      signatureMethod: { type: "string" },
      signatureLocation: { type: "string" },
      confidence: { type: "number" },
      page: pageSchema(),
      supportingText: { type: "string" },
    },
    required: [
      "signerName",
      "signerRole",
      "signed",
      "signedDate",
      "signatureMethod",
      "signatureLocation",
      "confidence",
      "page",
      "supportingText",
    ],
  };
}

function initialSchema() {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      person: { type: "string" },
      locationOrClause: { type: "string" },
      detected: { type: "boolean" },
      confidence: { type: "number" },
      page: pageSchema(),
      supportingText: { type: "string" },
    },
    required: [
      "person",
      "locationOrClause",
      "detected",
      "confidence",
      "page",
      "supportingText",
    ],
  };
}

function checkboxSchema() {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      label: { type: "string" },
      selected: { type: "boolean" },
      groupLabel: { type: "string" },
      confidence: { type: "number" },
      page: pageSchema(),
      supportingText: { type: "string" },
    },
    required: [
      "label",
      "selected",
      "groupLabel",
      "confidence",
      "page",
      "supportingText",
    ],
  };
}

function handwrittenTermSchema() {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      text: { type: "string" },
      locationOrClause: { type: "string" },
      apparentPurpose: { type: "string" },
      crossedOutText: { type: "string" },
      confidence: { type: "number" },
      page: pageSchema(),
      supportingText: { type: "string" },
    },
    required: [
      "text",
      "locationOrClause",
      "apparentPurpose",
      "crossedOutText",
      "confidence",
      "page",
      "supportingText",
    ],
  };
}

function obligationSchema() {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      responsibleParty: { type: "string" },
      obligation: { type: "string" },
      dueDate: { type: "string" },
      statedStatus: { type: "string" },
      condition: { type: "string" },
      confidence: { type: "number" },
      page: pageSchema(),
      supportingText: { type: "string" },
    },
    required: [
      "responsibleParty",
      "obligation",
      "dueDate",
      "statedStatus",
      "condition",
      "confidence",
      "page",
      "supportingText",
    ],
  };
}

function contingencySchema() {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      contingencyType: { type: "string" },
      terms: { type: "string" },
      deadline: { type: "string" },
      beneficiary: { type: "string" },
      statedDisposition: { type: "string" },
      confidence: { type: "number" },
      page: pageSchema(),
      supportingText: { type: "string" },
    },
    required: [
      "contingencyType",
      "terms",
      "deadline",
      "beneficiary",
      "statedDisposition",
      "confidence",
      "page",
      "supportingText",
    ],
  };
}

function amendmentSchema() {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      changedTerm: { type: "string" },
      priorValue: nullablePrimitiveSchema(),
      newValue: nullablePrimitiveSchema(),
      effectiveDate: { type: "string" },
      executionEvidence: { type: "string" },
      confidence: { type: "number" },
      page: pageSchema(),
      supportingText: { type: "string" },
    },
    required: [
      "changedTerm",
      "priorValue",
      "newValue",
      "effectiveDate",
      "executionEvidence",
      "confidence",
      "page",
      "supportingText",
    ],
  };
}

function noticeSchema() {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      noticeType: { type: "string" },
      sender: { type: "string" },
      recipient: { type: "string" },
      noticeDate: { type: "string" },
      statedEffect: { type: "string" },
      deliveryMethod: { type: "string" },
      confidence: { type: "number" },
      page: pageSchema(),
      supportingText: { type: "string" },
    },
    required: [
      "noticeType",
      "sender",
      "recipient",
      "noticeDate",
      "statedEffect",
      "deliveryMethod",
      "confidence",
      "page",
      "supportingText",
    ],
  };
}

function approvalSchema() {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      approvalType: { type: "string" },
      approvingParty: { type: "string" },
      approved: { type: "boolean" },
      approvalDate: { type: "string" },
      conditions: { type: "string" },
      confidence: { type: "number" },
      page: pageSchema(),
      supportingText: { type: "string" },
    },
    required: [
      "approvalType",
      "approvingParty",
      "approved",
      "approvalDate",
      "conditions",
      "confidence",
      "page",
      "supportingText",
    ],
  };
}

function waiverSchema() {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      waiverType: { type: "string" },
      waivingParty: { type: "string" },
      waived: { type: "boolean" },
      waiverDate: { type: "string" },
      scope: { type: "string" },
      confidence: { type: "number" },
      page: pageSchema(),
      supportingText: { type: "string" },
    },
    required: [
      "waiverType",
      "waivingParty",
      "waived",
      "waiverDate",
      "scope",
      "confidence",
      "page",
      "supportingText",
    ],
  };
}

function receiptSchema() {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      receiptType: { type: "string" },
      receivedBy: { type: "string" },
      providedBy: { type: "string" },
      receivedDate: { type: "string" },
      acknowledged: { type: "boolean" },
      subject: { type: "string" },
      confidence: { type: "number" },
      page: pageSchema(),
      supportingText: { type: "string" },
    },
    required: [
      "receiptType",
      "receivedBy",
      "providedBy",
      "receivedDate",
      "acknowledged",
      "subject",
      "confidence",
      "page",
      "supportingText",
    ],
  };
}

function fundingSchema() {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      fundingType: { type: "string" },
      lenderOrSource: { type: "string" },
      recipient: { type: "string" },
      amount: { type: ["number", "null"] },
      currency: { type: "string" },
      fundingDate: { type: "string" },
      statedStatus: { type: "string" },
      referenceNumber: { type: "string" },
      confidence: { type: "number" },
      page: pageSchema(),
      supportingText: { type: "string" },
    },
    required: [
      "fundingType",
      "lenderOrSource",
      "recipient",
      "amount",
      "currency",
      "fundingDate",
      "statedStatus",
      "referenceNumber",
      "confidence",
      "page",
      "supportingText",
    ],
  };
}

function recordingSchema() {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      instrumentType: { type: "string" },
      recordingOffice: { type: "string" },
      recordingDate: { type: "string" },
      instrumentNumber: { type: "string" },
      bookAndPage: { type: "string" },
      recorded: { type: "boolean" },
      parties: {
        type: "array",
        items: { type: "string" },
      },
      confidence: { type: "number" },
      page: pageSchema(),
      supportingText: { type: "string" },
    },
    required: [
      "instrumentType",
      "recordingOffice",
      "recordingDate",
      "instrumentNumber",
      "bookAndPage",
      "recorded",
      "parties",
      "confidence",
      "page",
      "supportingText",
    ],
  };
}

function possessionSchema() {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      possessionType: { type: "string" },
      partyReceivingPossession: { type: "string" },
      possessionDate: { type: "string" },
      possessionTime: { type: "string" },
      conditions: { type: "string" },
      statedStatus: { type: "string" },
      confidence: { type: "number" },
      page: pageSchema(),
      supportingText: { type: "string" },
    },
    required: [
      "possessionType",
      "partyReceivingPossession",
      "possessionDate",
      "possessionTime",
      "conditions",
      "statedStatus",
      "confidence",
      "page",
      "supportingText",
    ],
  };
}

function terminationSchema() {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      terminationType: { type: "string" },
      terminatingParty: { type: "string" },
      receivingParty: { type: "string" },
      terminationDate: { type: "string" },
      effectiveDate: { type: "string" },
      reason: { type: "string" },
      earnestMoneyDisposition: { type: "string" },
      executionEvidence: { type: "string" },
      deliveryEvidence: { type: "string" },
      confidence: { type: "number" },
      page: pageSchema(),
      supportingText: { type: "string" },
    },
    required: [
      "terminationType",
      "terminatingParty",
      "receivingParty",
      "terminationDate",
      "effectiveDate",
      "reason",
      "earnestMoneyDisposition",
      "executionEvidence",
      "deliveryEvidence",
      "confidence",
      "page",
      "supportingText",
    ],
  };
}

function settlementSchema() {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      settlementDocumentType: { type: "string" },
      settlementDate: { type: "string" },
      disbursementDate: { type: "string" },
      settlementAgent: { type: "string" },
      buyerSigned: { type: "boolean" },
      sellerSigned: { type: "boolean" },
      fundsShownAsDisbursed: { type: "boolean" },
      finalFiguresShown: { type: "boolean" },
      statedStatus: { type: "string" },
      confidence: { type: "number" },
      page: pageSchema(),
      supportingText: { type: "string" },
    },
    required: [
      "settlementDocumentType",
      "settlementDate",
      "disbursementDate",
      "settlementAgent",
      "buyerSigned",
      "sellerSigned",
      "fundsShownAsDisbursed",
      "finalFiguresShown",
      "statedStatus",
      "confidence",
      "page",
      "supportingText",
    ],
  };
}

function titleSchema() {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      titleEvidenceType: { type: "string" },
      grantor: { type: "string" },
      grantee: { type: "string" },
      vesting: { type: "string" },
      instrumentDate: { type: "string" },
      effectiveDate: { type: "string" },
      recorded: { type: "boolean" },
      recordingReference: { type: "string" },
      confidence: { type: "number" },
      page: pageSchema(),
      supportingText: { type: "string" },
    },
    required: [
      "titleEvidenceType",
      "grantor",
      "grantee",
      "vesting",
      "instrumentDate",
      "effectiveDate",
      "recorded",
      "recordingReference",
      "confidence",
      "page",
      "supportingText",
    ],
  };
}

function riskSchema() {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      riskType: { type: "string" },
      severity: { type: "string" },
      description: { type: "string" },
      affectedParty: { type: "string" },
      relatedDeadline: { type: "string" },
      documentLanguage: { type: "string" },
      confidence: { type: "number" },
      page: pageSchema(),
      supportingText: { type: "string" },
    },
    required: [
      "riskType",
      "severity",
      "description",
      "affectedParty",
      "relatedDeadline",
      "documentLanguage",
      "confidence",
      "page",
      "supportingText",
    ],
  };
}

function generalFactSchema() {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      factType: { type: "string" },
      name: { type: "string" },
      value: nullablePrimitiveSchema(),
      relatedParty: { type: "string" },
      relatedClause: { type: "string" },
      confidence: { type: "number" },
      page: pageSchema(),
      supportingText: { type: "string" },
    },
    required: [
      "factType",
      "name",
      "value",
      "relatedParty",
      "relatedClause",
      "confidence",
      "page",
      "supportingText",
    ],
  };
}

function evidenceFactSchema() {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      name: { type: "string" },
      value: nullablePrimitiveSchema(),
    },
    required: ["name", "value"],
  };
}

function evidenceRecordSchema() {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      type: {
        type: "string",
        enum: Object.values(EVIDENCE_TYPES),
      },
      category: { type: "string" },
      key: { type: "string" },
      value: nullablePrimitiveSchema(),
      confidence: { type: "number" },
      page: pageSchema(),
      supportingText: { type: "string" },
      eventDate: { type: "string" },
      facts: {
        type: "array",
        items: evidenceFactSchema(),
      },
    },
    required: [
      "type",
      "category",
      "key",
      "value",
      "confidence",
      "page",
      "supportingText",
      "eventDate",
      "facts",
    ],
  };
}

/* ------------------------------------------------------------------
   Complete Response Schema
------------------------------------------------------------------- */

function universalDocumentJsonSchema() {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      schemaVersion: { type: "number" },
      classification: classificationSchema(),
      parties: { type: "array", items: partySchema() },
      properties: { type: "array", items: propertySchema() },
      dates: { type: "array", items: dateSchema() },
      amounts: { type: "array", items: amountSchema() },
      signatures: { type: "array", items: signatureSchema() },
      initials: { type: "array", items: initialSchema() },
      checkboxes: { type: "array", items: checkboxSchema() },
      handwrittenTerms: {
        type: "array",
        items: handwrittenTermSchema(),
      },
      obligations: { type: "array", items: obligationSchema() },
      contingencies: { type: "array", items: contingencySchema() },
      amendments: { type: "array", items: amendmentSchema() },
      notices: { type: "array", items: noticeSchema() },
      approvals: { type: "array", items: approvalSchema() },
      waivers: { type: "array", items: waiverSchema() },
      receipts: { type: "array", items: receiptSchema() },
      funding: { type: "array", items: fundingSchema() },
      recordings: { type: "array", items: recordingSchema() },
      possession: { type: "array", items: possessionSchema() },
      terminations: { type: "array", items: terminationSchema() },
      settlements: { type: "array", items: settlementSchema() },
      titleEvidence: { type: "array", items: titleSchema() },
      risks: { type: "array", items: riskSchema() },
      facts: { type: "array", items: generalFactSchema() },
      evidence: { type: "array", items: evidenceRecordSchema() },
      summary: { type: "string" },
    },
    required: [
      "schemaVersion",
      "classification",
      "parties",
      "properties",
      "dates",
      "amounts",
      "signatures",
      "initials",
      "checkboxes",
      "handwrittenTerms",
      "obligations",
      "contingencies",
      "amendments",
      "notices",
      "approvals",
      "waivers",
      "receipts",
      "funding",
      "recordings",
      "possession",
      "terminations",
      "settlements",
      "titleEvidence",
      "risks",
      "facts",
      "evidence",
      "summary",
    ],
  };
}

const UNIVERSAL_DOCUMENT_RESPONSE_SCHEMA = universalDocumentJsonSchema();

/* ------------------------------------------------------------------
   Result Sanitization

   This performs shape protection only. It does not reconcile,
   deduplicate, rank, supersede, or canonicalize evidence. Those are
   Evidence Engine responsibilities.
------------------------------------------------------------------- */

const ARRAY_FIELDS = Object.freeze([
  "parties",
  "properties",
  "dates",
  "amounts",
  "signatures",
  "initials",
  "checkboxes",
  "handwrittenTerms",
  "obligations",
  "contingencies",
  "amendments",
  "notices",
  "approvals",
  "waivers",
  "receipts",
  "funding",
  "recordings",
  "possession",
  "terminations",
  "settlements",
  "titleEvidence",
  "risks",
  "facts",
]);

function sanitizeClassification(classification) {
  const source =
    classification && typeof classification === "object" ? classification : {};

  const jurisdiction =
    source.jurisdiction && typeof source.jurisdiction === "object"
      ? source.jurisdiction
      : {};

  return {
    documentFamily: normalizeString(source.documentFamily),
    documentType: normalizeString(source.documentType),
    documentPurpose: normalizeString(source.documentPurpose),
    documentEffect: normalizeString(source.documentEffect),
    confidence: normalizeConfidence(source.confidence),
    supportingText: normalizeString(source.supportingText),
    jurisdiction: {
      country: normalizeString(jurisdiction.country),
      stateOrProvince: normalizeString(jurisdiction.stateOrProvince),
      countyOrRegion: normalizeString(jurisdiction.countyOrRegion),
      city: normalizeString(jurisdiction.city),
    },
  };
}

function sanitizeUniversalDocumentResult(result = {}, sourceDocumentId = null) {
  const sanitized = {
    schemaVersion: SCHEMA_VERSION,
    classification: sanitizeClassification(result.classification),
    summary: normalizeString(result.summary),
  };

  ARRAY_FIELDS.forEach((field) => {
    sanitized[field] = ensureArray(result[field]);
  });

  sanitized.evidence = ensureArray(result.evidence)
    .map((record) => normalizeEvidenceRecord(record, sourceDocumentId))
    .filter(isUsableEvidenceRecord);

  return sanitized;
}

/* ------------------------------------------------------------------
   Party Evidence Conversion
------------------------------------------------------------------- */

function buildEvidenceFromParties(parties = [], sourceDocumentId = null) {
  const records = [];

  ensureArray(parties).forEach((party) => {
    const confidence = normalizeConfidence(party.confidence);
    const page = normalizePage(party.page);
    const supportingText = normalizeString(party.supportingText);

    if (normalizeString(party.name)) {
      records.push(
        createEvidenceRecord({
          type: EVIDENCE_TYPES.PARTY,
          category: "party",
          key: normalizeString(party.role) || "party",
          value: normalizeString(party.name),
          confidence,
          page,
          supportingText,
          sourceDocumentId,
          facts: [
            {
              name: "organization",
              value: normalizeString(party.organization),
            },
            {
              name: "address",
              value: normalizeString(party.address),
            },
            {
              name: "email",
              value: normalizeString(party.email),
            },
            {
              name: "phone",
              value: normalizeString(party.phone),
            },
          ],
        }),
      );
    }
  });

  return records;
}

/* ------------------------------------------------------------------
   Property Evidence Conversion
------------------------------------------------------------------- */

function buildEvidenceFromProperties(properties = [], sourceDocumentId = null) {
  const records = [];

  ensureArray(properties).forEach((property) => {
    const confidence = normalizeConfidence(property.confidence);
    const page = normalizePage(property.page);
    const supportingText = normalizeString(property.supportingText);

    if (normalizeString(property.address)) {
      records.push(
        createEvidenceRecord({
          type: EVIDENCE_TYPES.PROPERTY,
          category: "property",
          key: "address",
          value: normalizeString(property.address),
          confidence,
          page,
          supportingText,
          sourceDocumentId,
          facts: [
            {
              name: "legalDescription",
              value: normalizeString(property.legalDescription),
            },
            {
              name: "parcelNumber",
              value: normalizeString(property.parcelNumber),
            },
            {
              name: "propertyType",
              value: normalizeString(property.propertyType),
            },
            {
              name: "unitNumber",
              value: normalizeString(property.unitNumber),
            },
          ],
        }),
      );
    }
  });

  return records;
}

/* ------------------------------------------------------------------
   Date Evidence Conversion
------------------------------------------------------------------- */

function buildEvidenceFromDates(dates = [], sourceDocumentId = null) {
  const records = [];

  ensureArray(dates).forEach((item) => {
    const confidence = normalizeConfidence(item.confidence);
    const page = normalizePage(item.page);
    const supportingText = normalizeString(item.supportingText);

    if (!normalizeString(item.dateType)) {
      return;
    }

    records.push(
      createEvidenceRecord({
        type: EVIDENCE_TYPES.DATE,
        category: "date",
        key: normalizeString(item.dateType),
        value: normalizeString(item.value),
        confidence,
        page,
        supportingText,
        sourceDocumentId,
        eventDate: normalizeString(item.value),
        facts: [
          {
            name: "deadline",
            value: normalizeBoolean(item.isDeadline),
          },
          {
            name: "responsibleParty",
            value: normalizeString(item.responsibleParty),
          },
          {
            name: "relatedClause",
            value: normalizeString(item.relatedClause),
          },
        ],
      }),
    );
  });

  return records;
}

/* ------------------------------------------------------------------
   Money Evidence Conversion
------------------------------------------------------------------- */

function buildEvidenceFromAmounts(amounts = [], sourceDocumentId = null) {
  const records = [];

  ensureArray(amounts).forEach((item) => {
    const confidence = normalizeConfidence(item.confidence);
    const page = normalizePage(item.page);
    const supportingText = normalizeString(item.supportingText);

    if (!normalizeString(item.amountType)) {
      return;
    }

    records.push(
      createEvidenceRecord({
        type: EVIDENCE_TYPES.MONEY,
        category: "money",
        key: normalizeString(item.amountType),
        value: normalizeNumber(item.value),
        confidence,
        page,
        supportingText,
        sourceDocumentId,
        facts: [
          {
            name: "currency",
            value: normalizeString(item.currency),
          },
          {
            name: "payer",
            value: normalizeString(item.payer),
          },
          {
            name: "payee",
            value: normalizeString(item.payee),
          },
          {
            name: "relatedClause",
            value: normalizeString(item.relatedClause),
          },
        ],
      }),
    );
  });

  return records;
}

/* ------------------------------------------------------------------
   Signature Evidence Conversion
------------------------------------------------------------------- */

function buildEvidenceFromSignatures(signatures = [], sourceDocumentId = null) {
  const records = [];

  ensureArray(signatures).forEach((signature) => {
    const confidence = normalizeConfidence(signature.confidence);
    const page = normalizePage(signature.page);
    const supportingText = normalizeString(signature.supportingText);

    if (!normalizeString(signature.signerName)) {
      return;
    }

    records.push(
      createEvidenceRecord({
        type: EVIDENCE_TYPES.SIGNATURE,
        category: "signature",
        key: normalizeString(signature.signerRole),
        value: normalizeString(signature.signerName),
        confidence,
        page,
        supportingText,
        sourceDocumentId,
        eventDate: normalizeString(signature.signedDate),
        facts: [
          {
            name: "signed",
            value: normalizeBoolean(signature.signed),
          },
          {
            name: "method",
            value: normalizeString(signature.signatureMethod),
          },
          {
            name: "location",
            value: normalizeString(signature.signatureLocation),
          },
        ],
      }),
    );
  });

  return records;
}

/* ------------------------------------------------------------------
   Initial Evidence Conversion
------------------------------------------------------------------- */

function buildEvidenceFromInitials(initials = [], sourceDocumentId = null) {
  const records = [];

  ensureArray(initials).forEach((item) => {
    const confidence = normalizeConfidence(item.confidence);
    const page = normalizePage(item.page);
    const supportingText = normalizeString(item.supportingText);

    if (!normalizeString(item.person)) {
      return;
    }

    records.push(
      createEvidenceRecord({
        type: EVIDENCE_TYPES.INITIAL,
        category: "initial",
        key: normalizeString(item.locationOrClause) || "initial",
        value: normalizeString(item.person),
        confidence,
        page,
        supportingText,
        sourceDocumentId,
        facts: [
          {
            name: "detected",
            value: normalizeBoolean(item.detected),
          },
        ],
      }),
    );
  });

  return records;
}

/* ------------------------------------------------------------------
   Checkbox Evidence Conversion
------------------------------------------------------------------- */

function buildEvidenceFromCheckboxes(checkboxes = [], sourceDocumentId = null) {
  const records = [];

  ensureArray(checkboxes).forEach((item) => {
    const confidence = normalizeConfidence(item.confidence);
    const page = normalizePage(item.page);
    const supportingText = normalizeString(item.supportingText);

    if (!normalizeString(item.label)) {
      return;
    }

    records.push(
      createEvidenceRecord({
        type: EVIDENCE_TYPES.CHECKBOX,
        category: normalizeString(item.groupLabel) || "checkbox",
        key: normalizeString(item.label),
        value: normalizeBoolean(item.selected),
        confidence,
        page,
        supportingText,
        sourceDocumentId,
      }),
    );
  });

  return records;
}

/* ------------------------------------------------------------------
   Handwritten Evidence Conversion
------------------------------------------------------------------- */

function buildEvidenceFromHandwriting(
  handwrittenTerms = [],
  sourceDocumentId = null,
) {
  const records = [];

  ensureArray(handwrittenTerms).forEach((item) => {
    const confidence = normalizeConfidence(item.confidence);
    const page = normalizePage(item.page);
    const supportingText = normalizeString(item.supportingText);

    if (!normalizeString(item.text)) {
      return;
    }

    records.push(
      createEvidenceRecord({
        type: EVIDENCE_TYPES.HANDWRITING,
        category: "handwriting",
        key: normalizeString(item.locationOrClause),
        value: normalizeString(item.text),
        confidence,
        page,
        supportingText,
        sourceDocumentId,
        facts: [
          {
            name: "purpose",
            value: normalizeString(item.apparentPurpose),
          },
          {
            name: "crossedOutText",
            value: normalizeString(item.crossedOutText),
          },
        ],
      }),
    );
  });

  return records;
}

/* ------------------------------------------------------------------
   Obligation Evidence Conversion
------------------------------------------------------------------- */

function buildEvidenceFromObligations(
  obligations = [],
  sourceDocumentId = null,
) {
  const records = [];

  ensureArray(obligations).forEach((item) => {
    const confidence = normalizeConfidence(item.confidence);
    const page = normalizePage(item.page);
    const supportingText = normalizeString(item.supportingText);

    if (!normalizeString(item.obligation)) {
      return;
    }

    records.push(
      createEvidenceRecord({
        type: EVIDENCE_TYPES.OBLIGATION,
        category: "obligation",
        key: normalizeString(item.responsibleParty),
        value: normalizeString(item.obligation),
        confidence,
        page,
        supportingText,
        sourceDocumentId,
        eventDate: normalizeString(item.dueDate),
        facts: [
          {
            name: "status",
            value: normalizeString(item.statedStatus),
          },
          {
            name: "condition",
            value: normalizeString(item.condition),
          },
        ],
      }),
    );
  });

  return records;
}

/* ------------------------------------------------------------------
   Contingency Evidence Conversion
------------------------------------------------------------------- */

function buildEvidenceFromContingencies(
  contingencies = [],
  sourceDocumentId = null,
) {
  const records = [];

  ensureArray(contingencies).forEach((item) => {
    const confidence = normalizeConfidence(item.confidence);
    const page = normalizePage(item.page);
    const supportingText = normalizeString(item.supportingText);

    if (!normalizeString(item.contingencyType)) {
      return;
    }

    records.push(
      createEvidenceRecord({
        type: EVIDENCE_TYPES.CONTINGENCY,
        category: "contingency",
        key: normalizeString(item.contingencyType),
        value: normalizeString(item.terms),
        confidence,
        page,
        supportingText,
        sourceDocumentId,
        eventDate: normalizeString(item.deadline),
        facts: [
          {
            name: "beneficiary",
            value: normalizeString(item.beneficiary),
          },
          {
            name: "disposition",
            value: normalizeString(item.statedDisposition),
          },
        ],
      }),
    );
  });

  return records;
}

/* ------------------------------------------------------------------
   Amendment Evidence Conversion
------------------------------------------------------------------- */

function buildEvidenceFromAmendments(amendments = [], sourceDocumentId = null) {
  const records = [];

  ensureArray(amendments).forEach((item) => {
    const confidence = normalizeConfidence(item.confidence);
    const page = normalizePage(item.page);
    const supportingText = normalizeString(item.supportingText);

    if (!normalizeString(item.changedTerm)) {
      return;
    }

    records.push(
      createEvidenceRecord({
        type: EVIDENCE_TYPES.AMENDMENT,
        category: "amendment",
        key: normalizeString(item.changedTerm),
        value: normalizePrimitive(item.newValue),
        confidence,
        page,
        supportingText,
        sourceDocumentId,
        eventDate: normalizeString(item.effectiveDate),
        facts: [
          {
            name: "previousValue",
            value: normalizePrimitive(item.priorValue),
          },
          {
            name: "executionEvidence",
            value: normalizeString(item.executionEvidence),
          },
        ],
      }),
    );
  });

  return records;
}

/* ------------------------------------------------------------------
   Notice Evidence Conversion
------------------------------------------------------------------- */

function buildEvidenceFromNotices(notices = [], sourceDocumentId = null) {
  const records = [];

  ensureArray(notices).forEach((item) => {
    const confidence = normalizeConfidence(item.confidence);
    const page = normalizePage(item.page);
    const supportingText = normalizeString(item.supportingText);

    if (!normalizeString(item.noticeType)) {
      return;
    }

    records.push(
      createEvidenceRecord({
        type: EVIDENCE_TYPES.NOTICE,
        category: "notice",
        key: normalizeString(item.noticeType),
        value: normalizeString(item.statedEffect),
        confidence,
        page,
        supportingText,
        sourceDocumentId,
        eventDate: normalizeString(item.noticeDate),
        facts: [
          {
            name: "sender",
            value: normalizeString(item.sender),
          },
          {
            name: "recipient",
            value: normalizeString(item.recipient),
          },
          {
            name: "deliveryMethod",
            value: normalizeString(item.deliveryMethod),
          },
        ],
      }),
    );
  });

  return records;
}

/* ------------------------------------------------------------------
   Approval Evidence Conversion
------------------------------------------------------------------- */

function buildEvidenceFromApprovals(approvals = [], sourceDocumentId = null) {
  const records = [];

  ensureArray(approvals).forEach((item) => {
    const confidence = normalizeConfidence(item.confidence);
    const page = normalizePage(item.page);
    const supportingText = normalizeString(item.supportingText);

    if (!normalizeString(item.approvalType)) {
      return;
    }

    records.push(
      createEvidenceRecord({
        type: EVIDENCE_TYPES.APPROVAL,
        category: "approval",
        key: normalizeString(item.approvalType),
        value: normalizeBoolean(item.approved),
        confidence,
        page,
        supportingText,
        sourceDocumentId,
        eventDate: normalizeString(item.approvalDate),
        facts: [
          {
            name: "approvingParty",
            value: normalizeString(item.approvingParty),
          },
          {
            name: "conditions",
            value: normalizeString(item.conditions),
          },
        ],
      }),
    );
  });

  return records;
}

/* ------------------------------------------------------------------
   Waiver Evidence Conversion
------------------------------------------------------------------- */

function buildEvidenceFromWaivers(waivers = [], sourceDocumentId = null) {
  const records = [];

  ensureArray(waivers).forEach((item) => {
    const confidence = normalizeConfidence(item.confidence);
    const page = normalizePage(item.page);
    const supportingText = normalizeString(item.supportingText);

    if (!normalizeString(item.waiverType)) {
      return;
    }

    records.push(
      createEvidenceRecord({
        type: EVIDENCE_TYPES.WAIVER,
        category: "waiver",
        key: normalizeString(item.waiverType),
        value: normalizeBoolean(item.waived),
        confidence,
        page,
        supportingText,
        sourceDocumentId,
        eventDate: normalizeString(item.waiverDate),
        facts: [
          {
            name: "waivingParty",
            value: normalizeString(item.waivingParty),
          },
          {
            name: "scope",
            value: normalizeString(item.scope),
          },
        ],
      }),
    );
  });

  return records;
}

/* ------------------------------------------------------------------
   Receipt Evidence Conversion
------------------------------------------------------------------- */

function buildEvidenceFromReceipts(receipts = [], sourceDocumentId = null) {
  const records = [];

  ensureArray(receipts).forEach((item) => {
    const confidence = normalizeConfidence(item.confidence);
    const page = normalizePage(item.page);
    const supportingText = normalizeString(item.supportingText);

    if (!normalizeString(item.receiptType)) {
      return;
    }

    records.push(
      createEvidenceRecord({
        type: EVIDENCE_TYPES.RECEIPT,
        category: "receipt",
        key: normalizeString(item.receiptType),
        value: normalizeBoolean(item.acknowledged),
        confidence,
        page,
        supportingText,
        sourceDocumentId,
        eventDate: normalizeString(item.receivedDate),
        facts: [
          {
            name: "receivedBy",
            value: normalizeString(item.receivedBy),
          },
          {
            name: "providedBy",
            value: normalizeString(item.providedBy),
          },
          {
            name: "subject",
            value: normalizeString(item.subject),
          },
        ],
      }),
    );
  });

  return records;
}

/* ------------------------------------------------------------------
   Funding Evidence Conversion
------------------------------------------------------------------- */

function buildEvidenceFromFunding(funding = [], sourceDocumentId = null) {
  const records = [];

  ensureArray(funding).forEach((item) => {
    const confidence = normalizeConfidence(item.confidence);
    const page = normalizePage(item.page);
    const supportingText = normalizeString(item.supportingText);

    if (!normalizeString(item.fundingType)) {
      return;
    }

    records.push(
      createEvidenceRecord({
        type: EVIDENCE_TYPES.FUNDING,
        category: "funding",
        key: normalizeString(item.fundingType),
        value:
          item.amount === null || item.amount === undefined
            ? normalizeString(item.statedStatus)
            : normalizeNumber(item.amount),
        confidence,
        page,
        supportingText,
        sourceDocumentId,
        eventDate: normalizeString(item.fundingDate),
        facts: [
          {
            name: "lenderOrSource",
            value: normalizeString(item.lenderOrSource),
          },
          {
            name: "recipient",
            value: normalizeString(item.recipient),
          },
          {
            name: "currency",
            value: normalizeString(item.currency),
          },
          {
            name: "status",
            value: normalizeString(item.statedStatus),
          },
          {
            name: "referenceNumber",
            value: normalizeString(item.referenceNumber),
          },
        ],
      }),
    );
  });

  return records;
}

/* ------------------------------------------------------------------
   Recording Evidence Conversion
------------------------------------------------------------------- */

function buildEvidenceFromRecordings(recordings = [], sourceDocumentId = null) {
  const records = [];

  ensureArray(recordings).forEach((item) => {
    const confidence = normalizeConfidence(item.confidence);
    const page = normalizePage(item.page);
    const supportingText = normalizeString(item.supportingText);

    if (!normalizeString(item.instrumentType)) {
      return;
    }

    records.push(
      createEvidenceRecord({
        type: EVIDENCE_TYPES.RECORDING,
        category: "recording",
        key: normalizeString(item.instrumentType),
        value: normalizeBoolean(item.recorded),
        confidence,
        page,
        supportingText,
        sourceDocumentId,
        eventDate: normalizeString(item.recordingDate),
        facts: [
          {
            name: "recordingOffice",
            value: normalizeString(item.recordingOffice),
          },
          {
            name: "instrumentNumber",
            value: normalizeString(item.instrumentNumber),
          },
          {
            name: "bookAndPage",
            value: normalizeString(item.bookAndPage),
          },
          {
            name: "parties",
            value: ensureArray(item.parties)
              .map((party) => normalizeString(party))
              .filter(Boolean)
              .join(", "),
          },
        ],
      }),
    );
  });

  return records;
}

/* ------------------------------------------------------------------
   Possession Evidence Conversion
------------------------------------------------------------------- */

function buildEvidenceFromPossession(possession = [], sourceDocumentId = null) {
  const records = [];

  ensureArray(possession).forEach((item) => {
    const confidence = normalizeConfidence(item.confidence);
    const page = normalizePage(item.page);
    const supportingText = normalizeString(item.supportingText);

    if (!normalizeString(item.possessionType)) {
      return;
    }

    records.push(
      createEvidenceRecord({
        type: EVIDENCE_TYPES.POSSESSION,
        category: "possession",
        key: normalizeString(item.possessionType),
        value: normalizeString(item.statedStatus),
        confidence,
        page,
        supportingText,
        sourceDocumentId,
        eventDate: normalizeString(item.possessionDate),
        facts: [
          {
            name: "partyReceivingPossession",
            value: normalizeString(item.partyReceivingPossession),
          },
          {
            name: "possessionTime",
            value: normalizeString(item.possessionTime),
          },
          {
            name: "conditions",
            value: normalizeString(item.conditions),
          },
        ],
      }),
    );
  });

  return records;
}

/* ------------------------------------------------------------------
   Termination Evidence Conversion
------------------------------------------------------------------- */

function buildEvidenceFromTerminations(
  terminations = [],
  sourceDocumentId = null,
) {
  const records = [];

  ensureArray(terminations).forEach((item) => {
    const confidence = normalizeConfidence(item.confidence);
    const page = normalizePage(item.page);
    const supportingText = normalizeString(item.supportingText);

    if (!normalizeString(item.terminationType)) {
      return;
    }

    records.push(
      createEvidenceRecord({
        type: EVIDENCE_TYPES.TERMINATION,
        category: "termination",
        key: normalizeString(item.terminationType),
        value: normalizeString(item.reason),
        confidence,
        page,
        supportingText,
        sourceDocumentId,
        eventDate:
          normalizeString(item.effectiveDate) ||
          normalizeString(item.terminationDate),
        facts: [
          {
            name: "terminatingParty",
            value: normalizeString(item.terminatingParty),
          },
          {
            name: "receivingParty",
            value: normalizeString(item.receivingParty),
          },
          {
            name: "terminationDate",
            value: normalizeString(item.terminationDate),
          },
          {
            name: "earnestMoneyDisposition",
            value: normalizeString(item.earnestMoneyDisposition),
          },
          {
            name: "executionEvidence",
            value: normalizeString(item.executionEvidence),
          },
          {
            name: "deliveryEvidence",
            value: normalizeString(item.deliveryEvidence),
          },
        ],
      }),
    );
  });

  return records;
}

/* ------------------------------------------------------------------
   Settlement Evidence Conversion
------------------------------------------------------------------- */

function buildEvidenceFromSettlements(
  settlements = [],
  sourceDocumentId = null,
) {
  const records = [];

  ensureArray(settlements).forEach((item) => {
    const confidence = normalizeConfidence(item.confidence);
    const page = normalizePage(item.page);
    const supportingText = normalizeString(item.supportingText);

    if (!normalizeString(item.settlementDocumentType)) {
      return;
    }

    records.push(
      createEvidenceRecord({
        type: EVIDENCE_TYPES.SETTLEMENT,
        category: "settlement",
        key: normalizeString(item.settlementDocumentType),
        value: normalizeString(item.statedStatus),
        confidence,
        page,
        supportingText,
        sourceDocumentId,
        eventDate:
          normalizeString(item.disbursementDate) ||
          normalizeString(item.settlementDate),
        facts: [
          {
            name: "settlementAgent",
            value: normalizeString(item.settlementAgent),
          },
          {
            name: "buyerSigned",
            value: normalizeBoolean(item.buyerSigned),
          },
          {
            name: "sellerSigned",
            value: normalizeBoolean(item.sellerSigned),
          },
          {
            name: "fundsShownAsDisbursed",
            value: normalizeBoolean(item.fundsShownAsDisbursed),
          },
          {
            name: "finalFiguresShown",
            value: normalizeBoolean(item.finalFiguresShown),
          },
        ],
      }),
    );
  });

  return records;
}

/* ------------------------------------------------------------------
   Title Evidence Conversion
------------------------------------------------------------------- */

function buildEvidenceFromTitle(titleEvidence = [], sourceDocumentId = null) {
  const records = [];

  ensureArray(titleEvidence).forEach((item) => {
    const confidence = normalizeConfidence(item.confidence);
    const page = normalizePage(item.page);
    const supportingText = normalizeString(item.supportingText);

    if (!normalizeString(item.titleEvidenceType)) {
      return;
    }

    records.push(
      createEvidenceRecord({
        type: EVIDENCE_TYPES.TITLE,
        category: "title",
        key: normalizeString(item.titleEvidenceType),
        value: normalizeString(item.vesting),
        confidence,
        page,
        supportingText,
        sourceDocumentId,
        eventDate:
          normalizeString(item.effectiveDate) ||
          normalizeString(item.instrumentDate),
        facts: [
          {
            name: "grantor",
            value: normalizeString(item.grantor),
          },
          {
            name: "grantee",
            value: normalizeString(item.grantee),
          },
          {
            name: "recorded",
            value: normalizeBoolean(item.recorded),
          },
          {
            name: "recordingReference",
            value: normalizeString(item.recordingReference),
          },
        ],
      }),
    );
  });

  return records;
}

/* ------------------------------------------------------------------
   Risk Evidence Conversion
------------------------------------------------------------------- */

function buildEvidenceFromRisks(risks = [], sourceDocumentId = null) {
  const records = [];

  ensureArray(risks).forEach((item) => {
    const confidence = normalizeConfidence(item.confidence);
    const page = normalizePage(item.page);
    const supportingText = normalizeString(item.supportingText);

    if (!normalizeString(item.riskType)) {
      return;
    }

    records.push(
      createEvidenceRecord({
        type: EVIDENCE_TYPES.RISK,
        category: normalizeString(item.severity) || "risk",
        key: normalizeString(item.riskType),
        value: normalizeString(item.description),
        confidence,
        page,
        supportingText,
        sourceDocumentId,
        eventDate: normalizeString(item.relatedDeadline),
        facts: [
          {
            name: "affectedParty",
            value: normalizeString(item.affectedParty),
          },
          {
            name: "documentLanguage",
            value: normalizeString(item.documentLanguage),
          },
        ],
      }),
    );
  });

  return records;
}

/* ------------------------------------------------------------------
   General Fact Evidence Conversion
------------------------------------------------------------------- */

function buildEvidenceFromFacts(facts = [], sourceDocumentId = null) {
  const records = [];

  ensureArray(facts).forEach((item) => {
    const confidence = normalizeConfidence(item.confidence);
    const page = normalizePage(item.page);
    const supportingText = normalizeString(item.supportingText);

    if (!normalizeString(item.name)) {
      return;
    }

    records.push(
      createEvidenceRecord({
        type: EVIDENCE_TYPES.FACT,
        category: normalizeString(item.factType) || "fact",
        key: normalizeString(item.name),
        value: normalizePrimitive(item.value),
        confidence,
        page,
        supportingText,
        sourceDocumentId,
        facts: [
          {
            name: "relatedParty",
            value: normalizeString(item.relatedParty),
          },
          {
            name: "relatedClause",
            value: normalizeString(item.relatedClause),
          },
        ],
      }),
    );
  });

  return records;
}

/* ------------------------------------------------------------------
   AI-Provided Evidence Conversion

   The AI may return evidence records directly in addition to the
   structured observation sections. These records are normalized here
   before they are combined with evidence derived from those sections.
------------------------------------------------------------------- */

function buildEvidenceFromDirectEvidence(
  evidence = [],
  sourceDocumentId = null,
) {
  return ensureArray(evidence)
    .map((record) => normalizeEvidenceRecord(record, sourceDocumentId))
    .filter(isUsableEvidenceRecord);
}

/* ------------------------------------------------------------------
   Classification Evidence Conversion
------------------------------------------------------------------- */

function buildEvidenceFromClassification(
  classification = {},
  sourceDocumentId = null,
) {
  const records = [];

  if (!classification || typeof classification !== "object") {
    return records;
  }

  const confidence = normalizeConfidence(classification.confidence);

  const supportingText = normalizeString(classification.supportingText);

  if (normalizeString(classification.documentType)) {
    records.push(
      createEvidenceRecord({
        type: EVIDENCE_TYPES.DOCUMENT_CLASSIFICATION,
        category: "classification",
        key: "documentType",
        value: normalizeString(classification.documentType),
        confidence,
        supportingText,
        sourceDocumentId,
      }),
    );
  }

  if (normalizeString(classification.documentFamily)) {
    records.push(
      createEvidenceRecord({
        type: EVIDENCE_TYPES.DOCUMENT_CLASSIFICATION,
        category: "classification",
        key: "documentFamily",
        value: normalizeString(classification.documentFamily),
        confidence,
        supportingText,
        sourceDocumentId,
      }),
    );
  }

  if (normalizeString(classification.documentPurpose)) {
    records.push(
      createEvidenceRecord({
        type: EVIDENCE_TYPES.DOCUMENT_PURPOSE,
        category: "classification",
        key: "documentPurpose",
        value: normalizeString(classification.documentPurpose),
        confidence,
        supportingText,
        sourceDocumentId,
      }),
    );
  }

  if (normalizeString(classification.documentEffect)) {
    records.push(
      createEvidenceRecord({
        type: EVIDENCE_TYPES.DOCUMENT_EFFECT,
        category: "classification",
        key: "documentEffect",
        value: normalizeString(classification.documentEffect),
        confidence,
        supportingText,
        sourceDocumentId,
      }),
    );
  }

  return records;
}

/* ------------------------------------------------------------------
   Master Evidence Collection

   Every structured observation is converted into the common evidence
   record format.

   This function does not reconcile conflicts, select canonical facts,
   supersede earlier evidence, or determine transaction state.
------------------------------------------------------------------- */

const buildEvidenceFromClassificationRef = buildEvidenceFromClassification;

function deduplicateEvidence(records = []) {
  const seen = new Set();
  const output = [];

  ensureArray(records).forEach((record) => {
    if (!record || typeof record !== "object") {
      return;
    }

    const key = JSON.stringify({
      type: normalizeString(record.type),
      category: normalizeString(record.category),
      key: normalizeString(record.key),
      value: record.value,
      page: normalizePage(record.page),
      eventDate: normalizeString(record.eventDate),
      sourceDocumentId: record.sourceDocumentId || null,
      supportingText: normalizeString(record.supportingText),
    });

    if (seen.has(key)) {
      return;
    }

    seen.add(key);
    output.push(record);
  });

  return output;
}

function buildUniversalEvidenceCollection(
  analysis = {},
  sourceDocumentId = null,
) {
  const records = [
    ...buildEvidenceFromClassificationRef(
      analysis.classification,
      sourceDocumentId,
    ),

    ...buildEvidenceFromParties(analysis.parties, sourceDocumentId),

    ...buildEvidenceFromProperties(analysis.properties, sourceDocumentId),

    ...buildEvidenceFromDates(analysis.dates, sourceDocumentId),

    ...buildEvidenceFromAmounts(analysis.amounts, sourceDocumentId),

    ...buildEvidenceFromSignatures(analysis.signatures, sourceDocumentId),

    ...buildEvidenceFromInitials(analysis.initials, sourceDocumentId),

    ...buildEvidenceFromCheckboxes(analysis.checkboxes, sourceDocumentId),

    ...buildEvidenceFromHandwriting(
      analysis.handwrittenTerms,
      sourceDocumentId,
    ),

    ...buildEvidenceFromObligations(analysis.obligations, sourceDocumentId),

    ...buildEvidenceFromContingencies(analysis.contingencies, sourceDocumentId),

    ...buildEvidenceFromAmendments(analysis.amendments, sourceDocumentId),

    ...buildEvidenceFromNotices(analysis.notices, sourceDocumentId),

    ...buildEvidenceFromApprovals(analysis.approvals, sourceDocumentId),

    ...buildEvidenceFromWaivers(analysis.waivers, sourceDocumentId),

    ...buildEvidenceFromReceipts(analysis.receipts, sourceDocumentId),

    ...buildEvidenceFromFunding(analysis.funding, sourceDocumentId),

    ...buildEvidenceFromRecordings(analysis.recordings, sourceDocumentId),

    ...buildEvidenceFromPossession(analysis.possession, sourceDocumentId),

    ...buildEvidenceFromTerminations(analysis.terminations, sourceDocumentId),

    ...buildEvidenceFromSettlements(analysis.settlements, sourceDocumentId),

    ...buildEvidenceFromTitle(analysis.titleEvidence, sourceDocumentId),

    ...buildEvidenceFromRisks(analysis.risks, sourceDocumentId),

    ...buildEvidenceFromFacts(analysis.facts, sourceDocumentId),

    ...buildEvidenceFromDirectEvidence(analysis.evidence, sourceDocumentId),
  ];

  return deduplicateEvidence(records.filter(isUsableEvidenceRecord));
}

/* ------------------------------------------------------------------
   Classification Normalization
------------------------------------------------------------------- */

function normalizeJurisdiction(value = {}) {
  const jurisdiction = value && typeof value === "object" ? value : {};

  return {
    country: normalizeString(jurisdiction.country),

    stateOrProvince: normalizeString(jurisdiction.stateOrProvince),

    countyOrRegion: normalizeString(jurisdiction.countyOrRegion),

    city: normalizeString(jurisdiction.city),
  };
}

function normalizeClassification(value = {}) {
  const classification = value && typeof value === "object" ? value : {};

  return {
    documentFamily: normalizeString(classification.documentFamily),

    documentType: normalizeString(classification.documentType),

    documentPurpose: normalizeString(classification.documentPurpose),

    documentEffect: normalizeString(classification.documentEffect),

    confidence: normalizeConfidence(classification.confidence),

    supportingText: normalizeString(classification.supportingText),

    jurisdiction: normalizeJurisdiction(classification.jurisdiction),
  };
}

/* ------------------------------------------------------------------
   Structured Collection Normalization
------------------------------------------------------------------- */

function normalizeStructuredCollection(collection, normalizer) {
  return ensureArray(collection)
    .map((item) => normalizer(item || {}))
    .filter(Boolean);
}

function normalizeParty(item = {}) {
  return {
    name: normalizeString(item.name),
    role: normalizeString(item.role),
    organization: normalizeString(item.organization),
    address: normalizeString(item.address),
    email: normalizeString(item.email),
    phone: normalizeString(item.phone),
    confidence: normalizeConfidence(item.confidence),
    page: normalizePage(item.page),
    supportingText: normalizeString(item.supportingText),
  };
}

function normalizeProperty(item = {}) {
  return {
    address: normalizeString(item.address),
    legalDescription: normalizeString(item.legalDescription),
    parcelNumber: normalizeString(item.parcelNumber),
    propertyType: normalizeString(item.propertyType),
    unitNumber: normalizeString(item.unitNumber),
    confidence: normalizeConfidence(item.confidence),
    page: normalizePage(item.page),
    supportingText: normalizeString(item.supportingText),
  };
}

function normalizeDateItem(item = {}) {
  return {
    dateType: normalizeString(item.dateType),
    value: normalizeString(item.value),
    isDeadline: normalizeBoolean(item.isDeadline),
    responsibleParty: normalizeString(item.responsibleParty),
    relatedClause: normalizeString(item.relatedClause),
    confidence: normalizeConfidence(item.confidence),
    page: normalizePage(item.page),
    supportingText: normalizeString(item.supportingText),
  };
}

function normalizeAmountItem(item = {}) {
  return {
    amountType: normalizeString(item.amountType),

    value:
      item.value === null || item.value === undefined || item.value === ""
        ? 0
        : normalizeNumber(item.value),

    currency: normalizeString(item.currency),
    payer: normalizeString(item.payer),
    payee: normalizeString(item.payee),
    relatedClause: normalizeString(item.relatedClause),
    confidence: normalizeConfidence(item.confidence),
    page: normalizePage(item.page),
    supportingText: normalizeString(item.supportingText),
  };
}

function normalizeSignature(item = {}) {
  return {
    signerName: normalizeString(item.signerName),
    signerRole: normalizeString(item.signerRole),
    signed: normalizeBoolean(item.signed),
    signedDate: normalizeString(item.signedDate),
    signatureMethod: normalizeString(item.signatureMethod),
    signatureLocation: normalizeString(item.signatureLocation),
    confidence: normalizeConfidence(item.confidence),
    page: normalizePage(item.page),
    supportingText: normalizeString(item.supportingText),
  };
}

function normalizeInitial(item = {}) {
  return {
    person: normalizeString(item.person),
    locationOrClause: normalizeString(item.locationOrClause),
    detected: normalizeBoolean(item.detected),
    confidence: normalizeConfidence(item.confidence),
    page: normalizePage(item.page),
    supportingText: normalizeString(item.supportingText),
  };
}

function normalizeCheckbox(item = {}) {
  return {
    label: normalizeString(item.label),
    selected: normalizeBoolean(item.selected),
    groupLabel: normalizeString(item.groupLabel),
    confidence: normalizeConfidence(item.confidence),
    page: normalizePage(item.page),
    supportingText: normalizeString(item.supportingText),
  };
}

function normalizeHandwrittenTerm(item = {}) {
  return {
    text: normalizeString(item.text),
    locationOrClause: normalizeString(item.locationOrClause),
    apparentPurpose: normalizeString(item.apparentPurpose),
    crossedOutText: normalizeString(item.crossedOutText),
    confidence: normalizeConfidence(item.confidence),
    page: normalizePage(item.page),
    supportingText: normalizeString(item.supportingText),
  };
}

function normalizeObligation(item = {}) {
  return {
    responsibleParty: normalizeString(item.responsibleParty),

    obligation: normalizeString(item.obligation),

    dueDate: normalizeString(item.dueDate),

    statedStatus: normalizeString(item.statedStatus),

    condition: normalizeString(item.condition),

    confidence: normalizeConfidence(item.confidence),

    page: normalizePage(item.page),

    supportingText: normalizeString(item.supportingText),
  };
}

function normalizeContingency(item = {}) {
  return {
    contingencyType: normalizeString(item.contingencyType),

    terms: normalizeString(item.terms),

    deadline: normalizeString(item.deadline),

    beneficiary: normalizeString(item.beneficiary),

    statedDisposition: normalizeString(item.statedDisposition),

    confidence: normalizeConfidence(item.confidence),

    page: normalizePage(item.page),

    supportingText: normalizeString(item.supportingText),
  };
}

function normalizeAmendment(item = {}) {
  return {
    changedTerm: normalizeString(item.changedTerm),

    priorValue: normalizePrimitive(item.priorValue),

    newValue: normalizePrimitive(item.newValue),

    effectiveDate: normalizeString(item.effectiveDate),

    executionEvidence: normalizeString(item.executionEvidence),

    confidence: normalizeConfidence(item.confidence),

    page: normalizePage(item.page),

    supportingText: normalizeString(item.supportingText),
  };
}

function normalizeNotice(item = {}) {
  return {
    noticeType: normalizeString(item.noticeType),

    noticeDate: normalizeString(item.noticeDate),

    sender: normalizeString(item.sender),

    recipient: normalizeString(item.recipient),

    deliveryMethod: normalizeString(item.deliveryMethod),

    statedEffect: normalizeString(item.statedEffect),

    confidence: normalizeConfidence(item.confidence),

    page: normalizePage(item.page),

    supportingText: normalizeString(item.supportingText),
  };
}

function normalizeApproval(item = {}) {
  return {
    approvalType: normalizeString(item.approvalType),

    approved: normalizeBoolean(item.approved),

    approvalDate: normalizeString(item.approvalDate),

    approvingParty: normalizeString(item.approvingParty),

    conditions: normalizeString(item.conditions),

    confidence: normalizeConfidence(item.confidence),

    page: normalizePage(item.page),

    supportingText: normalizeString(item.supportingText),
  };
}

function normalizeWaiver(item = {}) {
  return {
    waiverType: normalizeString(item.waiverType),

    waived: normalizeBoolean(item.waived),

    waiverDate: normalizeString(item.waiverDate),

    waivingParty: normalizeString(item.waivingParty),

    scope: normalizeString(item.scope),

    confidence: normalizeConfidence(item.confidence),

    page: normalizePage(item.page),

    supportingText: normalizeString(item.supportingText),
  };
}

function normalizeReceipt(item = {}) {
  return {
    receiptType: normalizeString(item.receiptType),

    acknowledged: normalizeBoolean(item.acknowledged),

    receivedDate: normalizeString(item.receivedDate),

    receivedBy: normalizeString(item.receivedBy),

    providedBy: normalizeString(item.providedBy),

    subject: normalizeString(item.subject),

    confidence: normalizeConfidence(item.confidence),

    page: normalizePage(item.page),

    supportingText: normalizeString(item.supportingText),
  };
}

function normalizeFundingItem(item = {}) {
  return {
    fundingType: normalizeString(item.fundingType),

    amount:
      item.amount === null || item.amount === undefined || item.amount === ""
        ? null
        : normalizeNumber(item.amount),

    currency: normalizeString(item.currency),

    lenderOrSource: normalizeString(item.lenderOrSource),

    recipient: normalizeString(item.recipient),

    fundingDate: normalizeString(item.fundingDate),

    statedStatus: normalizeString(item.statedStatus),

    referenceNumber: normalizeString(item.referenceNumber),

    confidence: normalizeConfidence(item.confidence),

    page: normalizePage(item.page),

    supportingText: normalizeString(item.supportingText),
  };
}

function normalizeRecording(item = {}) {
  return {
    instrumentType: normalizeString(item.instrumentType),

    recorded: normalizeBoolean(item.recorded),

    recordingDate: normalizeString(item.recordingDate),

    recordingOffice: normalizeString(item.recordingOffice),

    instrumentNumber: normalizeString(item.instrumentNumber),

    bookAndPage: normalizeString(item.bookAndPage),

    parties: ensureArray(item.parties)
      .map((party) => normalizeString(party))
      .filter(Boolean),

    confidence: normalizeConfidence(item.confidence),

    page: normalizePage(item.page),

    supportingText: normalizeString(item.supportingText),
  };
}

function normalizePossessionItem(item = {}) {
  return {
    possessionType: normalizeString(item.possessionType),

    possessionDate: normalizeString(item.possessionDate),

    possessionTime: normalizeString(item.possessionTime),

    partyReceivingPossession: normalizeString(item.partyReceivingPossession),

    statedStatus: normalizeString(item.statedStatus),

    conditions: normalizeString(item.conditions),

    confidence: normalizeConfidence(item.confidence),

    page: normalizePage(item.page),

    supportingText: normalizeString(item.supportingText),
  };
}

function normalizeTermination(item = {}) {
  return {
    terminationType: normalizeString(item.terminationType),

    terminationDate: normalizeString(item.terminationDate),

    effectiveDate: normalizeString(item.effectiveDate),

    terminatingParty: normalizeString(item.terminatingParty),

    receivingParty: normalizeString(item.receivingParty),

    reason: normalizeString(item.reason),

    earnestMoneyDisposition: normalizeString(item.earnestMoneyDisposition),

    executionEvidence: normalizeString(item.executionEvidence),

    deliveryEvidence: normalizeString(item.deliveryEvidence),

    confidence: normalizeConfidence(item.confidence),

    page: normalizePage(item.page),

    supportingText: normalizeString(item.supportingText),
  };
}

function normalizeSettlement(item = {}) {
  return {
    settlementDocumentType: normalizeString(item.settlementDocumentType),

    settlementDate: normalizeString(item.settlementDate),

    disbursementDate: normalizeString(item.disbursementDate),

    settlementAgent: normalizeString(item.settlementAgent),

    buyerSigned: normalizeBoolean(item.buyerSigned),

    sellerSigned: normalizeBoolean(item.sellerSigned),

    fundsShownAsDisbursed: normalizeBoolean(item.fundsShownAsDisbursed),

    finalFiguresShown: normalizeBoolean(item.finalFiguresShown),

    statedStatus: normalizeString(item.statedStatus),

    confidence: normalizeConfidence(item.confidence),

    page: normalizePage(item.page),

    supportingText: normalizeString(item.supportingText),
  };
}

function normalizeTitleEvidenceItem(item = {}) {
  return {
    titleEvidenceType: normalizeString(item.titleEvidenceType),

    instrumentDate: normalizeString(item.instrumentDate),

    effectiveDate: normalizeString(item.effectiveDate),

    grantor: normalizeString(item.grantor),

    grantee: normalizeString(item.grantee),

    vesting: normalizeString(item.vesting),

    recorded: normalizeBoolean(item.recorded),

    recordingReference: normalizeString(item.recordingReference),

    confidence: normalizeConfidence(item.confidence),

    page: normalizePage(item.page),

    supportingText: normalizeString(item.supportingText),
  };
}

function normalizeRisk(item = {}) {
  return {
    riskType: normalizeString(item.riskType),

    severity: normalizeString(item.severity),

    description: normalizeString(item.description),

    affectedParty: normalizeString(item.affectedParty),

    relatedDeadline: normalizeString(item.relatedDeadline),

    documentLanguage: normalizeString(item.documentLanguage),

    confidence: normalizeConfidence(item.confidence),

    page: normalizePage(item.page),

    supportingText: normalizeString(item.supportingText),
  };
}

function normalizeFact(item = {}) {
  return {
    factType: normalizeString(item.factType),

    name: normalizeString(item.name),

    value: normalizePrimitive(item.value),

    relatedParty: normalizeString(item.relatedParty),

    relatedClause: normalizeString(item.relatedClause),

    confidence: normalizeConfidence(item.confidence),

    page: normalizePage(item.page),

    supportingText: normalizeString(item.supportingText),
  };
}

/* ------------------------------------------------------------------
   Complete Analysis Normalization

   This produces a predictable document-observation structure before
   evidence records are generated.

   It does not infer transaction state or determine legal effect.
------------------------------------------------------------------- */

function normalizeUniversalAnalysis(analysis = {}, sourceDocumentId = null) {
  const input = analysis && typeof analysis === "object" ? analysis : {};

  const normalized = {
    schemaVersion:
      normalizeString(input.schemaVersion) || UNIVERSAL_DOCUMENT_SCHEMA_VERSION,

    engineVersion:
      normalizeString(input.engineVersion) || AI_DOCUMENT_ENGINE_VERSION,

    sourceDocumentId:
      normalizeString(sourceDocumentId) ||
      normalizeString(input.sourceDocumentId),

    classification: normalizeClassification(input.classification),

    summary: normalizeString(input.summary),

    language: normalizeString(input.language) || "English",

    pageCount: normalizePageCount(input.pageCount),

    parties: normalizeStructuredCollection(input.parties, normalizeParty),

    properties: normalizeStructuredCollection(
      input.properties,
      normalizeProperty,
    ),

    dates: normalizeStructuredCollection(input.dates, normalizeDateItem),

    amounts: normalizeStructuredCollection(input.amounts, normalizeAmountItem),

    signatures: normalizeStructuredCollection(
      input.signatures,
      normalizeSignature,
    ),

    initials: normalizeStructuredCollection(input.initials, normalizeInitial),

    checkboxes: normalizeStructuredCollection(
      input.checkboxes,
      normalizeCheckbox,
    ),

    handwrittenTerms: normalizeStructuredCollection(
      input.handwrittenTerms,
      normalizeHandwrittenTerm,
    ),

    obligations: normalizeStructuredCollection(
      input.obligations,
      normalizeObligation,
    ),

    contingencies: normalizeStructuredCollection(
      input.contingencies,
      normalizeContingency,
    ),

    amendments: normalizeStructuredCollection(
      input.amendments,
      normalizeAmendment,
    ),

    notices: normalizeStructuredCollection(input.notices, normalizeNotice),

    approvals: normalizeStructuredCollection(
      input.approvals,
      normalizeApproval,
    ),

    waivers: normalizeStructuredCollection(input.waivers, normalizeWaiver),

    receipts: normalizeStructuredCollection(input.receipts, normalizeReceipt),

    funding: normalizeStructuredCollection(input.funding, normalizeFundingItem),

    recordings: normalizeStructuredCollection(
      input.recordings,
      normalizeRecording,
    ),

    possession: normalizeStructuredCollection(
      input.possession,
      normalizePossessionItem,
    ),

    terminations: normalizeStructuredCollection(
      input.terminations,
      normalizeTermination,
    ),

    settlements: normalizeStructuredCollection(
      input.settlements,
      normalizeSettlement,
    ),

    titleEvidence: normalizeStructuredCollection(
      input.titleEvidence,
      normalizeTitleEvidenceItem,
    ),

    risks: normalizeStructuredCollection(input.risks, normalizeRisk),

    facts: normalizeStructuredCollection(input.facts, normalizeFact),

    evidence: ensureArray(input.evidence)
      .map((record) =>
        normalizeEvidenceRecord(
          record,
          normalizeString(sourceDocumentId) ||
            normalizeString(input.sourceDocumentId),
        ),
      )
      .filter(isUsableEvidenceRecord),

    extractionWarnings: ensureArray(input.extractionWarnings)
      .map((warning) => normalizeString(warning))
      .filter(Boolean),
  };

  return normalized;
}

/* ------------------------------------------------------------------
   Analysis Validation
------------------------------------------------------------------- */

function validateUniversalAnalysis(analysis = {}) {
  const errors = [];
  const warnings = [];

  if (!analysis || typeof analysis !== "object") {
    errors.push("Analysis must be an object.");

    return {
      valid: false,
      errors,
      warnings,
    };
  }

  if (!normalizeString(analysis.schemaVersion)) {
    errors.push("Analysis schemaVersion is missing.");
  }

  if (!normalizeString(analysis.engineVersion)) {
    errors.push("Analysis engineVersion is missing.");
  }

  if (!analysis.classification || typeof analysis.classification !== "object") {
    errors.push("Analysis classification is missing.");
  }

  const expectedCollections = [
    "parties",
    "properties",
    "dates",
    "amounts",
    "signatures",
    "initials",
    "checkboxes",
    "handwrittenTerms",
    "obligations",
    "contingencies",
    "amendments",
    "notices",
    "approvals",
    "waivers",
    "receipts",
    "funding",
    "recordings",
    "possession",
    "terminations",
    "settlements",
    "titleEvidence",
    "risks",
    "facts",
    "evidence",
    "extractionWarnings",
  ];

  expectedCollections.forEach((collectionName) => {
    if (!Array.isArray(analysis[collectionName])) {
      errors.push(`Analysis ${collectionName} must be an array.`);
    }
  });

  if (analysis.classification && typeof analysis.classification === "object") {
    if (!normalizeString(analysis.classification.documentFamily)) {
      warnings.push("Document family was not identified.");
    }

    if (!normalizeString(analysis.classification.documentType)) {
      warnings.push("Document type was not identified.");
    }
  }

  if (!normalizeString(analysis.summary)) {
    warnings.push("Document summary is empty.");
  }

  if (!analysis.evidence.length) {
    warnings.push("No usable evidence records were extracted.");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/* ------------------------------------------------------------------
   Source Document Input Normalization
------------------------------------------------------------------- */

function normalizeSourceDocumentInput(input = {}) {
  const source = input && typeof input === "object" ? input : {};

  const sourceDocumentId =
    normalizeString(source.sourceDocumentId) ||
    normalizeString(source.documentId) ||
    normalizeString(source.id) ||
    randomUUID();

  const extractedText =
    normalizeString(source.extractedText) ||
    normalizeString(source.text) ||
    normalizeString(source.content);

  const pageImages = ensureArray(source.pageImages || source.images).filter(
    Boolean,
  );

  const mimeType =
    normalizeString(source.mimeType) || normalizeString(source.type);

  const originalName =
    normalizeString(source.originalName) ||
    normalizeString(source.fileName) ||
    normalizeString(source.name);

  const pageCount =
    normalizePageCount(source.pageCount) || pageImages.length || null;

  return {
    sourceDocumentId,
    extractedText,
    pageImages,
    mimeType,
    originalName,
    pageCount,

    metadata: {
      uploadedAt:
        normalizeString(source.uploadedAt) || normalizeString(source.createdAt),

      fileSize:
        source.fileSize === null || source.fileSize === undefined
          ? null
          : normalizeNumber(source.fileSize),

      checksum: normalizeString(source.checksum),

      sourceSystem: normalizeString(source.sourceSystem),
    },
  };
}

/* ------------------------------------------------------------------
   Text Preparation

   The filename is retained as source metadata only. It must not be
   used as evidence or as a basis for document classification.
------------------------------------------------------------------- */

function prepareDocumentTextForAnalysis(sourceDocument = {}) {
  const text = normalizeString(sourceDocument.extractedText);

  if (!text) {
    return "";
  }

  return text
    .replace(/\u0000/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

/* ------------------------------------------------------------------
   OpenAI Content Construction
------------------------------------------------------------------- */

function buildTextContentBlock(text) {
  const normalizedText = normalizeString(text);

  if (!normalizedText) {
    return null;
  }

  return {
    type: "input_text",
    text: normalizedText,
  };
}

function buildImageContentBlock(image) {
  if (!image) {
    return null;
  }

  if (typeof image === "string") {
    const imageValue = image.trim();

    if (!imageValue) {
      return null;
    }

    return {
      type: "input_image",
      image_url: imageValue,
    };
  }

  if (typeof image !== "object") {
    return null;
  }

  const imageUrl =
    normalizeString(image.image_url) ||
    normalizeString(image.imageUrl) ||
    normalizeString(image.url) ||
    normalizeString(image.dataUrl);

  if (!imageUrl) {
    return null;
  }

  return {
    type: "input_image",
    image_url: imageUrl,
  };
}

function buildDocumentContent(sourceDocument = {}) {
  const content = [];

  const preparedText = prepareDocumentTextForAnalysis(sourceDocument);

  const textBlock = buildTextContentBlock(
    [
      "DOCUMENT CONTENT",
      "",
      preparedText ||
        "[No machine-readable text was available. Review the supplied page images.]",
    ].join("\n"),
  );

  if (textBlock) {
    content.push(textBlock);
  }

  ensureArray(sourceDocument.pageImages)
    .map(buildImageContentBlock)
    .filter(Boolean)
    .forEach((imageBlock) => {
      content.push(imageBlock);
    });

  return content;
}

/* ------------------------------------------------------------------
   System Instructions

   The Universal Document Engine extracts observations only.

   It must not determine transaction state, transaction health,
   closing confidence, risk level, recommended actions, priorities,
   tasks, semantic effects, or transaction events.
------------------------------------------------------------------- */

function buildUniversalDocumentSystemInstructions() {
  return [
    "You are the RapportLink Universal Document Intelligence Engine.",
    "",
    "Your only responsibility is to inspect the actual internal content of the supplied document and return structured observations and raw evidence.",
    "",
    "NON-NEGOTIABLE RULES:",
    "",
    "1. Use only information visible or readable inside the document.",
    "2. Do not infer facts from the filename, upload name, folder name, transaction record, or external context.",
    "3. Do not determine transaction state.",
    "4. Do not determine transaction health.",
    "5. Do not calculate closing confidence.",
    "6. Do not make recommendations, priorities, or tasks.",
    "7. Do not create semantic effects.",
    "8. Do not create transaction events.",
    "9. Do not decide which conflicting fact is authoritative.",
    "10. Do not reconcile amendments against earlier documents.",
    "11. Do not guess missing values.",
    "12. When a value is unclear, return an empty value and add an extraction warning.",
    "13. Preserve the distinction between typed text, handwriting, initials, signatures, checked boxes, unchecked boxes, crossed-out text, and added language.",
    "14. Report direct documentary observations even when they conflict with other observations.",
    "15. Supporting text must be brief and tied directly to the observation.",
    "16. Page numbers must reflect the page where the observation appears whenever the page can be identified.",
    "",
    "DOCUMENT REVIEW REQUIREMENTS:",
    "",
    "- Identify the document family, type, purpose, and apparent documentary effect as written.",
    "- Extract every named party and stated role.",
    "- Extract every property address, legal description, parcel number, unit number, and property type.",
    "- Extract every stated date and deadline.",
    "- Extract every stated monetary amount.",
    "- Detect signatures, initials, checkboxes, handwriting, crossed-out language, and inserted terms.",
    "- Extract obligations, contingencies, amendments, notices, approvals, waivers, acknowledgments, receipts, funding information, recording information, possession terms, termination language, settlement information, and title evidence.",
    "- Extract explicit risks or warnings written in the document, but do not independently assess transaction risk.",
    "- Create raw evidence records for material observations.",
    "",
    "Return only valid JSON matching the required response schema.",
  ].join("\n");
}

/* ------------------------------------------------------------------
   User Instructions
------------------------------------------------------------------- */

function buildUniversalDocumentUserInstructions(sourceDocument = {}) {
  const pageCount =
    sourceDocument.pageCount === null || sourceDocument.pageCount === undefined
      ? "Unknown"
      : String(sourceDocument.pageCount);

  return [
    "Analyze the supplied document content.",
    "",
    `Source document ID: ${sourceDocument.sourceDocumentId}`,
    `MIME type: ${sourceDocument.mimeType || "Unknown"}`,
    `Page count: ${pageCount}`,
    "",
    "The original filename is intentionally not provided as analytical context because document conclusions must be based only on internal document content.",
    "",
    "Return all visible and readable observations in the required structured format.",
  ].join("\n");
}

/* ------------------------------------------------------------------
   OpenAI Request Construction
------------------------------------------------------------------- */

function buildUniversalDocumentRequest(sourceDocument = {}, options = {}) {
  const model =
    normalizeString(options.model) ||
    normalizeString(process.env.OPENAI_DOCUMENT_MODEL) ||
    normalizeString(process.env.OPENAI_MODEL) ||
    "gpt-5";

  const userContent = [
    {
      type: "input_text",
      text: buildUniversalDocumentUserInstructions(sourceDocument),
    },

    ...buildDocumentContent(sourceDocument),
  ];

  return {
    model,

    instructions: buildUniversalDocumentSystemInstructions(),

    input: [
      {
        role: "user",
        content: userContent,
      },
    ],

    text: {
      format: {
        type: "json_schema",
        name: "rapportlink_universal_document_analysis",
        strict: true,
        schema: UNIVERSAL_DOCUMENT_RESPONSE_SCHEMA,
      },
    },
  };
}

/* ------------------------------------------------------------------
   OpenAI Response Text Extraction
------------------------------------------------------------------- */

function extractResponseText(response = {}) {
  if (!response || typeof response !== "object") {
    return "";
  }

  if (normalizeString(response.output_text)) {
    return normalizeString(response.output_text);
  }

  const textParts = [];

  ensureArray(response.output).forEach((outputItem) => {
    ensureArray(outputItem && outputItem.content).forEach((contentItem) => {
      if (!contentItem || typeof contentItem !== "object") {
        return;
      }

      if (typeof contentItem.text === "string") {
        textParts.push(contentItem.text);
        return;
      }

      if (
        contentItem.text &&
        typeof contentItem.text === "object" &&
        typeof contentItem.text.value === "string"
      ) {
        textParts.push(contentItem.text.value);
      }
    });
  });

  return textParts.join("\n").trim();
}

/* ------------------------------------------------------------------
   JSON Parsing
------------------------------------------------------------------- */

function stripJsonCodeFence(value) {
  const text = normalizeString(value);

  if (!text.startsWith("```")) {
    return text;
  }

  return text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}

function parseUniversalDocumentResponse(response = {}) {
  const responseText = extractResponseText(response);

  if (!responseText) {
    throw new Error("OpenAI returned no document analysis content.");
  }

  const cleanedText = stripJsonCodeFence(responseText);

  let parsed;

  try {
    parsed = JSON.parse(cleanedText);
  } catch (error) {
    const parsingError = new Error(
      "OpenAI returned document analysis that was not valid JSON.",
    );

    parsingError.cause = error;
    parsingError.responseText = cleanedText;

    throw parsingError;
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("OpenAI document analysis response was not an object.");
  }

  return parsed;
}

/* ------------------------------------------------------------------
   OpenAI Client Resolution
------------------------------------------------------------------- */

function resolveOpenAIClient(options = {}) {
  if (options.openaiClient && typeof options.openaiClient === "object") {
    return options.openaiClient;
  }

  let OpenAI;

  try {
    OpenAI = require("openai");
  } catch (error) {
    const dependencyError = new Error(
      'The "openai" package is required to analyze documents.',
    );

    dependencyError.cause = error;

    throw dependencyError;
  }

  const OpenAIConstructor = OpenAI.OpenAI || OpenAI.default || OpenAI;

  const apiKey =
    normalizeString(options.apiKey) ||
    normalizeString(process.env.OPENAI_API_KEY);

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  return new OpenAIConstructor({
    apiKey,
  });
}

/* ------------------------------------------------------------------
   OpenAI Request Execution
------------------------------------------------------------------- */

async function executeUniversalDocumentRequest(request, options = {}) {
  const client = resolveOpenAIClient(options);

  if (!client.responses || typeof client.responses.create !== "function") {
    throw new Error(
      "The configured OpenAI client does not support responses.create().",
    );
  }

  console.log("OPENAI REQUEST");
  console.dir(request, { depth: null });

  const requestJson = JSON.stringify(request);

  console.log("OPENAI REQUEST SIZE:", {
    characters: requestJson.length,
    approximateMegabytes: Number(
      (Buffer.byteLength(requestJson, "utf8") / 1024 / 1024).toFixed(2),
    ),
  });

  try {
    return await client.responses.create(request);
  } catch (error) {
    console.error("OPENAI RAW ERROR:", {
      name: error?.name,
      message: error?.message,
      status: error?.status,
      code: error?.code,
      type: error?.type,
      cause: error?.cause,
      headers: error?.headers,
    });

    throw error;
  }
}

/* ------------------------------------------------------------------
   Main Universal Document Analysis
------------------------------------------------------------------- */

async function aiAnalyzeUniversalDocument(txn = {}, doc = {}) {
  const normalizedSource = normalizeSourceDocumentInput({
    ...doc,

    transactionId: txn.id || null,

    transaction: {
      id: txn.id || null,
      side: txn.side || "",
      address: txn.address || txn.propertyAddress || "",
      propertyAddress: txn.propertyAddress || txn.address || "",
      country: txn.country || "",
      state: txn.state || "",
    },
  });

  const options = {
    transaction: txn,
  };

  const request = buildUniversalDocumentRequest(normalizedSource, options);

  const startedAt = Date.now();

  const rawResponse = await executeUniversalDocumentRequest(request, options);

  const parsedResponse = parseUniversalDocumentResponse(rawResponse);

  const normalizedAnalysis = normalizeUniversalAnalysis(
    parsedResponse,
    normalizedSource.sourceDocumentId,
  );

  normalizedAnalysis.evidence = buildUniversalEvidenceCollection(
    normalizedAnalysis,
    normalizedAnalysis.sourceDocumentId,
  );

  const validation = validateUniversalAnalysis(normalizedAnalysis);

  if (!validation.valid) {
    const error = new Error("Universal document analysis failed validation.");

    error.validation = validation;
    error.analysis = normalizedAnalysis;

    throw error;
  }

  normalizedAnalysis.validation = validation;

  normalizedAnalysis.usage = {
    elapsedMilliseconds: Date.now() - startedAt,
  };

  return normalizedAnalysis;
}

/* ------------------------------------------------------------------
   Convenience Wrapper

   Returns only the normalized analysis.
------------------------------------------------------------------- */

async function analyzeUniversalDocument(txn = {}, doc = {}) {
  return aiAnalyzeUniversalDocument(txn, doc);
}

/* ------------------------------------------------------------------
   Response Schema Version Check
------------------------------------------------------------------- */

function validateSchemaVersion(analysis = {}) {
  return (
    normalizeString(analysis.schemaVersion) ===
    UNIVERSAL_DOCUMENT_SCHEMA_VERSION
  );
}

/* ------------------------------------------------------------------
   Engine Version Check
------------------------------------------------------------------- */

function validateEngineVersion(analysis = {}) {
  return normalizeString(analysis.engineVersion) === AI_DOCUMENT_ENGINE_VERSION;
}

/* ------------------------------------------------------------------
   Health Check
------------------------------------------------------------------- */

function validateUniversalDocumentEngine() {
  const errors = [];

  if (!UNIVERSAL_DOCUMENT_RESPONSE_SCHEMA) {
    errors.push("Missing response schema.");
  }

  if (!AI_DOCUMENT_ENGINE_VERSION) {
    errors.push("Missing engine version.");
  }

  if (!UNIVERSAL_DOCUMENT_SCHEMA_VERSION) {
    errors.push("Missing schema version.");
  }

  if (typeof aiAnalyzeUniversalDocument !== "function") {
    errors.push("aiAnalyzeUniversalDocument() missing.");
  }

  if (typeof analyzeUniversalDocument !== "function") {
    errors.push("analyzeUniversalDocument() missing.");
  }

  if (typeof normalizeUniversalAnalysis !== "function") {
    errors.push("normalizeUniversalAnalysis() missing.");
  }

  if (typeof buildUniversalEvidenceCollection !== "function") {
    errors.push("buildUniversalEvidenceCollection() missing.");
  }

  return {
    valid: errors.length === 0,
    errors,
    engineVersion: AI_DOCUMENT_ENGINE_VERSION,
    schemaVersion: UNIVERSAL_DOCUMENT_SCHEMA_VERSION,
  };
}

/* ------------------------------------------------------------------
   Module Exports
------------------------------------------------------------------- */

module.exports = {
  AI_DOCUMENT_ENGINE_VERSION,

  UNIVERSAL_DOCUMENT_SCHEMA_VERSION,

  UNIVERSAL_DOCUMENT_RESPONSE_SCHEMA,

  aiAnalyzeUniversalDocument,

  analyzeUniversalDocument,

  normalizeUniversalAnalysis,

  normalizeSourceDocumentInput,

  validateUniversalAnalysis,

  validateUniversalDocumentEngine,

  buildUniversalEvidenceCollection,

  buildUniversalDocumentRequest,

  buildUniversalDocumentSystemInstructions,

  buildUniversalDocumentUserInstructions,

  buildDocumentContent,

  prepareDocumentTextForAnalysis,

  parseUniversalDocumentResponse,

  extractResponseText,

  validateSchemaVersion,

  validateEngineVersion,

  normalizeEvidenceRecord,

  createEvidenceRecord,
};
