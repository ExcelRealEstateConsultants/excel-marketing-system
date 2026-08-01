/* ==========================================================
   RapportLink AI Transaction Coordinator
   Version 3.0
   ==========================================================

   PURPOSE

   The AI Transaction Coordinator DOES NOT determine
   transaction status.

   It reads information from the Transaction Brain and
   converts it into:

   • Priorities
   • Recommendations
   • Tasks
   • Daily Briefings
   • Transaction Health
   • Closing Confidence
   • AI Workspace Information

   SINGLE SOURCE OF TRUTH

   Transaction Brain
          ↓
   AI Transaction Coordinator
          ↓
   Transaction Workspace

   ========================================================== */

console.log("AI Transaction Coordinator Loaded");

/* ==========================================================
   Coordinator Version
   ========================================================== */

const AI_COORDINATOR_VERSION = 3;

/* ==========================================================
   Main Coordinator Entry Point
   ========================================================== */

function txnRunCoordinator(txn = {}, data = {}) {
  /*
  --------------------------------------------------------
  Build the authoritative Transaction Brain
  --------------------------------------------------------

  aiAnalyzeTransaction upgrades the saved document
  transactionEvents into semanticEffects and then rebuilds
  the Transaction Brain.

  Do not call aiRefreshTransaction directly here because
  that can rebuild the Brain before the saved document
  events have been normalized.
  --------------------------------------------------------
  */

  if (typeof aiAnalyzeTransaction === "function") {
    aiAnalyzeTransaction(txn);
  } else if (typeof aiRefreshTransaction === "function") {
    aiRefreshTransaction(txn);
  }

  const brain =
    txn.transactionBrain && typeof txn.transactionBrain === "object"
      ? txn.transactionBrain
      : typeof aiBuildTransactionBrain === "function"
        ? aiBuildTransactionBrain(txn)
        : null;

  /*
   * Ensure the authoritative Brain is attached to the
   * transaction used by every UI renderer.
   */
  if (brain) {
    txn.transactionBrain = brain;
  }

  const situation = brain?.situationModel || {};
  const executionPlan = brain?.executionPlan || {};
  const decisions = brain?.decisions || {};
  const narrative = brain?.narrative || {};
  const predictions = brain?.predictions || {};

  const ai = {
    version: AI_COORDINATOR_VERSION,

    transactionId: txn.id || null,

    property: txn.address || txn.propertyAddress || "",

    side: txn.side || txn.type || "",

    transactionState: brain?.transactionState || "Unknown",

    status: brain?.transactionState || "Unknown",

    transactionHealth: Number.isFinite(brain?.health) ? brain.health : null,

    closingProbability: Number.isFinite(brain?.confidence)
      ? brain.confidence
      : null,

    riskLevel: situation.riskLevel || brain?.riskLevel || "Unknown",

    alerts: [],

    priorities: [],

    recommendations: [],

    tasks: [],

    missingDocuments: [],

    missingFields: [],

    uploadedDocuments: Array.isArray(txn.documents) ? txn.documents : [],

    timeline: brain?.timeline?.events || brain?.timeline || [],

    intelligence: brain,

    situation,

    executionPlan,

    decisions,

    narrative,

    predictions,

    explanations: Array.isArray(brain?.explanations)
      ? [...brain.explanations]
      : [],

    dependencies: Array.isArray(brain?.dependencies)
      ? [...brain.dependencies]
      : [],

    evidenceChains: Array.isArray(brain?.evidenceChains)
      ? [...brain.evidenceChains]
      : [],

    scoreBreakdown: {
      deadlines: brain?.scores?.deadlines ?? 0,
      documents: brain?.scores?.documents ?? 0,
      checklist: brain?.scores?.checklist ?? 0,
      fields: brain?.scores?.fields ?? 0,
      compliance: brain?.scores?.compliance ?? 0,
    },

    lastAnalysis: new Date().toISOString(),
  };

  /*
  --------------------------------------------------------
  Populate Coordinator only from the Transaction Brain
  --------------------------------------------------------
  */

  if (typeof txnCoordinatorPopulateFromBrain === "function") {
    txnCoordinatorPopulateFromBrain(ai, brain, txn, data);
  }

  if (typeof txnCoordinatorSort === "function") {
    txnCoordinatorSort(ai);
  }

  /*
   * Save the exact Coordinator result on the transaction so
   * cards, counters, headers, KPIs, priorities, and the
   * workspace all consume the same answer.
   */
  txn.aiCoordinator = ai;

  return ai;
}

