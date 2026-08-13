/* =====================================================
   RapportLink DealPilot Growth Mode
   Version 1

   Purpose:
   - Give agents actionable business-growth ideas
   - Avoid repetitive recommendations
   - Rotate across different growth categories
   - Remember recently shown recommendations
   - Support "Give me another idea"

   This file does NOT alter transactions or AI conclusions.
   ===================================================== */

console.log("DealPilot Growth Mode Loaded");

const RL_GROWTH_HISTORY_KEY = "rapportlinkDealPilotGrowthHistoryV1";
const RL_GROWTH_CATEGORY_HISTORY_KEY =
  "rapportlinkDealPilotGrowthCategoryHistoryV1";

const RL_GROWTH_SUPPRESSION_DAYS = 90;
const RL_GROWTH_MAX_HISTORY = 300;

/*
Each play below generates multiple unique suggestions.

28 plays
x 4 audiences
x 2 execution angles
= 224 possible Growth Mode recommendations.
*/

const RL_GROWTH_PLAYS = [
  {
    id: "sphere_reconnect",
    category: "Sphere",
    title: "Create conversations inside your sphere.",
    action:
      "Personally reconnect with {audience}. {angle} Keep the conversation helpful rather than immediately asking for business.",
    audiences: [
      "five people you genuinely like but have not spoken with recently",
      "past coworkers, neighbors or friends you have not contacted this quarter",
      "people in your database who know what you do but rarely hear from you",
      "five contacts with no meaningful activity in the last 60–90 days",
    ],
    angles: [
      "Ask what is new in their life and whether anything has changed around their home or real-estate plans.",
      "Share one useful local-market observation and ask how things are going.",
    ],
  },

  {
    id: "past_client_equity",
    category: "Past Clients",
    title: "Turn past clients into new opportunities.",
    action:
      "Choose {audience}. {angle} Position it as useful homeowner information, not a sales pitch.",
    audiences: [
      "five homeowners you helped more than three years ago",
      "past clients who bought before the recent market cycle",
      "past clients who may have accumulated significant equity",
      "homeowners in your database who have never received an updated value review",
    ],
    angles: [
      "Offer a quick updated equity and market-value review.",
      "Send a short note showing what similar homes have sold for recently.",
    ],
  },

  {
    id: "referral_ask",
    category: "Referrals",
    title: "Create a referral opportunity today.",
    action:
      "Reach out to {audience}. {angle} Make the request conversational and specific.",
    audiences: [
      "three past clients who had an excellent experience with you",
      "people who have referred business to you before",
      "your strongest sphere contacts",
      "clients you closed within the last 12 months",
    ],
    angles: [
      "Ask whether anyone in their world is talking about buying, selling or relocating.",
      "Remind them that introductions are always appreciated and that you will take excellent care of anyone they send.",
    ],
  },

  {
    id: "home_anniversary",
    category: "Past Clients",
    title: "Use a home anniversary to reconnect.",
    action:
      "Identify {audience}. {angle} A genuine anniversary message creates an easy reason to reconnect.",
    audiences: [
      "clients approaching a home-purchase anniversary",
      "clients who closed during this month in prior years",
      "long-term homeowners in your database",
      "past sellers who moved locally and may still be in your market",
    ],
    angles: [
      "Send a short personal congratulations and offer an updated value estimate.",
      "Ask how the home has worked out for them and whether anything has changed.",
    ],
  },

  {
    id: "dormant_buyer",
    category: "Buyer Generation",
    title: "Wake up dormant buyers.",
    action:
      "Review {audience}. {angle} Use a specific reason to restart the conversation.",
    audiences: [
      "buyers who paused their search 30–90 days ago",
      "older buyer leads who never formally stopped looking",
      "buyers who previously said rates were their biggest concern",
      "people who toured homes but never wrote an offer",
    ],
    angles: [
      "Send one property or market change that makes contacting them relevant today.",
      "Ask whether their timing, budget or priorities have changed.",
    ],
  },

  {
    id: "buyer_payment_review",
    category: "Buyer Generation",
    title: "Create a financing conversation.",
    action:
      "Choose {audience}. {angle} A payment-focused conversation can restart buyers who became discouraged.",
    audiences: [
      "buyers who have not spoken with their lender recently",
      "buyers whose price range may have changed",
      "first-time buyers in your database",
      "buyers who stopped searching because affordability felt uncomfortable",
    ],
    angles: [
      "Invite them to update their payment scenarios with a lender.",
      "Ask whether they want to revisit purchasing power based on today's market.",
    ],
  },

  {
    id: "expired_listing",
    category: "Listing Generation",
    title: "Look for homeowners whose listing did not sell.",
    action:
      "Identify {audience}. {angle} Lead with curiosity about what happened rather than a listing presentation.",
    audiences: [
      "recent expired listings in a neighborhood you know well",
      "higher-priced expired listings where marketing may have missed the mark",
      "homes that expired after unusually long market time",
      "older expired listings that have never returned to market",
    ],
    angles: [
      "Offer a fresh opinion on positioning, presentation and current buyer demand.",
      "Prepare a brief analysis showing what has changed since they were listed.",
    ],
  },

  {
    id: "withdrawn_listing",
    category: "Listing Generation",
    title: "Revisit withdrawn and cancelled listings.",
    action:
      "Research {audience}. {angle} The goal is to understand whether the owner's plans actually changed.",
    audiences: [
      "withdrawn listings from the last six months",
      "cancelled listings in your primary farming areas",
      "homes that came off market after multiple price reductions",
      "properties that were withdrawn during a slower seasonal period",
    ],
    angles: [
      "Ask whether selling is still part of their longer-term plan.",
      "Offer a no-pressure update on today's market and likely strategy.",
    ],
  },

  {
    id: "fsbo",
    category: "Listing Generation",
    title: "Create value for a for-sale-by-owner.",
    action:
      "Select {audience}. {angle} Demonstrate expertise before asking for the listing.",
    audiences: [
      "FSBO properties that have been active for more than two weeks",
      "FSBO homes with weak photos or incomplete marketing",
      "FSBO sellers in neighborhoods where you already know recent sales",
      "higher-value FSBOs where exposure and negotiation matter significantly",
    ],
    angles: [
      "Offer useful information about competing inventory and recent comparable sales.",
      "Ask whether they would like feedback from the perspective of active buyers and agents.",
    ],
  },

  {
    id: "long_term_owner",
    category: "Listing Generation",
    title: "Target long-term homeowners.",
    action:
      "Build a list of {audience}. {angle} Long ownership periods often create equity and future-moving opportunities.",
    audiences: [
      "homeowners who have owned for seven or more years",
      "owners who purchased 10–20 years ago",
      "long-term owners in neighborhoods with strong appreciation",
      "owners whose homes may no longer match their current stage of life",
    ],
    angles: [
      "Send an equity-focused homeowner update.",
      "Offer a current market-value review without assuming they are ready to sell.",
    ],
  },

  {
    id: "absentee_owner",
    category: "Listing Generation",
    title: "Prospect absentee owners.",
    action:
      "Research {audience}. {angle} Focus the conversation on ownership decisions rather than immediately asking whether they want to sell.",
    audiences: [
      "non-owner-occupied properties in your strongest neighborhoods",
      "small landlords who have owned the property for many years",
      "out-of-area owners of local residential properties",
      "owners whose rental property may have significant equity",
    ],
    angles: [
      "Offer a current property-value and rental-market comparison.",
      "Ask whether they plan to continue holding the property over the next few years.",
    ],
  },

  {
    id: "downsizer",
    category: "Listing Generation",
    title: "Identify potential downsizing opportunities.",
    action:
      "Look for {audience}. {angle} Approach this as planning and education, not pressure.",
    audiences: [
      "long-term owners of larger homes",
      "empty nesters in established neighborhoods",
      "homeowners maintaining properties larger than they may now need",
      "owners in neighborhoods where smaller replacement options exist nearby",
    ],
    angles: [
      "Create a simple sell-versus-stay equity analysis.",
      "Share examples of smaller local homes and what the transition could look like.",
    ],
  },

  {
    id: "move_up",
    category: "Listing Generation",
    title: "Find the next move-up seller.",
    action:
      "Identify {audience}. {angle} Their next purchase can create both a listing and a buyer opportunity.",
    audiences: [
      "past clients whose starter home may now be too small",
      "families whose household size has changed",
      "owners who bought entry-level homes five or more years ago",
      "clients with substantial equity who may be able to move up",
    ],
    angles: [
      "Offer to model what selling and buying again could look like financially.",
      "Send a few examples of what their current equity might allow them to purchase.",
    ],
  },

  {
    id: "neighborhood_farm",
    category: "Neighborhood Farming",
    title: "Build a focused neighborhood farm.",
    action:
      "Choose {audience}. {angle} Consistency matters more than trying to cover an enormous geographic area.",
    audiences: [
      "one neighborhood with roughly 250–500 homes",
      "a subdivision where you already have a transaction or relationship",
      "a neighborhood with strong turnover and recognizable boundaries",
      "an area where you already understand pricing and buyer demand",
    ],
    angles: [
      "Prepare a simple 90-day plan combining mail, calls and useful market information.",
      "Identify the owners most likely to value equity, sales and neighborhood data.",
    ],
  },

  {
    id: "just_sold_farm",
    category: "Neighborhood Farming",
    title: "Turn a closing into neighborhood prospecting.",
    action:
      "Target {audience}. {angle} Nearby homeowners naturally want to know what a sale means for their own property.",
    audiences: [
      "50–100 homes surrounding a recent closing",
      "the immediate subdivision around a recent transaction",
      "homeowners near one of your strongest recent sales",
      "owners near a property that sold unusually quickly or at a notable price",
    ],
    angles: [
      "Send a concise just-sold update with the result and neighborhood context.",
      "Follow the mail or email with a small number of personal calls.",
    ],
  },

  {
    id: "market_report_farm",
    category: "Neighborhood Farming",
    title: "Own the market information in one neighborhood.",
    action:
      "Select {audience}. {angle} The objective is to become the agent homeowners associate with neighborhood knowledge.",
    audiences: [
      "a subdivision where homeowners rarely receive useful market information",
      "an established neighborhood with regular sales activity",
      "a neighborhood containing several past clients or sphere contacts",
      "an area where inventory or pricing has recently changed",
    ],
    angles: [
      "Create a short monthly neighborhood market report.",
      "Share recent sales, current competition and one useful interpretation of the numbers.",
    ],
  },

  {
    id: "open_house",
    category: "Buyer Generation",
    title: "Use an open house as a lead-generation event.",
    action:
      "Choose {audience}. {angle} Treat the event as a conversation opportunity, not simply a property showing.",
    audiences: [
      "a listing in an area with strong local buyer interest",
      "a home where neighbors may know potential buyers",
      "a property near renters or first-time-buyer neighborhoods",
      "a listing with strong visual appeal and easy public access",
    ],
    angles: [
      "Invite nearby homeowners personally before the public open house.",
      "Prepare a useful buyer guide or neighborhood information piece for attendees.",
    ],
  },

  {
    id: "renter_conversion",
    category: "Buyer Generation",
    title: "Create first-time buyer opportunities from renters.",
    action:
      "Focus on {audience}. {angle} Education works better than telling renters they should buy.",
    audiences: [
      "renters already in your database",
      "younger sphere contacts who have never owned",
      "people whose leases may expire within the next six months",
      "renters in areas where entry-level ownership remains possible",
    ],
    angles: [
      "Offer a simple rent-versus-own conversation with a lender.",
      "Share what a realistic first purchase could look like without assuming they are ready.",
    ],
  },

  {
    id: "price_reduction",
    category: "Buyer Generation",
    title: "Use price reductions to wake up buyers.",
    action:
      "Look at {audience}. {angle} New affordability can create a reason for immediate outreach.",
    audiences: [
      "homes that recently dropped into a buyer's price range",
      "properties your buyers previously liked but considered too expensive",
      "significant price reductions in your active buyer markets",
      "listings with multiple reductions and motivated sellers",
    ],
    angles: [
      "Send one highly relevant property rather than a generic search email.",
      "Explain specifically why the property may deserve another look now.",
    ],
  },

  {
    id: "local_business",
    category: "Branding",
    title: "Use local businesses to grow your audience.",
    action:
      "Feature {audience}. {angle} Useful local content can build relationships while expanding your visibility.",
    audiences: [
      "a locally owned restaurant",
      "a contractor or home-service professional",
      "a new business in one of your farming areas",
      "a long-standing neighborhood business people already recognize",
    ],
    angles: [
      "Create a short social spotlight and tag the business.",
      "Interview the owner briefly and connect the content back to the local community.",
    ],
  },

  {
    id: "market_video",
    category: "Branding",
    title: "Record one useful market video.",
    action:
      "Create content for {audience}. {angle} Keep it short, specific and understandable.",
    audiences: [
      "homeowners wondering whether prices are changing",
      "buyers confused about the current market",
      "people thinking about selling later this year",
      "your social audience who may not actively be discussing real estate yet",
    ],
    angles: [
      "Explain one market statistic and what it actually means.",
      "Answer one question you have heard repeatedly from clients.",
    ],
  },

  {
    id: "listing_content",
    category: "Branding",
    title: "Turn a listing into more than one piece of content.",
    action:
      "Use {audience}. {angle} One property can generate multiple business-development opportunities.",
    audiences: [
      "a current listing",
      "a recent closing",
      "a property with an unusual feature",
      "a home in one of your target neighborhoods",
    ],
    angles: [
      "Create separate content around the home, neighborhood and market lesson.",
      "Use the property to demonstrate expertise rather than simply advertising it.",
    ],
  },

  {
    id: "vendor_referral",
    category: "Referrals",
    title: "Develop a professional referral relationship.",
    action:
      "Reach out to {audience}. {angle} Look for a relationship where both sides can genuinely help clients.",
    audiences: [
      "a strong local lender",
      "a CPA or financial advisor",
      "an estate-planning attorney",
      "a contractor, insurance professional or home-service provider",
    ],
    angles: [
      "Invite them to coffee and learn what an ideal referral looks like for them.",
      "Discuss one useful resource you could create together for homeowners.",
    ],
  },

  {
    id: "agent_referral",
    category: "Referrals",
    title: "Build an agent-to-agent referral source.",
    action:
      "Identify {audience}. {angle} Relationships with agents outside your market can generate recurring business.",
    audiences: [
      "agents in feeder markets",
      "agents in cities where your clients commonly relocate",
      "high-performing agents outside your immediate service area",
      "agents you have previously worked with successfully",
    ],
    angles: [
      "Introduce yourself personally and explain the markets you serve.",
      "Offer to become their reliable Northern Nevada referral resource.",
    ],
  },

  {
    id: "database_property_data",
    category: "Database Mining",
    title: "Make your database smarter.",
    action:
      "Review {audience}. {angle} Better property data creates future listing opportunities DealPilot can identify automatically.",
    audiences: [
      "contacts with no property address",
      "past clients missing purchase or closing information",
      "sphere contacts whose homeownership status is unknown",
      "older imported contacts with incomplete profiles",
    ],
    angles: [
      "Add property and relationship information to the highest-value records.",
      "Complete a small batch rather than trying to clean the entire database today.",
    ],
  },

  {
    id: "database_stale",
    category: "Database Mining",
    title: "Mine your database for forgotten opportunities.",
    action:
      "Pull {audience}. {angle} These contacts already know you, which makes them more valuable than cold names.",
    audiences: [
      "contacts with no activity in 90+ days",
      "old prospects who never reached a final decision",
      "contacts who once showed strong engagement",
      "people who previously discussed a move but never acted",
    ],
    angles: [
      "Choose five and make genuinely personal contact.",
      "Review the notes first so your outreach references their actual situation.",
    ],
  },

  {
    id: "review_request",
    category: "Branding",
    title: "Strengthen your online reputation.",
    action:
      "Contact {audience}. {angle} Consistent reviews compound credibility over time.",
    audiences: [
      "recent clients who were clearly happy with the experience",
      "past clients who have thanked you but never left a review",
      "repeat or referral clients",
      "clients from memorable successful transactions",
    ],
    angles: [
      "Send a short personal review request.",
      "Explain that their review helps future clients feel comfortable choosing you.",
    ],
  },

  {
    id: "thirty_minute_block",
    category: "Daily Prospecting",
    title: "Use one focused prospecting block.",
    action:
      "Spend 30 minutes on {audience}. {angle} Protect the block from email and administrative distractions.",
    audiences: [
      "personal phone calls",
      "past-client conversations",
      "seller prospecting",
      "buyer follow-up",
    ],
    angles: [
      "Measure conversations created, not calls attempted.",
      "Choose one audience and stay focused on it for the entire block.",
    ],
  },

  {
    id: "market_trigger",
    category: "Market Opportunities",
    title: "Turn today's market into a reason to call.",
    action:
      "Identify {audience}. {angle} Market movement becomes valuable when you translate it into a client's personal situation.",
    audiences: [
      "buyers sensitive to mortgage payments",
      "homeowners watching neighborhood values",
      "sellers worried about inventory competition",
      "people waiting for the 'right time' to make a move",
    ],
    angles: [
      "Explain one current change and what it may mean for them.",
      "Ask whether today's conditions change anything about their timeline.",
    ],
  },
];

