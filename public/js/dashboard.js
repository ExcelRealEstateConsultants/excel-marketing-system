/* =====================================================
   RapportLink Dashboard JavaScript
   Version 1
   ===================================================== */

/* DASHBOARD */

function aiSafe(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (ch) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[ch],
  );
}

function aiContactName(contact = {}) {
  const name = `${contact.firstName || ""} ${contact.lastName || ""}`.trim();
  return name || contact.email || contact.phone || "Unnamed Contact";
}

function aiContactStage(contact = {}) {
  return contact.stage || contact.pipelineStage || "New Lead";
}

function aiDaysSince(value) {
  if (!value) return 999;
  const d = new Date(value);
  if (isNaN(d.getTime())) return 999;
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / 86400000));
}

function aiMoney(value) {
  const num = Number(value || 0);
  return num.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function aiExtractDealValue(contact = {}) {
  const keys = [
    "expectedCommission",
    "commission",
    "gci",
    "potentialCommission",
    "estimatedCommission",
    "dealValue",
    "pipelineValue",
    "propertyValue",
    "price",
    "purchasePrice",
    "listPrice",
  ];
  for (const key of keys) {
    const raw = contact[key];
    const parsed = Number(String(raw ?? "").replace(/[^0-9.]/g, ""));
    if (parsed > 0) {
      if (
        [
          "price",
          "purchasePrice",
          "listPrice",
          "propertyValue",
          "dealValue",
          "pipelineValue",
        ].includes(key)
      )
        return parsed * 0.025;
      return parsed;
    }
  }

  const stage = aiContactStage(contact);
  if (["Under Contract", "Pending"].includes(stage)) return 9000;
  if (stage === "Active Prospect") return 6000;
  if (stage === "Appointment Set") return 3500;
  if (stage === "Contacted") return 2000;
  return 1000;
}

function aiAddScoreDriver(drivers, label, value, type) {
  if (!Array.isArray(drivers)) return;
  const num = Number(value || 0);
  if (!label || num === 0) return;
  drivers.push({
    label,
    value: num,
    type: type || (num > 0 ? "positive" : "negative"),
  });
}

function aiScoreHeatLabel(score) {
  const num = Number(score || 0);
  if (num >= 75) return "Hot";
  if (num >= 45) return "Warm";
  if (num >= 15) return "Cold";
  return "Inactive";
}

function aiIsNetworkContact(contact = {}) {
  const type = String(contact.type || "").toLowerCase();
  const tags = Array.isArray(contact.tags)
    ? contact.tags.join(" ").toLowerCase()
    : String(contact.tags || "").toLowerCase();
  const text = `${type} ${tags}`;
  return [
    "agent",
    "broker",
    "vendor",
    "lender",
    "title",
    "escrow",
    "inspector",
    "appraiser",
    "photographer",
    "contractor",
    "staff",
    "team",
  ].some((word) => text.includes(word));
}

function aiHeatIcon(heat) {
  const label = String(heat || "").toLowerCase();
  if (label === "hot") return "🔥";
  if (label === "warm") return "🟡";
  if (label === "cold") return "⚪";
  if (label === "network") return "🤝";
  return "❄️";
}

function aiHeatClass(heat) {
  const label = String(heat || "").toLowerCase();
  return ["hot", "warm", "cold", "inactive", "network"].includes(label)
    ? label
    : "cold";
}

function aiHeatBadgeText(insight = {}) {
  const heat = insight.heat || "Cold";
  const score = Number(insight.leadScore ?? 0);
  if (heat === "Network") return `${aiHeatIcon(heat)} Network ${score}`;
  return `${aiHeatIcon(heat)} ${heat} Lead ${score}`;
}

function aiContactSearchText(contact = {}) {
  const parts = [];
  Object.keys(contact || {}).forEach((key) => {
    const value = contact[key];
    if (typeof value === "string" || typeof value === "number")
      parts.push(String(value));
  });
  if (Array.isArray(contact.notes))
    parts.push(
      contact.notes
        .map((n) => (typeof n === "string" ? n : n.text || n.note || ""))
        .join(" "),
    );
  if (Array.isArray(contact.tasks))
    parts.push(
      contact.tasks.map((t) => `${t.title || ""} ${t.notes || ""}`).join(" "),
    );
  if (Array.isArray(contact.tags)) parts.push(contact.tags.join(" "));
  return parts.join(" ").toLowerCase();
}

function aiAnalyzeContactIntent(
  contact = {},
  emailActivity = {},
  phoneActivity = {},
  stage = "",
) {
  const text = aiContactSearchText(contact);
  const drivers = [];
  let heatDelta = 0;
  let opportunityDelta = 0;
  let sentiment = "Neutral";
  let intentLabel = "Needs Review";

  const positivePatterns = [
    ["favorable response", 24, 22],
    ["responded favorably", 24, 22],
    ["interested", 20, 20],
    ["wants to meet", 28, 30],
    ["schedule appointment", 30, 32],
    ["appointment scheduled", 30, 34],
    ["listing appointment", 30, 36],
    ["buyer consultation", 26, 30],
    ["cma", 24, 32],
    ["market analysis", 22, 30],
    ["pre approved", 26, 36],
    ["pre-approved", 26, 36],
    ["ready to buy", 34, 42],
    ["ready to sell", 34, 42],
    ["make offer", 36, 45],
    ["showing", 26, 32],
    ["hot lead", 24, 24],
  ];

  const neutralPatterns = [
    ["not ready yet", -6, -14],
    ["follow up next month", -4, -8],
    ["follow up later", -6, -10],
    ["next quarter", -10, -18],
    ["six months", -12, -22],
    ["6 months", -12, -22],
    ["next year", -18, -30],
    ["future", -5, -10],
    ["nurture", -4, -8],
  ];

  const negativePatterns = [
    ["not interested", -42, -48],
    ["do not contact", -55, -55],
    ["stop contacting", -55, -55],
    ["wrong number", -35, -35],
    ["bad phone", -30, -30],
    ["bad email", -25, -25],
    ["dead lead", -45, -50],
    ["lost deal", -40, -48],
    ["went with another agent", -45, -50],
    ["unsubscribe", -50, -45],
    ["unsubscribed", -50, -45],
  ];

  positivePatterns.forEach(([phrase, heat, opp]) => {
    if (
      phrase === "interested" &&
      (text.includes("not interested") || text.includes("uninterested"))
    )
      return;
    if (text.includes(phrase)) {
      heatDelta += heat;
      opportunityDelta += opp;
      sentiment = "Positive";
      intentLabel = phrase.includes("ready")
        ? "Ready Soon"
        : phrase.includes("appointment") || phrase.includes("meet")
          ? "Appointment Opportunity"
          : "Engaged";
      aiAddScoreDriver(
        drivers,
        phrase.replace(/\b\w/g, (c) => c.toUpperCase()),
        heat,
        "positive",
      );
    }
  });

  neutralPatterns.forEach(([phrase, heat, opp]) => {
    if (text.includes(phrase)) {
      heatDelta += heat;
      opportunityDelta += opp;
      if (sentiment !== "Positive") sentiment = "Neutral";
      if (intentLabel === "Needs Review") intentLabel = "Longer-Term Nurture";
      aiAddScoreDriver(
        drivers,
        phrase.replace(/\b\w/g, (c) => c.toUpperCase()),
        heat,
        "neutral",
      );
    }
  });

  negativePatterns.forEach(([phrase, heat, opp]) => {
    if (text.includes(phrase)) {
      heatDelta += heat;
      opportunityDelta += opp;
      sentiment = "Negative";
      intentLabel = "Cool Down";
      aiAddScoreDriver(
        drivers,
        phrase.replace(/\b\w/g, (c) => c.toUpperCase()),
        heat,
        "negative",
      );
    }
  });

  const clicks = Number(emailActivity.clicks || 0);
  const opens = Number(emailActivity.opens || 0);
  const texts = Number(phoneActivity.texts || 0);

  if (clicks >= 3) {
    heatDelta += 18;
    opportunityDelta += 12;
    aiAddScoreDriver(drivers, "Clicked multiple links", 18, "positive");
  } else if (clicks > 0) {
    heatDelta += 8;
    opportunityDelta += 5;
    aiAddScoreDriver(drivers, "Clicked email link", 8, "positive");
  }

  if (opens >= 5) {
    heatDelta += 12;
    opportunityDelta += 6;
    aiAddScoreDriver(drivers, "Opened multiple emails", 12, "positive");
  } else if (opens > 0) {
    heatDelta += 4;
    aiAddScoreDriver(drivers, "Opened email", 4, "positive");
  }

  if (texts > 0) {
    heatDelta += Math.min(18, texts * 6);
    opportunityDelta += Math.min(12, texts * 4);
    aiAddScoreDriver(
      drivers,
      "Text activity",
      Math.min(18, texts * 6),
      "positive",
    );
  }

  if (contact.unsubscribed) {
    heatDelta -= 55;
    opportunityDelta -= 45;
    sentiment = "Negative";
    intentLabel = "Do Not Email";
    aiAddScoreDriver(drivers, "Unsubscribed", -55, "negative");
  }
  if (contact.bounced) {
    heatDelta -= 30;
    opportunityDelta -= 25;
    aiAddScoreDriver(drivers, "Email bounced", -30, "negative");
  }

  if (["Under Contract", "Pending"].includes(stage)) {
    opportunityDelta += 35;
    aiAddScoreDriver(drivers, `${stage} stage`, 35, "positive");
  }
  if (stage === "Closed") {
    opportunityDelta -= 10;
    if (intentLabel === "Needs Review") intentLabel = "Past Client Follow-Up";
  }
  if (stage === "Past Client") {
    opportunityDelta -= 5;
    if (intentLabel === "Needs Review") intentLabel = "Past Client Nurture";
  }

  return { heatDelta, opportunityDelta, sentiment, intentLabel, drivers };
}

function aiScoreRecommendedAction({
  stage = "",
  staleDays = 999,
  overdueTasks = 0,
  dueTodayTasks = 0,
  emailActivity = {},
  phoneActivity = {},
  intent = {},
  heat = "Cold",
  leadScore = 0,
  opportunityScore = 0,
} = {}) {
  const sentiment = intent.sentiment || "Neutral";
  const label = intent.intentLabel || "";

  if (heat === "Network" || sentiment === "Network")
    return {
      nextAction: "Network relationship",
      nextActionReason:
        "This appears to be a business/network contact, not an active buyer or seller lead.",
    };
  if (sentiment === "Negative" || label === "Cool Down")
    return {
      nextAction: "Cool down / do not pursue",
      nextActionReason:
        "The contact appears uninterested or should not be actively contacted.",
    };
  if (label === "Do Not Email")
    return {
      nextAction: "Do not email",
      nextActionReason:
        "The contact is unsubscribed or should not receive email campaigns.",
    };
  if (overdueTasks > 0)
    return {
      nextAction: "Complete overdue follow-up",
      nextActionReason: `${overdueTasks} overdue task${overdueTasks === 1 ? "" : "s"} need attention.`,
    };
  if (dueTodayTasks > 0)
    return {
      nextAction: "Follow up today",
      nextActionReason: `${dueTodayTasks} task${dueTodayTasks === 1 ? " is" : "s are"} due today.`,
    };
  if (["Under Contract", "Pending"].includes(stage))
    return {
      nextAction: "Check transaction status",
      nextActionReason: "This contact is in an active transaction stage.",
    };
  if (opportunityScore >= 80)
    return {
      nextAction: "Call today",
      nextActionReason:
        "High opportunity score and strong transaction potential.",
    };
  if (leadScore >= 80)
    return {
      nextAction: "Call or text today",
      nextActionReason: "High engagement indicates the contact is hot.",
    };
  if (staleDays >= 90)
    return {
      nextAction: "Add to re-engagement campaign",
      nextActionReason: "No recent activity for 90+ days.",
    };
  if (staleDays >= 30)
    return {
      nextAction: "Send value follow-up",
      nextActionReason: "The contact is cooling and needs a soft touch.",
    };
  if (Number(emailActivity.clicks || 0) > 0)
    return {
      nextAction: "Follow up on clicked link",
      nextActionReason: "The contact clicked something and may be interested.",
    };
  if (heat === "Warm")
    return {
      nextAction: "Follow up this week",
      nextActionReason: "The contact is warm but not urgent.",
    };
  return {
    nextAction: "Stay in nurture campaign",
    nextActionReason: "No urgent action yet.",
  };
}

function buildAIContactInsights(
  contactList = [],
  activityList = [],
  smsActivityList = [],
) {
  const contacts = Array.isArray(contactList) ? contactList : [];
  const activityByEmail = new Map();
  const activityByPhone = new Map();

  (Array.isArray(activityList) ? activityList : []).forEach((item) => {
    const key = String(item.email || item.contactEmail || "")
      .trim()
      .toLowerCase();
    if (!key) return;
    const current = activityByEmail.get(key) || {
      opens: 0,
      clicks: 0,
      last: "",
      sent: 0,
    };
    const type = String(
      item.type || item.event || item.status || "",
    ).toLowerCase();
    if (type.includes("click") || item.url) current.clicks += 1;
    if (type.includes("open") || item.opened) current.opens += 1;
    if (type.includes("sent") || item.sent) current.sent += 1;
    const date =
      item.date ||
      item.createdAt ||
      item.openedAt ||
      item.clickedAt ||
      item.sentAt ||
      "";
    if (date && (!current.last || new Date(date) > new Date(current.last)))
      current.last = date;
    activityByEmail.set(key, current);
  });

  (Array.isArray(smsActivityList) ? smsActivityList : []).forEach((item) => {
    const phone = String(
      item.phone || item.to || item.from || item.contactPhone || "",
    )
      .replace(/\D/g, "")
      .slice(-10);
    if (!phone) return;
    const current = activityByPhone.get(phone) || { texts: 0, last: "" };
    current.texts += 1;
    const date =
      item.date || item.createdAt || item.sentAt || item.receivedAt || "";
    if (date && (!current.last || new Date(date) > new Date(current.last)))
      current.last = date;
    activityByPhone.set(phone, current);
  });

  return contacts
    .map((contact) => {
      const emailKey = String(contact.email || "")
        .trim()
        .toLowerCase();
      const phoneKey = String(contact.phone || "")
        .replace(/\D/g, "")
        .slice(-10);
      const emailActivity = activityByEmail.get(emailKey) || {
        opens: 0,
        clicks: 0,
        last: "",
        sent: 0,
      };
      const phoneActivity = activityByPhone.get(phoneKey) || {
        texts: 0,
        last: "",
      };
      const tasks = Array.isArray(contact.tasks) ? contact.tasks : [];
      const today = new Date().toISOString().slice(0, 10);
      const openTasks = tasks.filter((task) => !task.done).length;
      const overdueTasks = tasks.filter(
        (task) =>
          !task.done && task.due && String(task.due).slice(0, 10) < today,
      ).length;
      const dueTodayTasks = tasks.filter(
        (task) =>
          !task.done && task.due && String(task.due).slice(0, 10) === today,
      ).length;
      const stage = aiContactStage(contact);
      const typeText = String(contact.type || "").toLowerCase();
      const isNetwork = aiIsNetworkContact(contact);

      const baseLeadScore = isNetwork
        ? 0
        : typeText.includes("referral")
          ? 60
          : typeText.includes("seller")
            ? 54
            : typeText.includes("buyer")
              ? 48
              : typeText.includes("investor")
                ? 52
                : typeText.includes("past")
                  ? 42
                  : typeText.includes("sphere")
                    ? 40
                    : 38;

      const baseOpportunityScore = isNetwork
        ? 0
        : typeText.includes("referral")
          ? 55
          : typeText.includes("seller")
            ? 45
            : typeText.includes("buyer")
              ? 42
              : typeText.includes("investor")
                ? 48
                : typeText.includes("past")
                  ? 35
                  : typeText.includes("sphere")
                    ? 32
                    : 30;

      const stageBoostMap = {
        "New Lead": 0,
        Contacted: 8,
        "Appointment Set": 22,
        "Active Prospect": 28,
        "Under Contract": 38,
        Pending: 42,
        Closed: -5,
        "Past Client": -3,
      };
      const opportunityStageMap = {
        "New Lead": 0,
        Contacted: 8,
        "Appointment Set": 25,
        "Active Prospect": 30,
        "Under Contract": 45,
        Pending: 50,
        Closed: -8,
        "Past Client": -5,
      };
      const stageBoost = stageBoostMap[stage] ?? 0;
      const opportunityStageBoost = opportunityStageMap[stage] ?? 0;
      const lastTouch =
        emailActivity.last ||
        phoneActivity.last ||
        contact.lastContactedAt ||
        contact.stageUpdatedAt ||
        contact.updatedAt ||
        contact.createdAt ||
        "";
      const staleDays = aiDaysSince(lastTouch);
      const recencyBoost =
        isNetwork || staleDays === 9999
          ? 0
          : staleDays <= 2
            ? 16
            : staleDays <= 7
              ? 10
              : staleDays <= 14
                ? 5
                : staleDays <= 30
                  ? 0
                  : staleDays <= 60
                    ? -7
                    : staleDays <= 90
                      ? -14
                      : -25;
      const engagementScore = isNetwork
        ? 0
        : Math.min(
            35,
            emailActivity.clicks * 8 +
              emailActivity.opens * 3 +
              phoneActivity.texts * 6,
          );
      const taskScore = isNetwork
        ? 0
        : Math.min(18, overdueTasks * 6 + dueTodayTasks * 8 + openTasks * 2);
      const intent = isNetwork
        ? {
            heatDelta: 0,
            opportunityDelta: 0,
            sentiment: "Network",
            intentLabel: "Business Contact",
            drivers: [],
          }
        : aiAnalyzeContactIntent(contact, emailActivity, phoneActivity, stage);
      const scoreDrivers = [...intent.drivers];
      if (!isNetwork)
        aiAddScoreDriver(
          scoreDrivers,
          "Starting score by contact type",
          baseLeadScore,
          "positive",
        );
      if (isNetwork)
        aiAddScoreDriver(
          scoreDrivers,
          "Business/network contact",
          0,
          "neutral",
        );
      if (stageBoost > 0)
        aiAddScoreDriver(
          scoreDrivers,
          `${stage} stage`,
          stageBoost,
          "positive",
        );
      if (stageBoost < 0)
        aiAddScoreDriver(scoreDrivers, `${stage} stage`, stageBoost, "neutral");
      if (recencyBoost > 0)
        aiAddScoreDriver(
          scoreDrivers,
          staleDays <= 2 ? "Very recent activity" : "Recent activity",
          recencyBoost,
          "positive",
        );
      if (recencyBoost < 0)
        aiAddScoreDriver(
          scoreDrivers,
          `No activity for ${staleDays} days`,
          recencyBoost,
          "negative",
        );
      if (overdueTasks > 0)
        aiAddScoreDriver(
          scoreDrivers,
          `${overdueTasks} overdue task${overdueTasks === 1 ? "" : "s"}`,
          overdueTasks * 6,
          "positive",
        );
      if (dueTodayTasks > 0)
        aiAddScoreDriver(
          scoreDrivers,
          `${dueTodayTasks} task${dueTodayTasks === 1 ? "" : "s"} due today`,
          dueTodayTasks * 8,
          "positive",
        );

      const rawLeadScore = isNetwork
        ? 0
        : baseLeadScore +
          engagementScore +
          taskScore +
          stageBoost +
          recencyBoost +
          intent.heatDelta;
      const leadScore = Math.max(0, Math.min(100, Math.round(rawLeadScore)));
      const opportunityScore = isNetwork
        ? 0
        : Math.max(
            0,
            Math.min(
              100,
              Math.round(
                baseOpportunityScore +
                  opportunityStageBoost +
                  leadScore * 0.25 +
                  emailActivity.clicks * 4 +
                  dueTodayTasks * 3 +
                  intent.opportunityDelta -
                  (staleDays > 45 && staleDays !== 9999 ? 6 : 0),
              ),
            ),
          );
      const heat = isNetwork ? "Network" : aiScoreHeatLabel(leadScore);
      const estimatedGCI =
        aiExtractDealValue(contact) * (opportunityScore / 100);
      const actionResult = aiScoreRecommendedAction({
        stage,
        staleDays,
        overdueTasks,
        dueTodayTasks,
        emailActivity,
        phoneActivity,
        intent,
        heat,
        leadScore,
        opportunityScore,
      });
      const nextAction = actionResult.nextAction;
      const nextActionReason = actionResult.nextActionReason;

      return {
        contact,
        opens: emailActivity.opens,
        clicks: emailActivity.clicks,
        texts: phoneActivity.texts,
        lastTouch,
        staleDays,
        openTasks,
        overdueTasks,
        dueTodayTasks,
        stage,
        leadScore,
        opportunityScore,
        heat,
        estimatedGCI,
        sentiment: intent.sentiment,
        intentLabel: intent.intentLabel,
        scoreDrivers,
        nextAction,
        nextActionReason,
      };
    })
    .sort(
      (a, b) =>
        b.opportunityScore - a.opportunityScore || b.leadScore - a.leadScore,
    );
}

function renderAIDashboard(
  data = {},
  contacts = [],
  campaigns = [],
  activity = [],
  smsActivity = [],
  taskStats = {},
) {
  const safe = aiSafe;
  const contactName = aiContactName;
  const contactStage = aiContactStage;
  const opened = Number(data.totalOpened || 0);
  const clicks = Number(data.totalClicks || 0);
  const openRate = Number(data.openRate || 0);
  const clickRate = Number(data.clickRate || 0);
  const dueToday = Number(taskStats.dueToday || 0);
  const overdue = Number(taskStats.overdue || 0);
  const engaged = opened + clicks;
  const campaignCount = Array.isArray(campaigns) ? campaigns.length : 0;
  const contactsList =
    Array.isArray(contacts) && contacts.length ? contacts : contactsCache;
  const activityList = Array.isArray(activity) ? activity : [];
  const smsList = Array.isArray(smsActivity) ? smsActivity : [];
  const enrichedContacts = buildAIContactInsights(
    contactsList,
    activityList,
    smsList,
  );

  const hotLeads = enrichedContacts
    .filter((item) => item.heat === "Hot")
    .slice(0, 6);
  const warmLeads = enrichedContacts
    .filter((item) => item.heat === "Warm")
    .slice(0, 6);
  const coldLeads = enrichedContacts.filter(
    (item) => item.heat === "Cold" || item.heat === "Inactive",
  );
  const quietContacts = enrichedContacts
    .filter(
      (item) =>
        item.staleDays >= 14 &&
        !item.contact.unsubscribed &&
        !item.contact.bounced,
    )
    .sort((a, b) => b.staleDays - a.staleDays)
    .slice(0, 5);

  const topLead = hotLeads[0] || warmLeads[0] || enrichedContacts[0];
  const bestOpportunity = enrichedContacts[0];
  const activePipelineItems = enrichedContacts.filter((row) =>
    [
      "Appointment Set",
      "Active Prospect",
      "Under Contract",
      "Pending",
    ].includes(row.stage),
  );
  const activePipeline = activePipelineItems.length;
  const pendingPipeline = enrichedContacts.filter((row) =>
    ["Under Contract", "Pending"].includes(row.stage),
  ).length;
  const newLeads = contactsList.filter(
    (c) => contactStage(c) === "New Lead",
  ).length;
  const forecastGCI = activePipelineItems.reduce(
    (sum, row) => sum + Number(row.estimatedGCI || 0),
    0,
  );

  const summaryParts = [];
  summaryParts.push(
    `I scored <b>${contactsList.length}</b> contacts using engagement, tasks, pipeline stage, and recency.`,
  );
  if (hotLeads.length)
    summaryParts.push(
      `<b>${hotLeads.length}</b> hot lead${hotLeads.length === 1 ? "" : "s"} should be handled first.`,
    );
  if (bestOpportunity)
    summaryParts.push(
      `Best opportunity: <b>${safe(contactName(bestOpportunity.contact))}</b> with opportunity score <b>${bestOpportunity.opportunityScore}</b>.`,
    );
  if (overdue > 0)
    summaryParts.push(
      `<b>${overdue}</b> follow-up${overdue === 1 ? "" : "s"} are overdue.`,
    );
  if (dueToday > 0)
    summaryParts.push(
      `<b>${dueToday}</b> follow-up${dueToday === 1 ? "" : "s"} are due today.`,
    );
  if (activePipeline > 0)
    summaryParts.push(
      `Estimated weighted pipeline GCI is <b>${aiMoney(forecastGCI)}</b>.`,
    );
  if (!hotLeads.length && !overdue && !dueToday)
    summaryParts.push(
      `Your immediate queue is clean, so today is a good day to create new opportunities.`,
    );
  aiExecutiveSummary.innerHTML = summaryParts.join(" ");

  const briefing = [];
  if (bestOpportunity)
    briefing.push({
      icon: "1",
      text: `Start with <b>${safe(contactName(bestOpportunity.contact))}</b>. Lead score ${bestOpportunity.leadScore}, opportunity score ${bestOpportunity.opportunityScore}. ${safe(bestOpportunity.nextAction)}: ${safe(bestOpportunity.nextActionReason)}`,
    });
  if (overdue > 0)
    briefing.push({
      icon: "2",
      text: `Clear overdue tasks before sending new campaigns. This protects active opportunities and past-client relationships.`,
    });
  if (hotLeads.length)
    briefing.push({
      icon: "3",
      text: `Your hot list has <b>${hotLeads.length}</b> contact${hotLeads.length === 1 ? "" : "s"}. Personal outreach beats another blast email here.`,
    });
  if (quietContacts.length)
    briefing.push({
      icon: "4",
      text: `Re-engage <b>${quietContacts.length}</b> cooling contact${quietContacts.length === 1 ? "" : "s"} before they go cold.`,
    });
  if (!briefing.length)
    briefing.push({
      icon: "AI",
      text: `No urgent risks detected. Best next move: create a short market update campaign and send it to a warm segment.`,
    });
  aiGeneratedBriefing.innerHTML = briefing
    .slice(0, 4)
    .map(
      (row) => `
    <div class="ai-briefing-line"><span>${row.icon}</span><div>${row.text}</div></div>
  `,
    )
    .join("");

  const priorities = [];
  if (bestOpportunity)
    priorities.push({
      icon: "★",
      title: `Best Opportunity: ${contactName(bestOpportunity.contact)}`,
      text: `${bestOpportunity.nextAction}. ${bestOpportunity.nextActionReason}`,
      action: "Open Contact",
      contactId: bestOpportunity.contact.id,
    });
  if (overdue > 0)
    priorities.push({
      icon: "!",
      title: "Overdue follow-ups need attention",
      text: `Handle ${overdue} overdue task${overdue === 1 ? "" : "s"} before new outreach.`,
      action: "View Tasks",
      tab: "tasks",
    });
  if (hotLeads.length)
    priorities.push({
      icon: "🔥",
      title: "Call or text hot leads",
      text: `${hotLeads.length} contact${hotLeads.length === 1 ? "" : "s"} show strong buying/selling signals.`,
      action: "Open Contacts",
      tab: "contacts",
    });
  if (dueToday > 0)
    priorities.push({
      icon: "✓",
      title: "Finish today’s follow-ups",
      text: `${dueToday} follow-up${dueToday === 1 ? "" : "s"} are due today.`,
      action: "Tasks",
      tab: "tasks",
    });
  if (quietContacts.length)
    priorities.push({
      icon: "↺",
      title: "Wake up quiet contacts",
      text: `${quietContacts.length} contact${quietContacts.length === 1 ? "" : "s"} may be slipping cold.`,
      action: "Contacts",
      tab: "contacts",
    });
  if (campaignCount === 0)
    priorities.push({
      icon: "+",
      title: "Create first campaign",
      text: "Start with a seller, buyer, or past-client nurture campaign.",
      action: "Campaigns",
      tab: "campaigns",
    });
  if (priorities.length === 0)
    priorities.push({
      icon: "AI",
      title: "Build new demand today",
      text: "Create a market update or listing-focused campaign to generate engagement.",
      action: "Campaigns",
      tab: "campaigns",
    });

  aiTodayPriorities.innerHTML = priorities
    .slice(0, 5)
    .map(
      (item) => `
    <div class="ai-priority-item">
      <span class="ai-priority-icon">${item.icon}</span>
      <div class="flex-grow-1"><b>${safe(item.title)}</b><br><small>${safe(item.text)}</small></div>
      ${item.contactId ? `<button class="btn btn-sm btn-outline-primary" onclick="openContact(${item.contactId})">${safe(item.action)}</button>` : `<button class="btn btn-sm btn-outline-primary" onclick="showTab('${item.tab}')">${safe(item.action)}</button>`}
    </div>
  `,
    )
    .join("");

  aiHotLeadCount.innerText = hotLeads.length;
  aiHotLeads.innerHTML = hotLeads.length
    ? hotLeads
        .map(
          (lead) => `
    <div class="ai-lead-item">
      <div>
        <b>${safe(contactName(lead.contact))}</b><br>
        <small>${safe(lead.contact.email || lead.contact.phone || "")}</small><br>
        <span class="ai-muted-line">${lead.opens} open${lead.opens === 1 ? "" : "s"} · ${lead.clicks} click${lead.clicks === 1 ? "" : "s"} · ${safe(lead.stage)}${lead.lastTouch ? ` · ${formatShortDate(lead.lastTouch)}` : ""}</span><br>
        <span class="ai-muted-line"><b>Next:</b> ${safe(lead.nextAction)}</span>
      </div>
      <span class="ai-soft-badge ai-lead-score ai-heat-hot">${lead.leadScore}</span>
    </div>
  `,
        )
        .join("")
    : '<div class="text-muted">No hot leads yet. Hot leads will appear when contacts open, click, text, or have active follow-up signals.</div>';

  aiBestOpportunity.innerHTML = bestOpportunity
    ? `
    <div class="ai-best-opportunity">
      <h5 class="mb-1">${safe(contactName(bestOpportunity.contact))}</h5>
      <div class="small-muted">${safe(bestOpportunity.contact.email || bestOpportunity.contact.phone || "")} · ${safe(bestOpportunity.stage)} · ${safe(bestOpportunity.contact.type || "Unassigned")}</div>
      <div class="ai-best-score-row">
        <div class="ai-big-score"><b>${bestOpportunity.opportunityScore}</b><span>Opportunity</span></div>
        <div class="ai-big-score"><b>${bestOpportunity.leadScore}</b><span>Lead Score</span></div>
        <div class="ai-big-score"><b>${aiMoney(bestOpportunity.estimatedGCI)}</b><span>Weighted GCI</span></div>
      </div>
      <div class="ai-confidence-note mt-3"><b>Recommended action:</b> ${safe(bestOpportunity.nextAction)} — ${safe(bestOpportunity.nextActionReason)}</div>
      <button class="btn btn-sm btn-success mt-3" onclick="openContact(${bestOpportunity.contact.id})">Open Contact</button>
    </div>
  `
    : '<div class="text-muted">Add contacts and activity to generate a best opportunity.</div>';

  aiHeatHotCount.innerText = hotLeads.length;
  aiHeatWarmCount.innerText = warmLeads.length;
  aiHeatColdCount.innerText = coldLeads.length;

  aiForecastActive.innerText = activePipeline;
  aiForecastPending.innerText = pendingPipeline;
  aiForecastGCI.innerText = aiMoney(forecastGCI);
  aiForecastHot.innerText = hotLeads.length;
  aiForecastNote.innerHTML = `
    <div class="ai-confidence-note">
      AI read: ${activePipeline} active pipeline contact${activePipeline === 1 ? "" : "s"}, ${pendingPipeline} pending/contract contact${pendingPipeline === 1 ? "" : "s"}, ${newLeads} new lead${newLeads === 1 ? "" : "s"}, and ${hotLeads.length} hot lead${hotLeads.length === 1 ? "" : "s"}. Forecasted GCI is a weighted estimate until transaction values are added.
    </div>
  `;

  const actions = [];
  if (bestOpportunity)
    actions.push({
      title: `${bestOpportunity.nextAction}: ${contactName(bestOpportunity.contact)}`,
      text: `${bestOpportunity.nextActionReason} Opportunity score ${bestOpportunity.opportunityScore}.`,
      contactId: bestOpportunity.contact.id,
    });
  if (overdue > 0)
    actions.push({
      title: "Clear overdue tasks",
      text: "Protect deals and relationships by closing the loop today.",
      tab: "tasks",
    });
  if (hotLeads.length || warmLeads.length)
    actions.push({
      title: "Send engaged-lead follow-up",
      text: "Use the message below for contacts who opened or clicked recently.",
      tab: "campaigns",
    });
  actions.push({
    title: "Create a market update",
    text: "Generate fresh activity by sending a useful local market note.",
    tab: "campaigns",
  });
  actions.push({
    title: "Review pipeline momentum",
    text: "Move stale opportunities forward or clean up the board.",
    tab: "pipeline",
  });
  aiRecommendedActions.innerHTML = actions
    .slice(0, 5)
    .map(
      (action) => `
    <div class="ai-action-item">
      <div><b>${safe(action.title)}</b><br><small>${safe(action.text)}</small></div>
      ${action.contactId ? `<button class="btn btn-sm btn-outline-primary" onclick="openContact(${action.contactId})">Open</button>` : `<button class="btn btn-sm btn-outline-primary" onclick="showTab('${action.tab}')">Open</button>`}
    </div>
  `,
    )
    .join("");

  const followupName = bestOpportunity
    ? contactName(bestOpportunity.contact).split(" ")[0]
    : "there";
  const script1 = bestOpportunity
    ? `Hi ${followupName}, I was thinking about your real estate plans and wanted to check in. Are you still keeping an eye on the market, or is there anything specific you want me to look into for you this week?`
    : `Hi there, I just wanted to check in and see if you have any real estate questions or anything you would like me to keep an eye on for you.`;
  const script2 = `Quick market update idea: Send a short note about local inventory, pricing, and why this is a good time for buyers and sellers to review their options.`;
  aiFollowUpScripts.innerHTML = `
    <div class="ai-script-box">
      <b>Personal follow-up text/email</b>
      <textarea class="form-control mt-2" readonly>${safe(script1)}</textarea>
    </div>
    <div class="ai-script-box">
      <b>Campaign idea</b>
      <textarea class="form-control mt-2" readonly>${safe(script2)}</textarea>
    </div>
  `;

  aiQuietCount.innerText = quietContacts.length;
  aiQuietOpportunities.innerHTML = quietContacts.length
    ? quietContacts
        .map(
          (item) => `
    <div class="ai-opportunity-row">
      <div class="ai-opportunity-top">
        <div><b>${safe(contactName(item.contact))}</b><br><small>${safe(item.contact.email || item.contact.phone || "")}</small></div>
        <span class="ai-soft-badge ${item.staleDays > 30 ? "ai-heat-cold" : "ai-heat-warm"}">${item.staleDays}d</span>
      </div>
      <div class="ai-opportunity-meta">
        <span class="ai-mini-pill blue">${safe(item.stage)}</span>
        <span class="ai-mini-pill">${safe(item.contact.type || "Unassigned")}</span>
        <span class="ai-mini-pill ${item.heat === "Hot" ? "red" : item.heat === "Warm" ? "green" : ""}">${safe(item.heat)} ${item.leadScore}</span>
        ${item.overdueTasks ? `<span class="ai-mini-pill red">${item.overdueTasks} overdue</span>` : ""}
      </div>
      <div class="small-muted mt-2"><b>Next:</b> ${safe(item.nextAction)}</div>
    </div>
  `,
        )
        .join("")
    : '<div class="text-muted">No cooling contacts detected from the available data.</div>';

  aiPulseOpenRate.innerText = `${openRate}%`;
  aiPulseClickRate.innerText = `${clickRate}%`;
  aiPulseOpenBar.style.width = `${Math.min(openRate, 100)}%`;
  aiPulseClickBar.style.width = `${Math.min(clickRate, 100)}%`;
}

function initDashboardDrag() {
  if (dashboardSortable) return;
  applyDashboardLayout();

  dashboardSortable = Sortable.create(dashboardWidgetGrid, {
    animation: 160,
    handle: ".drag-handle",
    ghostClass: "sortable-ghost",
    chosenClass: "sortable-chosen",
    onEnd: saveDashboardLayout,
  });
}

function initDashboardDrilldowns() {
  const drilldownWidgets = [
    "totalContacts",
    "totalEmailCampaigns",
    "totalTextCampaigns",
    "openRate",
    "clickRate",
    "totalSent",
    "totalTextsSent",
    "totalOpened",
    "totalClicks",
    "listHealth",
    "dueToday",
    "overdue",
    "recentActivity",
    "topLinks",
    "campaignPerformance",
    "activityTrend",
    "engagementBreakdown",
  ];

  drilldownWidgets.forEach((widgetId) => {
    const widget = dashboardWidgetGrid.querySelector(
      `[data-widget-id="${widgetId}"]`,
    );
    if (!widget || widget.dataset.drilldownReady === "true") return;

    widget.dataset.drilldownReady = "true";
    widget.classList.add("drilldown-ready");

    widget.addEventListener("click", function (event) {
      if (event.target.closest(".drag-handle")) return;
      openDashboardDrilldown(widgetId);
    });
  });
}

function saveDashboardLayout() {
  const order = Array.from(dashboardWidgetGrid.children)
    .map((widget) => widget.dataset.widgetId)
    .filter(Boolean);
  localStorage.setItem("excelMarketingDashboardLayout", JSON.stringify(order));
}

function applyDashboardLayout() {
  const saved = JSON.parse(
    localStorage.getItem("excelMarketingDashboardLayout") || "[]",
  );
  if (!saved.length) return;

  saved.forEach((widgetId) => {
    const widget = dashboardWidgetGrid.querySelector(
      `[data-widget-id="${widgetId}"]`,
    );
    if (widget) dashboardWidgetGrid.appendChild(widget);
  });
}

function resetDashboardLayout() {
  localStorage.removeItem("excelMarketingDashboardLayout");
  location.reload();
}

function getDayKey(value) {
  const date = new Date(value);
  if (isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function getLastDays(count) {
  const days = [];
  const today = new Date();

  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }

  return days;
}

function shortDayLabel(dayKey) {
  const date = new Date(dayKey + "T00:00:00");
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function destroyChart(name) {
  if (dashboardCharts[name]) {
    dashboardCharts[name].destroy();
    delete dashboardCharts[name];
  }
}

function renderActivityTrendChart(activity) {
  destroyChart("activityTrend");

  const days = getLastDays(14);
  const sentMap = {};
  const openMap = {};
  const clickMap = {};

  days.forEach((day) => {
    sentMap[day] = 0;
    openMap[day] = 0;
    clickMap[day] = 0;
  });

  activity.forEach((a) => {
    const sentDay = getDayKey(a.sentAt || a.sentDate);
    if (sentDay && sentMap[sentDay] !== undefined && a.status !== "failed")
      sentMap[sentDay]++;

    const openDay = getDayKey(a.openedAt);
    if (a.opened && openDay && openMap[openDay] !== undefined)
      openMap[openDay]++;

    (a.clicks || []).forEach((click) => {
      const clickDay = getDayKey(click.clickedAt);
      if (clickDay && clickMap[clickDay] !== undefined) clickMap[clickDay]++;
    });
  });

  dashboardCharts.activityTrend = new Chart(activityTrendChart, {
    type: "line",
    data: {
      labels: days.map(shortDayLabel),
      datasets: [
        { label: "Sent", data: days.map((day) => sentMap[day]), tension: 0.35 },
        {
          label: "Opened",
          data: days.map((day) => openMap[day]),
          tension: 0.35,
        },
        {
          label: "Clicked",
          data: days.map((day) => clickMap[day]),
          tension: 0.35,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: "bottom" } },
      scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
    },
  });
}

function renderCampaignPerformanceChart(campaigns, activity) {
  destroyChart("campaignPerformance");

  const rows = campaigns
    .slice()
    .sort(
      (a, b) =>
        new Date(b.createdAt || b.updatedAt || 0) -
        new Date(a.createdAt || a.updatedAt || 0),
    )
    .slice(0, 8)
    .map((c) => {
      const matching = activity.filter(
        (a) => a.campaignName === c.name || a.campaignName === c.subject,
      );
      const sent = matching.filter(
        (a) => a.status === "sent" || !a.status,
      ).length;
      const opened = matching.filter((a) => a.opened).length;
      const clicks = matching.reduce(
        (sum, a) => sum + (a.clicks || []).length,
        0,
      );

      return {
        name: c.name || c.subject || "Untitled",
        sent,
        opened,
        clicks,
      };
    });

  dashboardCharts.campaignPerformance = new Chart(campaignPerformanceChart, {
    type: "bar",
    data: {
      labels: rows.map((r) =>
        r.name.length > 18 ? r.name.slice(0, 18) + "…" : r.name,
      ),
      datasets: [
        { label: "Sent", data: rows.map((r) => r.sent) },
        { label: "Opened", data: rows.map((r) => r.opened) },
        { label: "Clicks", data: rows.map((r) => r.clicks) },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: "bottom" } },
      scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
    },
  });
}

function renderEngagementBreakdownChart(data) {
  destroyChart("engagementBreakdown");

  dashboardCharts.engagementBreakdown = new Chart(engagementBreakdownChart, {
    type: "doughnut",
    data: {
      labels: ["Opened", "Clicked", "Unsubscribed", "Bounced"],
      datasets: [
        {
          data: [
            data.totalOpened || 0,
            data.totalClicks || 0,
            data.totalUnsubscribed || 0,
            data.totalBounced || 0,
          ],
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: "bottom" } },
    },
  });
}

async function loadDashboard() {
  const [
    statsRes,
    campaignsRes,
    activityRes,
    contactsRes,
    smsRes,
    taskStatsRes,
  ] = await Promise.all([
    fetch("/api/dashboard-stats"),
    fetch("/api/campaigns"),
    fetch("/api/activity"),
    fetch("/api/contacts").catch(() => null),
    fetch("/api/sms-activity").catch(() => null),
    fetch("/api/task-stats").catch(() => null),
  ]);

  const data = await statsRes.json();
  const campaigns = await campaignsRes.json();
  const activity = await activityRes.json();
  const contacts = contactsRes ? await contactsRes.json() : contactsCache;
  const smsActivity = smsRes ? await smsRes.json() : [];
  const taskStats = taskStatsRes
    ? await taskStatsRes.json()
    : { dueToday: 0, overdue: 0 };

  campaignsCache = Array.isArray(campaigns) ? campaigns : [];
  activityCache = Array.isArray(activity) ? activity : [];
  smsActivityCache = Array.isArray(smsActivity) ? smsActivity : [];
  if (Array.isArray(contacts))
    contactsCache = normalizeContactsForPipeline(contacts);

  const textCampaignNames = new Set(
    smsActivityCache
      .filter((item) => item.type === "text-campaign" || item.campaignName)
      .map((item) => item.campaignName || item.name || "Text Campaign"),
  );

  const totalTextsSent = smsActivityCache.filter(
    (item) =>
      item.status === "queued" ||
      item.status === "sent" ||
      item.status === "delivered",
  ).length;

  dashTotalContacts.innerText = data.totalContacts || 0;
  dashTotalEmailCampaigns.innerText =
    campaignsCache.length || data.totalCampaigns || 0;
  dashTotalTextCampaigns.innerText = textCampaignNames.size || 0;
  dashTotalSent.innerText = data.totalSent || 0;
  dashTotalTextsSent.innerText = totalTextsSent || 0;
  dashTotalOpened.innerText = data.totalOpened || 0;
  dashTotalClicks.innerText = data.totalClicks || 0;
  dashTotalUnsubscribed.innerText = data.totalUnsubscribed || 0;
  dashTotalBounced.innerText = data.totalBounced || 0;
  dashOpenRate.innerText = (data.openRate || 0) + "%";
  dashClickRate.innerText = (data.clickRate || 0) + "%";
  dashDueToday.innerText = taskStats.dueToday || 0;
  dashOverdue.innerText = taskStats.overdue || 0;

  updateNotificationBadge(taskStats);
  renderAIDashboard(
    data,
    contactsCache,
    campaignsCache,
    activityCache,
    smsActivityCache,
    taskStats,
  );

  recentActivityList.innerHTML = "";

  const combinedRecent = [
    ...(data.recentActivity || []).map((item) => ({
      ...item,
      channel: "Email",
    })),
    ...smsActivityCache.slice(0, 10).map((item) => ({
      type: item.status || "Text",
      email: item.to || "",
      campaignName: item.campaignName || item.contactName || "Text Message",
      date: item.sentAt || item.createdAt,
      error: item.error || "",
      url: "",
      channel: "Text",
    })),
  ]
    .filter((item) => item.date)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 10);

  if (combinedRecent.length === 0) {
    recentActivityList.innerHTML =
      '<div class="text-muted">No activity yet.</div>';
  } else {
    combinedRecent.forEach((a) => {
      recentActivityList.innerHTML += `
        <div class="border-bottom py-2">
          <span class="status-badge">${a.channel || "Activity"}</span>
          <b>${a.email || ""}</b> ${(a.type || a.status || "activity").toLowerCase()} <b>${a.campaignName || ""}</b>
          ${a.url ? `<br><small>Link: ${a.url}</small>` : ""}
          ${a.error ? `<br><small class="text-danger">Error: ${a.error}</small>` : ""}
          <br><small>${formatDate(a.date || a.sentAt)}</small>
        </div>
      `;
    });
  }

  topLinksList.innerHTML = "";

  if (!data.topLinks || data.topLinks.length === 0) {
    topLinksList.innerHTML =
      '<div class="text-muted">No link clicks yet.</div>';
  } else {
    data.topLinks.forEach((link) => {
      topLinksList.innerHTML += `
        <div class="border-bottom py-2">
          <b>${link.clicks}</b> clicks<br>
          <small>${link.url}</small>
        </div>
      `;
    });
  }

  renderActivityTrendChart(activityCache);
  renderCampaignPerformanceChart(campaignsCache, activityCache);
  renderEngagementBreakdownChart(data);
  initDashboardDrag();
  initDashboardDrilldowns();
}

function openDashboardDrilldown(type) {
  const titleMap = {
    totalContacts: "All Contacts",
    totalEmailCampaigns: "Email Campaigns",
    totalTextCampaigns: "Text Campaigns",
    openRate: "Opened Emails",
    clickRate: "Clicked Links",
    totalSent: "Emails Sent",
    totalTextsSent: "Texts Sent",
    totalOpened: "Total Opens",
    totalClicks: "Total Clicks",
    listHealth: "List Health",
    dueToday: "Tasks Due Today",
    overdue: "Overdue Tasks",
    recentActivity: "Recent Activity",
    topLinks: "Top Links Clicked",
    campaignPerformance: "Email Campaign Performance",
    activityTrend: "Email Activity Trend",
    engagementBreakdown: "Engagement Breakdown",
  };

  dashboardDrilldownTitle.innerText = titleMap[type] || "Dashboard Detail";
  dashboardDrilldownSubtitle.innerText =
    "Click a contact or campaign row to open more detail.";
  dashboardDrilldownContent.innerHTML = buildDashboardDrilldownHtml(type);
  dashboardDrilldownPanel.classList.add("open");
}

function closeDashboardDrilldown() {
  dashboardDrilldownPanel.classList.remove("open");
}

function findContactByEmail(email) {
  return contactsCache.find(
    (c) =>
      String(c.email || "").toLowerCase() === String(email || "").toLowerCase(),
  );
}

function contactOpenAction(email) {
  const contact = findContactByEmail(email);
  return contact ? `onclick="openContact(${contact.id})"` : "";
}

function buildDashboardDrilldownHtml(type) {
  if (type === "totalContacts") {
    if (!contactsCache.length)
      return '<div class="text-muted">No contacts yet.</div>';
    return contactsCache
      .slice()
      .sort((a, b) => contactName(a).localeCompare(contactName(b)))
      .map(
        (c) => `
        <div class="drilldown-row" onclick="openContact(${c.id})">
          <b>${contactName(c)}</b><br>
          <small>${c.email || ""} | ${formatPhone(c.phone || "")} | ${c.type || ""} | ${inferStageFromContact(c)}</small>
          ${renderTags(c.tags)}
        </div>
      `,
      )
      .join("");
  }

  if (type === "totalEmailCampaigns" || type === "campaignPerformance") {
    if (!campaignsCache.length)
      return '<div class="text-muted">No campaigns yet.</div>';
    return campaignsCache
      .map(
        (c) => `
      <div class="drilldown-row" onclick="openCampaignPanel(${c.id})">
        <b>${c.name || "Untitled Campaign"}</b><br>
        <small>Subject: ${c.subject || ""}</small><br>${c.preheader ? `<small>Preheader: ${c.preheader}</small><br>` : ""}
        <small>Created: ${formatDate(c.createdAt)}${c.updatedAt ? " | Updated: " + formatDate(c.updatedAt) : ""}</small>
      </div>
    `,
      )
      .join("");
  }

  if (type === "totalTextCampaigns" || type === "totalTextsSent") {
    if (!smsActivityCache.length)
      return '<div class="text-muted">No text campaign or one-on-one text activity yet.</div>';
    const rows = smsActivityCache
      .slice()
      .sort(
        (a, b) =>
          new Date(b.sentAt || b.createdAt || 0) -
          new Date(a.sentAt || a.createdAt || 0),
      );
    return rows
      .map(
        (item) => `
      <div class="drilldown-row">
        <b>${item.campaignName || item.contactName || "Text Message"}</b><br>
        <small>To: ${formatPhone(item.to || "")} | Status: ${item.status || ""}</small><br>
        <small>${formatDate(item.sentAt || item.createdAt)}</small>
        <div class="mt-2">${item.message || ""}</div>
        ${item.error ? `<div class="text-danger small mt-1">${item.error}</div>` : ""}
      </div>
    `,
      )
      .join("");
  }

  if (type === "openRate" || type === "totalOpened") {
    const rows = activityCache
      .filter((a) => a.opened)
      .sort((a, b) => new Date(b.openedAt || 0) - new Date(a.openedAt || 0));
    if (!rows.length)
      return '<div class="text-muted">No opens tracked yet.</div>';
    return rows
      .map(
        (a) => `
      <div class="drilldown-row" ${contactOpenAction(a.email)}>
        <b>${a.email || ""}</b><br>
        <small>Opened: ${formatDate(a.openedAt)} | Campaign: ${a.campaignName || ""}</small>
      </div>
    `,
      )
      .join("");
  }

  if (type === "clickRate" || type === "totalClicks" || type === "topLinks") {
    const rows = [];
    activityCache.forEach((a) => {
      (a.clicks || []).forEach((click) =>
        rows.push({ ...click, email: a.email, campaignName: a.campaignName }),
      );
    });
    rows.sort(
      (a, b) => new Date(b.clickedAt || 0) - new Date(a.clickedAt || 0),
    );
    if (!rows.length)
      return '<div class="text-muted">No clicks tracked yet.</div>';
    return rows
      .map(
        (r) => `
      <div class="drilldown-row" ${contactOpenAction(r.email)}>
        <b>${r.email || ""}</b><br>
        <small>Clicked: ${formatDate(r.clickedAt)} | Campaign: ${r.campaignName || ""}</small><br>
        <small>${r.url || ""}</small>
      </div>
    `,
      )
      .join("");
  }

  if (
    type === "totalSent" ||
    type === "recentActivity" ||
    type === "activityTrend"
  ) {
    const rows = [];
    activityCache.forEach((a) => {
      rows.push({
        type: a.status === "failed" ? "Failed" : "Sent",
        email: a.email,
        campaignName: a.campaignName,
        date: a.sentAt || a.sentDate,
        detail: a.error || "",
      });
      if (a.opened)
        rows.push({
          type: "Opened",
          email: a.email,
          campaignName: a.campaignName,
          date: a.openedAt,
          detail: "",
        });
      (a.clicks || []).forEach((click) =>
        rows.push({
          type: "Clicked",
          email: a.email,
          campaignName: a.campaignName,
          date: click.clickedAt,
          detail: click.url || "",
        }),
      );
    });
    rows.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    if (!rows.length) return '<div class="text-muted">No activity yet.</div>';
    return rows
      .slice(0, 100)
      .map(
        (r) => `
      <div class="drilldown-row" ${contactOpenAction(r.email)}>
        <b>${r.type}</b> — ${r.email || ""}<br>
        <small>${r.campaignName || ""} | ${formatDate(r.date)}</small>
        ${r.detail ? `<br><small>${r.detail}</small>` : ""}
      </div>
    `,
      )
      .join("");
  }

  if (type === "listHealth") {
    const rows = contactsCache.filter((c) => c.unsubscribed || c.bounced);
    if (!rows.length)
      return '<div class="text-muted">No unsubscribed or bounced contacts.</div>';
    return rows
      .map(
        (c) => `
      <div class="drilldown-row" onclick="openContact(${c.id})">
        <b>${contactName(c)}</b><br>
        <small>${c.email || ""} | ${c.unsubscribed ? "Unsubscribed" : ""} ${c.bounced ? "Bounced" : ""}</small>
      </div>
    `,
      )
      .join("");
  }

  if (type === "dueToday" || type === "overdue") {
    const rows = [];
    contactsCache.forEach((c) => {
      (c.tasks || []).forEach((task) => {
        if (
          type === "dueToday" &&
          !task.done &&
          task.due &&
          String(task.due).slice(0, 10) === todayKey()
        )
          rows.push({ contact: c, task });
        if (type === "overdue" && taskIsOverdue(task))
          rows.push({ contact: c, task });
      });
    });
    if (!rows.length) return '<div class="text-muted">No matching tasks.</div>';
    return rows
      .map(
        (row) => `
      <div class="drilldown-row" onclick="openContact(${row.contact.id})">
        <b>${row.task.title || "Untitled Task"}</b><br>
        <small>${contactName(row.contact)} | Due: ${formatShortDate(row.task.due)} | Priority: ${row.task.priority || "Normal"}</small>
      </div>
    `,
      )
      .join("");
  }

  if (type === "engagementBreakdown") {
    return buildDashboardDrilldownHtml("recentActivity");
  }

  return '<div class="text-muted">No detail available yet.</div>';
}