function txnCoordinatorPopulateFromBrain(ai, brain, txn = {}, data = {}) {
  if (!brain) return;

  ai.alerts = Array.isArray(brain.alerts) ? [...brain.alerts] : [];

  ai.priorities = Array.isArray(brain.priorities) ? [...brain.priorities] : [];

  ai.recommendations = Array.isArray(brain.recommendations)
    ? [...brain.recommendations]
    : [];

  ai.tasks = Array.isArray(brain.executionPlan?.tasks)
    ? [...brain.executionPlan.tasks]
    : Array.isArray(brain.tasks)
      ? [...brain.tasks]
      : [];

  ai.missingDocuments = Array.isArray(brain.missingDocuments)
    ? [...brain.missingDocuments]
    : [];

  ai.missingFields = Array.isArray(brain.missingFields)
    ? [...brain.missingFields]
    : [];

  ai.timeline = Array.isArray(brain.timeline?.events)
    ? [...brain.timeline.events]
    : Array.isArray(brain.timeline)
      ? [...brain.timeline]
      : [];

  if (brain.situationModel?.riskLevel) {
    ai.riskLevel = brain.situationModel.riskLevel;
  } else if (brain.riskLevel) {
    ai.riskLevel = brain.riskLevel;
  }

  if (brain.narrative) {
    ai.summary = brain.narrative.summary || "";
    ai.nextBestAction = brain.narrative.nextBestAction || "";

    ai.reasoning = Array.isArray(brain.narrative.reasoning)
      ? [...brain.narrative.reasoning]
      : [];
  }

  if (brain.predictions) {
    ai.predictions = { ...brain.predictions };
  }

  if (brain.decisions) {
    ai.decisions = { ...brain.decisions };
  }

  ai.evidenceChains = Array.isArray(brain.evidenceChains)
    ? [...brain.evidenceChains]
    : [];

  ai.dependencies = Array.isArray(brain.dependencies)
    ? [...brain.dependencies]
    : [];

  ai.explanations = Array.isArray(brain.explanations)
    ? [...brain.explanations]
    : [];
}

/* ==========================================================
   Deadline Analyzer
   ========================================================== */

function txnCoordinatorAnalyzeDeadlines(txn = {}, data = {}, ai = {}) {
  /*
  --------------------------------------------------------
  Compatibility wrapper

  Deadline analysis is now performed entirely by the
  Transaction Brain. The coordinator receives the
  resulting timeline, alerts, score breakdown, and
  execution plan through txnCoordinatorPopulateFromBrain().

  This function exists only to preserve compatibility
  with any remaining legacy call sites.
  --------------------------------------------------------
  */

  if (!Array.isArray(ai.timeline)) {
    ai.timeline = [];
  }

  if (!Array.isArray(ai.alerts)) {
    ai.alerts = [];
  }

  if (!ai.scoreBreakdown || typeof ai.scoreBreakdown !== "object") {
    ai.scoreBreakdown = {};
  }

  if (typeof ai.scoreBreakdown.deadlines !== "number") {
    ai.scoreBreakdown.deadlines = 100;
  }

  return ai.scoreBreakdown.deadlines;
}

/* ==========================================================
   Checklist Analyzer
   ========================================================== */

function txnCoordinatorAnalyzeChecklist(txn = {}, data = {}, ai = {}) {
  /*
  --------------------------------------------------------
  Compatibility wrapper

  Checklist analysis is now performed entirely by the
  Transaction Brain. The coordinator receives checklist
  health, alerts, and scoring through
  txnCoordinatorPopulateFromBrain().

  This function exists only to preserve compatibility
  with any remaining legacy call sites.
  --------------------------------------------------------
  */

  if (!ai.scoreBreakdown || typeof ai.scoreBreakdown !== "object") {
    ai.scoreBreakdown = {};
  }

  if (typeof ai.scoreBreakdown.checklist !== "number") {
    ai.scoreBreakdown.checklist = 100;
  }

  if (!Array.isArray(ai.alerts)) {
    ai.alerts = [];
  }

  return ai.scoreBreakdown.checklist;
}

/* ==========================================================
   Document Analyzer
   ========================================================== */

