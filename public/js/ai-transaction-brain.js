/* =====================================================
   RapportLink AI Transaction Brain
   Version 4 — Semantic Evidence Architecture
   ===================================================== */

console.log("AI Transaction Brain Loaded");

const AI_TRANSACTION_BRAIN_VERSION = 5;

const AI_SIGNAL_STATUS = Object.freeze({
  VERIFIED_TRUE: "VerifiedTrue",
  VERIFIED_FALSE: "VerifiedFalse",
  UNKNOWN: "Unknown",
  CONFLICTING: "Conflicting",
});

function aiCreateSignalAssessment() {
  return {
    status: AI_SIGNAL_STATUS.UNKNOWN,
    confidence: 0,
    supportingEvidence: [],
    contradictingEvidence: [],
    reasoning: [],
  };
}

function aiSignalIsVerifiedTrue(brain = {}, signalName = "") {
  return (
    brain.signalAssessments?.[signalName]?.status ===
    AI_SIGNAL_STATUS.VERIFIED_TRUE
  );
}

function aiSignalIsVerifiedFalse(brain = {}, signalName = "") {
  return (
    brain.signalAssessments?.[signalName]?.status ===
    AI_SIGNAL_STATUS.VERIFIED_FALSE
  );
}

function aiSignalIsUnknown(brain = {}, signalName = "") {
  return (
    !brain.signalAssessments?.[signalName] ||
    brain.signalAssessments[signalName].status === AI_SIGNAL_STATUS.UNKNOWN
  );
}

function aiSignalIsConflicting(brain = {}, signalName = "") {
  return (
    brain.signalAssessments?.[signalName]?.status ===
    AI_SIGNAL_STATUS.CONFLICTING
  );
}

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

function aiBuildTransactionContext(brain, txn = {}) {
  const text = (value) =>
    String(value === null || value === undefined ? "" : value).trim();

  const transactionSide = text(
    txn.side ||
      txn.transactionSide ||
      txn.type ||
      txn.transactionType ||
      txn.workflowType ||
      "",
  ).toLowerCase();

  brain.transactionContext.side = transactionSide;

  if (
    transactionSide.includes("listing") ||
    transactionSide.includes("seller")
  ) {
    brain.transactionContext.workflow = "Listing";
  } else if (transactionSide.includes("buyer")) {
    brain.transactionContext.workflow = "Buyer";
  } else {
    brain.transactionContext.workflow = "Unknown";
  }

  brain.transactionContext.sellerPresent = Boolean(text(txn.seller));
  brain.transactionContext.buyerPresent = Boolean(text(txn.buyer));

  const reasoningMessage = `Transaction workflow identified as ${brain.transactionContext.workflow}.`;

  if (!brain.reasoning.includes(reasoningMessage)) {
    brain.reasoning.push(reasoningMessage);
  }

  return brain.transactionContext;
}

const text = (value) =>
  String(value === null || value === undefined ? "" : value).trim();

