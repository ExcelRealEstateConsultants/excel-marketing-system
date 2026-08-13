/**
 * RapportLink Universal Document Intelligence Engine
 * Version 3.1.0
 *
 * ONE AUTHORITATIVE PIPELINE
 *
 * Source document
 *   -> normalized input
 *   -> one OpenAI request
 *   -> one strict JSON response
 *   -> one canonical analysis
 *   -> deterministic lifecycle normalization
 *   -> one returned analysis object
 *
 * RESPONSIBILITY BOUNDARY
 *
 * This engine may determine document-level facts, execution, semantic effects,
 * and transaction events supported directly by the current document.
 *
 * It must never determine the transaction's final state, health, closing
 * confidence, priorities, recommendations, tasks, or completion percentage.
 * Those responsibilities belong to the Transaction Brain and downstream UI.
 */

"use strict";

require("dotenv").config();

const crypto = require("crypto");

const ENGINE_NAME = "RapportLink Universal Document Intelligence Engine";
const ENGINE_VERSION = "3.1.0";
const SCHEMA_VERSION = 3;

const AI_DOCUMENT_ENGINE_VERSION = ENGINE_VERSION;
const UNIVERSAL_DOCUMENT_SCHEMA_VERSION = String(SCHEMA_VERSION);

const DEFAULT_MODEL =
  process.env.OPENAI_DOCUMENT_MODEL || process.env.OPENAI_MODEL || "gpt-5.6";

const SEMANTIC_EFFECT_TYPES = Object.freeze([
  "contractExecuted",
  "listingAgreementExecuted",
  "settlementCompleted",
  "fundsDisbursed",
  "recordingCompleted",
  "titleTransferred",
  "terminationEffective",
  "inspectionCompleted",
  "appraisalCompleted",
  "amendmentEffective",
]);

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
  EXECUTION: "execution",
  TRANSACTION_EVENT: "transactionEvent",
  OTHER: "other",
});

/* ------------------------------------------------------------------
   Utilities
------------------------------------------------------------------- */

function randomUUID() {
  return crypto.randomUUID();
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

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

  return Number.isFinite(page) && page >= 1 ? Math.round(page) : null;
}