function txnCoordinatorAnalyzeDocuments(txn = {}, data = {}, ai = {}) {
  /*
  --------------------------------------------------------
  Compatibility wrapper

  Document analysis is now performed entirely by the
  Transaction Brain. Document Intelligence determines
  document types, the Evidence Engine reconciles them,
  and the Transaction Brain produces uploaded document
  lists, missing documents, alerts, and document scores.

  This function exists only to preserve compatibility
  with any remaining legacy call sites.
  --------------------------------------------------------
  */

  if (!Array.isArray(ai.uploadedDocuments)) {
    ai.uploadedDocuments = Array.isArray(txn.documents)
      ? [...txn.documents]
      : [];
  }

  if (!Array.isArray(ai.missingDocuments)) {
    ai.missingDocuments = [];
  }

  if (!Array.isArray(ai.alerts)) {
    ai.alerts = [];
  }

  if (!ai.scoreBreakdown || typeof ai.scoreBreakdown !== "object") {
    ai.scoreBreakdown = {};
  }

  if (typeof ai.scoreBreakdown.documents !== "number") {
    ai.scoreBreakdown.documents = 100;
  }

  return ai.scoreBreakdown.documents;
}

/* ==========================================================
   Transaction Field Analyzer
   ========================================================== */

function txnCoordinatorAnalyzeFields(txn = {}, ai = {}) {
  /*
  --------------------------------------------------------
  Compatibility wrapper

  Field completeness analysis is now performed by the
  Transaction Brain. Required fields, missing fields,
  field alerts, and field scoring are determined there
  and copied into the coordinator by
  txnCoordinatorPopulateFromBrain().

  This function exists only to preserve compatibility
  with any remaining legacy call sites.
  --------------------------------------------------------
  */

  if (!Array.isArray(ai.missingFields)) {
    ai.missingFields = [];
  }

  if (!Array.isArray(ai.alerts)) {
    ai.alerts = [];
  }

  if (!ai.scoreBreakdown || typeof ai.scoreBreakdown !== "object") {
    ai.scoreBreakdown = {};
  }

  if (typeof ai.scoreBreakdown.fields !== "number") {
    ai.scoreBreakdown.fields = 100;
  }

  return ai.scoreBreakdown.fields;
}

/* ==========================================================
   Priority Builder
   ========================================================== */

function txnCoordinatorBuildPriorities(ai = {}) {
  /*
  --------------------------------------------------------
  Compatibility wrapper

  Priorities are now generated by the Transaction Brain
  and copied into the coordinator by
  txnCoordinatorPopulateFromBrain().

  This function intentionally does nothing so older
  code paths can continue calling it safely.
  --------------------------------------------------------
  */

  if (!Array.isArray(ai.priorities)) {
    ai.priorities = [];
  }

  return ai.priorities;
}

/* ==========================================================
   Recommendation Builder
   ========================================================== */

function txnCoordinatorBuildRecommendations(txn = {}, ai = {}) {
  /*
  --------------------------------------------------------
  Compatibility wrapper

  Recommendations are now generated by the
  Transaction Brain and copied into the coordinator
  by txnCoordinatorPopulateFromBrain().

  This function intentionally preserves compatibility
  with any remaining legacy code paths.
  --------------------------------------------------------
  */

  if (!Array.isArray(ai.recommendations)) {
    ai.recommendations = [];
  }

  /*
  --------------------------------------------------------
  Remove accidental duplicates only.
  --------------------------------------------------------
  */

  ai.recommendations = [
    ...new Set(
      ai.recommendations.filter(
        (item) => item !== null && item !== undefined && item !== "",
      ),
    ),
  ];

  return ai.recommendations;
}

/* ==========================================================
   Task Builder
   ========================================================== */

function txnCoordinatorBuildTasks(txn = {}, ai = {}) {
  /*
  --------------------------------------------------------
  Compatibility wrapper

  Tasks are now generated by the Transaction Brain's
  Execution Plan and copied into the coordinator by
  txnCoordinatorPopulateFromBrain().

  This function remains only so legacy code paths
  continue to operate safely.
  --------------------------------------------------------
  */

  if (!Array.isArray(ai.tasks)) {
    ai.tasks = [];
  }

  /*
  --------------------------------------------------------
  Remove duplicate tasks.
  --------------------------------------------------------
  */

  const seen = new Set();

  ai.tasks = ai.tasks.filter((task) => {
    if (!task || !task.title) {
      return false;
    }

    const key = [task.title, task.priority || "", task.note || ""].join("|");

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });

  return ai.tasks;
}

/* ==========================================================
   Score Calculator
   ========================================================== */

