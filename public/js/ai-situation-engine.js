/* ==========================================================
   RapportLink AI Situation Engine
   Version 2.0
   ==========================================================

   PURPOSE

   The Situation Engine is a compatibility and presentation
   layer for the completed Transaction Brain.

   It does not independently:

      • determine transaction state
      • interpret transaction evidence
      • create authoritative signals
      • calculate health
      • calculate confidence
      • calculate risk
      • create priorities
      • create recommendations
      • create tasks
      • predict outcomes
      • make transaction decisions
      • create execution plans

   Every authoritative transaction conclusion must come from
   the Transaction Brain.

   The Situation Engine preserves the output structure expected
   by existing RapportLink files while ensuring that every value
   is copied from the Transaction Brain rather than independently
   derived here.

   ========================================================== */

"use strict";

console.log("AI Situation Engine Loaded");

const AI_SITUATION_ENGINE_VERSION = "2.0.0";

/* ==========================================================
   Safe Value Helpers
   ========================================================== */

function situationString(value, fallback = "") {
  if (typeof value !== "string") {
    return fallback;
  }

  const normalizedValue = value.trim();

  return normalizedValue || fallback;
}

function situationNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numericValue = Number(value);

  return Number.isFinite(numericValue) ? numericValue : null;
}

function situationArray(value) {
  return Array.isArray(value) ? [...value] : [];
}

function situationObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return { ...value };
}

function situationValue(value, fallback = null) {
  return value === undefined ? fallback : value;
}

/* ==========================================================
   Brain Field Compatibility Helpers
   ========================================================== */

function getBrainState(brain = {}) {
  return situationString(
    brain.transactionState ||
      brain.state?.state ||
      brain.decision?.state ||
      brain.currentState,
    "Unknown",
  );
}

function getBrainConfidence(brain = {}) {
  return situationNumber(
    brain.confidence ??
      brain.stateConfidence ??
      brain.state?.confidence ??
      brain.decision?.confidence,
  );
}

function getBrainHealth(brain = {}) {
  const directHealth = situationNumber(brain.health);

  if (directHealth !== null) {
    return directHealth;
  }

  return situationNumber(
    brain.healthScore ??
      brain.transactionHealth ??
      brain.scores?.health ??
      brain.health?.score,
  );
}

function getBrainRiskScore(brain = {}) {
  return situationNumber(
    brain.riskScore ??
      brain.scores?.risk ??
      brain.risk?.score ??
      brain.riskAssessment?.score,
  );
}

function getBrainRisk(brain = {}) {
  if (
    brain.risk &&
    typeof brain.risk === "object" &&
    !Array.isArray(brain.risk)
  ) {
    return situationObject(brain.risk);
  }

  if (
    brain.riskAssessment &&
    typeof brain.riskAssessment === "object" &&
    !Array.isArray(brain.riskAssessment)
  ) {
    return situationObject(brain.riskAssessment);
  }

  const riskLevel = situationString(
    brain.riskLevel || brain.riskClassification,
    "Unknown",
  );

  return {
    level: riskLevel,
    score: getBrainRiskScore(brain),
  };
}

function getBrainFacts(brain = {}) {
  return situationObject(
    brain.canonicalFacts || brain.facts || brain.canonicalEvidence?.facts,
  );
}

function getBrainSignals(brain = {}) {
  return situationObject(brain.signals);
}

function getBrainReasoning(brain = {}) {
  if (Array.isArray(brain.reasoning)) {
    return situationArray(brain.reasoning);
  }

  if (Array.isArray(brain.stateReasoning)) {
    return situationArray(brain.stateReasoning);
  }

  if (Array.isArray(brain.decision?.reasoning)) {
    return situationArray(brain.decision.reasoning);
  }

  return [];
}

function getBrainMissingItems(brain = {}) {
  if (Array.isArray(brain.missingItems)) {
    return situationArray(brain.missingItems);
  }

  if (Array.isArray(brain.missingEvidence)) {
    return situationArray(brain.missingEvidence);
  }

  return [];
}