/* =====================================================
   BUILD THE 224-SUGGESTION POOL
   ===================================================== */

function rlBuildGrowthSuggestionPool() {
  const pool = [];

  RL_GROWTH_PLAYS.forEach((play) => {
    play.audiences.forEach((audience, audienceIndex) => {
      play.angles.forEach((angle, angleIndex) => {
        pool.push({
          id: `${play.id}-${audienceIndex}-${angleIndex}`,
          playId: play.id,
          category: play.category,
          title: play.title,
          text: play.action
            .replace("{audience}", audience)
            .replace("{angle}", angle),
        });
      });
    });
  });

  return pool;
}

const RL_GROWTH_SUGGESTIONS = rlBuildGrowthSuggestionPool();

/* =====================================================
   HISTORY
   ===================================================== */

function rlGrowthReadHistory() {
  try {
    const history = JSON.parse(
      localStorage.getItem(RL_GROWTH_HISTORY_KEY) || "[]",
    );

    return Array.isArray(history) ? history : [];
  } catch {
    return [];
  }
}

function rlGrowthSaveHistory(history) {
  try {
    localStorage.setItem(
      RL_GROWTH_HISTORY_KEY,
      JSON.stringify(history.slice(0, RL_GROWTH_MAX_HISTORY)),
    );
  } catch {
    // Growth Mode must never break the Dashboard.
  }
}