function normalizePageCount(value) {
  const pageCount = Number(value);

  return Number.isFinite(pageCount) && pageCount >= 1
    ? Math.round(pageCount)
    : null;
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

  return value === undefined ? null : normalizeString(value);
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeBoolean(value) {
  return value === true;
}

function uniqueBy(items, keyBuilder) {
  const seen = new Set();

  return ensureArray(items).filter((item) => {
    const key = keyBuilder(item);

    if (!key || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

/* ------------------------------------------------------------------
   Evidence
------------------------------------------------------------------- */

function normalizeEvidenceType(type) {
  const requested = normalizeString(type);

  return Object.values(EVIDENCE_TYPES).includes(requested)
    ? requested
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
    sourceDocumentId: sourceDocumentId || null,
    eventDate: normalizeString(eventDate),
    facts: normalizeEvidenceFacts(facts),
  };
}

function normalizeEvidenceRecord(record = {}, sourceDocumentId = null) {
  return createEvidenceRecord({
    ...record,
    sourceDocumentId: record?.sourceDocumentId || sourceDocumentId || null,
  });
}

function isUsableEvidenceRecord(record = {}) {
  const hasIdentity = Boolean(
    normalizeString(record.key) || normalizeString(record.category),
  );

  const hasValue =
    record.value !== null &&
    record.value !== undefined &&
    !(typeof record.value === "string" && !record.value.trim());

  return (
    hasIdentity &&
    (hasValue || ensureArray(record.facts).length > 0) &&
    Boolean(normalizeString(record.supportingText))
  );
}

/* ------------------------------------------------------------------
   Input normalization and OpenAI content
------------------------------------------------------------------- */

function normalizeSourceDocumentInput(input = {}) {
  const source = isPlainObject(input) ? input : {};

  const pageImages = ensureArray(source.pageImages || source.images).filter(
    Boolean,
  );

  return {
    sourceDocumentId:
      normalizeString(source.sourceDocumentId) ||
      normalizeString(source.documentId) ||
      normalizeString(source.id) ||
      randomUUID(),

    extractedText:
      normalizeString(source.extractedText) ||
      normalizeString(source.text) ||
      normalizeString(source.content),

    pageImages,

    mimeType: normalizeString(source.mimeType) || normalizeString(source.type),

    originalName:
      normalizeString(source.originalName) ||
      normalizeString(source.fileName) ||
      normalizeString(source.name),

    pageCount:
      normalizePageCount(source.pageCount || source.extraction?.pages) ||
      pageImages.length ||
      null,

    metadata: {
      uploadedAt:
        normalizeString(source.uploadedAt) || normalizeString(source.createdAt),

      fileSize:
        source.fileSize === null || source.fileSize === undefined
          ? normalizeNumber(source.size, 0) || null
          : normalizeNumber(source.fileSize, 0) || null,

      checksum: normalizeString(source.checksum),

      sourceSystem: normalizeString(source.sourceSystem),
    },
  };
}

function prepareDocumentTextForAnalysis(sourceDocument = {}) {
  return normalizeString(sourceDocument.extractedText)
    .replace(/\u0000/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

function buildTextContentBlock(text) {
  const normalized = normalizeString(text);

  return normalized
    ? {
        type: "input_text",
        text: normalized,
      }
    : null;
}

function buildImageContentBlock(image) {
  if (!image) {
    return null;
  }

  if (typeof image === "string") {
    const imageUrl = image.trim();

    return imageUrl
      ? {
          type: "input_image",
          image_url: imageUrl,
        }
      : null;
  }

  if (!isPlainObject(image)) {
    return null;
  }

  const imageUrl =
    normalizeString(image.image_url) ||
    normalizeString(image.imageUrl) ||
    normalizeString(image.url) ||
    normalizeString(image.dataUrl);

  return imageUrl
    ? {
        type: "input_image",
        image_url: imageUrl,
      }
    : null;
}

function buildDocumentContent(sourceDocument = {}) {
  const content = [];

  const textBlock = buildTextContentBlock(
    [
      "DOCUMENT CONTENT",
      "",
      prepareDocumentTextForAnalysis(sourceDocument) ||
        "[No machine-readable text was available. Review the supplied page images.]",
    ].join("\n"),
  );

  if (textBlock) {
    content.push(textBlock);
  }

  ensureArray(sourceDocument.pageImages)
    .map(buildImageContentBlock)
    .filter(Boolean)
    .forEach((imageBlock) => content.push(imageBlock));

  return content;
}

/* ------------------------------------------------------------------
   Instructions
------------------------------------------------------------------- */

function buildUniversalDocumentSystemInstructions() {
  return [
    "You are the RapportLink Universal Document Intelligence Engine.",
    "",
    "Inspect only the actual internal text and page images of the supplied document.",
    "Do not classify or draw conclusions from the filename, upload name, folder, transaction record, or external context.",
    "",
    "RESPONSIBILITY:",
    "",
    "- Extract documentary observations and raw evidence.",
    "- Determine document-level execution only when directly supported.",
    "- Produce document-level semantic effects and transaction events only when directly supported.",
    "- Never determine the transaction's final state, health, closing confidence, risk classification, priorities, recommendations, tasks, or completion percentage.",
    "",
    "EXECUTION RULES:",
    "",
    "1. A document title or blank form never proves execution.",
    "2. Set execution.executed=true only when visible signatures, authenticated electronic signatures, acknowledgments, or equivalent direct execution evidence support it.",
    "3. Set execution.fullyExecuted=true only when the document supports completion by all required parties.",
    "4. Set execution.signaturesComplete=true only when required signatures appear complete.",
    "5. Set execution.initialsComplete=true only when required initials appear complete or the document does not require initials.",
    "6. Set execution.effective=true only when the document supports that it became operative.",
    "7. When execution cannot be verified, use false and explain the uncertainty in supportingText.",
    "",
    "AMENDMENT AND COUNTER OFFER RULES:",
    "",
    "1. Treat counter offers, amendments, addenda, modification agreements, change forms, and similar documents as documents that may modify earlier transaction terms.",
    "2. Extract EVERY material changed term stated in the document.",
    "3. A changed term does NOT need to repeat the original contract language.",
    "4. When a document identifies an original contract location by page number, paragraph number, section number, line number, field name, label, or similar reference, use all wording available in the document to determine what business term is being changed.",
    "5. Parenthetical descriptions are authoritative contextual clues. Example: 'Pg 1, Ln 13 to be $2,500. (Earnest money deposit)' means changedTerm='earnestMoney' and newValue=2500.",
    "6. Normalize material changed terms to these canonical names whenever applicable:",
    "   purchasePrice",
    "   earnestMoney",
    "   sellerCredit",
    "   closingDate",
    "   effectiveDate",
    "   inspectionDays",
    "   optionDays",
    "   financingDeadline",
    "   appraisalDeadline",
    "   commissionPercent",
    "7. Recognize equivalent natural-language descriptions. Examples:",
    "   earnest money, earnest money deposit, EMD, deposit -> earnestMoney",
    "   purchase price, sales price, contract price -> purchasePrice",
    "   seller credit, seller concession, buyer closing-cost credit, credit to buyer -> sellerCredit",
    "   closing date, close of escrow date, COE date -> closingDate",
    "   appraisal contingency period -> appraisalDeadline when a date is stated, otherwise appraisal-related days may be preserved as the described changed term",
    "   loan contingency, financing contingency -> financingDeadline when a date is stated",
    "   listing broker commission, listing-side commission -> commissionPercent when expressed as a percentage",
    "8. If the changed term is clear from nearby descriptive wording, do not leave changedTerm as only 'Pg 1 Ln 13', 'line 13', 'paragraph 4', or similar location text.",
    "9. The amendment's new operative value belongs in amendments[].newValue.",
    "10. Also place material amended transaction values in facts using the same canonical name so downstream reconciliation can consume them.",
    "11. Preserve priorValue only when the prior value is actually stated or reliably visible in the supplied document. Never invent it.",
    "12. If an executed amendment or counter offer changes multiple terms, return a separate amendments[] entry for every changed term.",
    "",
    "SEMANTIC EFFECT RULES:",
    "",
    "- Return every semantic effect required by the schema.",
    "- Use occurred=true only when directly supported by this document.",
    "- Use occurred=false when not supported.",
    "- contractExecuted applies to an executed purchase, sale, or equivalent transaction contract.",
    "- listingAgreementExecuted applies to an executed listing or exclusive brokerage agreement.",
    "- settlementCompleted applies only when settlement or closing completion is directly established.",
    "- fundsDisbursed applies only when actual funding or disbursement is directly established.",
    "- recordingCompleted applies only when recording is directly established.",
    "- titleTransferred applies only when transfer of title is directly established.",
    "- terminationEffective applies only when an effective termination or cancellation is directly established.",
    "- inspectionCompleted applies only when completion of an inspection is directly established.",
    "- appraisalCompleted applies only when completion of an appraisal is directly established.",
    "- amendmentEffective applies when a counter offer, amendment, addendum, or modification is executed or otherwise shown to have become operative.",
    "",
    "TRANSACTION EVENT RULES:",
    "",
    "- Create events only for material events directly supported by this document.",
    "- Use only these canonical event types: contractExecuted, listingAgreementExecuted, settlementCompleted, fundsDisbursed, recordingCompleted, titleTransferred, terminationEffective, inspectionCompleted, appraisalCompleted, amendmentEffective.",
    "- Event dates must come from the document. Use an empty string when no reliable date is shown.",
    "",
    "OBSERVATION RULES:",
    "",
    "- Extract parties, properties, dates, amounts, signatures, initials, checkboxes, handwriting, obligations, contingencies, amendments, notices, approvals, waivers, receipts, funding, recording, possession, termination, settlement, title evidence, risks, and general facts.",
    "- Preserve distinctions between typed text, signatures, initials, selected boxes, unselected boxes, handwriting, strikeouts, and inserted language.",
    "- Never invent missing values.",
    "- Supporting text must be concise and tied directly to the document.",
    "- Page numbers must identify the supporting page when available.",
    "- Raw evidence must remain documentary evidence, not a final transaction-state conclusion.",
    "",
    "Return only valid JSON matching the required response schema.",
  ].join("\n");
}

function buildUniversalDocumentUserInstructions(sourceDocument = {}) {
  return [
    "Analyze the supplied document.",
    "",
    `Source document ID: ${sourceDocument.sourceDocumentId}`,
    `MIME type: ${sourceDocument.mimeType || "Unknown"}`,
    `Page count: ${
      sourceDocument.pageCount === null ? "Unknown" : sourceDocument.pageCount
    }`,
    "",
    "The filename is intentionally excluded from analytical context.",
    "Use the extracted text and page images together.",
    "Return the complete structured response.",
  ].join("\n");
}

/* ------------------------------------------------------------------
   JSON schema helpers
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

function requiredObject(properties) {
  return {
    type: "object",
    additionalProperties: false,
    properties,
    required: Object.keys(properties),
  };
}

function observationBase(extra = {}) {
  return requiredObject({
    ...extra,
    confidence: { type: "number" },
    page: pageSchema(),
    supportingText: { type: "string" },
  });
}

function classificationSchema() {
  return requiredObject({
    documentFamily: { type: "string" },
    documentType: { type: "string" },
    documentPurpose: { type: "string" },
    documentEffect: { type: "string" },
    confidence: { type: "number" },
    supportingText: { type: "string" },
    jurisdiction: requiredObject({
      country: { type: "string" },
      stateOrProvince: { type: "string" },
      countyOrRegion: { type: "string" },
      city: { type: "string" },
    }),
  });
}

function executionSchema() {
  return requiredObject({
    executed: { type: "boolean" },
    fullyExecuted: { type: "boolean" },
    signaturesComplete: { type: "boolean" },
    initialsComplete: { type: "boolean" },
    effective: { type: "boolean" },
    executionDate: { type: "string" },
    effectiveDate: { type: "string" },
    confidence: { type: "number" },
    supportingText: { type: "string" },
  });
}

function semanticEffectSchema() {
  return requiredObject({
    occurred: { type: "boolean" },
    date: { type: "string" },
    confidence: { type: "number" },
    supportingText: { type: "string" },
  });
}

function transactionEventSchema() {
  return requiredObject({
    type: {
      type: "string",
      enum: SEMANTIC_EFFECT_TYPES,
    },
    occurred: { type: "boolean" },
    date: { type: "string" },
    confidence: { type: "number" },
    description: { type: "string" },
    supportingText: { type: "string" },
  });
}

function evidenceRecordSchema() {
  return requiredObject({
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
      items: requiredObject({
        name: { type: "string" },
        value: nullablePrimitiveSchema(),
      }),
    },
  });
}

function universalDocumentJsonSchema() {
  const semanticProperties = {};

  SEMANTIC_EFFECT_TYPES.forEach((type) => {
    semanticProperties[type] = semanticEffectSchema();
  });

  return requiredObject({
    schemaVersion: { type: "number" },

    classification: classificationSchema(),

    execution: executionSchema(),

    semanticEffects: requiredObject(semanticProperties),

    transactionEvents: {
      type: "array",
      items: transactionEventSchema(),
    },

    parties: {
      type: "array",
      items: observationBase({
        name: { type: "string" },
        role: { type: "string" },
        organization: { type: "string" },
        address: { type: "string" },
        email: { type: "string" },
        phone: { type: "string" },
      }),
    },

    properties: {
      type: "array",
      items: observationBase({
        address: { type: "string" },
        legalDescription: { type: "string" },
        parcelNumber: { type: "string" },
        propertyType: { type: "string" },
        unitNumber: { type: "string" },
      }),
    },

    dates: {
      type: "array",
      items: observationBase({
        dateType: { type: "string" },
        value: { type: "string" },
        isDeadline: { type: "boolean" },
        responsibleParty: { type: "string" },
        relatedClause: { type: "string" },
      }),
    },

    amounts: {
      type: "array",
      items: observationBase({
        amountType: { type: "string" },
        value: { type: "number" },
        currency: { type: "string" },
        payer: { type: "string" },
        payee: { type: "string" },
        relatedClause: { type: "string" },
      }),
    },

    signatures: {
      type: "array",
      items: observationBase({
        signerName: { type: "string" },
        signerRole: { type: "string" },
        signed: { type: "boolean" },
        signedDate: { type: "string" },
        signatureMethod: { type: "string" },
        signatureLocation: { type: "string" },
      }),
    },

    initials: {
      type: "array",
      items: observationBase({
        person: { type: "string" },
        locationOrClause: { type: "string" },
        detected: { type: "boolean" },
      }),
    },

    checkboxes: {
      type: "array",
      items: observationBase({
        label: { type: "string" },
        selected: { type: "boolean" },
        groupLabel: { type: "string" },
      }),
    },

    handwrittenTerms: {
      type: "array",
      items: observationBase({
        text: { type: "string" },
        locationOrClause: { type: "string" },
        apparentPurpose: { type: "string" },
        crossedOutText: { type: "string" },
      }),
    },

    obligations: {
      type: "array",
      items: observationBase({
        responsibleParty: { type: "string" },
        obligation: { type: "string" },
        dueDate: { type: "string" },
        statedStatus: { type: "string" },
        condition: { type: "string" },
      }),
    },

    contingencies: {
      type: "array",
      items: observationBase({
        contingencyType: { type: "string" },
        terms: { type: "string" },
        deadline: { type: "string" },
        beneficiary: { type: "string" },
        statedDisposition: { type: "string" },
      }),
    },

    amendments: {
      type: "array",
      items: observationBase({
        changedTerm: { type: "string" },
        priorValue: nullablePrimitiveSchema(),
        newValue: nullablePrimitiveSchema(),
        effectiveDate: { type: "string" },
        executionEvidence: { type: "string" },
      }),
    },

    notices: {
      type: "array",
      items: observationBase({
        noticeType: { type: "string" },
        sender: { type: "string" },
        recipient: { type: "string" },
        noticeDate: { type: "string" },
        statedEffect: { type: "string" },
        deliveryMethod: { type: "string" },
      }),
    },

    approvals: {
      type: "array",
      items: observationBase({
        approvalType: { type: "string" },
        approvingParty: { type: "string" },
        approved: { type: "boolean" },
        approvalDate: { type: "string" },
        conditions: { type: "string" },
      }),
    },

    waivers: {
      type: "array",
      items: observationBase({
        waiverType: { type: "string" },
        waivingParty: { type: "string" },
        waived: { type: "boolean" },
        waiverDate: { type: "string" },
        scope: { type: "string" },
      }),
    },

    receipts: {
      type: "array",
      items: observationBase({
        receiptType: { type: "string" },
        receivedBy: { type: "string" },
        providedBy: { type: "string" },
        receivedDate: { type: "string" },
        acknowledged: { type: "boolean" },
        subject: { type: "string" },
      }),
    },

    funding: {
      type: "array",
      items: observationBase({
        fundingType: { type: "string" },
        lenderOrSource: { type: "string" },
        recipient: { type: "string" },
        amount: { type: ["number", "null"] },
        currency: { type: "string" },
        fundingDate: { type: "string" },
        statedStatus: { type: "string" },
        referenceNumber: { type: "string" },
      }),
    },

    recordings: {
      type: "array",
      items: observationBase({
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
      }),
    },

    possession: {
      type: "array",
      items: observationBase({
        possessionType: { type: "string" },
        partyReceivingPossession: { type: "string" },
        possessionDate: { type: "string" },
        possessionTime: { type: "string" },
        conditions: { type: "string" },
        statedStatus: { type: "string" },
      }),
    },

    terminations: {
      type: "array",
      items: observationBase({
        terminationType: { type: "string" },
        terminatingParty: { type: "string" },
        receivingParty: { type: "string" },
        terminationDate: { type: "string" },
        effectiveDate: { type: "string" },
        reason: { type: "string" },
        earnestMoneyDisposition: { type: "string" },
        executionEvidence: { type: "string" },
        deliveryEvidence: { type: "string" },
      }),
    },

    settlements: {
      type: "array",
      items: observationBase({
        settlementDocumentType: { type: "string" },
        settlementDate: { type: "string" },
        disbursementDate: { type: "string" },
        settlementAgent: { type: "string" },
        buyerSigned: { type: "boolean" },
        sellerSigned: { type: "boolean" },
        fundsShownAsDisbursed: { type: "boolean" },
        finalFiguresShown: { type: "boolean" },
        statedStatus: { type: "string" },
      }),
    },

    titleEvidence: {
      type: "array",
      items: observationBase({
        titleEvidenceType: { type: "string" },
        grantor: { type: "string" },
        grantee: { type: "string" },
        vesting: { type: "string" },
        instrumentDate: { type: "string" },
        effectiveDate: { type: "string" },
        recorded: { type: "boolean" },
        recordingReference: { type: "string" },
      }),
    },

    risks: {
      type: "array",
      items: observationBase({
        riskType: { type: "string" },
        severity: { type: "string" },
        description: { type: "string" },
        affectedParty: { type: "string" },
        relatedDeadline: { type: "string" },
        documentLanguage: { type: "string" },
      }),
    },

    facts: {
      type: "array",
      items: observationBase({
        factType: { type: "string" },
        name: { type: "string" },
        value: nullablePrimitiveSchema(),
        relatedParty: { type: "string" },
        relatedClause: { type: "string" },
      }),
    },

    evidence: {
      type: "array",
      items: evidenceRecordSchema(),
    },

    summary: { type: "string" },
  });
}

const UNIVERSAL_DOCUMENT_RESPONSE_SCHEMA = universalDocumentJsonSchema();

/* ------------------------------------------------------------------
   Canonical result normalization
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

function normalizeClassification(classification = {}) {
  const source = isPlainObject(classification) ? classification : {};

  const jurisdiction = isPlainObject(source.jurisdiction)
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

function normalizeExecution(execution = {}) {
  const source = isPlainObject(execution) ? execution : {};

  return {
    executed: source.executed === true,
    fullyExecuted: source.fullyExecuted === true,
    signaturesComplete: source.signaturesComplete === true,
    initialsComplete: source.initialsComplete === true,
    effective: source.effective === true,
    executionDate: normalizeString(source.executionDate),
    effectiveDate: normalizeString(source.effectiveDate),
    confidence: normalizeConfidence(source.confidence),
    supportingText: normalizeString(source.supportingText),
  };
}

function normalizeSemanticEffect(effect = {}) {
  const source = isPlainObject(effect) ? effect : {};

  return {
    occurred: source.occurred === true,
    date: normalizeString(
      source.date ||
        source.eventDate ||
        source.effectiveDate ||
        source.executionDate,
    ),
    confidence: normalizeConfidence(source.confidence),
    supportingText: normalizeString(
      source.supportingText || source.description || source.reason,
    ),
  };
}

function normalizeTransactionEvent(event = {}) {
  const source = isPlainObject(event) ? event : {};

  return {
    type: normalizeString(source.type || source.eventType || source.name),
    occurred: source.occurred === true,
    date: normalizeString(
      source.date ||
        source.eventDate ||
        source.effectiveDate ||
        source.executionDate,
    ),
    confidence: normalizeConfidence(source.confidence),
    description: normalizeString(
      source.description || source.summary || source.reason,
    ),
    supportingText: normalizeString(
      source.supportingText || source.support || source.explanation,
    ),
  };
}

function createEmptySemanticEffects() {
  const effects = {};

  SEMANTIC_EFFECT_TYPES.forEach((type) => {
    effects[type] = normalizeSemanticEffect();
  });

  return effects;
}

function determineExecutionEffectType(classification = {}) {
  const haystack = [
    classification.documentFamily,
    classification.documentType,
    classification.documentPurpose,
    classification.documentEffect,
  ]
    .map((value) => normalizeString(value).toLowerCase())
    .join(" ");

  if (
    /\b(listing agreement|exclusive right to sell|exclusive agency|exclusive brokerage agreement)\b/.test(
      haystack,
    )
  ) {
    return "listingAgreementExecuted";
  }

  if (
    /\b(purchase agreement|sale agreement|sales contract|purchase contract|offer and acceptance|contract of sale)\b/.test(
      haystack,
    )
  ) {
    return "contractExecuted";
  }

  return "";
}

function applyDeterministicLifecycleNormalization(analysis = {}) {
  const normalized = analysis;

  /*
   * Verified execution may deterministically establish only
   * executed purchase/sale contracts and executed listing agreements.
   *
   * Terminations and amendments require their own explicit effectiveness
   * evidence. A signature alone does not prove delivery or effectiveness.
   */

  const effectType = determineExecutionEffectType(normalized.classification);

  if (
    effectType &&
    normalized.execution.executed === true &&
    normalized.execution.fullyExecuted === true &&
    normalized.execution.signaturesComplete === true &&
    normalized.execution.confidence >= 70
  ) {
    const existingEffect =
      normalized.semanticEffects[effectType] || normalizeSemanticEffect();

    if (existingEffect.occurred !== true) {
      normalized.semanticEffects[effectType] = {
        occurred: true,
        date:
          normalized.execution.effectiveDate ||
          normalized.execution.executionDate ||
          "",
        confidence: normalized.execution.confidence,
        supportingText:
          normalized.execution.supportingText ||
          `Verified document execution supports ${effectType}.`,
      };
    }

    if (
      !normalized.transactionEvents.some(
        (event) => event.type === effectType && event.occurred === true,
      )
    ) {
      const effect = normalized.semanticEffects[effectType];

      normalized.transactionEvents.push({
        type: effectType,
        occurred: true,
        date: effect.date,
        confidence: effect.confidence,
        description: `Verified document execution supports ${effectType}.`,
        supportingText: effect.supportingText,
      });
    }
  }

  /*
   * Termination and amendment effectiveness are not derived here.
   *
   * Their current schemas describe execution and delivery with free-text
   * fields. A non-empty phrase can be negative (for example, "not delivered"),
   * so converting mere text presence into an effective lifecycle event would
   * be unsafe. The model may still return a directly supported canonical
   * semantic effect or transaction event.
   */

  /*
   * Closing lifecycle effects require direct documentary status.
   * Signatures and final figures alone do not prove settlement completion.
   */

  const completedSettlement = normalized.settlements.find((item) => {
    const status = normalizeString(item?.statedStatus).toLowerCase();

    return [
      "completed",
      "closed",
      "settled",
      "settlement completed",
      "closing completed",
    ].includes(status);
  });

  if (completedSettlement) {
    promoteEffectFromCollection(
      normalized,
      "settlementCompleted",
      [completedSettlement],
      "settlementDate",
    );
  }

  const disbursedSettlement = normalized.settlements.find(
    (item) => item?.fundsShownAsDisbursed === true,
  );

  const disbursedFunding = normalized.funding.find((item) => {
    const status = normalizeString(item?.statedStatus).toLowerCase();

    return [
      "disbursed",
      "funded",
      "completed",
      "funding completed",
      "funds disbursed",
    ].includes(status);
  });

  if (disbursedSettlement || disbursedFunding) {
    promoteEffectFromCollection(
      normalized,
      "fundsDisbursed",
      [disbursedSettlement || disbursedFunding],
      disbursedSettlement ? "disbursementDate" : "fundingDate",
    );
  }

  const completedRecording = normalized.recordings.find(
    (item) => item?.recorded === true,
  );

  if (completedRecording) {
    promoteEffectFromCollection(
      normalized,
      "recordingCompleted",
      [completedRecording],
      "recordingDate",
    );
  }

  /*
   * Title transfer requires recorded transfer evidence with grantor/grantee,
   * not merely any recorded title-related document.
   */

  const recordedTransfer = normalized.titleEvidence.find(
    (item) =>
      item?.recorded === true &&
      Boolean(normalizeString(item.grantor)) &&
      Boolean(normalizeString(item.grantee)) &&
      /\b(deed|title transfer|conveyance)\b/i.test(
        String(item.titleEvidenceType || ""),
      ),
  );

  if (recordedTransfer) {
    promoteEffectFromCollection(
      normalized,
      "titleTransferred",
      [recordedTransfer],
      "effectiveDate",
    );
  }

  return normalized;
}

function promoteEffectFromCollection(
  analysis,
  effectType,
  collection,
  dateField,
) {
  const supportingItem = ensureArray(collection).find(Boolean);

  if (!supportingItem) {
    return;
  }

  const existing =
    analysis.semanticEffects[effectType] || normalizeSemanticEffect();

  if (existing.occurred !== true) {
    analysis.semanticEffects[effectType] = {
      occurred: true,
      date: normalizeString(supportingItem[dateField]),
      confidence: normalizeConfidence(supportingItem.confidence),
      supportingText: normalizeString(supportingItem.supportingText),
    };
  }

  if (
    !analysis.transactionEvents.some(
      (event) => event.type === effectType && event.occurred === true,
    )
  ) {
    const effect = analysis.semanticEffects[effectType];

    analysis.transactionEvents.push({
      type: effectType,
      occurred: true,
      date: effect.date,
      confidence: effect.confidence,
      description: `Document supports ${effectType}.`,
      supportingText: effect.supportingText,
    });
  }
}

function normalizeUniversalAnalysis(analysis = {}, sourceDocumentId = null) {
  const input = isPlainObject(analysis) ? analysis : {};

  const resolvedSourceDocumentId =
    normalizeString(sourceDocumentId) ||
    normalizeString(input.sourceDocumentId);

  const semanticEffects = createEmptySemanticEffects();

  SEMANTIC_EFFECT_TYPES.forEach((type) => {
    semanticEffects[type] = normalizeSemanticEffect(
      input.semanticEffects?.[type],
    );
  });

  const normalized = {
    schemaVersion:
      normalizeString(input.schemaVersion) || UNIVERSAL_DOCUMENT_SCHEMA_VERSION,

    engineVersion:
      normalizeString(input.engineVersion) || AI_DOCUMENT_ENGINE_VERSION,

    sourceDocumentId: resolvedSourceDocumentId,

    classification: normalizeClassification(input.classification),

    execution: normalizeExecution(input.execution),

    semanticEffects,

    transactionEvents: ensureArray(input.transactionEvents)
      .map(normalizeTransactionEvent)
      .filter((event) => SEMANTIC_EFFECT_TYPES.includes(event.type)),

    summary: normalizeString(input.summary),

    language: normalizeString(input.language) || "English",

    pageCount: normalizePageCount(input.pageCount),

    extractionWarnings: ensureArray(input.extractionWarnings)
      .map(normalizeString)
      .filter(Boolean),

    evidence: ensureArray(input.evidence)
      .map((record) =>
        normalizeEvidenceRecord(record, resolvedSourceDocumentId),
      )
      .filter(isUsableEvidenceRecord),
  };

  ARRAY_FIELDS.forEach((field) => {
    normalized[field] = ensureArray(input[field]).map((item) =>
      isPlainObject(item) ? { ...item } : item,
    );
  });

  applyDeterministicLifecycleNormalization(normalized);

  return normalized;
}

/* ------------------------------------------------------------------
   Canonical evidence assembly
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

function buildEvidenceFromDirectEvidence(
  evidence = [],
  sourceDocumentId = null,
) {
  return ensureArray(evidence)
    .map((record) => normalizeEvidenceRecord(record, sourceDocumentId))
    .filter(isUsableEvidenceRecord);
}

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

const buildEvidenceFromClassificationRef = buildEvidenceFromClassification;

function buildEvidenceFromLifecycleAnalysis(
  analysis = {},
  sourceDocumentId = null,
) {
  const records = [];
  const execution = analysis.execution || {};

  if (
    execution.executed === true &&
    normalizeString(execution.supportingText)
  ) {
    records.push(
      createEvidenceRecord({
        type: EVIDENCE_TYPES.EXECUTION,
        category: "execution",
        key: "document.executed",
        value: true,
        confidence: execution.confidence,
        supportingText: execution.supportingText,
        sourceDocumentId,
        eventDate: execution.effectiveDate || execution.executionDate || "",
        facts: [
          {
            name: "fullyExecuted",
            value: execution.fullyExecuted === true,
          },
          {
            name: "signaturesComplete",
            value: execution.signaturesComplete === true,
          },
          {
            name: "initialsComplete",
            value: execution.initialsComplete === true,
          },
          {
            name: "effective",
            value: execution.effective === true,
          },
        ],
      }),
    );
  }

  SEMANTIC_EFFECT_TYPES.forEach((type) => {
    const effect = analysis.semanticEffects?.[type];

    if (
      !effect ||
      effect.occurred !== true ||
      !normalizeString(effect.supportingText)
    ) {
      return;
    }

    records.push(
      createEvidenceRecord({
        type: EVIDENCE_TYPES.TRANSACTION_EVENT,
        category: "semanticEffect",
        key: type,
        value: true,
        confidence: effect.confidence,
        supportingText: effect.supportingText,
        sourceDocumentId,
        eventDate: effect.date,
      }),
    );
  });

  ensureArray(analysis.transactionEvents).forEach((event) => {
    if (
      !event ||
      event.occurred !== true ||
      !SEMANTIC_EFFECT_TYPES.includes(event.type) ||
      !normalizeString(event.supportingText) ||
      analysis.semanticEffects?.[event.type]?.occurred === true
    ) {
      return;
    }

    records.push(
      createEvidenceRecord({
        type: EVIDENCE_TYPES.TRANSACTION_EVENT,
        category: "transactionEvent",
        key: event.type,
        value: true,
        confidence: event.confidence,
        supportingText: event.supportingText,
        sourceDocumentId,
        eventDate: event.date,
        facts: [
          {
            name: "description",
            value: normalizeString(event.description),
          },
        ],
      }),
    );
  });

  return records;
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

    ...buildEvidenceFromLifecycleAnalysis(analysis, sourceDocumentId),

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
   Validation
------------------------------------------------------------------- */

function validateUniversalAnalysis(analysis = {}) {
  const errors = [];
  const warnings = [];

  if (!isPlainObject(analysis)) {
    return {
      valid: false,
      errors: ["Analysis must be an object."],
      warnings,
    };
  }

  if (!analysis.classification) {
    errors.push("Analysis classification is missing.");
  }

  if (!analysis.execution) {
    errors.push("Analysis execution is missing.");
  }

  if (!analysis.semanticEffects) {
    errors.push("Analysis semanticEffects is missing.");
  }

  if (!Array.isArray(analysis.transactionEvents)) {
    errors.push("Analysis transactionEvents must be an array.");
  }

  [...ARRAY_FIELDS, "evidence", "extractionWarnings"].forEach((field) => {
    if (!Array.isArray(analysis[field])) {
      errors.push(`Analysis ${field} must be an array.`);
    }
  });

  if (!normalizeString(analysis.classification?.documentType)) {
    warnings.push("Document type was not identified.");
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
   Request construction and execution
------------------------------------------------------------------- */

function buildUniversalDocumentRequest(sourceDocument = {}, options = {}) {
  const model = normalizeString(options.model) || DEFAULT_MODEL;

  return {
    model,

    instructions: buildUniversalDocumentSystemInstructions(),

    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: buildUniversalDocumentUserInstructions(sourceDocument),
          },
          ...buildDocumentContent(sourceDocument),
        ],
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

function extractResponseText(response = {}) {
  if (normalizeString(response.output_text)) {
    return normalizeString(response.output_text);
  }

  for (const outputItem of ensureArray(response.output)) {
    for (const contentItem of ensureArray(outputItem?.content)) {
      if (normalizeString(contentItem?.text)) {
        return normalizeString(contentItem.text);
      }

      if (normalizeString(contentItem?.output_text)) {
        return normalizeString(contentItem.output_text);
      }
    }
  }

  return "";
}

function parseUniversalDocumentResponse(response = {}) {
  if (isPlainObject(response.output_parsed)) {
    return response.output_parsed;
  }

  const responseText = extractResponseText(response);

  if (!responseText) {
    throw new Error("OpenAI returned no universal document analysis.");
  }

  try {
    return JSON.parse(
      responseText
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/, "")
        .trim(),
    );
  } catch (error) {
    const parsingError = new Error(
      "OpenAI returned invalid JSON for universal document analysis.",
    );

    parsingError.cause = error;
    parsingError.responseText = responseText;

    throw parsingError;
  }
}

function resolveOpenAIClient(options = {}) {
  if (isPlainObject(options.openaiClient)) {
    return options.openaiClient;
  }

  const OpenAI = require("openai");
  const OpenAIConstructor = OpenAI.OpenAI || OpenAI.default || OpenAI;

  const apiKey =
    normalizeString(options.apiKey) ||
    normalizeString(process.env.OPENAI_API_KEY);

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  return new OpenAIConstructor({ apiKey });
}

async function executeUniversalDocumentRequest(request, options = {}) {
  const client = resolveOpenAIClient(options);

  if (!client.responses || typeof client.responses.create !== "function") {
    throw new Error(
      "The configured OpenAI client does not support responses.create().",
    );
  }

  const response = await client.responses.create(request);

  return response;
}

/* ------------------------------------------------------------------
   Main public analysis
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

  if (
    !normalizedSource.extractedText &&
    normalizedSource.pageImages.length === 0
  ) {
    throw new Error("The document contains no readable text or page images.");
  }

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

  normalizedAnalysis.pageCount =
    normalizedAnalysis.pageCount || normalizedSource.pageCount;

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

    model: request.model,

    pageImagesSubmitted: normalizedSource.pageImages.length,

    textCharactersSubmitted: normalizedSource.extractedText.length,
  };

  normalizedAnalysis.reviewedAt = new Date().toISOString();

  return normalizedAnalysis;
}

async function analyzeUniversalDocument(txn = {}, doc = {}) {
  return aiAnalyzeUniversalDocument(txn, doc);
}

/* ------------------------------------------------------------------
   Compatibility helpers and exports
------------------------------------------------------------------- */

function sanitizeUniversalDocumentResult(result = {}, sourceDocumentId = null) {
  return normalizeUniversalAnalysis(result, sourceDocumentId);
}

function validateSchemaVersion(analysis = {}) {
  return (
    normalizeString(analysis.schemaVersion) ===
    UNIVERSAL_DOCUMENT_SCHEMA_VERSION
  );
}

function validateEngineVersion(analysis = {}) {
  return normalizeString(analysis.engineVersion) === AI_DOCUMENT_ENGINE_VERSION;
}

function validateUniversalDocumentEngine() {
  const errors = [];

  if (!UNIVERSAL_DOCUMENT_RESPONSE_SCHEMA) {
    errors.push("Missing response schema.");
  }

  if (typeof aiAnalyzeUniversalDocument !== "function") {
    errors.push("aiAnalyzeUniversalDocument() missing.");
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
    engineName: ENGINE_NAME,
    engineVersion: AI_DOCUMENT_ENGINE_VERSION,
    schemaVersion: UNIVERSAL_DOCUMENT_SCHEMA_VERSION,
  };
}

module.exports = {
  ENGINE_NAME,

  AI_DOCUMENT_ENGINE_VERSION,

  UNIVERSAL_DOCUMENT_SCHEMA_VERSION,

  UNIVERSAL_DOCUMENT_RESPONSE_SCHEMA,

  EVIDENCE_TYPES,

  SEMANTIC_EFFECT_TYPES,

  aiAnalyzeUniversalDocument,

  analyzeUniversalDocument,

  normalizeUniversalAnalysis,

  sanitizeUniversalDocumentResult,

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

  applyDeterministicLifecycleNormalization,
};
