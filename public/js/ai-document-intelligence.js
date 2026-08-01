/* =====================================================
   RapportLink AI Document Intelligence
   Version 4 - Evidence Engine
   ===================================================== */

console.log("AI Document Intelligence Loaded");

/*
=========================================================
Evidence Model
=========================================================

Document Intelligence NEVER decides:

- Active
- Pending
- Closed
- Cancelled

It only extracts evidence.

The Transaction Brain is the ONLY component
allowed to determine transaction state.
=========================================================
*/

/* =========================================================
   AI TRANSACTION COORDINATOR
   ========================================================= */

function aiBuildCoordinator(txn = {}) {
  const brain = txn.transactionBrain || aiBuildTransactionBrain(txn);

  const coordinator = {
    greeting: "",

    headline: "",

    summary: "",

    recommendations: [],

    priorities: [],

    alerts: [],

    health: brain.health,

    confidence: brain.confidence,

    transactionState: brain.transactionState,

    evidence: [...brain.evidence],

    reasoning: [...brain.reasoning],

    missingItems: [...brain.missingItems],
  };

  switch (brain.transactionState) {
    case "Pre-Contract":
      coordinator.greeting = "Good morning.";

      coordinator.headline = "No Executed Purchase Agreement Found";

      coordinator.summary =
        "I could not find evidence of an executed purchase agreement.";

      break;

    case "Active":
      coordinator.greeting = "Good morning.";

      coordinator.headline = "Transaction In Progress";

      coordinator.summary =
        "The available evidence indicates this transaction is active.";

      break;

    case "Pending":
      coordinator.greeting = "Good morning.";

      coordinator.headline = "Transaction Needs Review";

      coordinator.summary =
        "Some evidence is incomplete or conflicting and should be reviewed before the transaction status changes.";

      break;

    case "Cancelled":
      coordinator.greeting = "Good morning.";

      coordinator.headline = "Transaction Cancelled";

      coordinator.summary =
        "The available evidence indicates this transaction was cancelled.";

      break;

    case "Closed":
      coordinator.greeting = "Congratulations!";

      coordinator.headline = "Transaction Closed";

      coordinator.summary =
        "The available evidence indicates this transaction has successfully closed.";

      break;

    default:
      coordinator.greeting = "Good morning.";

      coordinator.headline = "Transaction Review";

      coordinator.summary =
        "The AI Transaction Brain has completed its review.";
  } /*
  ----------------------------------------------------
  Brain Recommendations
  ----------------------------------------------------
  */

  coordinator.recommendations.push(...brain.recommendations); /*

  ----------------------------------------------------
  Missing Evidence
  ----------------------------------------------------
  */

  brain.missingItems.forEach((item) => {
    coordinator.priorities.push(`Missing: ${item}`);
  }); /*
  ----------------------------------------------------
  Final Message
  ----------------------------------------------------
  */

  coordinator.message = `
${coordinator.greeting}

I've finished reviewing this transaction.

Current State:
${brain.transactionState}

Confidence:
${brain.confidence}%

Transaction Health:
${brain.health}%

Evidence Reviewed:
${brain.evidence.length}

Reasoning:

${brain.reasoning.join("\n")}

Recommended Next Actions:

${coordinator.recommendations.join("\n")}
`;

  return coordinator;
}

/* =========================================================
   TRANSACTION BRAIN AUTO REFRESH
   ========================================================= */

