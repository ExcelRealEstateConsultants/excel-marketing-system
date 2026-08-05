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

  const isObject = (value) =>
    value !== null && typeof value === "object" && !Array.isArray(value);

  const hasValue = (value) =>
    value !== undefined &&
    value !== null &&
    !(typeof value === "string" && value.trim() === "");

  const firstValue = (...values) => values.find((value) => hasValue(value));

  const normalizeKeyName = (value) =>
    String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "");

  /*
   * Convert document-specific fact names into the canonical
   * names consumed by aiExtractCanonicalFacts().
   */
  const canonicalFactAliases = {
    purchasePrice: [
      "purchasePrice",
      "purchase_price",
      "salesPrice",
      "salePrice",
      "contractPrice",
      "price",
      "totalSalesPrice",
      "listPrice",
      "listingPrice",
      "originalListPrice",
      "newListPrice",
      "newListingPrice",
      "revisedListPrice",
      "revisedListingPrice",
      "newPrice",
    ],

    earnestMoney: [
      "earnestMoney",
      "earnest_money",
      "earnestMoneyDeposit",
      "depositAmount",
      "initialDeposit",
    ],

    effectiveDate: [
      "effectiveDate",
      "effective_date",
      "contractEffectiveDate",
      "agreementEffectiveDate",
    ],

    closingDate: [
      "closingDate",
      "closing_date",
      "closeDate",
      "scheduledClosingDate",
      "contractClosingDate",
    ],

    actualClosingDate: [
      "actualClosingDate",
      "actual_closing_date",
      "closedDate",
      "settlementDate",
      "recordingDate",
    ],

    terminationDate: [
      "terminationDate",
      "termination_date",
      "cancellationDate",
      "cancelledDate",
      "canceledDate",
    ],

    sellerCredit: [
      "sellerCredit",
      "sellerCredits",
      "sellerConcession",
      "sellerConcessions",
      "creditAmount",
      "sellerContribution",
    ],

    inspectionDays: [
      "inspectionDays",
      "inspectionPeriodDays",
      "dueDiligenceDays",
    ],

    optionDays: ["optionDays", "optionPeriodDays"],

    financingDeadline: [
      "financingDeadline",
      "loanDeadline",
      "financingContingencyDeadline",
    ],

    appraisalDeadline: ["appraisalDeadline", "appraisalContingencyDeadline"],
  };

  const aliasLookup = new Map();

  Object.entries(canonicalFactAliases).forEach(([canonicalName, aliases]) => {
    aliases.forEach((alias) => {
      aliasLookup.set(normalizeKeyName(alias), canonicalName);
    });
  });

  const canonicalizeFactKey = (key) => {
    const normalized = normalizeKeyName(key);

    return aliasLookup.get(normalized) || String(key || "").trim();
  };

  const reconcileEvidence = (record, doc, analysis) => {
    if (!record || typeof record !== "object") {
      return;
    }

    const normalized = normalizeEvidence(record, doc, analysis);

    if (!normalized.key || !hasValue(normalized.value)) {
      return;
    }

    brain.reconciliationEngine.reconcile(normalized);
  };

  /*
   * Turn each fact inside an evidence item's `facts` property
   * into its own keyed EvidenceRecord.
   */
  const addFactCollection = (facts, parentEvidence, doc, analysis) => {
    if (!facts) {
      return;
    }

    const addFact = (rawKey, rawValue, metadata = {}) => {
      const canonicalKey = canonicalizeFactKey(rawKey);

      if (!canonicalKey || !hasValue(rawValue)) {
        return;
      }

      reconcileEvidence(
        {
          key: canonicalKey,
          value: rawValue,

          type: firstValue(metadata.type, parentEvidence?.type, "fact"),

          confidence: firstValue(
            metadata.confidence,
            parentEvidence?.confidence,
            50,
          ),

          page: firstValue(metadata.page, parentEvidence?.page, null),

          supportingText: firstValue(
            metadata.supportingText,
            parentEvidence?.supportingText,
            parentEvidence?.value,
            "",
          ),

          documentId: firstValue(
            metadata.documentId,
            metadata.sourceDocumentId,
            parentEvidence?.documentId,
            parentEvidence?.sourceDocumentId,
            analysis?.documentId,
            doc?.id,
            null,
          ),

          documentName: firstValue(
            metadata.documentName,
            metadata.sourceDocument,
            parentEvidence?.documentName,
            parentEvidence?.sourceDocument,
            analysis?.documentName,
            doc?.name,
            "Uploaded Document",
          ),

          documentType: firstValue(
            metadata.documentType,
            parentEvidence?.documentType,
            analysis?.documentType,
            analysis?.classification?.documentType,
            null,
          ),

          extractedBy: firstValue(
            metadata.extractedBy,
            parentEvidence?.extractedBy,
            "gpt",
          ),

          reasoning: asArray(
            firstValue(metadata.reasoning, parentEvidence?.reasoning, []),
          ),

          metadata: {
            ...(isObject(parentEvidence?.metadata)
              ? parentEvidence.metadata
              : {}),

            ...(isObject(metadata.metadata) ? metadata.metadata : {}),

            originalFactKey: rawKey,
            parentEvidenceType: parentEvidence?.type || "",
          },
        },
        doc,
        analysis,
      );
    };

    if (Array.isArray(facts)) {
      facts.forEach((fact) => {
        if (!fact || typeof fact !== "object") {
          return;
        }

        const key = firstValue(
          fact.key,
          fact.factType,
          fact.name,
          fact.field,
          fact.path,
          "",
        );

        const value = firstValue(
          fact.value,
          fact.normalizedValue,
          fact.extractedValue,
          fact.content,
          fact.text,
        );

        addFact(key, value, fact);
      });

      return;
    }

    if (!isObject(facts)) {
      return;
    }

    Object.entries(facts).forEach(([key, entry]) => {
      if (isObject(entry)) {
        const value = firstValue(
          entry.value,
          entry.normalizedValue,
          entry.extractedValue,
          entry.content,
          entry.text,
        );

        addFact(key, value, entry);
        return;
      }

      addFact(key, entry);
    });
  };

  const inferEvidenceFact = (item, doc, analysis) => {
    const evidenceType = normalizeKeyName(item?.type);
    const evidenceValue = item?.value;

    /*
     * Some important values are stored as the evidence value,
     * rather than inside the nested facts collection.
     */
    if (
      evidenceType.includes("closingterm") ||
      evidenceType.includes("closingdate")
    ) {
      reconcileEvidence(
        {
          ...item,
          key: "closingDate",
          value: evidenceValue,
          type: "date",
        },
        doc,
        analysis,
      );
    }

    if (
      evidenceType.includes("effectivedate") ||
      evidenceType.includes("contractdate")
    ) {
      reconcileEvidence(
        {
          ...item,
          key: "effectiveDate",
          value: evidenceValue,
          type: "date",
        },
        doc,
        analysis,
      );
    }

    if (
      evidenceType.includes("terminationdate") ||
      evidenceType.includes("cancellationdate")
    ) {
      reconcileEvidence(
        {
          ...item,
          key: "terminationDate",
          value: evidenceValue,
          type: "date",
        },
        doc,
        analysis,
      );
    }
  };

  const addEvidenceCollection = (evidence, doc, analysis) => {
    let items = [];

    if (Array.isArray(evidence)) {
      items = evidence;
    } else if (isObject(evidence)) {
      items = [
        ...asArray(evidence.items),
        ...asArray(evidence.records),
        ...asArray(evidence.evidence),
      ];
    }

    items.forEach((item) => {
      if (!item || typeof item !== "object") {
        return;
      }

      /*
       * Preserve explicitly keyed evidence records.
       */
      const explicitKey = firstValue(
        item.key,
        item.name,
        item.field,
        item.path,
        "",
      );

      if (explicitKey && hasValue(item.value)) {
        reconcileEvidence(
          {
            ...item,
            key: canonicalizeFactKey(explicitKey),
          },
          doc,
          analysis,
        );
      }

      /*
       * Expand nested facts into independent evidence records.
       */
      addFactCollection(item.facts, item, doc, analysis);

      inferEvidenceFact(item, doc, analysis);
    });
  };

  const addExecutionEffect = (effectType, analysis, doc, confidence = 90) => {
    brain.semanticEffects.push({
      type: effectType,
      occurred: true,
      date: firstValue(
        analysis?.effectiveDate,
        analysis?.executionDate,
        analysis?.signedDate,
        "",
      ),
      confidence,
      supportingText: firstValue(
        analysis?.executionSummary,
        analysis?.summary,
        `${effectType} supported by the document analysis.`,
      ),
      sourceDocumentId: firstValue(analysis?.documentId, doc?.id, null),
      sourceDocument: firstValue(
        analysis?.documentName,
        doc?.name,
        "Uploaded Document",
      ),
    });
  };

  /*
   * Conservative execution inference for older saved analyses
   * that contain classification/execution information but no
   * semanticEffects collection.
   */
  const inferExecutionEffects = (analysis, doc) => {
    if (!analysis || typeof analysis !== "object") {
      return;
    }

    const nestedAnalysis =
      analysis.universalAnalysis &&
      typeof analysis.universalAnalysis === "object"
        ? analysis.universalAnalysis
        : {};

    const documentType = String(
      firstValue(
        analysis.documentType,
        analysis.classification?.documentType,
        nestedAnalysis.documentType,
        nestedAnalysis.classification?.documentType,
        analysis.type,
        "",
      ),
    )
      .trim()
      .toLowerCase();

    const execution =
      analysis.execution && typeof analysis.execution === "object"
        ? analysis.execution
        : nestedAnalysis.execution &&
            typeof nestedAnalysis.execution === "object"
          ? nestedAnalysis.execution
          : {};

    const executionStatus = String(
      firstValue(
        analysis.executionStatus,
        analysis.documentExecutionStatus,
        analysis.signatureStatus,
        analysis.classification?.executionStatus,
        nestedAnalysis.executionStatus,
        nestedAnalysis.documentExecutionStatus,
        nestedAnalysis.signatureStatus,
        nestedAnalysis.classification?.executionStatus,
        execution.status,
        "",
      ),
    )
      .trim()
      .toLowerCase();

    const signatures = [
      ...asArray(analysis.signatures),
      ...asArray(nestedAnalysis.signatures),
    ].filter(
      (signature, index, collection) =>
        signature &&
        typeof signature === "object" &&
        collection.findIndex(
          (candidate) =>
            candidate?.signerName === signature.signerName &&
            candidate?.signerRole === signature.signerRole &&
            candidate?.signatureLocation === signature.signatureLocation,
        ) === index,
    );

    const signedSignatures = signatures.filter(
      (signature) => signature.signed === true,
    );

    const normalizeRole = (value) =>
      String(value || "")
        .trim()
        .toLowerCase()
        .replace(/[’']/g, "");

    const hasSignedRole = (...roleTerms) =>
      signedSignatures.some((signature) => {
        const role = normalizeRole(signature.signerRole);

        return roleTerms.some((term) => role.includes(normalizeRole(term)));
      });

    const hasSignedSeller = hasSignedRole("seller", "owner", "property owner");

    const hasSignedBuyer = hasSignedRole("buyer", "purchaser");

    const hasSignedListingRepresentative = hasSignedRole(
      "listing agent",
      "listing broker",
      "seller licensee",
      "sellers licensee",
      "broker",
      "licensee",
    );

    const hasSignedPurchaseRepresentative = hasSignedRole(
      "buyer agent",
      "buyers agent",
      "selling agent",
      "broker",
      "licensee",
    );

    const explicitlyExecuted =
      analysis.fullyExecuted === true ||
      analysis.executed === true ||
      analysis.signed === true ||
      analysis.allRequiredSignaturesPresent === true ||
      nestedAnalysis.fullyExecuted === true ||
      nestedAnalysis.executed === true ||
      nestedAnalysis.signed === true ||
      nestedAnalysis.allRequiredSignaturesPresent === true ||
      execution.executed === true ||
      execution.fullyExecuted === true ||
      execution.signaturesComplete === true ||
      execution.effective === true ||
      executionStatus === "executed" ||
      executionStatus === "fully executed" ||
      executionStatus === "fully_executed";

    const isListingAgreement =
      documentType.includes("listing agreement") ||
      documentType.includes("listing contract") ||
      documentType.includes("exclusive right to sell") ||
      documentType.includes("exclusive agency");

    const isPurchaseAgreement =
      documentType.includes("purchase agreement") ||
      documentType.includes("sales contract") ||
      documentType.includes("residential contract") ||
      documentType.includes("purchase contract");

    const listingExecutionSupported =
      isListingAgreement &&
      (explicitlyExecuted ||
        (hasSignedSeller && hasSignedListingRepresentative));

    const purchaseExecutionSupported =
      isPurchaseAgreement &&
      (explicitlyExecuted ||
        (hasSignedSeller &&
          (hasSignedBuyer || hasSignedPurchaseRepresentative)));

    if (listingExecutionSupported) {
      const supportingSignatures = signedSignatures.filter((signature) => {
        const role = normalizeRole(signature.signerRole);

        return (
          role.includes("seller") ||
          role.includes("owner") ||
          role.includes("listing") ||
          role.includes("licensee") ||
          role.includes("broker")
        );
      });

      brain.semanticEffects.push({
        type: "listingAgreementExecuted",
        occurred: true,

        date: firstValue(
          execution.effectiveDate,
          execution.executionDate,
          analysis.effectiveDate,
          analysis.executionDate,
          supportingSignatures.find((signature) => signature.signedDate)
            ?.signedDate,
          "",
        ),

        confidence: explicitlyExecuted ? 95 : 86,

        supportingText: explicitlyExecuted
          ? "The document analysis explicitly identifies the listing agreement as executed."
          : "The document is classified as a listing agreement and contains signed seller and listing-representative signature evidence.",

        sourceDocumentId: firstValue(
          analysis.documentId,
          nestedAnalysis.documentId,
          doc?.id,
          null,
        ),

        sourceDocument: firstValue(
          analysis.documentName,
          nestedAnalysis.documentName,
          doc?.name,
          "Uploaded Document",
        ),
      });

      return;
    }

    if (purchaseExecutionSupported) {
      brain.semanticEffects.push({
        type: "contractExecuted",
        occurred: true,

        date: firstValue(
          execution.effectiveDate,
          execution.executionDate,
          analysis.effectiveDate,
          analysis.executionDate,
          signedSignatures.find((signature) => signature.signedDate)
            ?.signedDate,
          "",
        ),

        confidence: explicitlyExecuted ? 95 : 86,

        supportingText: explicitlyExecuted
          ? "The document analysis explicitly identifies the purchase agreement as executed."
          : "The document is classified as a purchase agreement and contains signed party evidence supporting execution.",

        sourceDocumentId: firstValue(
          analysis.documentId,
          nestedAnalysis.documentId,
          doc?.id,
          null,
        ),

        sourceDocument: firstValue(
          analysis.documentName,
          nestedAnalysis.documentName,
          doc?.name,
          "Uploaded Document",
        ),
      });
    }
  };

  asArray(docs).forEach((doc) => {
    if (!doc || typeof doc !== "object") {
      return;
    }

    const analysis =
      doc.aiAnalysis ||
      doc.universalAnalysis ||
      doc.ai ||
      doc.analysis ||
      doc.documentAnalysis ||
      null;

    if (!analysis || typeof analysis !== "object") {
      return;
    }

    const nestedAnalysis = isObject(analysis.universalAnalysis)
      ? analysis.universalAnalysis
      : null;

    /*
     * Semantic effects
     */
    addSemanticEffectsFromObject(analysis.semanticEffects, doc, analysis);

    addSemanticEffectsFromArray(analysis.semanticEffects, doc, analysis);

    if (nestedAnalysis) {
      addSemanticEffectsFromObject(
        nestedAnalysis.semanticEffects,
        doc,
        analysis,
      );

      addSemanticEffectsFromArray(
        nestedAnalysis.semanticEffects,
        doc,
        analysis,
      );
    }

    /*
     * Transaction events
     */
    asArray(analysis.transactionEvents).forEach((event) => {
      brain.transactionEvents.push(
        normalizeTransactionEvent(event, doc, analysis),
      );
    });

    if (nestedAnalysis) {
      asArray(nestedAnalysis.transactionEvents).forEach((event) => {
        brain.transactionEvents.push(
          normalizeTransactionEvent(event, doc, analysis),
        );
      });
    }

    /*
     * Evidence and nested facts
     */
    addEvidenceCollection(analysis.evidence, doc, analysis);

    addFactCollection(analysis.facts, null, doc, analysis);

    if (nestedAnalysis) {
      addEvidenceCollection(nestedAnalysis.evidence, doc, analysis);

      addFactCollection(nestedAnalysis.facts, null, doc, analysis);
    }

    inferExecutionEffects(analysis, doc);

    if (nestedAnalysis) {
      inferExecutionEffects(nestedAnalysis, doc);
    }
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
        markSignal(
          "contractExecuted",
          "Executed contract evidence detected.",
          effect.confidence,
          [effect],
        );
        break;

      case "listingAgreementExecuted":
        markSignal(
          "listingAgreementExecuted",
          "Executed listing agreement evidence detected.",
          effect.confidence,
          [effect],
        );
        break;

      case "settlementCompleted":
        markSignal(
          "settlementCompleted",
          "Settlement completion evidence detected.",
          effect.confidence,
          [effect],
        );
        break;

      case "fundsDisbursed":
        markSignal(
          "fundsDisbursed",
          "Funding or disbursement evidence detected.",
          effect.confidence,
          [effect],
        );
        break;

      case "recordingCompleted":
        markSignal(
          "recordingCompleted",
          "Recording completion evidence detected.",
          effect.confidence,
          [effect],
        );
        break;

      case "titleTransferred":
        markSignal(
          "titleTransferred",
          "Title transfer evidence detected.",
          effect.confidence,
          [effect],
        );
        break;

      case "terminationEffective":
        markSignal(
          "terminationEffective",
          "Effective termination evidence detected.",
          effect.confidence,
          [effect],
        );
        break;

      case "inspectionCompleted":
        markSignal(
          "inspectionCompleted",
          "Inspection completion evidence detected.",
          effect.confidence,
          [effect],
        );
        break;

      case "appraisalCompleted":
        markSignal(
          "appraisalCompleted",
          "Appraisal completion evidence detected.",
          effect.confidence,
          [effect],
        );
        break;

      case "amendmentEffective":
        markSignal(
          "amendmentEffective",
          "Effective amendment evidence detected.",
          effect.confidence,
          [effect],
        );
        break;
    }
  });

  /*
   * Normalized transaction events are also verified document
   * intelligence. They must be allowed to establish lifecycle
   * signals when a semantic-effects object is absent or incomplete.
   */

  brain.transactionEvents.forEach((event) => {
    if (!event || event.occurred !== true) {
      return;
    }

    switch (event.type) {
      case "contractExecuted":
        markSignal(
          "contractExecuted",
          "Executed contract transaction event detected.",
          event.confidence,
          [event],
        );
        break;

      case "listingAgreementExecuted":
        markSignal(
          "listingAgreementExecuted",
          "Executed listing agreement transaction event detected.",
          event.confidence,
          [event],
        );
        break;

      case "settlementCompleted":
        markSignal(
          "settlementCompleted",
          "Settlement completion transaction event detected.",
          event.confidence,
          [event],
        );
        break;

      case "fundsDisbursed":
        markSignal(
          "fundsDisbursed",
          "Funding or disbursement transaction event detected.",
          event.confidence,
          [event],
        );
        break;

      case "recordingCompleted":
        markSignal(
          "recordingCompleted",
          "Recording completion transaction event detected.",
          event.confidence,
          [event],
        );
        break;

      case "titleTransferred":
        markSignal(
          "titleTransferred",
          "Title transfer transaction event detected.",
          event.confidence,
          [event],
        );
        break;

      case "terminationEffective":
        markSignal(
          "terminationEffective",
          "Effective termination transaction event detected.",
          event.confidence,
          [event],
        );
        break;

      case "inspectionCompleted":
        markSignal(
          "inspectionCompleted",
          "Inspection completion transaction event detected.",
          event.confidence,
          [event],
        );
        break;

      case "appraisalCompleted":
        markSignal(
          "appraisalCompleted",
          "Appraisal completion transaction event detected.",
          event.confidence,
          [event],
        );
        break;

      case "amendmentEffective":
        markSignal(
          "amendmentEffective",
          "Effective amendment transaction event detected.",
          event.confidence,
          [event],
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
  const workflow = String(brain.transactionContext?.workflow || "").trim();

  const context = brain.transactionContextEvidence || {};

  const storedStatus = String(context.status || "")
    .trim()
    .toLowerCase();

  const statusSource = String(context.statusSource || "")
    .trim()
    .toLowerCase();

  /*
   * Evidence priority:
   *
   * 1. Verified current document evidence
   * 2. Explicit user-entered lifecycle status
   * 3. Workflow-based starting state
   *
   * A trusted user status may establish lifecycle state,
   * but it must never establish document facts such as price,
   * closing date, earnest money, or commission.
   */

  const hasVerifiedClosing =
    brain.signals.settlementCompleted === true ||
    (brain.signals.recordingCompleted === true &&
      brain.signals.titleTransferred === true) ||
    (brain.signals.fundsDisbursed === true &&
      brain.signals.titleTransferred === true);

  const hasVerifiedTermination = brain.signals.terminationEffective === true;

  const hasVerifiedContract = brain.signals.contractExecuted === true;

  const hasVerifiedListingAgreement =
    brain.signals.listingAgreementExecuted === true;

  const hasTrustedUserStatus =
    statusSource === "user" ||
    statusSource === "manual" ||
    statusSource === "user entered" ||
    statusSource === "user-entered";

  const userSaysClosed =
    hasTrustedUserStatus &&
    ["closed", "complete", "completed"].includes(storedStatus);

  const userSaysCancelled =
    hasTrustedUserStatus &&
    ["cancelled", "canceled", "terminated"].includes(storedStatus);

  const userSaysPending =
    hasTrustedUserStatus &&
    ["pending", "under contract", "under-contract"].includes(storedStatus);

  const userSaysActive =
    hasTrustedUserStatus &&
    ["active", "listed", "listing", "active listing"].includes(storedStatus);

  /*
   * Conflicting verified document outcomes require review.
   */

  if (hasVerifiedClosing && hasVerifiedTermination) {
    brain.decision.state = "Needs Review";

    addReasoning(
      "Verified closing and termination evidence conflict. Human review is required before assigning a final lifecycle state.",
    );
  } else if (hasVerifiedClosing) {
    brain.decision.state = "Closed";

    addReasoning(
      "Transaction closed based on verified settlement, recording, funding, or title-transfer evidence.",
    );
  } else if (hasVerifiedTermination) {
    brain.decision.state = "Cancelled";

    addReasoning(
      "Transaction cancelled based on verified effective termination evidence.",
    );
  } else if (hasVerifiedContract) {
    if (workflow === "Listing") {
      brain.decision.state = "Pending";

      addReasoning(
        "Listing transaction moved to Pending because an executed purchase agreement was verified.",
      );
    } else {
      brain.decision.state = "Active";

      addReasoning(
        "Transaction moved to Active because an executed purchase agreement was verified.",
      );
    }
  } else if (workflow === "Listing" && hasVerifiedListingAgreement) {
    brain.decision.state = "Active";

    addReasoning(
      "Listing transaction is Active because an executed listing agreement was verified.",
    );
  } else if (userSaysClosed) {
    brain.decision.state = "Closed";

    addReasoning(
      "Transaction marked Closed based on the trusted user-entered transaction status.",
    );
  } else if (userSaysCancelled) {
    brain.decision.state = "Cancelled";

    addReasoning(
      "Transaction marked Cancelled based on the trusted user-entered transaction status.",
    );
  } else if (userSaysPending) {
    brain.decision.state = "Pending";

    addReasoning(
      "Transaction marked Pending based on the trusted user-entered transaction status.",
    );
  } else if (userSaysActive) {
    brain.decision.state = "Active";

    addReasoning(
      "Transaction marked Active based on the trusted user-entered transaction status.",
    );
  } else if (workflow === "Listing") {
    brain.decision.state = "Pre-Listing";

    addReasoning(
      "Listing workflow exists without verified execution evidence or a trusted user-entered active status.",
    );
  } else if (workflow === "Buyer") {
    brain.decision.state = "Pre-Contract";

    addReasoning(
      "Buyer workflow exists without verified execution evidence or a trusted user-entered lifecycle status.",
    );
  } else {
    brain.decision.state = "Unknown";

    addReasoning(
      "Transaction state cannot be determined from current evidence or trusted user-entered lifecycle status.",
    );
  }

  brain.transactionState = brain.decision.state;

  brain.decision.supportingEvidence = [
    ...(Array.isArray(brain.reconciledEvidence)
      ? brain.reconciledEvidence
      : []),
  ];

  if (!Array.isArray(brain.decision.audit)) {
    brain.decision.audit = [];
  }

  brain.decision.audit.push({
    timestamp: new Date().toISOString(),
    state: brain.decision.state,
    workflow,
    storedStatus,
    statusSource,
    hasTrustedUserStatus,
    signals: {
      ...brain.signals,
    },
    authoritativeSource:
      hasVerifiedClosing ||
      hasVerifiedTermination ||
      hasVerifiedContract ||
      hasVerifiedListingAgreement
        ? "verified_document_evidence"
        : hasTrustedUserStatus
          ? "trusted_user_status"
          : "workflow_default",
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
  const canonical =
    brain?.canonicalEvidence &&
    typeof brain.canonicalEvidence === "object" &&
    !Array.isArray(brain.canonicalEvidence)
      ? brain.canonicalEvidence
      : {};

  /*
   * Canonical facts must come from current trusted evidence.
   *
   * The canonical evidence map may contain either:
   *
   * 1. A primitive value:
   *      purchasePrice: 1060000
   *
   * 2. A canonical evidence record:
   *      purchasePrice: {
   *        value: 1060000,
   *        confidence: 98,
   *        documentId: "...",
   *      }
   *
   * This function converts either representation into the
   * primitive business value required by brain.canonicalFacts.
   *
   * Stored transaction fields such as txn.price, txn.closeDate,
   * and txn.status are deliberately not used as authoritative
   * document facts. Removing documents must therefore remove
   * document-derived canonical facts.
   */

  const hasValue = (value) =>
    value !== undefined &&
    value !== null &&
    !(typeof value === "string" && value.trim() === "");

  const unwrapCanonicalValue = (entry) => {
    if (!hasValue(entry)) {
      return undefined;
    }

    if (typeof entry !== "object" || Array.isArray(entry)) {
      return entry;
    }

    return firstDefined(
      entry.value,
      entry.normalizedValue,
      entry.factValue,
      entry.canonicalValue,
      entry.extractedValue,
      entry.data?.value,
      entry.facts?.value,
      undefined,
    );
  };

  const findCanonicalEntry = (...aliases) => {
    for (const alias of aliases) {
      if (Object.prototype.hasOwnProperty.call(canonical, alias)) {
        const value = unwrapCanonicalValue(canonical[alias]);

        if (hasValue(value)) {
          return value;
        }
      }
    }

    const normalizeKey = (value) =>
      String(value || "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "");

    const normalizedAliases = new Set(aliases.map(normalizeKey));

    for (const [key, entry] of Object.entries(canonical)) {
      if (!normalizedAliases.has(normalizeKey(key))) {
        continue;
      }

      const value = unwrapCanonicalValue(entry);

      if (hasValue(value)) {
        return value;
      }
    }

    return undefined;
  };

  const normalizeMoney = (value) => {
    if (!hasValue(value)) {
      return "";
    }

    if (typeof value === "number") {
      return Number.isFinite(value) ? value : "";
    }

    const cleaned = String(value)
      .trim()
      .replace(/[$,\s]/g, "");

    if (!cleaned) {
      return "";
    }

    const number = Number(cleaned);

    return Number.isFinite(number) ? number : value;
  };

  const normalizeInteger = (value) => {
    if (!hasValue(value)) {
      return null;
    }

    const number = Number(
      typeof value === "string" ? value.replace(/[^\d.-]/g, "") : value,
    );

    return Number.isFinite(number) ? Math.round(number) : null;
  };

  const normalizeDate = (value) => {
    if (!hasValue(value)) {
      return "";
    }

    return String(value).trim();
  };

  brain.canonicalFacts.purchasePrice = normalizeMoney(
    findCanonicalEntry(
      "purchasePrice",
      "purchase_price",
      "contractPrice",
      "contract_price",
      "salePrice",
      "sale_price",
      "price",
    ),
  );

  brain.canonicalFacts.effectiveDate = normalizeDate(
    findCanonicalEntry(
      "effectiveDate",
      "effective_date",
      "contractEffectiveDate",
      "contract_effective_date",
      "agreementEffectiveDate",
      "agreement_effective_date",
    ),
  );

  brain.canonicalFacts.closingDate = normalizeDate(
    findCanonicalEntry(
      "closingDate",
      "closing_date",
      "scheduledClosingDate",
      "scheduled_closing_date",
      "closeDate",
      "close_date",
    ),
  );

  brain.canonicalFacts.actualClosingDate = normalizeDate(
    findCanonicalEntry(
      "actualClosingDate",
      "actual_closing_date",
      "closedDate",
      "closed_date",
      "settlementDate",
      "settlement_date",
      "recordingDate",
      "recording_date",
    ),
  );

  brain.canonicalFacts.terminationDate = normalizeDate(
    findCanonicalEntry(
      "terminationDate",
      "termination_date",
      "cancellationDate",
      "cancellation_date",
      "cancelledDate",
      "cancelled_date",
      "canceledDate",
      "canceled_date",
    ),
  );

  brain.canonicalFacts.earnestMoney = normalizeMoney(
    findCanonicalEntry(
      "earnestMoney",
      "earnest_money",
      "earnestMoneyDeposit",
      "earnest_money_deposit",
      "deposit",
      "depositAmount",
      "deposit_amount",
    ),
  );

  brain.canonicalFacts.sellerCredit = normalizeMoney(
    findCanonicalEntry(
      "sellerCredit",
      "seller_credit",
      "sellerCredits",
      "seller_credits",
      "sellerConcession",
      "seller_concession",
      "sellerConcessions",
      "seller_concessions",
    ),
  );

  brain.canonicalFacts.inspectionDays = normalizeInteger(
    findCanonicalEntry(
      "inspectionDays",
      "inspection_days",
      "inspectionPeriodDays",
      "inspection_period_days",
      "dueDiligenceDays",
      "due_diligence_days",
    ),
  );

  brain.canonicalFacts.optionDays = normalizeInteger(
    findCanonicalEntry(
      "optionDays",
      "option_days",
      "optionPeriodDays",
      "option_period_days",
    ),
  );

  brain.canonicalFacts.financingDeadline = normalizeDate(
    findCanonicalEntry(
      "financingDeadline",
      "financing_deadline",
      "loanDeadline",
      "loan_deadline",
      "financingContingencyDeadline",
      "financing_contingency_deadline",
    ),
  );

  brain.canonicalFacts.appraisalDeadline = normalizeDate(
    findCanonicalEntry(
      "appraisalDeadline",
      "appraisal_deadline",
      "appraisalContingencyDeadline",
      "appraisal_contingency_deadline",
    ),
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

  if (
    workflow === "Buyer" &&
    !["Closed", "Cancelled", "Needs Review"].includes(brain.decision?.state)
  ) {
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

    listingAgreementExecuted: [
      "listingAgreementExecuted",
      "listingAgreementSigned",
      "executedListingAgreement",
      "fullyExecutedListingAgreement",
      "exclusiveListingAgreementExecuted",
      "exclusiveAgencyAgreementExecuted",
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

    const sourceFacts =
      source.facts && typeof source.facts === "object"
        ? Array.isArray(source.facts)
          ? source.facts.reduce((output, fact) => {
              const name = text(fact?.name);

              if (name) {
                output[name] = fact?.value;
              }

              return output;
            }, {})
          : { ...source.facts }
        : {};

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

      category: text(source.category),

      confidence: normalizeConfidence(
        firstDefined(source.confidence, source.score),
        50,
      ),

      supportingText: text(
        firstDefined(
          source.supportingText,
          source.support,
          source.description,
          source.explanation,
          "",
        ),
      ),

      eventDate: text(
        firstDefined(
          source.eventDate,
          source.date,
          source.effectiveDate,
          source.completedDate,
          "",
        ),
      ),

      facts: sourceFacts,

      documentId: firstDefined(
        source.documentId,
        source.sourceDocumentId,
        analysis.documentId,
        doc.id,
        null,
      ),

      documentName: firstDefined(
        source.documentName,
        source.sourceDocument,
        analysis.documentName,
        doc.name,
        "Uploaded Document",
      ),

      documentType: firstDefined(
        source.documentType,
        analysis.documentType,
        analysis.classification?.documentType,
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

    statusSource: txn.statusSource || "",
    statusUpdatedAt: txn.statusUpdatedAt || "",

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

  /* -----------------------------------------------------
   State Decision Engine

   Order matters.

   Evidence beats workflow.
   Workflow beats missing documents.
----------------------------------------------------- */

  aiDetermineTransactionState(brain, addReasoning);

  aiBuildSituationRecommendations(brain);

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