function txnCoordinatorCalculateScores(ai = {}) {
  /*
  --------------------------------------------------------
  Compatibility wrapper

  Transaction scoring is performed entirely by the
  Transaction Brain.

  This function must never calculate, infer, or invent
  health, closing probability, risk, or score details.
  Missing Brain conclusions remain explicitly unknown.
  --------------------------------------------------------
  */

  const transactionHealth =
    typeof ai.transactionHealth === "number" &&
    Number.isFinite(ai.transactionHealth)
      ? ai.transactionHealth
      : null;

  const closingProbability =
    typeof ai.closingProbability === "number" &&
    Number.isFinite(ai.closingProbability)
      ? ai.closingProbability
      : null;

  const riskLevel =
    typeof ai.riskLevel === "string" && ai.riskLevel.trim()
      ? ai.riskLevel.trim()
      : "Unknown";

  const scoreBreakdown =
    ai.scoreBreakdown &&
    typeof ai.scoreBreakdown === "object" &&
    !Array.isArray(ai.scoreBreakdown)
      ? ai.scoreBreakdown
      : {};

  return {
    transactionHealth,
    closingProbability,
    riskLevel,
    scoreBreakdown,
  };
}

/* ==========================================================
   Coordinator Sorter
   ========================================================== */

function txnCoordinatorSort(ai = {}) {
  const severityRank = {
    high: 0,

    medium: 1,

    low: 2,

    good: 3,
  };

  /*
  --------------------------------------------------------
  Alerts
  --------------------------------------------------------
  */

  ai.alerts.sort((a, b) => {
    return (severityRank[a.severity] ?? 99) - (severityRank[b.severity] ?? 99);
  });

  /*
  --------------------------------------------------------
  Timeline
  --------------------------------------------------------
  */

  ai.timeline.sort((a, b) => {
    return (a.daysRemaining ?? 9999) - (b.daysRemaining ?? 9999);
  });

  /*
  --------------------------------------------------------
  Priorities
  --------------------------------------------------------
  */

  ai.priorities.sort((a, b) => {
    return (severityRank[a.severity] ?? 99) - (severityRank[b.severity] ?? 99);
  });
}

/* ==========================================================
   Days Until Utility
   ========================================================== */

function txnCoordinatorDaysUntil(value) {
  if (!value) return null;

  const date = new Date(value);

  if (isNaN(date.getTime())) return null;

  const today = new Date();

  today.setHours(0, 0, 0, 0);

  date.setHours(0, 0, 0, 0);

  return Math.ceil((date - today) / (1000 * 60 * 60 * 24));
}

/* ==========================================================
   Daily Briefing
   ========================================================== */

function txnBuildDailyBriefing(txn = {}, ai = {}) {
  const hour = new Date().getHours();

  const greeting = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";

  const priorities = Array.isArray(ai.priorities)
    ? ai.priorities.slice(0, 5)
    : [];

  let html = `

    <div style="
      font-size:24px;
      font-weight:800;
      color:#042C49;
      margin-bottom:14px;
    ">
      Good ${greeting}, Jeff.
    </div>

    <div style="
      font-size:17px;
      line-height:1.7;
      margin-bottom:24px;
    ">

      I've finished reviewing
      <b>${txnSafe(txn.address || "this transaction")}</b>.

      <br><br>

      Current Status:
      <b>${txnSafe(ai.transactionState)}</b>

      <br>

      Transaction Health:
      <b>${ai.transactionHealth}%</b>

      <br>

      Closing Confidence:
      <b>${ai.closingProbability}%</b>

    </div>

  `;

  if (priorities.length) {
    html += `

      <div style="
        font-size:18px;
        font-weight:800;
        color:#042C49;
        margin-bottom:16px;
      ">
        Today's Priorities
      </div>

    `;

    priorities.forEach((item) => {
      const color =
        item.severity === "high"
          ? "#DC2626"
          : item.severity === "medium"
            ? "#F59E0B"
            : "#00A143";

      html += `

        <div style="
          border-left:5px solid ${color};
          background:#F8FAFC;
          border-radius:12px;
          padding:16px 18px;
          margin-bottom:14px;
        ">

          <div style="
            font-weight:800;
            color:#042C49;
          ">
            ${txnSafe(item.title)}
          </div>

          <div style="
            margin-top:8px;
            color:#64748B;
            line-height:1.6;
          ">
            ${txnSafe(item.text)}
          </div>

        </div>

      `;
    });
  }

  if (Array.isArray(ai.recommendations) && ai.recommendations.length) {
    html += `

      <div style="
        margin-top:24px;
        padding:18px;
        background:#ECFDF5;
        border-left:5px solid #00A143;
        border-radius:12px;
      ">

        <div style="
          font-weight:800;
          color:#042C49;
          margin-bottom:10px;
        ">
          AI Recommendation
        </div>

        <div style="
          line-height:1.6;
        ">
          ${txnSafe(ai.recommendations[0])}
        </div>

      </div>

    `;
  }

  return html;
}

