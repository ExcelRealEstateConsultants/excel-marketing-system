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

  /*
--------------------------------------------------------
Legacy transaction normalization

Normalize historical transaction fields into the
canonical names expected by the Transaction Brain.

Do NOT overwrite existing canonical values.
--------------------------------------------------------
*/

  if (
    (txn.purchasePrice == null || txn.purchasePrice === "") &&
    Number.isFinite(Number(txn.price))
  ) {
    txn.purchasePrice = Number(txn.price);
  }

  if (
    (!txn.closingDate || String(txn.closingDate).trim() === "") &&
    txn.closeDate
  ) {
    txn.closingDate = txn.closeDate;
  }

  if (
    (!txn.contractPrice || String(txn.contractPrice).trim() === "") &&
    txn.purchasePrice
  ) {
    txn.contractPrice = txn.purchasePrice;
  }

  console.log("AFTER NORMALIZATION");
  console.log("purchasePrice:", txn.purchasePrice);
  console.log("closingDate:", txn.closingDate);
  console.log("contractPrice:", txn.contractPrice);

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

  const authoritativeState = String(
    brain?.decision?.state || brain?.transactionState || "",
  ).trim();

  txn.checklistCompleted =
    authoritativeState === "Closed"
      ? 100
      : checklistItems.length > 0
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
  /*
  --------------------------------------------------------
  PURPOSE

  This function is a document-analysis normalization layer.

  It must not independently:

  - interpret document meaning
  - infer document execution
  - infer contract status
  - infer listing status
  - infer settlement
  - infer recording
  - infer title transfer
  - infer termination
  - create semantic effects
  - create transaction events
  - determine transaction state

  The Universal Document Engine creates document intelligence.
  The Transaction Brain determines transaction conclusions.
  --------------------------------------------------------
  */

  if (!txn || typeof txn !== "object" || Array.isArray(txn)) {
    return txn;
  }

  if (!Array.isArray(txn.documents)) {
    txn.documents = [];
  }

  const isObject = (value) =>
    value !== null && typeof value === "object" && !Array.isArray(value);

  /*
  --------------------------------------------------------
  Analysis Candidate Validation

  A valid analysis must contain at least one recognized
  Universal Document Intelligence output structure.

  Classification alone is not sufficient because it does not
  prove that the analysis contains usable evidence.
  --------------------------------------------------------
  */

  const hasAnalysisContent = (analysis) => {
    if (!isObject(analysis)) {
      return false;
    }

    const directEvidence =
      Array.isArray(analysis.evidence) ||
      Array.isArray(analysis.evidence?.items);

    const directEvents = Array.isArray(analysis.transactionEvents);

    const directSemanticEffects =
      isObject(analysis.semanticEffects) ||
      Array.isArray(analysis.semanticEffects);

    const directFacts =
      isObject(analysis.facts) || Array.isArray(analysis.facts);

    const nestedUniversal = isObject(analysis.universalAnalysis);

    const nestedEvidence =
      Array.isArray(analysis.universalAnalysis?.evidence) ||
      Array.isArray(analysis.universalAnalysis?.evidence?.items);

    const nestedEvents = Array.isArray(
      analysis.universalAnalysis?.transactionEvents,
    );

    const nestedSemanticEffects =
      isObject(analysis.universalAnalysis?.semanticEffects) ||
      Array.isArray(analysis.universalAnalysis?.semanticEffects);

    const nestedFacts =
      isObject(analysis.universalAnalysis?.facts) ||
      Array.isArray(analysis.universalAnalysis?.facts);

    return Boolean(
      directEvidence ||
      directEvents ||
      directSemanticEffects ||
      directFacts ||
      nestedUniversal ||
      nestedEvidence ||
      nestedEvents ||
      nestedSemanticEffects ||
      nestedFacts,
    );
  };

  /*
  --------------------------------------------------------
  Candidate Scoring

  Prefer the analysis object containing the richest current
  Universal Document Intelligence result.

  This supports historical storage locations without
  interpreting or altering the analysis.
  --------------------------------------------------------
  */

  const scoreAnalysisCandidate = (analysis) => {
    if (!isObject(analysis)) {
      return -1;
    }

    let score = 0;

    if (
      isObject(analysis.semanticEffects) ||
      Array.isArray(analysis.semanticEffects)
    ) {
      score += 100;
    }

    if (Array.isArray(analysis.transactionEvents)) {
      score += 80;
    }

    if (Array.isArray(analysis.evidence)) {
      score += 70;
    }

    if (Array.isArray(analysis.evidence?.items)) {
      score += 70;
    }

    if (isObject(analysis.facts) || Array.isArray(analysis.facts)) {
      score += 50;
    }

    if (isObject(analysis.classification)) {
      score += 20;
    }

    if (isObject(analysis.universalAnalysis)) {
      score += 10;
    }

    if (
      isObject(analysis.universalAnalysis?.semanticEffects) ||
      Array.isArray(analysis.universalAnalysis?.semanticEffects)
    ) {
      score += 100;
    }

    if (Array.isArray(analysis.universalAnalysis?.transactionEvents)) {
      score += 80;
    }

    if (
      Array.isArray(analysis.universalAnalysis?.evidence) ||
      Array.isArray(analysis.universalAnalysis?.evidence?.items)
    ) {
      score += 70;
    }

    if (
      isObject(analysis.universalAnalysis?.facts) ||
      Array.isArray(analysis.universalAnalysis?.facts)
    ) {
      score += 50;
    }

    return score;
  };

  /*
  --------------------------------------------------------
  Resolve Stored Document Analysis

  RapportLink has historically stored document analysis in
  several properties.

  Locate the strongest existing result without rebuilding it.
  --------------------------------------------------------
  */

  const resolveDocumentAnalysis = (doc) => {
    if (!isObject(doc)) {
      return null;
    }

    const candidates = [
      doc.aiAnalysis,
      doc.aiAnalysis?.analysis,

      doc.universalAnalysis,
      doc.universalAnalysis?.analysis,

      doc.ai,
      doc.ai?.analysis,

      doc.analysis,
      doc.analysis?.analysis,

      doc.documentAnalysis,
      doc.documentAnalysis?.analysis,
    ].filter(isObject);

    if (!candidates.length) {
      return null;
    }

    const validCandidates = candidates.filter(hasAnalysisContent);

    const candidatePool = validCandidates.length ? validCandidates : candidates;

    return (
      candidatePool
        .map((candidate, index) => ({
          candidate,
          index,
          score: scoreAnalysisCandidate(candidate),
        }))
        .sort((left, right) => {
          if (right.score !== left.score) {
            return right.score - left.score;
          }

          return left.index - right.index;
        })[0]?.candidate || null
    );
  };

  /*
  --------------------------------------------------------
  Normalize Every Current Document

  Store the exact same analysis object in the compatibility
  locations currently consumed by RapportLink.

  Do not clone, modify, supplement, reinterpret, or replace
  semanticEffects, transactionEvents, facts, or evidence.
  --------------------------------------------------------
  */

  txn.documents.forEach((doc) => {
    if (!isObject(doc)) {
      return;
    }

    const authoritativeAnalysis = resolveDocumentAnalysis(doc);

    if (!authoritativeAnalysis) {
      /*
       * Do not retain stale compatibility aliases when no
       * supported analysis exists for the current document.
       */
      delete doc.aiAnalysis;
      delete doc.ai;

      return;
    }

    doc.aiAnalysis = authoritativeAnalysis;
    doc.ai = authoritativeAnalysis;
  });

  /*
  --------------------------------------------------------
  Remove Stale Transaction Conclusions

  The next Brain build must be based only on the transaction's
  current documents and their current saved analyses.
  --------------------------------------------------------
  */

  delete txn.transactionBrain;
  delete txn.aiCoordinator;

  delete txn.derivedStatus;
  delete txn.aiTransactionState;
  delete txn.health;
  delete txn.closingConfidence;

  /*
  --------------------------------------------------------
  Rebuild the Authoritative Downstream Layers

  aiRefreshTransaction:
    - builds the Transaction Brain
    - stores the Brain
    - builds the Coordinator

  If it is unavailable, build and store the Brain directly.
  --------------------------------------------------------
  */

  if (typeof aiRefreshTransaction === "function") {
    return aiRefreshTransaction(txn);
  }

  if (typeof aiBuildTransactionBrain === "function") {
    const brain = aiBuildTransactionBrain(txn);

    if (brain && typeof brain === "object" && !Array.isArray(brain)) {
      txn.transactionBrain = brain;
    }
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