function aiCreateEmptyTransactionBrain(txn = {}) {
  const brain = {
    version: AI_TRANSACTION_BRAIN_VERSION,
    engineVersion: AI_TRANSACTION_BRAIN_VERSION,

    transactionState: "Unknown",

    confidence: 0,
    health: 0,

    decision: {
      state: "Unknown",
      confidence: 0,
      health: 0,
      supportingEvidence: [],
      contradictingEvidence: [],
      unresolvedEvidence: [],
      reasoning: [],
      missingItems: [],
      recommendations: [],
      audit: [],
    },

    transactionContext: {
      side: "",
      workflow: "Unknown",
      sellerPresent: false,
      buyerPresent: false,
      source: "Transaction Setup",
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

    /*
     * signalAssessments is the authoritative lifecycle model.
     *
     * The Boolean signals object remains temporarily available
     * for downstream compatibility. A Boolean signal becomes true
     * only when its authoritative assessment is VerifiedTrue.
     */

    signalAssessments: {
      contractExecuted: aiCreateSignalAssessment(),
      listingAgreementExecuted: aiCreateSignalAssessment(),
      settlementCompleted: aiCreateSignalAssessment(),
      fundsDisbursed: aiCreateSignalAssessment(),
      recordingCompleted: aiCreateSignalAssessment(),
      titleTransferred: aiCreateSignalAssessment(),
      terminationEffective: aiCreateSignalAssessment(),
      inspectionCompleted: aiCreateSignalAssessment(),
      appraisalCompleted: aiCreateSignalAssessment(),
      amendmentEffective: aiCreateSignalAssessment(),
      closingEvidencePresent: aiCreateSignalAssessment(),
      terminationEvidencePresent: aiCreateSignalAssessment(),
      conflictingOutcomeEvidence: aiCreateSignalAssessment(),
      closingAfterTermination: aiCreateSignalAssessment(),
      terminationAfterClosing: aiCreateSignalAssessment(),
    },

    signals: {
      contractExecuted: false,
      listingAgreementExecuted: false,
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
      listed: 0,
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

  return brain;
}

function aiProcessTransactionDocuments(brain, docs, helpers) {
  const {
    addSemanticEffectsFromObject,
    addSemanticEffectsFromArray,
    normalizeTransactionEvent,
    normalizeEvidence,
    asArray,
  } = helpers;

  docs.forEach((doc) => {
    if (!doc) {
      return;
    }

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
}

function aiBuildTransactionSignals(
  brain,
  transactionContextEvidence,
  markSignal,
) {
  /*
   * Lifecycle signals must come from verified semantic
   * document evidence only.
   *
   * Stored status, dates, checklist entries, and summaries
   * provide context but cannot manufacture transaction state.
   */

  brain.semanticEffects.forEach((effect) => {
    if (!effect || effect.occurred !== true) {
      return;
    }

    switch (effect.type) {
      case "contractExecuted":
        markSignal("contractExecuted", "Executed contract evidence detected.");
        break;

      case "listingAgreementExecuted":
        markSignal(
          "listingAgreementExecuted",
          "Executed listing agreement evidence detected.",
        );
        break;

      case "settlementCompleted":
        markSignal(
          "settlementCompleted",
          "Settlement completion evidence detected.",
        );
        break;

      case "fundsDisbursed":
        markSignal(
          "fundsDisbursed",
          "Funding or disbursement evidence detected.",
        );
        break;

      case "recordingCompleted":
        markSignal(
          "recordingCompleted",
          "Recording completion evidence detected.",
        );
        break;

      case "titleTransferred":
        markSignal("titleTransferred", "Title transfer evidence detected.");
        break;

      case "terminationEffective":
        markSignal(
          "terminationEffective",
          "Effective termination evidence detected.",
        );
        break;

      case "inspectionCompleted":
        markSignal(
          "inspectionCompleted",
          "Inspection completion evidence detected.",
        );
        break;

      case "appraisalCompleted":
        markSignal(
          "appraisalCompleted",
          "Appraisal completion evidence detected.",
        );
        break;

      case "amendmentEffective":
        markSignal(
          "amendmentEffective",
          "Effective amendment evidence detected.",
        );
        break;
    }
  });

  /*
   * Derived lifecycle support signals.
   *
   * These are calculated only from verified Brain signals.
   * They do not create lifecycle states by themselves.
   */

  brain.signals.closingEvidencePresent = Boolean(
    brain.signals.settlementCompleted ||
    brain.signals.recordingCompleted ||
    brain.signals.titleTransferred ||
    brain.signals.fundsDisbursed,
  );

  brain.signals.terminationEvidencePresent = Boolean(
    brain.signals.terminationEffective,
  );

  brain.signals.closingAfterTermination = Boolean(
    brain.signals.terminationEffective && brain.signals.settlementCompleted,
  );

  brain.signals.terminationAfterClosing = Boolean(
    brain.signals.settlementCompleted && brain.signals.terminationEffective,
  );

  brain.signals.conflictingOutcomeEvidence = Boolean(
    brain.signals.settlementCompleted && brain.signals.terminationEffective,
  );

  return brain.signals;
}

function aiDetermineTransactionState(brain, addReasoning) {
  const workflow = brain.transactionContext.workflow;

  /*
   * Transaction lifecycle state is determined exclusively
   * from verified semantic document evidence.
   *
   * Stored transaction status, stored dates, checklist values,
   * transaction summaries, names, and workflow labels cannot
   * manufacture Closed, Cancelled, Pending, or Active state.
   */

  /*
   * Closed requires verified completion evidence.
   */
  if (
    brain.signals.settlementCompleted ||
    (brain.signals.recordingCompleted && brain.signals.titleTransferred) ||
    (brain.signals.fundsDisbursed && brain.signals.titleTransferred)
  ) {
    brain.decision.state = "Closed";

    addReasoning(
      "Transaction closed based exclusively on verified settlement, recording, funding, or title-transfer evidence.",
    );

    /*
     * Cancelled requires verified effective termination evidence.
     */
  } else if (
    brain.signals.terminationEffective &&
    !brain.signals.closingEvidencePresent
  ) {
    brain.decision.state = "Cancelled";

    addReasoning(
      "Transaction cancelled based exclusively on verified effective termination evidence without verified closing evidence.",
    );

    /*
     * An executed buyer contract is Pending unless verified
     * closing or termination evidence establishes another state.
     */
  } else if (brain.signals.contractExecuted) {
    if (workflow === "Buyer") {
      brain.decision.state = "Pending";

      addReasoning(
        "Executed buyer contract detected without verified closing or termination evidence.",
      );
    } else {
      brain.decision.state = "Active";

      addReasoning(
        "Executed contract detected without verified closing or termination evidence.",
      );
    }

    /*
     * Workflow provides a non-lifecycle starting classification.
     * It cannot prove execution, closing, or cancellation.
     */
  } else if (workflow === "Listing") {
    brain.decision.state = "Listed";

    addReasoning(
      "Transaction identified as a listing workflow without verified executed-contract evidence.",
    );
  } else if (workflow === "Buyer") {
    brain.decision.state = "Pre-Contract";

    addReasoning(
      "Buyer workflow exists without verified executed-contract evidence.",
    );
  } else {
    brain.decision.state = "Unknown";

    addReasoning(
      "Transaction state cannot be determined from verified evidence and workflow context.",
    );
  }

  brain.transactionState = brain.decision.state;

  brain.decision.supportingEvidence = [...brain.reconciledEvidence];

  brain.decision.audit.push({
    timestamp: new Date().toISOString(),
    state: brain.decision.state,
    workflow,
    signals: {
      ...brain.signals,
    },
    storedTransactionContext: {
      status: brain.transactionContextEvidence?.status || "",
      contractDate: brain.transactionContextEvidence?.contractDate || "",
      closeDate: brain.transactionContextEvidence?.closeDate || "",
      closedDate: brain.transactionContextEvidence?.closedDate || "",
      actualClosingDate:
        brain.transactionContextEvidence?.actualClosingDate || "",
      terminationDate: brain.transactionContextEvidence?.terminationDate || "",
    },
    authoritativeSource: "verified_semantic_document_evidence",
    reason: brain.reasoning[brain.reasoning.length - 1] || "",
  });

  return brain.decision.state;
}

function aiCalculateHealthAndConfidence(brain) {
  const clamp = (value) =>
    Math.max(0, Math.min(100, Math.round(Number(value || 0))));

  const evidence = Array.isArray(brain.reconciledEvidence)
    ? brain.reconciledEvidence
    : [];

  const semanticEffects = Array.isArray(brain.semanticEffects)
    ? brain.semanticEffects
    : [];

  const transactionEvents = Array.isArray(brain.transactionEvents)
    ? brain.transactionEvents
    : [];

  const missingItems = Array.isArray(brain.missingItems)
    ? brain.missingItems
    : [];

  const signals =
    brain.signals && typeof brain.signals === "object" ? brain.signals : {};

  const state = String(
    brain?.decision?.state || brain?.transactionState || "Unknown",
  ).trim();

  const activeSignalNames = Object.entries(signals)
    .filter(([, value]) => value === true)
    .map(([name]) => name);

  const activeSignals = activeSignalNames.length;

  const supportingEvidenceCount =
    evidence.length + semanticEffects.length + transactionEvents.length;

  /*
   * A derived Brain signal is itself evidence that the earlier
   * evidence-processing layers found support for a conclusion.
   *
   * The previous implementation ignored valid Brain signals and
   * automatically returned zero whenever the three evidence arrays
   * were empty.
   */

  const hasTrustedSupport = supportingEvidenceCount > 0 || activeSignals > 0;

  const averageEvidenceConfidence = (() => {
    const confidenceValues = [
      ...evidence.map((item) => Number(item?.confidence)),
      ...semanticEffects.map((item) => Number(item?.confidence)),
      ...transactionEvents.map((item) => Number(item?.confidence)),
    ].filter((value) => Number.isFinite(value) && value >= 0);

    if (!confidenceValues.length) {
      return 0;
    }

    return (
      confidenceValues.reduce((total, value) => total + value, 0) /
      confidenceValues.length
    );
  })();

  /*
   * Health measures transaction readiness and completeness.
   *
   * Health is not the same as confidence. A transaction can have
   * strong evidence supporting its state while still having missing
   * documents, deadlines, or checklist items.
   */

  const calculateHealth = () => {
    if (!hasTrustedSupport) {
      return 0;
    }

    let score = 25;

    score += Math.min(supportingEvidenceCount * 5, 25);
    score += Math.min(activeSignals * 7, 35);

    if (signals.listingAgreementExecuted) {
      score += 10;
    }

    if (signals.contractExecuted) {
      score += 15;
    }

    if (state === "Pending") {
      score += 5;
    }

    if (
      state === "Closed" &&
      signals.settlementCompleted &&
      signals.closingEvidencePresent
    ) {
      score = 100;
    }

    if (
      state === "Cancelled" &&
      signals.terminationEffective &&
      signals.terminationEvidencePresent
    ) {
      score = 100;
    }

    score -= Math.min(missingItems.length * 5, 35);

    if (signals.conflictingOutcomeEvidence) {
      score -= 40;
    }

    return clamp(score);
  };

  /*
   * Confidence measures how strongly trusted Brain evidence and
   * signals support the current state determination.
   *
   * The state name alone never creates confidence.
   */

  const calculateConfidence = () => {
    if (!hasTrustedSupport) {
      return 0;
    }

    let score = 20;

    score += Math.min(supportingEvidenceCount * 5, 25);
    score += Math.min(activeSignals * 10, 40);

    if (averageEvidenceConfidence > 0) {
      score += Math.min(averageEvidenceConfidence * 0.25, 25);
    }

    if (state === "Listed" && signals.listingAgreementExecuted) {
      score += 15;
    }

    if (state === "Active" && signals.contractExecuted) {
      score += 15;
    }

    if (state === "Pending" && signals.contractExecuted) {
      score += 10;
    }

    if (
      state === "Pending" &&
      signals.contractExecuted &&
      signals.closingEvidencePresent
    ) {
      score += 10;
    }

    if (
      state === "Closed" &&
      signals.settlementCompleted &&
      signals.closingEvidencePresent
    ) {
      score = 100;
    }

    if (
      state === "Cancelled" &&
      signals.terminationEffective &&
      signals.terminationEvidencePresent
    ) {
      score = 100;
    }

    if (signals.conflictingOutcomeEvidence) {
      score -= 40;
    }

    return clamp(score);
  };

  brain.health = calculateHealth();
  brain.confidence = calculateConfidence();

  if (!brain.decision || typeof brain.decision !== "object") {
    brain.decision = {};
  }

  brain.decision.health = brain.health;
  brain.decision.confidence = brain.confidence;

  brain.scoreSupport = {
    supportingEvidenceCount,
    activeSignalCount: activeSignals,
    activeSignalNames,
    averageEvidenceConfidence: clamp(averageEvidenceConfidence),
    missingItemCount: missingItems.length,
    hasTrustedSupport,
  };

  return {
    health: brain.health,
    confidence: brain.confidence,
  };
}

function aiExtractCanonicalFacts(brain, txn, firstDefined) {
  const canonical = brain.canonicalEvidence || {};

  /*
   * Canonical facts must come from current document evidence.
   *
   * User-entered transaction fields are baseline context only.
   * They must not become authoritative Brain facts unless
   * supported by current evidence.
   */

  brain.canonicalFacts.purchasePrice = firstDefined(
    canonical.purchasePrice,
    canonical.price,
    "",
  );

  brain.canonicalFacts.effectiveDate = firstDefined(
    canonical.effectiveDate,
    "",
  );

  brain.canonicalFacts.closingDate = firstDefined(canonical.closingDate, "");

  brain.canonicalFacts.actualClosingDate = firstDefined(
    canonical.actualClosingDate,
    "",
  );

  brain.canonicalFacts.terminationDate = firstDefined(
    canonical.terminationDate,
    "",
  );

  brain.canonicalFacts.earnestMoney = firstDefined(canonical.earnestMoney, "");

  brain.canonicalFacts.sellerCredit = firstDefined(canonical.sellerCredit, "");

  brain.canonicalFacts.inspectionDays = firstDefined(
    canonical.inspectionDays,
    null,
  );

  brain.canonicalFacts.optionDays = firstDefined(canonical.optionDays, null);

  brain.canonicalFacts.financingDeadline = firstDefined(
    canonical.financingDeadline,
    "",
  );

  brain.canonicalFacts.appraisalDeadline = firstDefined(
    canonical.appraisalDeadline,
    "",
  );

  return brain.canonicalFacts;
}

function aiBuildSituationRecommendations(brain) {
  const addMissing = (item) => {
    const clean = String(item || "").trim();

    if (clean && !brain.missingItems.includes(clean)) {
      brain.missingItems.push(clean);
    }
  };

  const recommend = (item) => {
    const clean = String(item || "").trim();

    if (clean && !brain.recommendations.includes(clean)) {
      brain.recommendations.push(clean);
    }
  };

  const workflow = String(brain?.transactionContext?.workflow || "").trim();

  const evidence = Array.isArray(brain.reconciledEvidence)
    ? brain.reconciledEvidence
    : [];

  const canonical = brain.canonicalEvidence || {};

  const normalize = (value) =>
    String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "");

  const evidenceContains = (...terms) => {
    const normalizedTerms = terms.map(normalize).filter(Boolean);

    return evidence.some((item) => {
      const searchable = normalize(
        [
          item?.key,
          item?.type,
          item?.value,
          item?.documentType,
          item?.documentName,
          item?.reasoning,
        ].join(" "),
      );

      return normalizedTerms.some((term) => searchable.includes(term));
    });
  };

  const canonicalContains = (...keys) =>
    keys.some((key) => {
      const value = canonical?.[key];

      return value !== undefined && value !== null && value !== "";
    });

  /*
   * Buyer workflow
   */

  if (workflow === "Buyer") {
    if (!brain.signals?.contractExecuted) {
      addMissing("Executed Purchase Agreement");

      recommend(
        "Obtain and review an executed purchase agreement before treating this transaction as active.",
      );
    }
  }

  /*
   * Listing workflow
   *
   * Missing items are added only when the current evidence
   * does not support their existence.
   */

  if (workflow === "Listing") {
    const hasListingAgreement =
      evidenceContains("listingagreement", "exclusiveagencyagreement") ||
      canonicalContains("listingAgreement");

    const hasSellerDisclosures =
      evidenceContains(
        "sellerdisclosure",
        "propertydisclosure",
        "residentialdisclosure",
      ) || canonicalContains("sellerDisclosures");

    const hasMarketingEvidence =
      evidenceContains(
        "marketingphoto",
        "listingphoto",
        "photography",
        "mls",
      ) ||
      canonicalContains(
        "marketingPhotos",
        "mlsNumber",
        "mlsStatus",
        "listingLiveDate",
      );

    if (!hasListingAgreement) {
      addMissing("Listing Agreement");
    }

    if (!hasSellerDisclosures) {
      addMissing("Seller Disclosures");
    }

    if (!hasMarketingEvidence) {
      addMissing("Marketing / MLS Evidence");
    }

    if (
      !hasListingAgreement ||
      !hasSellerDisclosures ||
      !hasMarketingEvidence
    ) {
      recommend(
        "Verify the listing agreement, seller disclosures, and marketing or MLS evidence.",
      );
    } else {
      recommend(
        "Monitor seller communication, showing activity, feedback, and offer activity.",
      );
    }
  }

  /*
   * Evidence-based lifecycle recommendations.
   *
   * This function runs before the final state decision,
   * so recommendations must use established signals rather
   * than brain.decision.state.
   */

  if (
    brain.signals?.contractExecuted &&
    !brain.signals?.settlementCompleted &&
    !brain.signals?.terminationEffective
  ) {
    recommend(
      "Monitor contractual deadlines, unresolved requirements, and progress toward settlement.",
    );
  }

  if (
    brain.signals?.closingEvidencePresent &&
    !brain.signals?.settlementCompleted
  ) {
    recommend(
      "Review the closing evidence and confirm whether settlement, funding, recording, and title transfer are complete.",
    );
  }

  if (
    brain.signals?.settlementCompleted ||
    brain.signals?.recordingCompleted ||
    brain.signals?.titleTransferred
  ) {
    recommend("Confirm the final brokerage and compliance file is complete.");
  }

  if (brain.signals?.terminationEffective) {
    recommend(
      "Confirm the termination documentation is complete and archive remaining transaction obligations.",
    );
  }

  if (brain.signals?.conflictingOutcomeEvidence) {
    recommend(
      "Resolve the conflicting closing and termination evidence before relying on the transaction state.",
    );
  }

  return {
    missingItems: [...brain.missingItems],
    recommendations: [...brain.recommendations],
  };
}

function aiBuildTransactionBrain(txn = {}) {
  const docs = Array.isArray(txn.documents) ? txn.documents : [];

  const brain = aiCreateEmptyTransactionBrain(txn);

  /*
   * Transaction Context
   *
   * This is not state.
   *
   * It only tells the Brain what workflow the human created.
   */
  aiBuildTransactionContext(brain, txn);

  /* -----------------------------------------------------
     Core Helpers
  ----------------------------------------------------- */

  const clamp = (value, minimum = 0, maximum = 100) =>
    Math.max(minimum, Math.min(maximum, Number(value || 0)));

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

  const asObject = (value) =>
    value && typeof value === "object" && !Array.isArray(value) ? value : {};

  const asArray = (value) => (Array.isArray(value) ? value : []);

  const firstDefined = (...values) =>
    values.find(
      (value) => value !== undefined && value !== null && value !== "",
    );

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

  /* -----------------------------------------------------
     Semantic Effect Normalization
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

    for (const [canonical, aliases] of Object.entries(semanticAliases)) {
      if (aliases.some((alias) => normalizedKey(alias) === key)) {
        return canonical;
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
     Transaction Event Normalization
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

    return {
      type: canonicalEffectName(rawType) || text(rawType) || "TransactionEvent",

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
     Evidence Normalization
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
   Build Unified Transaction Evidence Context

   Evidence priority:

   1. Document Intelligence evidence
   2. Transaction lifecycle evidence
   3. Transaction timeline/history
   4. Workflow context

   The Brain decides.
   It does not blindly trust saved status.
----------------------------------------------------- */

  const normalizedStatus = String(txn.status || "")
    .trim()
    .toLowerCase();

  const transactionContextEvidence = {
    source: "transaction_record",

    status: normalizedStatus,

    closed:
      normalizedStatus === "closed" ||
      normalizedStatus === "complete" ||
      normalizedStatus === "completed",

    cancelled:
      normalizedStatus === "cancelled" ||
      normalizedStatus === "canceled" ||
      normalizedStatus === "terminated",

    pending: normalizedStatus === "pending",

    active:
      normalizedStatus === "active" ||
      normalizedStatus === "under contract" ||
      normalizedStatus === "under-contract",

    listed:
      normalizedStatus === "listed" ||
      normalizedStatus === "listing" ||
      normalizedStatus === "active listing",

    preContract:
      normalizedStatus === "pre-contract" ||
      normalizedStatus === "precontract" ||
      normalizedStatus === "pre contract",

    side: String(txn.side || txn.transactionSide || "").trim(),

    contractDate: txn.contractDate || "",

    closeDate: txn.closeDate || "",

    closedDate: txn.closedDate || "",

    actualClosingDate: txn.actualClosingDate || "",

    terminationDate: txn.terminationDate || "",

    checklist: txn.checklist || {},

    checklistCompleted: Number(txn.checklistCompleted || 0),

    evidenceSummary: txn.evidenceSummary || {},

    aiEvidence: txn.aiEvidence || {},

    aiDocumentReviews: Array.isArray(txn.aiDocumentReviews)
      ? txn.aiDocumentReviews
      : [],

    activity: Array.isArray(txn.activity) ? txn.activity : [],

    tasks: Array.isArray(txn.tasks) ? txn.tasks : [],

    documents: Array.isArray(txn.documents) ? txn.documents.length : 0,

    hasTerminationEvidence: Boolean(
      txn.terminationDate ||
      (Array.isArray(txn.aiDocumentReviews) &&
        txn.aiDocumentReviews.some((review) =>
          String(review.documentName || review.name || "")
            .toLowerCase()
            .includes("termination"),
        )),
    ),

    hasClosingChecklistEvidence: Boolean(
      !(
        normalizedStatus === "cancelled" ||
        normalizedStatus === "canceled" ||
        normalizedStatus === "terminated"
      ) &&
      txn.checklist &&
      (txn.checklist["Closed / Recorded"] === true ||
        txn.checklist["Closing Statement Reviewed"] === true),
    ),

    hasExecutedContractChecklistEvidence: Boolean(
      txn.checklist &&
      (txn.checklist["Purchase Agreement Executed"] === true ||
        txn.checklist["Offer Accepted"] === true),
    ),
  };

  brain.transactionContextEvidence = transactionContextEvidence;

  const markSignal = (
    signalName,
    reason,
    confidence = 100,
    supportingEvidence = [],
  ) => {
    if (
      Object.prototype.hasOwnProperty.call(brain.signalAssessments, signalName)
    ) {
      const assessment = brain.signalAssessments[signalName];

      assessment.status = AI_SIGNAL_STATUS.VERIFIED_TRUE;
      assessment.confidence = Math.max(
        assessment.confidence || 0,
        Number(confidence) || 100,
      );

      if (Array.isArray(supportingEvidence)) {
        assessment.supportingEvidence.push(...supportingEvidence);
      }

      if (reason) {
        assessment.reasoning.push(reason);
        addReasoning(reason);
      }
    }

    /*
     * Compatibility layer.
     *
     * Existing RapportLink modules still consume Boolean
     * signals. A Boolean becomes true only when the
     * authoritative assessment is VerifiedTrue.
     */

    if (Object.prototype.hasOwnProperty.call(brain.signals, signalName)) {
      brain.signals[signalName] = aiSignalIsVerifiedTrue(brain, signalName);
    }
  };

  /* -----------------------------------------------------
   Stored Transaction Context

   Stored status, dates, checklist values, summaries, activity,
   tasks, and prior AI review data remain available in
   brain.transactionContextEvidence for display, auditing,
   comparison, and migration support.

   They are deliberately not converted into authoritative
   lifecycle signals.

   Closed, Cancelled, Pending, and Active lifecycle conclusions
   must come from verified semantic document evidence.
----------------------------------------------------- */

  /* -----------------------------------------------------
   Gather Evidence From Documents

   Document Intelligence remains the highest-confidence
   evidence source.

   It augments transaction lifecycle evidence.
----------------------------------------------------- */

  aiProcessTransactionDocuments(brain, docs, {
    addSemanticEffectsFromObject,
    addSemanticEffectsFromArray,
    normalizeTransactionEvent,
    normalizeEvidence,
    asArray,
  });

  brain.semanticEffects = uniqueBy(brain.semanticEffects, (effect) =>
    JSON.stringify({
      type: effect.type,
      occurred: effect.occurred,
      date: effect.date || "",
      confidence: effect.confidence,
      sourceDocumentId: effect.sourceDocumentId || null,
    }),
  );

  brain.transactionEvents = uniqueBy(brain.transactionEvents, (event) =>
    JSON.stringify({
      type: event.type,
      date: event.date || "",
      sourceDocumentId: event.sourceDocumentId || null,
    }),
  );

  brain.reconciledEvidence = brain.evidenceCollection.getActive();

  brain.evidence = [...brain.reconciledEvidence];

  if (typeof buildTrustedCanonicalEvidenceMap === "function") {
    brain.canonicalEvidence = buildTrustedCanonicalEvidenceMap(
      brain.reconciledEvidence,
    );
  } else {
    brain.canonicalEvidence = buildCanonicalEvidenceMap(
      brain.reconciledEvidence,
    );
  }

  /* -----------------------------------------------------
   Build Signals From Unified Evidence Context

   Priority:
   1. Document Intelligence evidence
   2. Transaction lifecycle evidence
   3. Timeline evidence

   No single source blindly overrides
   the Transaction Brain.
----------------------------------------------------- */

  /*
   * Document Intelligence evidence
   */
  aiBuildTransactionSignals(brain, transactionContextEvidence, markSignal);

  /* -----------------------------------------------------
   Canonical Fact Extraction

   Facts are derived from:
   1. Evidence Engine
   2. Transaction lifecycle context
   3. Existing transaction fields

   Facts do not determine state by themselves.
   They support reasoning.
----------------------------------------------------- */

  aiExtractCanonicalFacts(brain, txn, firstDefined);

  brain.evidenceSummary = {
    documents: docs.length,

    evidence: brain.reconciledEvidence.length,

    semanticEffects: brain.semanticEffects.length,

    transactionEvents: brain.transactionEvents.length,

    closingSignals: Boolean(brain.signals.closingEvidencePresent),

    terminationSignals: Boolean(brain.signals.terminationEvidencePresent),
  };

  /* -----------------------------------------------------
   Health + Confidence

   Health = transaction readiness.

   Confidence = confidence that the current state
   is correct.
----------------------------------------------------- */

  /* -----------------------------------------------------
   Situation-Based Recommendations

   Missing documents create tasks.
   They do not define transaction state.
----------------------------------------------------- */

  aiBuildSituationRecommendations(brain);

  /* -----------------------------------------------------
   State Decision Engine

   Order matters.

   Evidence beats workflow.
   Workflow beats missing documents.
----------------------------------------------------- */

  aiDetermineTransactionState(brain, addReasoning);

  if (
    String(txn.address || "")
      .toLowerCase()
      .includes("8005 caladium")
  ) {
    console.log("CALADIUM BRAIN AUDIT", {
      storedStatus: txn.status,
      normalizedStatus,
      transactionContextEvidence,
      semanticEffects: brain.semanticEffects,
      signals: brain.signals,
      finalState: brain.transactionState,
      reasoning: brain.reasoning,
    });
  }

  aiCalculateHealthAndConfidence(brain);

  /* -----------------------------------------------------
   Final Brain Finalization
----------------------------------------------------- */

  brain.transactionState = brain.decision.state;

  brain.decision.supportingEvidence = [...brain.reconciledEvidence];

  brain.decision.missingItems = [...brain.missingItems];

  brain.decision.recommendations = [...brain.recommendations];

  brain.reasoning = uniqueBy(brain.reasoning, (item) => item);

  brain.decision.reasoning = [...brain.reasoning];

  brain.lastUpdated = new Date().toISOString();

  brain.version = AI_TRANSACTION_BRAIN_VERSION;

  /* -----------------------------------------------------
     Health Calculation
     
     Health measures transaction readiness.
     It does NOT measure whether documents exist.
  ----------------------------------------------------- */

  brain.missingItems = uniqueBy(brain.missingItems, (item) => item);

  brain.recommendations = uniqueBy(brain.recommendations, (item) => item);

  brain.decision.missingItems = [...brain.missingItems];

  brain.decision.recommendations = [...brain.recommendations];

  addReasoning(
    `Final transaction state determined as ${brain.transactionState}.`,
  );

  /* -----------------------------------------------------
     Compatibility Layer
     
     Existing RapportLink modules expect:
     - facts
     - recommendations
     - missingItems
     - health
     - confidence
     - reasoning
     
     Keep these available while the Brain remains
     the single source of truth.
  ----------------------------------------------------- */

  brain.facts = {
    purchaseAgreement: brain.signals.contractExecuted
      ? {
          detected: true,
          evidence: brain.reconciledEvidence,
        }
      : null,

    terminationDocuments: brain.signals.terminationEffective
      ? [
          {
            detected: true,
            evidence: brain.reconciledEvidence,
          },
        ]
      : [],

    inspections: brain.signals.inspectionCompleted
      ? [
          {
            detected: true,
          },
        ]
      : [],

    appraisals: brain.signals.appraisalCompleted
      ? [
          {
            detected: true,
          },
        ]
      : [],

    closingDocuments: brain.signals.closingEvidencePresent
      ? [
          {
            detected: true,
          },
        ]
      : [],

    amendments: brain.signals.amendmentEffective
      ? [
          {
            detected: true,
          },
        ]
      : [],
  };

  /*
   * Final reasoning summary.
   */

  brain.reasoning = uniqueBy(brain.reasoning, (item) => item);

  brain.decision.reasoning = [...brain.reasoning];

  /*
   * Attach audit snapshot.
   */

  brain.decision.audit.push({
    timestamp: new Date().toISOString(),

    finalState: brain.transactionState,

    confidence: brain.confidence,

    health: brain.health,

    missingItems: [...brain.missingItems],

    recommendations: [...brain.recommendations],
  });

  /*
   * Save refresh metadata.
   */

  brain.lastUpdated = new Date().toISOString();

  brain.version = AI_TRANSACTION_BRAIN_VERSION;

  /*
   * Temporary Brain Diagnostic
   *
   * Remove after debugging.
   */

  console.log("Building Brain:", txn);

  /*
   * Return the complete Transaction Brain.
   */

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
