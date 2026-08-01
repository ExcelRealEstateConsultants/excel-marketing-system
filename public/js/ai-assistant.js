/* =====================================================
   RapportLink Floating AI Assistant
   Version 1
   ===================================================== */

/* ================= FLOATING AI ASSISTANT V1 ================= */
let aiAssistantBooted = false;

function aiAssistantEscape(value) {
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

function aiAssistantContactName(contact = {}) {
  if (typeof aiContactName === "function") return aiContactName(contact);
  return (
    `${contact.firstName || ""} ${contact.lastName || ""}`.trim() ||
    contact.name ||
    contact.email ||
    "Unknown Contact"
  );
}

function aiAssistantOpen() {
  const panel = document.getElementById("aiAssistantPanel");
  if (panel) panel.classList.add("open");
  aiAssistantInit();
}

function aiAssistantClose() {
  document.getElementById("aiAssistantPanel")?.classList.remove("open");
}

function aiAssistantToggle() {
  const panel = document.getElementById("aiAssistantPanel");
  if (!panel) return;
  if (panel.classList.contains("open")) aiAssistantClose();
  else aiAssistantOpen();
}

function aiAssistantAddMessage(role, html) {
  const body = document.getElementById("aiAssistantBody");
  if (!body) return;
  const div = document.createElement("div");
  div.className = `ai-assistant-message ${role === "user" ? "user" : "assistant"}`;
  div.innerHTML = html;
  body.appendChild(div);
  body.scrollTop = body.scrollHeight;
}

function aiAssistantInit() {
  if (aiAssistantBooted) return;
  aiAssistantBooted = true;
  aiAssistantAddMessage(
    "assistant",
    `
    <b>Good to see you, Jeff.</b><br>
    I can help prioritize leads, review transactions, recommend follow-ups, and create campaign ideas using the data already inside this CRM.
    <div class="mt-2">
      <span class="ai-assistant-pill hot">🔥 Leads</span>
      <span class="ai-assistant-pill risk">📁 Transactions</span>
      <span class="ai-assistant-pill good">📧 Marketing</span>
    </div>
  `,
  );
}

async function aiAssistantEnsureData() {
  try {
    if (!Array.isArray(contactsCache) || contactsCache.length === 0) {
      const res = await fetch("/api/contacts");
      const contacts = await res.json();
      contactsCache =
        typeof normalizeContactsForPipeline === "function"
          ? normalizeContactsForPipeline(contacts)
          : contacts;
    }
  } catch (e) {}

  try {
    if (!Array.isArray(activityCache) || activityCache.length === 0) {
      const res = await fetch("/api/activity");
      activityCache = await res.json();
    }
  } catch (e) {
    if (!Array.isArray(activityCache)) activityCache = [];
  }

  try {
    if (!Array.isArray(campaignsCache) || campaignsCache.length === 0) {
      const res = await fetch("/api/campaigns");
      campaignsCache = await res.json();
    }
  } catch (e) {
    if (!Array.isArray(campaignsCache)) campaignsCache = [];
  }

  try {
    if (!Array.isArray(smsActivityCache) || smsActivityCache.length === 0) {
      const res = await fetch("/api/sms-activity");
      smsActivityCache = await res.json();
    }
  } catch (e) {
    if (!Array.isArray(smsActivityCache)) smsActivityCache = [];
  }

  try {
    if (typeof txnLoad === "function") txnLoad();
  } catch (e) {}
}

async function aiAssistantGetInsights() {
  await aiAssistantEnsureData();
  if (typeof buildAIContactInsights === "function") {
    return buildAIContactInsights(
      contactsCache || [],
      activityCache || [],
      smsActivityCache || [],
    );
  }
  return (contactsCache || []).map((contact) => ({
    contact,
    leadScore: 0,
    opportunityScore: 0,
    heat: "Cold",
    nextAction: "Review contact",
    nextActionReason: "Scoring is not available yet.",
  }));
}

function aiAssistantAsk() {
  const input = document.getElementById("aiAssistantInput");
  const question = String(input?.value || "").trim();
  if (!question) return;
  if (input) input.value = "";
  aiAssistantAddMessage("user", aiAssistantEscape(question));
  aiAssistantAnswerQuestion(question);
}

async function aiAssistantAnswerQuestion(question) {
  const q = String(question || "").toLowerCase();
  if (q.includes("call") || q.includes("follow up") || q.includes("follow-up"))
    return aiAssistantRunCommand("calls");
  if (
    q.includes("transaction") ||
    q.includes("closing") ||
    q.includes("escrow") ||
    q.includes("inspection") ||
    q.includes("appraisal")
  )
    return aiAssistantRunCommand("transactions");
  if (q.includes("hot") || q.includes("lead") || q.includes("likely to close"))
    return aiAssistantRunCommand("hotleads");
  if (
    q.includes("forecast") ||
    q.includes("gci") ||
    q.includes("commission") ||
    q.includes("pipeline")
  )
    return aiAssistantRunCommand("forecast");
  if (q.includes("campaign") || q.includes("marketing") || q.includes("email"))
    return aiAssistantRunCommand(
      q.includes("seller") ? "sellerCampaign" : "marketing",
    );
  aiAssistantAddMessage(
    "assistant",
    `I can help with that. Try asking:<br><br>
    <button class="ai-assistant-command" onclick="aiAssistantRunCommand('calls')">Who should I call today?</button>
    <button class="ai-assistant-command" onclick="aiAssistantRunCommand('transactions')">What transactions need attention?</button>
    <button class="ai-assistant-command" onclick="aiAssistantRunCommand('marketing')">What should I market next?</button>`,
  );
}

async function aiAssistantRunCommand(type) {
  aiAssistantOpen();
  const labelMap = {
    calls: "Who should I call today?",
    transactions: "What transactions need attention?",
    hotleads: "Show my hottest leads",
    forecast: "What is my forecast?",
    marketing: "Marketing recommendations",
    sellerCampaign: "Create seller campaign",
  };
  aiAssistantAddMessage("user", aiAssistantEscape(labelMap[type] || type));
  aiAssistantAddMessage(
    "assistant",
    '<span class="ai-assistant-small">Analyzing your CRM data...</span>',
  );
  const body = document.getElementById("aiAssistantBody");
  const loadingNode = body?.lastElementChild;

  let html = "";
  try {
    if (type === "calls") html = await aiAssistantBuildCallList();
    else if (type === "transactions")
      html = await aiAssistantBuildTransactionList();
    else if (type === "hotleads") html = await aiAssistantBuildHotLeads();
    else if (type === "forecast") html = await aiAssistantBuildForecast();
    else if (type === "marketing")
      html = await aiAssistantBuildMarketingIdeas();
    else if (type === "sellerCampaign")
      html = await aiAssistantBuildSellerCampaign();
    else html = "I am not sure how to handle that command yet.";
  } catch (error) {
    html = `<b>I hit an issue while analyzing this.</b><br><span class="ai-assistant-small">${aiAssistantEscape(error.message || error)}</span>`;
  }

  if (loadingNode) loadingNode.innerHTML = html;
}

async function aiAssistantBuildCallList() {
  const insights = await aiAssistantGetInsights();
  const candidates = insights
    .filter(
      (i) =>
        i.heat !== "Network" &&
        (i.nextAction || "")
          .toLowerCase()
          .match(/call|text|follow|overdue|today/),
    )
    .sort(
      (a, b) =>
        (b.opportunityScore || 0) - (a.opportunityScore || 0) ||
        (b.leadScore || 0) - (a.leadScore || 0),
    )
    .slice(0, 5);

  if (!candidates.length)
    return "<b>No urgent calls found.</b><br>Keep nurturing your contacts and check back after new activity comes in.";

  return `<b>Top people to contact today:</b>${candidates
    .map((item) => {
      const c = item.contact || {};
      return `<div class="ai-assistant-result-card">
      <b>${aiAssistantEscape(aiAssistantContactName(c))}</b><br>
      <span class="ai-assistant-pill ${String(item.heat).toLowerCase()}">${aiAssistantEscape(typeof aiHeatBadgeText === "function" ? aiHeatBadgeText(item) : `${item.heat} ${item.leadScore}`)}</span>
      <span class="ai-assistant-pill good">Opp ${Number(item.opportunityScore || 0)}</span><br>
      <span class="ai-assistant-small">${aiAssistantEscape(item.nextAction)} — ${aiAssistantEscape(item.nextActionReason)}</span><br>
      ${c.id ? `<button class="btn btn-sm btn-outline-primary mt-2" onclick="openContact(${c.id}); aiAssistantClose();">Open Contact</button>` : ""}
    </div>`;
    })
    .join("")}`;
}

async function aiAssistantBuildHotLeads() {
  const insights = await aiAssistantGetInsights();
  const hot = insights
    .filter((i) => i.heat !== "Network")
    .sort(
      (a, b) =>
        (b.leadScore || 0) - (a.leadScore || 0) ||
        (b.opportunityScore || 0) - (a.opportunityScore || 0),
    )
    .slice(0, 7);

  if (!hot.length)
    return "<b>No scored leads yet.</b><br>Add contacts, campaign activity, notes, or tasks and the scoring engine will have more to work with.";

  return `<b>Highest-scored leads right now:</b>${hot
    .map((item) => {
      const c = item.contact || {};
      return `<div class="ai-assistant-result-card">
      <b>${aiAssistantEscape(aiAssistantContactName(c))}</b><br>
      <span class="ai-assistant-pill ${String(item.heat).toLowerCase()}">${aiAssistantEscape(typeof aiHeatBadgeText === "function" ? aiHeatBadgeText(item) : `${item.heat} ${item.leadScore}`)}</span>
      <span class="ai-assistant-pill good">Opportunity ${Number(item.opportunityScore || 0)}</span><br>
      <span class="ai-assistant-small">${aiAssistantEscape(item.nextAction)}</span>
    </div>`;
    })
    .join("")}`;
}

async function aiAssistantBuildTransactionList() {
  await aiAssistantEnsureData();
  const txns = Array.isArray(txnCache) ? txnCache : [];
  if (!txns.length)
    return `<b>No transactions found yet.</b><br>Create your first transaction in the Transactions tab and I can watch deadlines, missing documents, and broker-risk items.<br><button class="btn btn-sm btn-success mt-2" onclick="showTab('transactions'); aiAssistantClose();">Open Transactions</button>`;

  const alerts = typeof txnAllAlerts === "function" ? txnAllAlerts() : [];
  const urgent = alerts.filter((a) => a.severity !== "good").slice(0, 8);
  if (!urgent.length)
    return `<b>Transactions look clean right now.</b><br>No urgent AI coordinator alerts were found.<br><button class="btn btn-sm btn-outline-primary mt-2" onclick="showTab('transactions'); aiAssistantClose();">Open Transactions</button>`;

  return `<b>Transactions needing attention:</b>${urgent
    .map(
      (alert) => `
    <div class="ai-assistant-result-card">
      <span class="ai-assistant-pill ${alert.severity === "high" ? "hot" : "risk"}">${alert.severity === "high" ? "High Priority" : "Watch"}</span><br>
      <b>${aiAssistantEscape(alert.title)}</b><br>
      <span class="ai-assistant-small">${aiAssistantEscape(alert.text)}</span><br>
      ${alert.txn?.id ? `<button class="btn btn-sm btn-outline-primary mt-2" onclick="showTab('transactions'); txnOpenPanel('${alert.txn.id}'); aiAssistantClose();">Open Transaction</button>` : ""}
    </div>`,
    )
    .join("")}`;
}

async function aiAssistantBuildForecast() {
  const insights = await aiAssistantGetInsights();
  await aiAssistantEnsureData();
  const activeTxns = (txnCache || []).filter((t) =>
    typeof txnIsActive === "function"
      ? txnIsActive(t)
      : !["Closed", "Cancelled"].includes(t.status),
  );
  const txGci = activeTxns.reduce(
    (sum, t) =>
      sum + (typeof txnGci === "function" ? txnGci(t) : Number(t.gci || 0)),
    0,
  );
  const weightedLeadGci = insights
    .filter((i) => i.heat !== "Network")
    .reduce((sum, i) => sum + Number(i.estimatedGCI || 0), 0);
  const hotCount = insights.filter((i) => i.heat === "Hot").length;
  const warmCount = insights.filter((i) => i.heat === "Warm").length;
  const pendingCount = activeTxns.filter(
    (t) =>
      String(t.status || "")
        .toLowerCase()
        .includes("pending") ||
      String(t.status || "")
        .toLowerCase()
        .includes("contract"),
  ).length;
  const totalForecast = txGci + weightedLeadGci;
  return `<b>Forecast Summary</b><br>
    <div class="ai-assistant-result-card">
      <span class="ai-assistant-pill good">Active Transaction GCI ${aiMoney(txGci)}</span><br>
      <span class="ai-assistant-pill warm">Weighted Lead GCI ${aiMoney(weightedLeadGci)}</span><br>
      <span class="ai-assistant-pill hot">Total Forecast ${aiMoney(totalForecast)}</span><br><br>
      <b>Pipeline signals:</b><br>
      <span class="ai-assistant-small">${hotCount} hot leads, ${warmCount} warm leads, ${pendingCount} active/pending transaction files.</span>
    </div>`;
}

async function aiAssistantBuildMarketingIdeas() {
  const insights = await aiAssistantGetInsights();
  const cold = insights.filter(
    (i) => i.heat === "Cold" || i.heat === "Inactive",
  ).length;
  const warm = insights.filter((i) => i.heat === "Warm").length;
  const hot = insights.filter((i) => i.heat === "Hot").length;
  const clicked = (activityCache || []).filter((a) =>
    String(a.type || "")
      .toLowerCase()
      .includes("click"),
  ).length;
  const campaigns = Array.isArray(campaignsCache) ? campaignsCache.length : 0;

  const ideas = [];
  if (hot > 0)
    ideas.push(
      "Create a short personal follow-up for hot leads instead of a broad campaign.",
    );
  if (warm > 0)
    ideas.push("Send a value-based market update to warm leads this week.");
  if (cold > 5)
    ideas.push(
      "Create a re-engagement campaign for cold and inactive contacts.",
    );
  if (clicked > 0)
    ideas.push(
      "Follow up with contacts who clicked links and reference what they clicked.",
    );
  if (campaigns === 0)
    ideas.push("Build your first seller or buyer nurture campaign.");

  return `<b>Marketing recommendations:</b><br>${ideas.map((i) => `<div class="ai-assistant-result-card">${aiAssistantEscape(i)}</div>`).join("") || '<div class="ai-assistant-result-card">Keep adding contacts and activity so I can make stronger recommendations.</div>'}
    <button class="btn btn-sm btn-success mt-2" onclick="aiAssistantRunCommand('sellerCampaign')">Draft Seller Campaign</button>`;
}

async function aiAssistantBuildSellerCampaign() {
  const subject = "Thinking About Selling? Here’s What To Know";
  const preheader = "Market timing matters";
  const body = `Hi there,<br><br>If you have been thinking about selling, this is a good time to look at your options before making any big decisions.<br><br>I can help you understand your current home value, what buyers are responding to, and what simple improvements may make the biggest difference.<br><br>If you would like, I can put together a quick market review for your home.<br><br>Jeff Peterson<br>RapportLink`;

  return `<b>Seller campaign draft:</b>
    <div class="ai-assistant-result-card">
      <b>Subject:</b> ${aiAssistantEscape(subject)}<br>
      <b>Preheader:</b> ${aiAssistantEscape(preheader)}<br><br>
      <span class="ai-assistant-small">${body}</span><br>
      <button class="btn btn-sm btn-success mt-2" onclick="aiAssistantApplySellerCampaignDraft()">Use This In Email Campaigns</button>
    </div>`;
}

function aiAssistantApplySellerCampaignDraft() {
  const subjectText = "Thinking About Selling? Here’s What To Know";
  const preheaderText = "Market timing matters";
  const html = `Hi there,<br><br>If you have been thinking about selling, this is a good time to look at your options before making any big decisions.<br><br>I can help you understand your current home value, what buyers are responding to, and what simple improvements may make the biggest difference.<br><br>If you would like, I can put together a quick market review for your home.<br><br>Jeff Peterson<br>Excel Real Estate Consultants`;
  showTab("campaigns");
  setTimeout(() => {
    const nameEl = document.getElementById("campaignName");
    const subjectEl = document.getElementById("subject");
    const preheaderEl = document.getElementById("preheader");
    if (nameEl) nameEl.value = "Seller Market Review Campaign";
    if (subjectEl) subjectEl.value = subjectText;
    if (preheaderEl) preheaderEl.value = preheaderText;
    if (typeof quill !== "undefined" && quill.root) quill.root.innerHTML = html;
  }, 150);
  aiAssistantAddMessage(
    "assistant",
    "<b>Draft loaded.</b><br>The seller campaign draft has been placed into Email Campaigns. Review it before saving or sending.",
  );
  aiAssistantClose();
}