function aiRefreshTransaction(txn = {}) {
  /*
  --------------------------------------------------------
  Rebuild the authoritative Transaction Brain

  Use only this transaction's current documents, evidence,
  and legitimate workflow data.

  This function must never reanalyze documents and must never
  copy AI-derived conclusions into permanent user-entered
  transaction fields.
  --------------------------------------------------------
  */

  console.group("REFRESH TXN");

  console.log("documents:", txn.documents);
  console.log("aiDocumentReviews:", txn.aiDocumentReviews);
  console.log("price:", txn.price);
  console.log("purchasePrice:", txn.purchasePrice);
  console.log("expectedGCI:", txn.expectedGCI);
  console.log("closeDate:", txn.closeDate);
  console.log("closingDate:", txn.closingDate);
  console.log("transactionBrain:", txn.transactionBrain);
  console.log("aiCoordinator:", txn.aiCoordinator);

  console.groupEnd();

  const brain =
    typeof aiBuildTransactionBrain === "function"
      ? aiBuildTransactionBrain(txn)
      : null;

  /*
  --------------------------------------------------------
  Brain unavailable

  Remove previously generated AI objects so stale conclusions
  cannot continue appearing as current truth.
  --------------------------------------------------------
  */

  if (!brain || typeof brain !== "object" || Array.isArray(brain)) {
    console.warn("Transaction Brain is not available.");

    delete txn.transactionBrain;
    delete txn.aiCoordinator;

    /*
     * Remove legacy mirrors that could be mistaken for
     * authoritative current conclusions.
     */
    delete txn.derivedStatus;
    delete txn.aiTransactionState;
    delete txn.health;
    delete txn.closingConfidence;

    return txn;
  }

  /*
  --------------------------------------------------------
  Store the rebuilt Brain

  The complete Transaction Brain object is the authoritative
  source for state, health, confidence, risk, evidence,
  reasoning, missing items, and recommendations.
  --------------------------------------------------------
  */

  txn.transactionBrain = brain;

  /*
   * Do not copy Brain conclusions into legacy transaction
   * fields such as:
   *
   * txn.derivedStatus
   * txn.aiTransactionState
   * txn.health
   * txn.closingConfidence
   *
   * Consumers must read those conclusions directly from
   * txn.transactionBrain or from the authoritative AI object
   * created from it.
   */

  delete txn.derivedStatus;
  delete txn.aiTransactionState;
  delete txn.health;
  delete txn.closingConfidence;

  /*
  --------------------------------------------------------
  Canonical facts

  Canonical Brain facts must never overwrite permanent
  user-entered transaction fields such as:
  --------------------------------------------------------

  txn.price
  txn.closeDate
  txn.contractDate
  txn.loanDate
  txn.appraisalDate
  */

  /*
  --------------------------------------------------------
  Rebuild the Coordinator from the completed Brain

  The Coordinator may organize and display Brain conclusions,
  but it must not independently derive transaction state,
  health, confidence, risk, or evidence.
  --------------------------------------------------------
  */

  if (typeof aiBuildCoordinator === "function") {
    try {
      txn.aiCoordinator = aiBuildCoordinator(txn, brain);
    } catch (error) {
      console.error("AI Coordinator build failed:", error);
      txn.aiCoordinator = null;
    }
  } else {
    txn.aiCoordinator = null;
  }

  /*
  --------------------------------------------------------
  Checklist completion

  This is operational workflow information only. It must not
  determine transaction state, health, confidence, or risk.
  --------------------------------------------------------
  */

  const checklistItems = Array.isArray(txn.checklist)
    ? txn.checklist
    : txn.checklist && typeof txn.checklist === "object"
      ? Object.values(txn.checklist)
      : [];

  const completedChecklistItems = checklistItems.filter((item) => {
    if (item === true) {
      return true;
    }

    if (!item || typeof item !== "object") {
      return false;
    }

    return (
      item.done === true ||
      item.completed === true ||
      item.checked === true ||
      String(item.status || "")
        .trim()
        .toLowerCase() === "completed"
    );
  });

  txn.checklistCompleted =
    checklistItems.length > 0
      ? Math.round(
          (completedChecklistItems.length / checklistItems.length) * 100,
        )
      : null;

  brain.transactionCompletion = txn.checklistCompleted;
  brain.completion = txn.checklistCompleted;

  console.log("REFRESH COMPLETE", {
    transactionId: txn.id || null,
    transactionBrain: txn.transactionBrain,
    aiCoordinator: txn.aiCoordinator,
    state:
      txn.transactionBrain?.decision?.state ||
      txn.transactionBrain?.transactionState ||
      "Unknown",
    health:
      txn.transactionBrain?.decision?.health ??
      txn.transactionBrain?.health ??
      0,
    confidence:
      txn.transactionBrain?.decision?.confidence ??
      txn.transactionBrain?.confidence ??
      0,
  });

  return txn;
}

