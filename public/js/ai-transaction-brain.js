/* =====================================================
   RapportLink AI Transaction Brain
   Version 4 — Semantic Evidence Architecture
   ===================================================== */

console.log("AI Transaction Brain Loaded");

const AI_TRANSACTION_BRAIN_VERSION = 5;

/*
=========================================================

The Transaction Brain is the only component allowed to
determine:

- Transaction State
- Transaction Health
- Closing Confidence
- Missing Items
- Recommendations
- Reasoning

It does not classify documents by filename or document title.

It reasons from semantic effects, transaction events,
structured facts, confidence, and event sequence produced by
the Universal Document Engine.

=========================================================
*/

function aiBuildTransactionBrain(txn = {}) {
  const docs = Array.isArray(txn.documents) ? txn.documents : [];

  const brain = {
    version: AI_TRANSACTION_BRAIN_VERSION,
    engineVersion: AI_TRANSACTION_BRAIN_VERSION,

    transactionState: "Unknown",
    confidence: null,
    health: null,

    /*
     * The Decision Engine will become the single source of
     * truth for every AI conclusion.
     *
     * During the transition, the existing properties
     * (transactionState, confidence, health, reasoning,
     * recommendations, missingItems) remain so the rest of
     * RapportLink continues to work unchanged.
     */
    decision: {
      state: "Pre-Contract",

      confidence: null,

      health: null,

      supportingEvidence: [],

      contradictingEvidence: [],

      unresolvedEvidence: [],

      reasoning: [],

      missingItems: [],

      recommendations: [],

      audit: [],
    },

    semanticEffects: [],
    transactionEvents: [],

    ledger: new EvidenceLedger({
      transactionId: txn.id || txn.transactionId || null,
    }),

    reconciliationEngine: null,

    evidenceCollection: null,

    reconciledEvidence: [],

    canonicalEvidence: {},

    timeline: [],

    evidenceTimeline: new EvidenceTimeline(),

    canonicalFacts: {
      purchasePrice: "",
      earnestMoney: "",
      effectiveDate: "",
      closingDate: "",
      actualClosingDate: "",
      terminationDate: "",
      appraisalValue: "",
      sellerCredit: "",
      optionDays: null,
      inspectionDays: null,
      financingDeadline: "",
      appraisalDeadline: "",
    },

    signals: {
      contractExecuted: false,
      settlementCompleted: false,
      fundsDisbursed: false,
      recordingCompleted: false,
      titleTransferred: false,
      terminationEffective: false,

      inspectionCompleted: false,
      appraisalCompleted: false,
      amendmentEffective: false,

      closingEvidencePresent: false,
      terminationEvidencePresent: false,
      conflictingOutcomeEvidence: false,

      closingAfterTermination: false,
      terminationAfterClosing: false,
    },

    scores: {
      preContract: 0,
      active: 0,
      pending: 0,
      cancelled: 0,
      closed: 0,
    },

    missingItems: [],
    recommendations: [],
    reasoning: [],
  };

  brain.evidenceCollection = brain.ledger.collection;

  brain.reconciliationEngine = new EvidenceReconciliationEngine(
    brain.evidenceCollection,
  );

  /* -----------------------------------------------------
     Core helpers
  ----------------------------------------------------- */

  const clamp = (value, minimum = 0, maximum = 100) =>
    Math.max(minimum, Math.min(maximum, Number(value || 0)));

  const text = (value) =>
    String(value === null || value === undefined ? "" : value).trim();

  const normalizedKey = (value) =>
    text(value)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "");

  const normalizeConfidence = (value, fallback = 0) => {
    const number = Number(value);

    if (!Number.isFinite(number)) {
      return clamp(fallback);
    }

    return clamp(number <= 1 ? number * 100 : number);
  };

  const parseDate = (value) => {
    const source = text(value);

    if (!source) return null;

    const nativeDate = new Date(source);

    if (!Number.isNaN(nativeDate.getTime())) {
      return nativeDate;
    }

    const numericMatch = source.match(
      /\b(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b/,
    );

    if (!numericMatch) return null;

    let year = Number(numericMatch[3]);

    if (year < 100) {
      year += year >= 70 ? 1900 : 2000;
    }

    const parsed = new Date(
      year,
      Number(numericMatch[1]) - 1,
      Number(numericMatch[2]),
    );

    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const timestamp = (value) => {
    const date = parseDate(value);
    return date ? date.getTime() : null;
  };

  const firstDefined = (...values) =>
    values.find(
      (value) =>
        value !== undefined &&
        value !== null &&
        value !== "" &&
        !(Array.isArray(value) && value.length === 0),
    );

  const asObject = (value) =>
    value && typeof value === "object" && !Array.isArray(value) ? value : {};

  const asArray = (value) => (Array.isArray(value) ? value : []);

  const valueFromObject = (object, aliases = []) => {
    const source = asObject(object);
    const normalizedAliases = aliases.map(normalizedKey);

    for (const [key, value] of Object.entries(source)) {
      if (
        normalizedAliases.includes(normalizedKey(key)) &&
        value !== undefined &&
        value !== null &&
        value !== ""
      ) {
        return value;
      }
    }

    return "";
  };

  const uniqueBy = (items, makeKey) => {
    const seen = new Set();

    return items.filter((item) => {
      const key = makeKey(item);

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
  };

  const addReasoning = (message) => {
    const clean = text(message);

    if (clean && !brain.reasoning.includes(clean)) {
      brain.reasoning.push(clean);
    }
  };

  const addMissingItem = (item) => {
    const clean = text(item);

    if (clean && !brain.missingItems.includes(clean)) {
      brain.missingItems.push(clean);
    }
  };

  const addRecommendation = (item) => {
    const clean = text(item);

    if (clean && !brain.recommendations.includes(clean)) {
      brain.recommendations.push(clean);
    }
  };

  /* -----------------------------------------------------
     Semantic effect normalization
  ----------------------------------------------------- */

  const semanticAliases = {
    contractExecuted: [
      "contractExecuted",
      "purchaseAgreementExecuted",
      "agreementExecuted",
      "fullyExecutedContract",
      "fullyExecutedPurchaseAgreement",
    ],

    settlementCompleted: [
      "settlementCompleted",
      "closingCompleted",
      "transactionClosed",
      "consummationCompleted",
    ],

    fundsDisbursed: [
      "fundsDisbursed",
      "fundingCompleted",
      "disbursementCompleted",
      "funded",
    ],

    recordingCompleted: [
      "recordingCompleted",
      "recorded",
      "deedRecorded",
      "recordingConfirmed",
    ],

    titleTransferred: [
      "titleTransferred",
      "ownershipTransferred",
      "deedTransferred",
    ],

    terminationEffective: [
      "terminationEffective",
      "contractTerminated",
      "cancellationEffective",
      "agreementCancelled",
    ],

    inspectionCompleted: ["inspectionCompleted", "inspectionPerformed"],

    appraisalCompleted: ["appraisalCompleted", "appraisalPerformed"],

    amendmentEffective: [
      "amendmentEffective",
      "amendmentExecuted",
      "contractModified",
    ],
  };

  const canonicalEffectName = (value) => {
    const key = normalizedKey(value);

    for (const [canonicalName, aliases] of Object.entries(semanticAliases)) {
      if (aliases.some((alias) => normalizedKey(alias) === key)) {
        return canonicalName;
      }
    }

    return "";
  };

  const normalizeSemanticEffect = ({ effectType, effect, doc, analysis }) => {
    const canonicalType = canonicalEffectName(effectType);

    if (!canonicalType) {
      return null;
    }

    const source = asObject(effect);

    return {
      type: canonicalType,

      occurred:
        source.occurred === true ||
        source.completed === true ||
        source.effective === true ||
        source.detected === true,

      date: firstDefined(
        source.date,
        source.occurredDate,
        source.effectiveDate,
        source.completedDate,
        source.eventDate,
        "",
      ),

      confidence: normalizeConfidence(
        firstDefined(source.confidence, source.score),
        0,
      ),

      supportingText: text(
        firstDefined(
          source.supportingText,
          source.support,
          source.reason,
          source.explanation,
          "",
        ),
      ),

      sourceDocumentId: firstDefined(
        source.sourceDocumentId,
        analysis.documentId,
        doc.id,
        null,
      ),

      sourceDocument: firstDefined(
        source.sourceDocument,
        analysis.documentName,
        doc.name,
        "Uploaded Document",
      ),
    };
  };

  const addSemanticEffectsFromObject = (effects, doc, analysis) => {
    const source = asObject(effects);

    Object.entries(source).forEach(([effectType, effect]) => {
      const normalized = normalizeSemanticEffect({
        effectType,
        effect,
        doc,
        analysis,
      });

      if (normalized) {
        brain.semanticEffects.push(normalized);
      }
    });
  };

  const addSemanticEffectsFromArray = (effects, doc, analysis) => {
    asArray(effects).forEach((effect) => {
      const source = asObject(effect);

      const normalized = normalizeSemanticEffect({
        effectType: firstDefined(
          source.type,
          source.effectType,
          source.name,
          source.event,
          "",
        ),
        effect: source,
        doc,
        analysis,
      });

      if (normalized) {
        brain.semanticEffects.push(normalized);
      }
    });
  };

  /* -----------------------------------------------------
     Transaction event normalization
  ----------------------------------------------------- */

  const normalizeTransactionEvent = (event, doc, analysis) => {
    const source = asObject(event);

    const rawType = firstDefined(
      source.type,
      source.eventType,
      source.name,
      source.event,
      source.category,
      "",
    );

    const semanticType = canonicalEffectName(rawType);

    return {
      type: semanticType || text(rawType) || "TransactionEvent",

      date: firstDefined(
        source.date,
        source.eventDate,
        source.effectiveDate,
        source.completedDate,
        "",
      ),

      occurred:
        source.occurred !== false &&
        source.completed !== false &&
        source.effective !== false,

      confidence: normalizeConfidence(
        firstDefined(source.confidence, source.score),
        50,
      ),

      description: text(
        firstDefined(
          source.description,
          source.summary,
          source.supportingText,
          source.reason,
          "",
        ),
      ),

      sourceDocumentId: firstDefined(
        source.sourceDocumentId,
        analysis.documentId,
        doc.id,
        null,
      ),

      sourceDocument: firstDefined(
        source.sourceDocument,
        analysis.documentName,
        doc.name,
        "Uploaded Document",
      ),
    };
  };

  /* -----------------------------------------------------
     Generic evidence normalization

     Evidence remains available for auditability and
     canonical facts, but evidence type names do not decide
     transaction state.
  ----------------------------------------------------- */

  const normalizeEvidence = (item, doc, analysis) => {
    const source = asObject(item);

    return {
      key: text(
        firstDefined(source.key, source.name, source.field, source.path, ""),
      ),

      value: firstDefined(
        source.value,
        source.normalizedValue,
        source.text,
        source.content,
        "",
      ),

      type: text(firstDefined(source.type, source.category, "fact")),

      confidence: normalizeConfidence(
        firstDefined(source.confidence, source.score),
        50,
      ),

      documentId: firstDefined(
        source.documentId,
        analysis.documentId,
        doc.id,
        null,
      ),

      documentName: firstDefined(
        source.documentName,
        analysis.documentName,
        doc.name,
        "Uploaded Document",
      ),

      documentType: firstDefined(
        source.documentType,
        analysis.documentType,
        null,
      ),

      page: firstDefined(source.page, null),

      extractedBy: firstDefined(source.extractedBy, "gpt"),

      reasoning: asArray(source.reasoning),

      metadata: asObject(source.metadata),
    };
  };

  /* -----------------------------------------------------
     Gather analysis produced for this transaction
  ----------------------------------------------------- */

  docs.forEach((doc) => {
    if (!doc) return;

    const analysis = doc.aiAnalysis || doc.universalAnalysis || doc.ai || null;

    if (!analysis || typeof analysis !== "object") {
      return;
    }

    addSemanticEffectsFromObject(analysis.semanticEffects, doc, analysis);

    addSemanticEffectsFromArray(analysis.semanticEffects, doc, analysis);

    addSemanticEffectsFromObject(
      analysis.universalAnalysis?.semanticEffects,
      doc,
      analysis,
    );

    addSemanticEffectsFromArray(
      analysis.universalAnalysis?.semanticEffects,
      doc,
      analysis,
    );

    asArray(analysis.transactionEvents).forEach((event) => {
      brain.transactionEvents.push(
        normalizeTransactionEvent(event, doc, analysis),
      );
    });

    asArray(analysis.universalAnalysis?.transactionEvents).forEach((event) => {
      brain.transactionEvents.push(
        normalizeTransactionEvent(event, doc, analysis),
      );
    });

    asArray(analysis.evidence).forEach((item) => {
      brain.reconciliationEngine.reconcile(
        normalizeEvidence(item, doc, analysis),
      );
    });

    asArray(analysis.universalAnalysis?.evidence?.items).forEach((item) => {
      brain.reconciliationEngine.reconcile(
        normalizeEvidence(item, doc, analysis),
      );
    });
  });

  brain.semanticEffects = uniqueBy(brain.semanticEffects, (effect) =>
    JSON.stringify({
      type: effect.type,
      occurred: effect.occurred,
      date: effect.date || "",
      confidence: effect.confidence,
      sourceDocumentId: effect.sourceDocumentId || null,
      supportingText: effect.supportingText || "",
    }),
  );

  brain.transactionEvents = uniqueBy(brain.transactionEvents, (event) =>
    JSON.stringify({
      type: event.type,
      date: event.date || "",
      sourceDocumentId: event.sourceDocumentId || null,
      description: event.description || "",
    }),
  );

  brain.reconciledEvidence = brain.evidenceCollection.getActive();

  brain.evidence = [...brain.reconciledEvidence];

  /*
   * The Evidence Engine is the single source of truth for
   * canonical evidence decisions.
   *
   * If the trusted canonical engine is available, use it.
   * Otherwise fall back to the legacy implementation.
   */

  if (typeof buildTrustedCanonicalEvidenceMap === "function") {
    brain.canonicalEvidence = buildTrustedCanonicalEvidenceMap(
      brain.reconciledEvidence,
    );
  } else {
    brain.canonicalEvidence = buildCanonicalEvidenceMap(
      brain.reconciledEvidence,
    );
  }

  /*
   * Derive semantic effects from completed standardized transaction
   * events whenever a document analysis does not already contain the
   * corresponding effect.
   *
   * This is generic event normalization. It does not use filenames,
   * document titles, or transaction-specific hard coding.
   */
  const eventSemanticAliases = {
    contractExecuted: [
      "contract executed",
      "purchase agreement executed",
      "agreement executed",
      "contract signed",
      "purchase agreement signed",
      "effective contract",
    ],

    settlementCompleted: [
      "settlement",
      "settlement completed",
      "closing completed",
      "closing",
      "consummation",
    ],

    fundsDisbursed: [
      "disbursement",
      "escrow disbursement",
      "funds disbursed",
      "funding completed",
      "loan funding accounted",
      "seller proceeds allocated",
      "seller proceeds allocation",
      "buyer funding",
    ],

    recordingCompleted: [
      "recording completed",
      "deed recorded",
      "recorded deed",
      "recording confirmed",
      "instrument recorded",
    ],

    titleTransferred: [
      "title transferred",
      "title transfer",
      "ownership transferred",
      "deed conveyed",
      "conveyance completed",
    ],

    terminationEffective: [
      "termination effective",
      "contract terminated",
      "termination completed",
      "agreement cancelled",
      "agreement canceled",
      "contract cancelled",
      "contract canceled",
    ],

    inspectionCompleted: [
      "inspection completed",
      "inspection performed",
      "property inspected",
    ],

    appraisalCompleted: [
      "appraisal completed",
      "appraisal performed",
      "appraisal received",
    ],

    amendmentEffective: [
      "amendment effective",
      "amendment executed",
      "contract modified",
    ],
  };

  const eventMatchesSemanticType = (eventType, semanticType) => {
    const eventKey = text(eventType).toLowerCase();

    if (!eventKey) return false;

    return asArray(eventSemanticAliases[semanticType]).some((alias) => {
      const aliasKey = text(alias).toLowerCase();

      return (
        eventKey === aliasKey ||
        eventKey.includes(aliasKey) ||
        aliasKey.includes(eventKey)
      );
    });
  };

  const hasOccurredSemanticEffect = (semanticType) =>
    brain.semanticEffects.some(
      (effect) => effect.type === semanticType && effect.occurred === true,
    );

  Object.keys(eventSemanticAliases).forEach((semanticType) => {
    if (hasOccurredSemanticEffect(semanticType)) {
      return;
    }

    const matchingEvents = brain.transactionEvents
      .filter(
        (event) =>
          event.occurred === true &&
          eventMatchesSemanticType(event.type, semanticType),
      )
      .sort((a, b) => {
        const confidenceDifference =
          Number(b.confidence || 0) - Number(a.confidence || 0);

        if (confidenceDifference !== 0) {
          return confidenceDifference;
        }

        return Number(timestamp(b.date) || 0) - Number(timestamp(a.date) || 0);
      });

    const strongestEvent = matchingEvents[0];

    if (!strongestEvent) {
      return;
    }

    brain.semanticEffects.push({
      type: semanticType,
      occurred: true,
      date: strongestEvent.date || "",
      confidence: normalizeConfidence(strongestEvent.confidence, 0),
      supportingText:
        strongestEvent.description ||
        `${strongestEvent.type} was reported as completed.`,
      sourceDocumentId: strongestEvent.sourceDocumentId || null,
      sourceDocument: strongestEvent.sourceDocument || "Uploaded Document",
      derivedFromTransactionEvent: true,
    });
  });

  brain.semanticEffects = uniqueBy(brain.semanticEffects, (effect) =>
    JSON.stringify({
      type: effect.type,
      occurred: effect.occurred,
      date: effect.date || "",
      sourceDocumentId: effect.sourceDocumentId || null,
    }),
  );

  /* -----------------------------------------------------
     Semantic resolution
  ----------------------------------------------------- */

  const effectsOfType = (type) =>
    brain.semanticEffects.filter((effect) => effect.type === type);

  const strongestOccurredEffect = (type, minimumConfidence = 70) => {
    const effects = effectsOfType(type).filter(
      (effect) =>
        effect.occurred === true && effect.confidence >= minimumConfidence,
    );

    if (effects.length === 0) {
      return null;
    }

    return effects.sort((a, b) => {
      const confidenceDifference = b.confidence - a.confidence;

      if (confidenceDifference !== 0) {
        return confidenceDifference;
      }

      const aDate = new Date(a.date || 0).getTime();
      const bDate = new Date(b.date || 0).getTime();

      return bDate - aDate;
    })[0];
  };

  const effectOccurred = (type, minimumConfidence = 70) =>
    Boolean(strongestOccurredEffect(type, minimumConfidence));

  brain.signals.contractExecuted = effectOccurred("contractExecuted");

  brain.signals.settlementCompleted = effectOccurred("settlementCompleted", 85);

  brain.signals.fundsDisbursed = effectOccurred("fundsDisbursed", 80);

  brain.signals.recordingCompleted = effectOccurred("recordingCompleted", 80);

  brain.signals.titleTransferred = effectOccurred("titleTransferred", 80);

  brain.signals.terminationEffective = effectOccurred(
    "terminationEffective",
    85,
  );

  brain.signals.inspectionCompleted = effectOccurred("inspectionCompleted", 70);

  brain.signals.appraisalCompleted = effectOccurred("appraisalCompleted", 70);

  brain.signals.amendmentEffective = effectOccurred("amendmentEffective", 70);

  brain.signals.closingEvidencePresent =
    brain.signals.settlementCompleted ||
    brain.signals.fundsDisbursed ||
    brain.signals.recordingCompleted ||
    brain.signals.titleTransferred ||
    effectsOfType("settlementCompleted").some(
      (effect) => effect.occurred === true,
    ) ||
    effectsOfType("fundsDisbursed").some(
      (effect) => effect.occurred === true,
    ) ||
    effectsOfType("recordingCompleted").some(
      (effect) => effect.occurred === true,
    ) ||
    effectsOfType("titleTransferred").some(
      (effect) => effect.occurred === true,
    );

  brain.signals.terminationEvidencePresent =
    brain.signals.terminationEffective ||
    effectsOfType("terminationEffective").some(
      (effect) => effect.occurred === true,
    );

  brain.signals.conflictingOutcomeEvidence =
    brain.signals.closingEvidencePresent &&
    brain.signals.terminationEvidencePresent;

  /* -----------------------------------------------------
     Timeline

     Only semantic events and explicit transaction events
     participate in event-order reasoning.
  ----------------------------------------------------- */

  brain.semanticEffects.forEach((effect) => {
    const time = timestamp(effect.date);

    if (effect.occurred !== true || time === null) {
      return;
    }

    brain.timeline.push({
      type: effect.type,
      date: effect.date,
      timestamp: time,
      confidence: effect.confidence,
      description: effect.supportingText,
      sourceDocumentId: effect.sourceDocumentId,
      sourceDocument: effect.sourceDocument,
    });
  });

  brain.transactionEvents.forEach((event) => {
    const time = timestamp(event.date);

    if (event.occurred !== true || time === null) {
      return;
    }

    brain.timeline.push({
      type: event.type,
      date: event.date,
      timestamp: time,
      confidence: event.confidence,
      description: event.description,
      sourceDocumentId: event.sourceDocumentId,
      sourceDocument: event.sourceDocument,
    });
  });

  brain.timeline = uniqueBy(brain.timeline, (item) =>
    JSON.stringify({
      type: item.type,
      timestamp: item.timestamp,
      sourceDocumentId: item.sourceDocumentId || null,
    }),
  ).sort((a, b) => a.timestamp - b.timestamp);

  brain.timeline.forEach((item) => {
    brain.evidenceTimeline.add({
      transactionId: txn.id || txn.transactionId || null,
      documentId: item.sourceDocumentId || null,
      type: item.type,
      timestamp: new Date(item.timestamp).toISOString(),
      title: item.type,
      description: item.description || "",
      aiModule: "ai-transaction-brain",
      confidence: item.confidence,
      metadata: {
        sourceDocument: item.sourceDocument || null,
        originalDate: item.date || null,
      },
    });
  });

  const closingEventTypes = new Set([
    "settlementCompleted",
    "fundsDisbursed",
    "recordingCompleted",
    "titleTransferred",
  ]);

  const closingEvents = brain.timeline.filter((item) =>
    closingEventTypes.has(item.type),
  );

  const terminationEvents = brain.timeline.filter(
    (item) => item.type === "terminationEffective",
  );

  const latestClosingEvent =
    closingEvents.length > 0 ? closingEvents[closingEvents.length - 1] : null;

  const latestTerminationEvent =
    terminationEvents.length > 0
      ? terminationEvents[terminationEvents.length - 1]
      : null;

  if (latestClosingEvent && latestTerminationEvent) {
    brain.signals.closingAfterTermination =
      latestClosingEvent.timestamp > latestTerminationEvent.timestamp;

    brain.signals.terminationAfterClosing =
      latestTerminationEvent.timestamp > latestClosingEvent.timestamp;
  }

  /* -----------------------------------------------------
     Canonical facts

     Reconciled active evidence is the primary source of
     canonical transaction facts.

     Structured document facts are retained only as a
     compatibility fallback when the Evidence Engine does
     not contain a usable value.
  ----------------------------------------------------- */

  const canonicalAliases = {
    purchasePrice: [
      "purchasePrice",
      "salesPrice",
      "salePrice",
      "finalSalesPrice",
    ],

    earnestMoney: ["earnestMoney", "earnestMoneyDeposit", "emd"],

    effectiveDate: ["effectiveDate", "contractEffectiveDate", "executionDate"],

    closingDate: ["closingDate", "scheduledClosingDate", "contractClosingDate"],

    actualClosingDate: [
      "actualClosingDate",
      "settlementDate",
      "recordingDate",
      "disbursementDate",
      "closedDate",
    ],

    terminationDate: [
      "terminationDate",
      "cancellationDate",
      "cancelledDate",
      "canceledDate",
    ],

    appraisalValue: ["appraisalValue", "appraisedValue"],

    sellerCredit: ["sellerCredit", "sellerContribution", "sellerConcession"],

    optionDays: ["optionDays", "optionPeriodDays"],

    inspectionDays: ["inspectionDays", "inspectionPeriodDays"],

    financingDeadline: [
      "financingDeadline",
      "loanApprovalDeadline",
      "financingDate",
    ],

    appraisalDeadline: ["appraisalDeadline", "appraisalDate"],
  };

  const canonicalDateFields = new Set([
    "effectiveDate",
    "closingDate",
    "actualClosingDate",
    "terminationDate",
    "financingDeadline",
    "appraisalDeadline",
  ]);

  const hasUsableFactValue = (value) =>
    value !== undefined &&
    value !== null &&
    value !== "" &&
    !(Array.isArray(value) && value.length === 0);

  const evidenceKeyMatchesAlias = (evidenceKey, alias) => {
    const normalizedEvidenceKey = normalizedKey(evidenceKey);
    const normalizedAlias = normalizedKey(alias);

    if (!normalizedEvidenceKey || !normalizedAlias) {
      return false;
    }

    return (
      normalizedEvidenceKey === normalizedAlias ||
      normalizedEvidenceKey.endsWith(normalizedAlias)
    );
  };

  const chooseLatestDateValue = (values) => {
    const usableValues = asArray(values).filter(hasUsableFactValue);

    const datedValues = usableValues
      .map((value) => ({
        value,
        timestamp: timestamp(value),
      }))
      .filter((item) => item.timestamp !== null)
      .sort((a, b) => b.timestamp - a.timestamp);

    if (datedValues.length > 0) {
      return datedValues[0].value;
    }

    return firstDefined(...usableValues, "");
  };

  const getEvidenceCandidates = (aliases) =>
    brain.reconciledEvidence
      .filter((record) => {
        if (!record || !hasUsableFactValue(record.value)) {
          return false;
        }

        return aliases.some((alias) =>
          evidenceKeyMatchesAlias(record.key, alias),
        );
      })
      .map((record, index) => ({
        value: record.value,
        confidence: normalizeConfidence(record.confidence, 0),
        sourceConfidence: normalizeConfidence(
          record.sourceConfidence,
          record.confidence,
        ),
        updatedAt: timestamp(record.updatedAt || record.createdAt),
        index,
      }))
      .sort((a, b) => {
        const aDate = Number(a.updatedAt || 0);
        const bDate = Number(b.updatedAt || 0);

        // Prefer newer evidence first.
        if (aDate !== bDate) {
          return bDate - aDate;
        }

        // If equally recent, use extraction confidence.
        if (a.confidence !== b.confidence) {
          return b.confidence - a.confidence;
        }

        // Then use source confidence.
        if (a.sourceConfidence !== b.sourceConfidence) {
          return b.sourceConfidence - a.sourceConfidence;
        }

        // Final deterministic ordering.
        return b.index - a.index;
      });

  const structuredFactSources = [];

  docs.forEach((doc) => {
    if (!doc) return;

    const analysis = doc.aiAnalysis || doc.universalAnalysis || doc.ai || {};

    [
      analysis.canonicalFacts,
      analysis.facts,
      analysis.extractedFacts,
      analysis.transactionFacts,
      analysis.universalAnalysis?.canonicalFacts,
      analysis.universalAnalysis?.facts,
      analysis.universalAnalysis?.extractedFacts,
      analysis.universalAnalysis?.transactionFacts,
    ].forEach((source) => {
      if (source && typeof source === "object" && !Array.isArray(source)) {
        structuredFactSources.push(source);
      }
    });
  });

  const getStructuredFallbackValues = (aliases) =>
    structuredFactSources
      .map((source) => valueFromObject(source, aliases))
      .filter(hasUsableFactValue);

  Object.entries(canonicalAliases).forEach(([field, aliases]) => {
    const evidenceCandidates = getEvidenceCandidates(aliases);

    if (evidenceCandidates.length > 0) {
      const evidenceValues = evidenceCandidates.map(
        (candidate) => candidate.value,
      );

      brain.canonicalFacts[field] = canonicalDateFields.has(field)
        ? chooseLatestDateValue(evidenceValues)
        : evidenceValues[0];

      return;
    }

    const fallbackValues = getStructuredFallbackValues(aliases);

    if (fallbackValues.length === 0) {
      return;
    }

    brain.canonicalFacts[field] = canonicalDateFields.has(field)
      ? chooseLatestDateValue(fallbackValues)
      : fallbackValues[fallbackValues.length - 1];
  });

  const closingDates = closingEvents.map((event) => event.date).filter(Boolean);

  const terminationDates = terminationEvents
    .map((event) => event.date)
    .filter(Boolean);

  /*
   * A scheduled closing is a contractual deadline, not proof
   * that closing occurred. It populates closingDate only.
   */
  const scheduledClosingDates = brain.transactionEvents
    .filter((event) => {
      const eventType = normalizedKey(event.type);

      return (
        event.date &&
        (eventType.includes("closingscheduled") ||
          eventType.includes("scheduledclosing") ||
          eventType === "closingdate")
      );
    })
    .map((event) => event.date)
    .filter(Boolean);

  if (scheduledClosingDates.length > 0) {
    brain.canonicalFacts.closingDate = chooseLatestDateValue([
      brain.canonicalFacts.closingDate,
      ...scheduledClosingDates,
    ]);
  }

  /*
   * Only completed closing events may populate the actual
   * closing date.
   */
  if (closingDates.length > 0) {
    brain.canonicalFacts.actualClosingDate = chooseLatestDateValue([
      brain.canonicalFacts.actualClosingDate,
      ...closingDates,
    ]);
  }

  if (terminationDates.length > 0) {
    brain.canonicalFacts.terminationDate = chooseLatestDateValue([
      brain.canonicalFacts.terminationDate,
      ...terminationDates,
    ]);
  }

  /* -----------------------------------------------------
     State scores

     Scores are derived from the strength, corroboration,
     and sequence of semantic evidence.

     Scores measure support for each possible state. They do
     not independently override event-order reasoning.
  ----------------------------------------------------- */

  const stateEvidenceWeights = {
    contractExecuted: {
      preContract: -90,
      active: 100,
      pending: -20,
    },

    inspectionCompleted: {
      active: 10,
    },

    appraisalCompleted: {
      active: 10,
      pending: 10,
    },

    amendmentEffective: {
      active: 5,
    },

    settlementCompleted: {
      closed: 100,
      active: -80,
      pending: -40,
      cancelled: -90,
    },

    fundsDisbursed: {
      closed: 90,
      pending: 20,
      active: -40,
    },

    recordingCompleted: {
      closed: 95,
      pending: 20,
      active: -50,
    },

    titleTransferred: {
      closed: 90,
      pending: 15,
      active: -40,
    },

    terminationEffective: {
      cancelled: 100,
      closed: -90,
      active: -80,
      pending: -30,
    },
  };

  const addStateScore = (state, amount) => {
    if (!Object.prototype.hasOwnProperty.call(brain.scores, state)) {
      return;
    }

    brain.scores[state] += Number(amount || 0);
  };

  const occurredEffectsForType = (type) =>
    brain.semanticEffects.filter(
      (effect) => effect && effect.type === type && effect.occurred === true,
    );

  const calculateSemanticSupport = (type) => {
    const effects = occurredEffectsForType(type);

    if (effects.length === 0) {
      return {
        present: false,
        confidence: 0,
        corroboration: 0,
        sourceCount: 0,
        latestTimestamp: null,
      };
    }

    const sourceIds = new Set();

    effects.forEach((effect) => {
      const sourceId = effect.sourceDocumentId || effect.sourceDocument || null;

      if (sourceId) {
        sourceIds.add(String(sourceId));
      }
    });

    const strongestConfidence = Math.max(
      ...effects.map((effect) => normalizeConfidence(effect.confidence, 0)),
    );

    const corroborationBonus = Math.min(
      Math.max(sourceIds.size - 1, 0) * 5,
      15,
    );

    const latestTimestamp = effects.reduce((latest, effect) => {
      const effectTimestamp = timestamp(effect.date);

      if (effectTimestamp === null) {
        return latest;
      }

      if (latest === null || effectTimestamp > latest) {
        return effectTimestamp;
      }

      return latest;
    }, null);

    return {
      present: true,
      confidence: clamp(strongestConfidence + corroborationBonus, 0, 100),
      corroboration: corroborationBonus,
      sourceCount: sourceIds.size,
      latestTimestamp,
    };
  };

  const semanticSupport = {};

  Object.keys(stateEvidenceWeights).forEach((effectType) => {
    semanticSupport[effectType] = calculateSemanticSupport(effectType);
  });

  /*
   * No executed-contract evidence strongly supports
   * Pre-Contract. An executed contract moves the transaction
   * into the active lifecycle.
   */
  if (!brain.signals.contractExecuted) {
    addStateScore("preContract", 85);
  }

  Object.entries(stateEvidenceWeights).forEach(([effectType, stateWeights]) => {
    const support = semanticSupport[effectType];

    if (!support.present) {
      return;
    }

    const strengthMultiplier = clamp(support.confidence, 0, 100) / 100;

    Object.entries(stateWeights).forEach(([state, baseWeight]) => {
      addStateScore(state, baseWeight * strengthMultiplier);
    });
  });

  /*
   * Evidence indicating closing activity without completed
   * closing evidence supports Pending, not Closed.
   */
  if (
    brain.signals.closingEvidencePresent &&
    !brain.signals.settlementCompleted &&
    !brain.signals.recordingCompleted &&
    !brain.signals.fundsDisbursed &&
    !brain.signals.titleTransferred
  ) {
    addStateScore("pending", 65);
  }

  /*
   * Termination-related evidence that has not established an
   * effective termination represents an unresolved outcome.
   */
  if (
    brain.signals.terminationEvidencePresent &&
    !brain.signals.terminationEffective
  ) {
    addStateScore("pending", 65);
  }

  /*
   * Conflicting closing and termination evidence lowers the
   * certainty of both final outcomes and supports Pending
   * until event sequence resolves the conflict.
   */
  if (brain.signals.conflictingOutcomeEvidence) {
    addStateScore("pending", 55);
    addStateScore("closed", -20);
    addStateScore("cancelled", -20);
  }

  /*
   * Event sequence is stronger than isolated evidence.
   * A later completed outcome supersedes an earlier
   * contradictory outcome.
   */
  if (brain.signals.closingAfterTermination) {
    addStateScore("closed", 100);
    addStateScore("cancelled", -90);
    addStateScore("pending", -40);

    addReasoning(
      "Completed closing evidence occurred after the termination evidence, so the later closing outcome controls.",
    );
  }

  if (brain.signals.terminationAfterClosing) {
    addStateScore("cancelled", 100);
    addStateScore("closed", -90);
    addStateScore("pending", 20);

    addReasoning(
      "Effective termination evidence occurred after the closing evidence, so the later termination outcome controls.",
    );
  }

  /*
   * A transaction with an executed contract but no completed
   * closing or effective termination remains Active unless
   * closing-stage evidence supports Pending.
   */
  if (
    brain.signals.contractExecuted &&
    !brain.signals.settlementCompleted &&
    !brain.signals.recordingCompleted &&
    !brain.signals.fundsDisbursed &&
    !brain.signals.titleTransferred &&
    !brain.signals.terminationEffective &&
    !brain.signals.closingEvidencePresent
  ) {
    addStateScore("active", 20);
  }

  Object.keys(brain.scores).forEach((key) => {
    brain.scores[key] = Math.round(clamp(brain.scores[key], 0, 100));
  });

  /* -----------------------------------------------------
   State determination
----------------------------------------------------- */

  const transactionSide = text(txn.side).toLowerCase();

  const isListingWorkflow =
    transactionSide === "listing" ||
    transactionSide === "seller" ||
    transactionSide === "seller listing";

  const pendingEvidence =
    brain.transactionEvents.some((event) => {
      const type = normalizedKey(event.type);

      return (
        type.includes("closing") ||
        type.includes("settlement") ||
        type.includes("funding") ||
        type.includes("funds") ||
        type.includes("recording") ||
        type.includes("title")
      );
    }) &&
    !brain.signals.settlementCompleted &&
    !brain.signals.recordingCompleted;

  if (brain.signals.closingAfterTermination) {
    brain.decision.state = "Closed";
  } else if (brain.signals.terminationAfterClosing) {
    brain.decision.state = "Cancelled";
  } else if (
    brain.signals.settlementCompleted ||
    brain.signals.recordingCompleted ||
    (brain.signals.fundsDisbursed && brain.signals.titleTransferred)
  ) {
    brain.decision.state = "Closed";
  } else if (brain.signals.terminationEffective) {
    brain.decision.state = "Cancelled";
  } else if (brain.signals.conflictingOutcomeEvidence) {
    brain.decision.state = "Pending";
  } else if (brain.signals.contractExecuted) {
    const completedMilestones =
      Number(brain.signals.inspectionCompleted) +
      Number(brain.signals.appraisalCompleted) +
      Number(brain.signals.fundsDisbursed) +
      Number(brain.signals.recordingCompleted);

    if (pendingEvidence || completedMilestones >= 2) {
      brain.decision.state = "Pending";
    } else {
      brain.decision.state = "Active";
    }
  } else if (isListingWorkflow) {
    brain.decision.state = "Listed";
  } else {
    brain.decision.state = "Pre-Contract";
  }

  if (brain.decision.state !== "Unknown") {
    brain.transactionState = brain.decision.state;
  }

  /* -----------------------------------------------------
     Confidence
  ----------------------------------------------------- */

  const calculateClosingConfidence = () => {
    /*
     * Closing Confidence answers:
     *
     * "How much evidence supports a successful closing?"
     *
     * It is NOT transaction confidence.
     */

    switch (brain.decision.state) {
      case "Pre-Contract":
      case "Listed":
      case "Cancelled":
        return 0;

      case "Active": {
        let score = 0;

        if (brain.signals.contractExecuted) score += 40;
        if (brain.signals.inspectionCompleted) score += 20;

        if (transactionSide === "buyer") {
          if (brain.signals.appraisalCompleted) score += 20;
        }

        if (brain.canonicalFacts.closingDate) score += 20;

        return clamp(score);
      }

      case "Pending": {
        let score = 0;

        if (brain.signals.contractExecuted) score += 15;
        if (brain.signals.settlementCompleted) score += 25;
        if (brain.signals.fundsDisbursed) score += 20;
        if (brain.signals.recordingCompleted) score += 20;
        if (brain.signals.titleTransferred) score += 20;

        if (brain.signals.conflictingOutcomeEvidence) {
          score -= 25;
        }

        return clamp(score);
      }

      case "Closed": {
        let score = 0;

        if (brain.signals.settlementCompleted) score += 30;
        if (brain.signals.fundsDisbursed) score += 25;
        if (brain.signals.recordingCompleted) score += 25;
        if (brain.signals.titleTransferred) score += 20;

        return clamp(score);
      }

      default:
        return 0;
    }
  };

  brain.decision.confidence = calculateClosingConfidence();
  brain.confidence = brain.decision.confidence;

  /* -----------------------------------------------------
     Human-readable reasoning
  ----------------------------------------------------- */

  const addDecisionReasoning = (message) => {
    const reasoning = text(message).trim();

    if (reasoning && !brain.decision.reasoning.includes(reasoning)) {
      brain.decision.reasoning.push(reasoning);
    }
  };

  if (brain.signals.contractExecuted) {
    addDecisionReasoning(
      "The document evidence establishes that the purchase contract was executed.",
    );
  }

  if (brain.signals.inspectionCompleted) {
    addDecisionReasoning(
      "The document evidence establishes that the inspection occurred.",
    );
  }

  if (brain.signals.appraisalCompleted) {
    addDecisionReasoning(
      "The document evidence establishes that the appraisal occurred.",
    );
  }

  if (brain.signals.amendmentEffective) {
    addDecisionReasoning(
      "An effective contract amendment was identified and its structured facts were considered.",
    );
  }

  if (brain.signals.settlementCompleted) {
    addDecisionReasoning(
      "The document contents establish that settlement was completed.",
    );
  }

  if (brain.signals.fundsDisbursed) {
    addDecisionReasoning(
      "The document contents establish that transaction funds were disbursed.",
    );
  }

  if (brain.signals.recordingCompleted) {
    addDecisionReasoning(
      "The document contents establish that recording was completed.",
    );
  }

  if (brain.signals.titleTransferred) {
    addDecisionReasoning(
      "The document contents establish that title transferred.",
    );
  }

  if (brain.signals.terminationEffective) {
    addDecisionReasoning(
      "The document contents establish that the contract termination became effective.",
    );
  }

  if (brain.signals.closingAfterTermination) {
    addDecisionReasoning(
      "Completed closing evidence is dated after the termination evidence, so the later closing controls this transaction record.",
    );
  }

  if (brain.signals.terminationAfterClosing) {
    addDecisionReasoning(
      "Effective termination evidence is dated after the closing evidence, so the later termination controls this transaction record.",
    );
  }

  if (
    brain.signals.conflictingOutcomeEvidence &&
    !brain.signals.closingAfterTermination &&
    !brain.signals.terminationAfterClosing
  ) {
    addDecisionReasoning(
      "Both closing-related and termination-related evidence were found, but the available dates do not establish which outcome occurred last.",
    );
  }

  if (brain.decision.state === "Pre-Contract") {
    addDecisionReasoning(
      "The available document analysis does not establish an executed contract, effective termination, or completed closing.",
    );
  }

  if (brain.decision.state === "Listed") {
    addDecisionReasoning(
      "This is a listing workflow without evidence of an executed purchase contract.",
    );
  }

  if (brain.decision.state === "Pending") {
    addDecisionReasoning(
      "The available evidence shows a transaction outcome may be developing, but it does not yet establish a final outcome with sufficient certainty.",
    );
  }

  brain.reasoning = [...brain.decision.reasoning];

  /* -----------------------------------------------------
     Health
  ----------------------------------------------------- */

  /*
   * Health must be calculated only from evidence currently
   * available to the Transaction Brain.
   *
   * This local helper is intentionally declared before the
   * Health calculation so this section does not depend on a
   * helper declared later in the function.
   */
  const hasHealthEvidenceFor = (aliases = []) => {
    const normalizedAliases = aliases.map(normalizedKey);

    return brain.reconciledEvidence.some((record) => {
      if (!record) return false;

      const searchableValues = [record.key, record.type, record.value]
        .map(normalizedKey)
        .filter(Boolean);

      return normalizedAliases.some((alias) =>
        searchableValues.some(
          (value) =>
            value === alias || value.includes(alias) || alias.includes(value),
        ),
      );
    });
  };

  switch (brain.decision.state) {
    case "Pre-Contract":
      /*
       * No executed transaction has been established.
       * Without supporting transaction evidence, Health is 0.
       */
      brain.decision.health = 0;
      break;

    case "Listed": {
      let possible = 2;
      let earned = 0;

      if (
        hasHealthEvidenceFor([
          "listingAgreement",
          "executedListingAgreement",
          "exclusiveRightToSell",
        ])
      ) {
        earned++;
      }

      if (
        hasHealthEvidenceFor([
          "sellerDisclosures",
          "sellerDisclosure",
          "propertyDisclosure",
          "sellerRealPropertyDisclosure",
        ])
      ) {
        earned++;
      }

      brain.decision.health = Math.round((earned / possible) * 100);

      break;
    }

    case "Active": {
      let possible = 2;
      let earned = 0;

      if (brain.signals.contractExecuted) {
        earned++;
      }

      if (brain.canonicalFacts.closingDate) {
        earned++;
      }

      /*
       * Buyer-side and non-listing transactions also depend
       * on inspection and appraisal evidence.
       */
      if (!isListingWorkflow) {
        possible++;

        if (brain.signals.inspectionCompleted) {
          earned++;
        }

        if (transactionSide === "buyer") {
          possible++;

          if (brain.signals.appraisalCompleted) {
            earned++;
          }
        }
      }

      brain.decision.health = Math.round((earned / possible) * 100);

      break;
    }

    case "Pending": {
      const possible = 5;
      let earned = 0;

      if (brain.signals.contractExecuted) {
        earned++;
      }

      if (brain.signals.settlementCompleted) {
        earned++;
      }

      if (brain.signals.fundsDisbursed) {
        earned++;
      }

      if (brain.signals.recordingCompleted) {
        earned++;
      }

      if (brain.signals.titleTransferred) {
        earned++;
      }

      brain.decision.health = Math.round((earned / possible) * 100);

      if (brain.signals.conflictingOutcomeEvidence) {
        brain.decision.health -= 25;
      }

      brain.decision.health = clamp(brain.decision.health);

      break;
    }

    case "Cancelled":
      brain.decision.health = brain.signals.terminationEffective ? 100 : 0;
      break;

    case "Closed": {
      const possible = 4;
      let earned = 0;

      if (brain.signals.settlementCompleted) {
        earned++;
      }

      if (brain.signals.fundsDisbursed) {
        earned++;
      }

      if (brain.signals.recordingCompleted) {
        earned++;
      }

      if (brain.signals.titleTransferred) {
        earned++;
      }

      brain.decision.health = Math.round((earned / possible) * 100);

      break;
    }

    default:
      brain.decision.health = 0;
      break;
  }

  brain.decision.health = clamp(brain.decision.health);

  brain.health = brain.decision.health;

  /* -----------------------------------------------------
     Missing items
  ----------------------------------------------------- */

  const hasEvidenceFor = (aliases = []) => {
    const normalizedAliases = aliases.map(normalizedKey);

    return brain.reconciledEvidence.some((record) => {
      if (!record) return false;

      const searchableValues = [record.key, record.type, record.value]
        .map(normalizedKey)
        .filter(Boolean);

      return normalizedAliases.some((alias) =>
        searchableValues.some(
          (value) => value === alias || value.includes(alias),
        ),
      );
    });
  };

  if (brain.decision.state === "Pre-Contract") {
    if (isListingWorkflow) {
      if (
        !hasEvidenceFor([
          "listingAgreement",
          "executedListingAgreement",
          "exclusiveRightToSell",
        ])
      ) {
        addMissingItem("Listing Agreement");
      }
    } else {
      addMissingItem("Executed Purchase Agreement");
    }
  }

  if (brain.decision.state === "Listed") {
    if (
      !hasEvidenceFor([
        "listingAgreement",
        "executedListingAgreement",
        "exclusiveRightToSell",
      ])
    ) {
      addMissingItem("Listing Agreement");
    }

    if (
      !hasEvidenceFor([
        "sellerDisclosures",
        "sellerDisclosure",
        "propertyDisclosure",
        "sellerRealPropertyDisclosure",
      ])
    ) {
      addMissingItem("Seller Disclosures");
    }
  }

  if (brain.decision.state === "Active" && !isListingWorkflow) {
    if (!brain.signals.inspectionCompleted) {
      addMissingItem("Inspection Documentation");
    }

    if (transactionSide === "buyer" && !brain.signals.appraisalCompleted) {
      addMissingItem("Appraisal Documentation");
    }
  }

  if (brain.decision.state === "Pending") {
    if (
      brain.signals.terminationEvidencePresent &&
      !brain.signals.terminationEffective
    ) {
      addMissingItem("Evidence Confirming Effective Termination");
    }

    if (
      brain.signals.closingEvidencePresent &&
      !brain.signals.settlementCompleted &&
      !brain.signals.recordingCompleted
    ) {
      addMissingItem("Evidence Confirming Completed Settlement or Recording");
    }

    if (
      brain.signals.conflictingOutcomeEvidence &&
      !brain.signals.closingAfterTermination &&
      !brain.signals.terminationAfterClosing
    ) {
      addMissingItem(
        "Dated Evidence Needed to Resolve Closing and Termination Sequence",
      );
    }
  }

  brain.decision.missingItems = [...brain.missingItems];

  /* -----------------------------------------------------
     Recommendations
  ----------------------------------------------------- */

  const addDecisionRecommendation = (message) => {
    const recommendation = text(message).trim();

    if (
      recommendation &&
      !brain.decision.recommendations.includes(recommendation)
    ) {
      brain.decision.recommendations.push(recommendation);
    }
  };

  switch (brain.decision.state) {
    case "Pre-Contract":
      addDecisionRecommendation(
        "Upload or locate the executed purchase agreement.",
      );
      break;

    case "Listed":
      addDecisionRecommendation(
        "Verify the listing agreement, seller disclosures, photography and marketing readiness, MLS status, showing activity, feedback, and offer activity.",
      );
      break;

    case "Active":
      {
        addDecisionRecommendation(
          "Continue monitoring contractual deadlines and required transaction documents.",
        );

        if (!brain.signals.inspectionCompleted) {
          addDecisionRecommendation(
            "Confirm the inspection status and upload supporting documentation when available.",
          );
        }

        if (transactionSide === "buyer" && !brain.signals.appraisalCompleted) {
          addDecisionRecommendation(
            "Confirm the appraisal status and upload supporting documentation when available.",
          );
        }
      }
      break;

    case "Pending":
      if (brain.signals.conflictingOutcomeEvidence) {
        addDecisionRecommendation(
          "Review the dated semantic evidence to determine whether closing or termination occurred last.",
        );
      } else if (brain.signals.closingEvidencePresent) {
        addDecisionRecommendation(
          "Confirm completed settlement, disbursement, recording, or title transfer before treating the transaction as Closed.",
        );
      } else if (brain.signals.terminationEvidencePresent) {
        addDecisionRecommendation(
          "Confirm that the termination became effective before treating the transaction as Cancelled.",
        );
      } else {
        addDecisionRecommendation(
          "Continue monitoring the transaction for completed closing or termination evidence.",
        );
      }
      break;

    case "Cancelled":
      addDecisionRecommendation(
        "Confirm earnest money disposition and complete all cancellation follow-up.",
      );
      break;

    case "Closed":
      addDecisionRecommendation(
        "Confirm the final brokerage and compliance file is complete.",
      );

      addDecisionRecommendation(
        "Move the client into the Past Client workflow.",
      );
      break;

    default:
      break;
  }

  brain.recommendations = [...brain.decision.recommendations];

  /*
   * Store the completed conclusion inside the Decision Engine.
   */
  brain.decision.state = brain.transactionState;
  brain.decision.confidence = brain.confidence;
  brain.decision.health = brain.health;

  brain.decision.reasoning = [...brain.reasoning];
  brain.decision.missingItems = [...brain.missingItems];
  brain.decision.recommendations = [...brain.recommendations];

  /*
   * The Decision Engine is now the final source used by the
   * rest of RapportLink.
   */
  brain.transactionState = brain.decision.state;
  brain.confidence = brain.decision.confidence;
  brain.health = brain.decision.health;

  brain.reasoning = [...brain.decision.reasoning];
  brain.missingItems = [...brain.decision.missingItems];
  brain.recommendations = [...brain.decision.recommendations];

  /* -----------------------------------------------------
   Situation Engine

   Build the evidence-based Situation Model after the
   Transaction Brain has completed all reasoning.
----------------------------------------------------- */

  if (typeof aiBuildSituationModel === "function") {
    try {
      brain.situationModel = aiBuildSituationModel(txn, brain);

      /*
       * Surface the Situation Engine's executive outputs so
       * existing modules can begin using them immediately.
       */

      if (brain.situationModel.decisions) {
        brain.decisions = brain.situationModel.decisions;
      }

      if (brain.situationModel.executionPlan) {
        brain.executionPlan = brain.situationModel.executionPlan;
      }

      if (brain.situationModel.predictions) {
        brain.predictions = brain.situationModel.predictions;
      }

      if (brain.situationModel.narrative) {
        brain.narrative = brain.situationModel.narrative;
      }

      if (brain.situationModel.explanations) {
        brain.explanations = brain.situationModel.explanations;
      }

      if (brain.situationModel.dependencies) {
        brain.dependencies = brain.situationModel.dependencies;
      }

      if (brain.situationModel.evidenceChains) {
        brain.evidenceChains = brain.situationModel.evidenceChains;
      }
    } catch (error) {
      console.error("AI Situation Engine Error:", error);

      brain.situationModel = {
        error: true,
        message: error.message,
      };
    }
  }

  return brain;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    aiBuildTransactionBrain,
    AI_TRANSACTION_BRAIN_VERSION,
  };
}

if (typeof window !== "undefined") {
  window.aiBuildTransactionBrain = aiBuildTransactionBrain;
  window.AI_TRANSACTION_BRAIN_VERSION = AI_TRANSACTION_BRAIN_VERSION;
}