/* ==========================================================
   Main Entry Point
   ========================================================== */

function aiBuildSituationModel(txn = {}, brain = {}) {
  const authoritativeBrain =
    brain && typeof brain === "object" && !Array.isArray(brain) ? brain : {};

  const transactionId =
    txn.id || txn.transactionId || authoritativeBrain.transactionId || null;

  const propertyAddress =
    situationString(txn.address) ||
    situationString(txn.propertyAddress) ||
    situationString(authoritativeBrain.propertyAddress);

  const transactionSide = situationString(
    txn.side || authoritativeBrain.transactionSide,
  ).toLowerCase();

  const transactionState = getBrainState(authoritativeBrain);
  const confidence = getBrainConfidence(authoritativeBrain);
  const health = getBrainHealth(authoritativeBrain);
  const riskScore = getBrainRiskScore(authoritativeBrain);
  const risk = getBrainRisk(authoritativeBrain);

  const canonicalFacts = getBrainFacts(authoritativeBrain);
  const signals = getBrainSignals(authoritativeBrain);
  const reasoning = getBrainReasoning(authoritativeBrain);
  const missingItems = getBrainMissingItems(authoritativeBrain);

  /*
   * Every field below is copied directly from the Transaction
   * Brain or supplied as a neutral compatibility value.
   *
   * No authoritative transaction conclusion is created here.
   */

  return {
    version: AI_SITUATION_ENGINE_VERSION,

    source: "Transaction Brain",

    transactionId,

    propertyAddress,

    transactionSide,

    transactionState,

    state: transactionState,

    confidence,

    stateConfidence: confidence,

    health,

    healthScore: health,

    risk,

    riskScore,

    riskLevel: situationString(
      risk.level ||
        authoritativeBrain.riskLevel ||
        authoritativeBrain.riskClassification,
      "Unknown",
    ),

    canonicalFacts,

    facts: canonicalFacts,

    signals,

    evidence: situationArray(authoritativeBrain.evidence),

    timeline: situationArray(authoritativeBrain.timeline),

    reasoning,

    stateReasoning: reasoning,

    situations: situationObject(authoritativeBrain.situations),

    priorities: situationArray(authoritativeBrain.priorities),

    topPriorities: situationArray(
      authoritativeBrain.topPriorities || authoritativeBrain.priorities,
    ),

    primaryPriority: situationValue(authoritativeBrain.primaryPriority, null),

    recommendations: situationArray(authoritativeBrain.recommendations),

    tasks: situationArray(authoritativeBrain.tasks),

    missingItems,

    missingEvidence: missingItems,

    conflicts: situationArray(
      authoritativeBrain.conflicts || authoritativeBrain.evidenceConflicts,
    ),

    decisions: situationArray(
      authoritativeBrain.decisions || authoritativeBrain.decision?.decisions,
    ),

    decision: situationValue(authoritativeBrain.decision, null),

    executionPlan: situationValue(authoritativeBrain.executionPlan, null),

    predictions: situationArray(authoritativeBrain.predictions),

    narrative: situationValue(authoritativeBrain.narrative, null),

    explanations: situationArray(authoritativeBrain.explanations),

    dependencies: situationArray(authoritativeBrain.dependencies),

    evidenceChains: situationArray(authoritativeBrain.evidenceChains),

    generatedAt:
      situationString(authoritativeBrain.generatedAt) ||
      new Date().toISOString(),
  };
}

/* ==========================================================
   Public API
   ========================================================== */

const AI_SITUATION_ENGINE_API = {
  version: AI_SITUATION_ENGINE_VERSION,

  aiBuildSituationModel,

  buildSituationModel: aiBuildSituationModel,
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = AI_SITUATION_ENGINE_API;
}

if (typeof globalThis !== "undefined") {
  globalThis.aiBuildSituationModel = aiBuildSituationModel;

  globalThis.RapportLinkSituationEngine = AI_SITUATION_ENGINE_API;
}

console.log("AI Situation Engine Core Ready");