function rlGrowthReadCategoryHistory() {
  try {
    const history = JSON.parse(
      localStorage.getItem(RL_GROWTH_CATEGORY_HISTORY_KEY) || "[]",
    );

    return Array.isArray(history) ? history : [];
  } catch {
    return [];
  }
}

function rlGrowthSaveCategoryHistory(history) {
  try {
    localStorage.setItem(
      RL_GROWTH_CATEGORY_HISTORY_KEY,
      JSON.stringify(history.slice(0, 20)),
    );
  } catch {
    // Ignore localStorage failures.
  }
}

/* =====================================================
   SUPPRESSION
   ===================================================== */

function rlGrowthSuppressionCutoff() {
  return Date.now() - RL_GROWTH_SUPPRESSION_DAYS * 86400000;
}

function rlGrowthRecentlyShownIds() {
  const cutoff = rlGrowthSuppressionCutoff();

  return new Set(
    rlGrowthReadHistory()
      .filter((item) => Number(item.shownAt || 0) >= cutoff)
      .map((item) => String(item.id || "")),
  );
}

function rlGrowthRecentCategories() {
  return rlGrowthReadCategoryHistory()
    .slice(0, 3)
    .map((item) => String(item.category || ""));
}

/* =====================================================
   SELECTION
   ===================================================== */

