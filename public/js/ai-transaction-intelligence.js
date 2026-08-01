/* =====================================================
   RapportLink AI Transaction Intelligence
   Version 4
   ===================================================== */

console.log("AI Transaction Intelligence Loaded");

function aiBuildTransactionIntelligence(txn = {}) {
  /*
   * Legacy compatibility wrapper.
   *
   * RapportLink now uses the Transaction Brain as the
   * single source of truth.
   *
   * Older code may still call this function, so simply
   * return the Transaction Brain information.
   */

  if (typeof aiRefreshTransaction === "function") {
    aiRefreshTransaction(txn);
  }

  const brain = txn.transactionBrain || aiBuildTransactionBrain(txn);

  return {
    transactionState: brain.transactionState,

    hasTermination: brain.facts.terminationDocuments.length > 0,

    terminationExecuted: brain.facts.terminationDocuments.some(
      (d) => d.facts?.buyerSigned && d.facts?.sellerSigned,
    ),

    hasPurchaseAgreement: !!brain.facts.purchaseAgreement,

    hasInspection: brain.facts.inspections.length > 0,

    hasAppraisal: brain.facts.appraisals.length > 0,

    hasClosingStatement: brain.facts.closingDocuments.some(
      (d) => d.facts?.settlementStatementDetected,
    ),

    hasAmendment: brain.facts.amendments.length > 0,

    hasClosingEvidence: brain.facts.closingDocuments.length > 0,

    completedMilestones: [],

    cancelledMilestones: [],

    activeMilestones: [],

    recommendations: [...brain.recommendations],

    missingDocuments: [...brain.missingItems],

    unresolvedIssues: [],

    confidence: brain.confidence,

    health: brain.health,

    reasoning: [...brain.reasoning],
  };
}

function aiTransactionTerminationConfirmed(review = {}) {
  const extractedData =
    review.extractedData && typeof review.extractedData === "object"
      ? review.extractedData
      : {};

  if (
    extractedData.buyerSignatureDetected === true &&
    extractedData.terminationDate
  ) {
    return true;
  }

  const summary = String(review.advisorSummary || "").toLowerCase();

  const summaryConfirmsSignature =
    summary.includes("detected the buyer signature") ||
    summary.includes("buyer signature detected");

  const summaryConfirmsDate =
    summary.includes("termination date of") ||
    summary.includes("termination date detected");

  return summaryConfirmsSignature && summaryConfirmsDate;
}