/* =========================================================
   REMOVE LEGACY STATUS CHANGES
   =========================================================

   Search ai-document-intelligence.js for EVERY occurrence of:

       updateTransaction.status

   or

       statusImpact

   or

       txn.status =

   inside ANY document reader.

   NONE OF THEM SHOULD EXIST ANYMORE.

   The ONLY place allowed to assign:

       txn.status

   should be inside:

       aiRefreshTransaction()

   after

       const brain = aiBuildTransactionBrain(txn);

========================================================= */

/* =========================================================
   NEW CENTRAL ENTRY POINT
   ========================================================= */

function aiAnalyzeTransaction(txn = {}) {
  if (!txn || typeof txn !== "object") {
    return txn;
  }

  if (!Array.isArray(txn.documents)) {
    txn.documents = [];
  }

  const isObject = (value) =>
    value !== null && typeof value === "object" && !Array.isArray(value);

  const normalizeText = (value) =>
    String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ");

  const normalizeConfidence = (value) => {
    const number = Number(value || 0);

    if (!Number.isFinite(number)) {
      return 0;
    }

    if (number > 0 && number <= 1) {
      return Math.round(number * 100);
    }

    return Math.max(0, Math.min(100, Math.round(number)));
  };

  const falseEffect = () => ({
    occurred: false,
    date: "",
    confidence: 0,
    supportingText: "",
  });

  const resolveDocumentAnalysis = (doc) => {
    const candidates = [
      doc?.aiAnalysis,
      doc?.aiAnalysis?.analysis,
      doc?.ai,
      doc?.ai?.analysis,
      doc?.universalAnalysis,
      doc?.universalAnalysis?.analysis,
      doc?.analysis,
      doc?.analysis?.analysis,
      doc?.documentAnalysis,
      doc?.documentAnalysis?.analysis,
    ];

    const intelligenceCandidate = candidates.find(
      (candidate) =>
        isObject(candidate) &&
        (Array.isArray(candidate.evidence) ||
          Array.isArray(candidate.transactionEvents) ||
          isObject(candidate.facts) ||
          isObject(candidate.semanticEffects)),
    );

    return (
      intelligenceCandidate ||
      candidates.find((candidate) => isObject(candidate)) ||
      null
    );
  };

  const getEvidenceRecords = (analysis) =>
    Array.isArray(analysis?.evidence)
      ? analysis.evidence.filter((record) => isObject(record))
      : [];

  const getFactContainers = (analysis) => {
    const containers = [];

    if (isObject(analysis?.facts)) {
      containers.push(analysis.facts);

      Object.values(analysis.facts).forEach((value) => {
        if (isObject(value)) {
          containers.push(value);
        }
      });
    }

    getEvidenceRecords(analysis).forEach((record) => {
      if (isObject(record.facts)) {
        containers.push(record.facts);
      }
    });

    return containers;
  };

  const findFact = (analysis, factNames = []) => {
    const normalizedNames = factNames.map(normalizeText);
    const containers = getFactContainers(analysis);

    for (const container of containers) {
      for (const [key, value] of Object.entries(container)) {
        if (normalizedNames.includes(normalizeText(key))) {
          return {
            found: true,
            value,
            container,
            key,
          };
        }
      }
    }

    return {
      found: false,
      value: undefined,
      container: null,
      key: "",
    };
  };

  const findEvidenceByType = (analysis, typeNames = []) => {
    const normalizedTypes = typeNames.map(normalizeText);

    return (
      getEvidenceRecords(analysis).find((record) => {
        const recordType = normalizeText(
          record.type || record.documentType || record.category || "",
        );

        return normalizedTypes.some(
          (type) =>
            recordType === type ||
            recordType.includes(type) ||
            type.includes(recordType),
        );
      }) || null
    );
  };

  const getTransactionEvents = (analysis) =>
    Array.isArray(analysis?.transactionEvents)
      ? analysis.transactionEvents
      : [];

  const eventIsCompleted = (event) => {
    if (!isObject(event)) {
      return false;
    }

    if (event.completed === true || event.occurred === true) {
      return true;
    }

    const status = normalizeText(
      event.status || event.eventStatus || event.completionStatus || "",
    );

    return [
      "completed",
      "complete",
      "executed",
      "effective",
      "occurred",
      "confirmed",
      "signed",
      "cancelled",
      "canceled",
      "terminated",
    ].includes(status);
  };

  const getEventText = (event) =>
    normalizeText(
      [
        event?.eventType,
        event?.type,
        event?.name,
        event?.title,
        event?.label,
        event?.description,
        event?.supportingText,
      ]
        .filter(Boolean)
        .join(" "),
    );

  const findCompletedEvent = (analysis, eventNames = []) => {
    const normalizedNames = eventNames.map(normalizeText);

    return (
      getTransactionEvents(analysis).find((event) => {
        if (!eventIsCompleted(event)) {
          return false;
        }

        const eventText = getEventText(event);

        return normalizedNames.some(
          (name) =>
            eventText === name ||
            eventText.includes(name) ||
            name.includes(eventText),
        );
      }) || null
    );
  };

  const getEventDate = (event) =>
    String(
      event?.eventDate ||
        event?.date ||
        event?.effectiveDate ||
        event?.completedDate ||
        event?.signedDate ||
        "",
    );

  const buildEffectFromEvent = (event) => {
    if (!event) {
      return null;
    }

    return {
      occurred: true,
      date: getEventDate(event),
      confidence: normalizeConfidence(
        event.confidence ?? event.confidenceScore ?? event.probability ?? 0,
      ),
      supportingText: String(
        event.supportingText ||
          event.description ||
          `${event.eventType || event.type || "Transaction event"} was completed.`,
      ),
    };
  };

  const buildEffectFromFact = ({
    analysis,
    factNames,
    evidenceTypes = [],
    dateFactNames = [],
    supportingText,
  }) => {
    const factResult = findFact(analysis, factNames);

    if (!factResult.found || factResult.value !== true) {
      return null;
    }

    const matchingEvidence = findEvidenceByType(analysis, evidenceTypes);

    const dateResult = findFact(analysis, dateFactNames);

    return {
      occurred: true,
      date:
        dateResult.found && dateResult.value ? String(dateResult.value) : "",
      confidence: normalizeConfidence(
        matchingEvidence?.confidence ?? analysis?.confidence ?? 0,
      ),
      supportingText: String(
        matchingEvidence?.supportingText ||
          supportingText ||
          `${factResult.key} was confirmed by document evidence.`,
      ),
    };
  };

  const chooseEffect = (eventEffect, factEffect, existingEffect) => {
    if (eventEffect?.occurred === true) {
      return eventEffect;
    }

    if (factEffect?.occurred === true) {
      return factEffect;
    }

    if (isObject(existingEffect) && existingEffect.occurred === true) {
      return existingEffect;
    }

    return falseEffect();
  };

  txn.documents.forEach((doc) => {
    if (!doc || typeof doc !== "object") {
      return;
    }

    const analysis = resolveDocumentAnalysis(doc);

    if (!analysis) {
      return;
    }

    /*
     * Normalize all supported historical storage locations to
     * one authoritative document-analysis property.
     */
    doc.aiAnalysis = analysis;

    const existingSemanticEffects = isObject(analysis.semanticEffects)
      ? analysis.semanticEffects
      : {};

    const contractExecutedEvent = buildEffectFromEvent(
      findCompletedEvent(analysis, [
        "contract executed",
        "purchase agreement executed",
        "executed purchase agreement",
        "agreement executed",
        "contract signed",
        "purchase agreement signed",
      ]),
    );

    const contractExecutedFact = buildEffectFromFact({
      analysis,
      factNames: [
        "contractExecuted",
        "purchaseAgreementExecuted",
        "agreementExecuted",
      ],
      evidenceTypes: ["PurchaseAgreement", "Purchase Agreement", "Contract"],
      dateFactNames: ["effectiveDate", "contractDate", "executionDate"],
      supportingText:
        "The document evidence confirms an executed purchase agreement.",
    });

    const listingAgreementExecutedEvent = buildEffectFromEvent(
      findCompletedEvent(analysis, [
        "listing agreement executed",
        "executed listing agreement",
        "listing agreement signed",
        "listing contract executed",
        "listing contract signed",
      ]),
    );

    const listingAgreementExecutedFact = buildEffectFromFact({
      analysis,
      factNames: [
        "listingAgreementExecuted",
        "listingContractExecuted",
        "listingAgreementSigned",
      ],
      evidenceTypes: [
        "ListingAgreement",
        "Listing Agreement",
        "Listing Contract",
      ],
      dateFactNames: [
        "listingAgreementDate",
        "listingDate",
        "executionDate",
        "effectiveDate",
      ],
      supportingText:
        "The document evidence confirms an executed listing agreement.",
    });

    const settlementCompletedEvent = buildEffectFromEvent(
      findCompletedEvent(analysis, [
        "settlement completed",
        "settlement",
        "closing completed",
        "closing complete",
        "transaction closed",
      ]),
    );

    const settlementCompletedFact = buildEffectFromFact({
      analysis,
      factNames: ["settlementCompleted", "closingCompleted"],
      evidenceTypes: ["Settlement", "Closing", "ClosingDisclosure"],
      dateFactNames: ["actualClosingDate", "closingDate", "settlementDate"],
      supportingText:
        "The document evidence confirms settlement or closing was completed.",
    });

    const fundsDisbursedEvent = buildEffectFromEvent(
      findCompletedEvent(analysis, [
        "funds disbursed",
        "disbursement completed",
        "disbursement",
        "escrow disbursement",
        "seller proceeds allocation",
        "seller proceeds allocated",
        "loan funding accounted",
      ]),
    );

    const fundsDisbursedFact = buildEffectFromFact({
      analysis,
      factNames: ["fundsDisbursed", "disbursementCompleted"],
      evidenceTypes: ["Disbursement", "Settlement", "Closing"],
      dateFactNames: ["disbursementDate", "fundingDate", "actualClosingDate"],
      supportingText: "The document evidence confirms funds were disbursed.",
    });

    const recordingCompletedEvent = buildEffectFromEvent(
      findCompletedEvent(analysis, [
        "recording completed",
        "recording",
        "deed recorded",
        "recorded deed",
      ]),
    );

    const recordingCompletedFact = buildEffectFromFact({
      analysis,
      factNames: ["recordingCompleted", "deedRecorded"],
      evidenceTypes: ["Recording", "Deed", "Closing"],
      dateFactNames: ["recordingDate", "deedRecordedDate"],
      supportingText: "The document evidence confirms recording was completed.",
    });

    const titleTransferredEvent = buildEffectFromEvent(
      findCompletedEvent(analysis, [
        "title transferred",
        "title transfer",
        "deed conveyed",
        "ownership transferred",
      ]),
    );

    const titleTransferredFact = buildEffectFromFact({
      analysis,
      factNames: ["titleTransferred", "ownershipTransferred", "deedConveyed"],
      evidenceTypes: ["Title", "Deed", "Closing"],
      dateFactNames: ["titleTransferDate", "deedDate", "actualClosingDate"],
      supportingText: "The document evidence confirms title was transferred.",
    });

    const terminationEffectiveEvent = buildEffectFromEvent(
      findCompletedEvent(analysis, [
        "termination effective",
        "contract terminated",
        "termination completed",
        "buyer termination",
        "buyer terminated contract",
        "notice of buyer termination",
        "notice of buyer's termination",
        "agreement terminated",
        "agreement cancelled",
        "agreement canceled",
        "contract cancelled",
        "contract canceled",
        "cancellation effective",
        "cancelled",
        "canceled",
        "terminated",
      ]),
    );

    const terminationEffectiveFact = buildEffectFromFact({
      analysis,
      factNames: [
        "terminationEffective",
        "contractTerminated",
        "agreementTerminated",
        "cancellationEffective",
      ],
      evidenceTypes: ["Termination", "Termination of Contract", "Cancellation"],
      dateFactNames: ["terminationDate", "cancellationDate", "effectiveDate"],
      supportingText:
        "The document evidence confirms the termination is effective.",
    });

    analysis.semanticEffects = {
      ...existingSemanticEffects,

      contractExecuted: chooseEffect(
        contractExecutedEvent,
        contractExecutedFact,
        existingSemanticEffects.contractExecuted,
      ),

      listingAgreementExecuted: chooseEffect(
        listingAgreementExecutedEvent,
        listingAgreementExecutedFact,
        existingSemanticEffects.listingAgreementExecuted,
      ),

      settlementCompleted: chooseEffect(
        settlementCompletedEvent,
        settlementCompletedFact,
        existingSemanticEffects.settlementCompleted,
      ),

      fundsDisbursed: chooseEffect(
        fundsDisbursedEvent,
        fundsDisbursedFact,
        existingSemanticEffects.fundsDisbursed,
      ),

      recordingCompleted: chooseEffect(
        recordingCompletedEvent,
        recordingCompletedFact,
        existingSemanticEffects.recordingCompleted,
      ),

      titleTransferred: chooseEffect(
        titleTransferredEvent,
        titleTransferredFact,
        existingSemanticEffects.titleTransferred,
      ),

      terminationEffective: chooseEffect(
        terminationEffectiveEvent,
        terminationEffectiveFact,
        existingSemanticEffects.terminationEffective,
      ),
    };

    /*
     * Keep both historical analysis properties synchronized.
     */
    doc.ai = analysis;
  });

  /*
   * Rebuild every downstream layer from the normalized
   * document intelligence.
   */
  if (typeof aiRefreshTransaction === "function") {
    aiRefreshTransaction(txn);
  } else if (typeof aiBuildTransactionBrain === "function") {
    txn.transactionBrain = aiBuildTransactionBrain(txn);
  }

  return txn;
}