function rlGrowthShuffle(items = []) {
  const copy = [...items];

  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }

  return copy;
}

function rlGrowthPickSuggestion({ excludeId = "" } = {}) {
  const recentlyShown = rlGrowthRecentlyShownIds();
  const recentCategories = rlGrowthRecentCategories();

  let candidates = RL_GROWTH_SUGGESTIONS.filter(
    (item) =>
      item.id !== excludeId &&
      !recentlyShown.has(item.id) &&
      !recentCategories.includes(item.category),
  );

  /*
  If category diversity makes the pool too small,
  allow recent categories but still suppress the exact idea.
  */
  if (!candidates.length) {
    candidates = RL_GROWTH_SUGGESTIONS.filter(
      (item) => item.id !== excludeId && !recentlyShown.has(item.id),
    );
  }

  /*
  If the user somehow burns through the entire 90-day pool,
  allow older ideas again rather than showing nothing.
  */
  if (!candidates.length) {
    candidates = RL_GROWTH_SUGGESTIONS.filter((item) => item.id !== excludeId);
  }

  const suggestion = rlGrowthShuffle(candidates)[0];

  if (!suggestion) return null;

  const history = rlGrowthReadHistory();

  history.unshift({
    id: suggestion.id,
    category: suggestion.category,
    shownAt: Date.now(),
  });

  rlGrowthSaveHistory(history);

  const categoryHistory = rlGrowthReadCategoryHistory();

  categoryHistory.unshift({
    category: suggestion.category,
    shownAt: Date.now(),
  });

  rlGrowthSaveCategoryHistory(categoryHistory);

  return suggestion;
}