/* ==========================================================
   AI Action Steps
   ========================================================== */

function txnCoordinatorActionSteps(alert = {}) {
  const title = String(alert.title || "").toLowerCase();

  const text = String(alert.text || "").toLowerCase();

  /*
  --------------------------------------------------------
  Closed Transaction
  --------------------------------------------------------
  */

  if (title.includes("closed") || text.includes("transaction closed")) {
    return [
      "Confirm the final commission has been received.",

      "Verify the brokerage compliance file is complete.",

      "Confirm the final settlement statement is retained.",

      "Move the client into the Past Client workflow.",

      "Schedule long-term follow-up reminders.",
    ];
  }

  /*
  --------------------------------------------------------
  Cancelled Transaction
  --------------------------------------------------------
  */

  if (
    title.includes("cancel") ||
    title.includes("termination") ||
    text.includes("terminated")
  ) {
    return [
      "Confirm the termination is fully executed.",

      "Confirm earnest money disposition.",

      "Notify title or escrow.",

      "Notify the lender if applicable.",

      "Archive the transaction after completion.",
    ];
  }

  /*
  --------------------------------------------------------
  Documents
  --------------------------------------------------------
  */

  if (title.includes("document") || text.includes("document")) {
    return [
      "Review the uploaded documents.",

      "Upload any missing required documents.",

      "Confirm signatures and dates.",

      "Verify document completeness.",
    ];
  }

  /*
  --------------------------------------------------------
  Deadlines
  --------------------------------------------------------
  */

  if (title.includes("deadline") || title.includes("due")) {
    return [
      "Review the deadline immediately.",

      "Confirm responsibility with all parties.",

      "Complete any outstanding work.",

      "Update the transaction once completed.",
    ];
  }

  /*
  --------------------------------------------------------
  Checklist
  --------------------------------------------------------
  */

  if (title.includes("checklist")) {
    return [
      "Open the Checklist tab.",

      "Mark completed items.",

      "Complete outstanding checklist items.",

      "Review remaining contractual requirements.",
    ];
  }

  /*
  --------------------------------------------------------
  Default
  --------------------------------------------------------
  */

  return [
    "Review the issue.",

    "Determine the next action.",

    "Update the transaction.",

    "Confirm the issue has been resolved.",
  ];
}

/* ==========================================================
   Coordinator Helpers
   ========================================================== */

/*
------------------------------------------------------------
Returns the Transaction Brain state.
------------------------------------------------------------
*/

function txnCoordinatorState(txn = {}) {
  return txn.transactionBrain?.transactionState || "Unknown";
}

/*
------------------------------------------------------------
Returns Transaction Health.
------------------------------------------------------------
*/

function txnCoordinatorHealth(txn = {}) {
  const health = txn.transactionBrain?.health;

  return Number.isFinite(health) ? health : null;
}

/*
------------------------------------------------------------
Returns Closing Confidence.
------------------------------------------------------------
*/

function txnCoordinatorConfidence(txn = {}) {
  const confidence = txn.transactionBrain?.confidence;

  return Number.isFinite(confidence) ? confidence : null;
}

/*
------------------------------------------------------------
Returns current recommendations.
------------------------------------------------------------
*/

function txnCoordinatorRecommendations(txn = {}) {
  return Array.isArray(txn.transactionBrain?.recommendations)
    ? [...txn.transactionBrain.recommendations]
    : [];
}

/*
------------------------------------------------------------
Returns current missing documents.
------------------------------------------------------------
*/

function txnCoordinatorMissingDocuments(txn = {}) {
  return Array.isArray(txn.transactionBrain?.missingItems)
    ? [...txn.transactionBrain.missingItems]
    : [];
}

/*
------------------------------------------------------------
Coordinator Refresh
------------------------------------------------------------
*/

function txnCoordinatorRefresh(txn = {}, data = {}) {
  const ai = txnRunCoordinator(txn, data);

  txn.aiCoordinator = ai;

  return ai;
}

console.log("AI Transaction Coordinator Ready");