/* =========================================================
   NEW PUBLIC API
   ========================================================= */

function aiReviewTransaction(txn = {}) {
  return aiAnalyzeTransaction(txn);
}

/* =========================================================
   WORKSPACE API
   ========================================================= */

function aiWorkspaceRefresh(txn = {}) {
  txn = aiAnalyzeTransaction(txn);

  return {
    transaction: txn,

    coordinator: txn.aiCoordinator,

    brain: txn.transactionBrain,
  };
}

/* =========================================================
   AI STATUS HELPERS
   ========================================================= */

function aiTransactionState(txn = {}) {
  const brain = txn?.transactionBrain;

  if (!brain || typeof brain !== "object" || Array.isArray(brain)) {
    console.warn(
      "AI transaction state unavailable because the Transaction Brain is missing.",
    );

    return "Unknown";
  }

  const state = String(
    brain?.decision?.state || brain?.transactionState || "",
  ).trim();

  if (!state) {
    console.warn(
      "AI transaction state unavailable because the Transaction Brain has no valid state decision.",
    );

    return "Unknown";
  }

  return state;
}

function aiTransactionConfidence(txn = {}) {
  const brain = txn?.transactionBrain;

  if (!brain || typeof brain !== "object" || Array.isArray(brain)) {
    console.warn(
      "AI transaction confidence unavailable because the Transaction Brain is missing.",
    );

    return 0;
  }

  const confidence = Number(brain?.decision?.confidence ?? brain?.confidence);

  if (!Number.isFinite(confidence)) {
    console.warn(
      "AI transaction confidence unavailable because the Transaction Brain has no valid confidence decision.",
    );

    return 0;
  }

  return Math.max(0, Math.min(100, confidence));
}

function aiTransactionHealth(txn = {}) {
  const brain = txn?.transactionBrain;

  if (!brain || typeof brain !== "object" || Array.isArray(brain)) {
    console.warn(
      "AI transaction health unavailable because the Transaction Brain is missing.",
    );

    return 0;
  }

  const health = Number(brain?.decision?.health ?? brain?.health);

  if (!Number.isFinite(health)) {
    console.warn(
      "AI transaction health unavailable because the Transaction Brain has no valid health decision.",
    );

    return 0;
  }

  return Math.max(0, Math.min(100, health));
}

/* =========================================================
   IMPORTANT

   From this point forward the rest of RapportLink
   should use:

       aiTransactionState(txn)

   instead of

       txn.status

   because txn.status is now only a cached value
   generated by the Transaction Brain.

========================================================= */