/* =====================================================
   TODAY'S STABLE SUGGESTION

   Keep the same recommendation during the day instead
   of changing every time the page rerenders.
   ===================================================== */

const RL_GROWTH_TODAY_KEY = "rapportlinkDealPilotGrowthTodayV1";

function rlGrowthTodayDateKey() {
  const now = new Date();

  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
}

function rlGrowthGetTodaySuggestion() {
  const today = rlGrowthTodayDateKey();

  try {
    const stored = JSON.parse(
      localStorage.getItem(RL_GROWTH_TODAY_KEY) || "null",
    );

    if (
      stored &&
      stored.date === today &&
      stored.suggestion &&
      stored.suggestion.id
    ) {
      return stored.suggestion;
    }
  } catch {
    // Ignore invalid stored data.
  }

  const suggestion = rlGrowthPickSuggestion();

  if (!suggestion) return null;

  try {
    localStorage.setItem(
      RL_GROWTH_TODAY_KEY,
      JSON.stringify({
        date: today,
        suggestion,
      }),
    );
  } catch {
    // Ignore storage errors.
  }

  return suggestion;
}

/* =====================================================
   GIVE ME ANOTHER IDEA
   ===================================================== */

function rlGrowthGetAnotherSuggestion(currentId = "") {
  const suggestion = rlGrowthPickSuggestion({
    excludeId: currentId,
  });

  if (!suggestion) return null;

  try {
    localStorage.setItem(
      RL_GROWTH_TODAY_KEY,
      JSON.stringify({
        date: rlGrowthTodayDateKey(),
        suggestion,
      }),
    );
  } catch {
    // Ignore storage errors.
  }

  return suggestion;
}

/* =====================================================
   OPTIONAL DEBUGGING
   ===================================================== */

window.rlDealPilotGrowth = {
  suggestions: RL_GROWTH_SUGGESTIONS,
  getTodaySuggestion: rlGrowthGetTodaySuggestion,
  getAnotherSuggestion: rlGrowthGetAnotherSuggestion,
  totalSuggestions: RL_GROWTH_SUGGESTIONS.length,
};
