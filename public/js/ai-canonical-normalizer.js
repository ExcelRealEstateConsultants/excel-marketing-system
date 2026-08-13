/* =====================================================
   RapportLink Canonical Normalizer
   Version 1
   ===================================================== */

"use strict";

const AI_CANONICAL_NORMALIZER_VERSION = 1;

function normalizeUniversalAnalysisToCanonicalEvidence(
  analysis = {},
  options = {},
) {
  const isObject = (value) =>
    value !== null && typeof value === "object" && !Array.isArray(value);

  const asObject = (value) => (isObject(value) ? value : {});

  const asArray = (value) => (Array.isArray(value) ? value : []);

  const hasValue = (value) =>
    value !== undefined &&
    value !== null &&
    !(typeof value === "string" && value.trim() === "");

  const firstValue = (...values) => values.find((value) => hasValue(value));

  const text = (value) =>
    String(value === undefined || value === null ? "" : value).trim();

  const normalizedText = (value) =>
    text(value)
      .toLowerCase()
      .replace(/[’']/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();

  const normalizedKey = (value) => normalizedText(value).replace(/\s+/g, "");

  const normalizeConfidence = (value, fallback = 50) => {
    const number = Number(value);

    if (!Number.isFinite(number)) {
      return fallback;
    }

    const percent = number <= 1 ? number * 100 : number;

    return Math.max(0, Math.min(100, Math.round(percent)));
  };

  const normalizeMoney = (value) => {
    if (!hasValue(value)) {
      return null;
    }

    if (typeof value === "number") {
      return Number.isFinite(value) ? value : null;
    }

    const cleaned = text(value).replace(/[$,\s]/g, "");
    const number = Number(cleaned);

    return Number.isFinite(number) ? number : null;
  };

  const normalizeInteger = (value) => {
    if (!hasValue(value)) {
      return null;
    }

    const cleaned =
      typeof value === "string" ? value.replace(/[^\d.-]/g, "") : value;

    const number = Number(cleaned);

    return Number.isFinite(number) ? Math.round(number) : null;
  };

  const normalizeDate = (value) => {
    if (!hasValue(value)) {
      return "";
    }

    const raw = text(value);

    const isoMatch = raw.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);

    if (isoMatch) {
      return isoMatch[0];
    }

    const slashMatch = raw.match(/\b(\d{1,2})\/(\d{1,2})\/(20\d{2})\b/);

    if (slashMatch) {
      const month = slashMatch[1].padStart(2, "0");
      const day = slashMatch[2].padStart(2, "0");
      const year = slashMatch[3];

      return `${year}-${month}-${day}`;
    }

    const parsed = new Date(raw);

    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(0, 10);
    }

    return "";
  };

  const sourceDocument =
    options.document && typeof options.document === "object"
      ? options.document
      : {};

  const nestedAnalysis = isObject(analysis.universalAnalysis)
    ? analysis.universalAnalysis
    : {};

  const classification = asObject(
    firstValue(analysis.classification, nestedAnalysis.classification, {}),
  );

  const documentType = text(
    firstValue(
      analysis.documentType,
      classification.documentType,
      nestedAnalysis.documentType,
      nestedAnalysis.classification?.documentType,
      sourceDocument.documentType,
      sourceDocument.name,
      "",
    ),
  );

  const documentPurpose = text(
    firstValue(
      analysis.documentPurpose,
      classification.documentPurpose,
      nestedAnalysis.documentPurpose,
      nestedAnalysis.classification?.documentPurpose,
      "",
    ),
  );

  const documentEffect = text(
    firstValue(
      analysis.transactionEffect,
      analysis.documentEffect,
      classification.documentEffect,
      nestedAnalysis.transactionEffect,
      nestedAnalysis.documentEffect,
      nestedAnalysis.classification?.documentEffect,
      "",
    ),
  );

  const semanticDocumentText = normalizedText(
    [documentType, documentPurpose, documentEffect].join(" "),
  );

  const canonical = {
    version: AI_CANONICAL_NORMALIZER_VERSION,

    sourceDocumentId: firstValue(
      analysis.documentId,
      nestedAnalysis.documentId,
      sourceDocument.id,
      null,
    ),

    sourceDocumentName: firstValue(
      analysis.documentName,
      nestedAnalysis.documentName,
      sourceDocument.name,
      "Uploaded Document",
    ),

    sourceDocumentType: documentType,

    documentRole: "unknown",

    executionStatus: "unknown",

    legalEffects: [],

    canonicalFacts: {},

    canonicalDates: {},

    relativeDeadlines: {},

    canonicalParties: {},

    canonicalProperty: {},

    evidence: [],

    warnings: [],

    sourceAnalysis: analysis,

    sourceDocument,
  };

  const pushUnique = (array, item, makeKey) => {
    const key = makeKey(item);

    if (!array.some((existing) => makeKey(existing) === key)) {
      array.push(item);
    }
  };

  const addWarning = (message) => {
    const clean = text(message);

    if (clean && !canonical.warnings.includes(clean)) {
      canonical.warnings.push(clean);
    }
  };

  const addLegalEffect = (type, details = {}) => {
    if (!type) {
      return;
    }

    pushUnique(
      canonical.legalEffects,
      {
        type,
        occurred: details.occurred !== false,
        date: normalizeDate(details.date),
        confidence: normalizeConfidence(details.confidence, 70),
        supportingText: text(details.supportingText),
        sourceDocumentId: canonical.sourceDocumentId,
        sourceDocument: canonical.sourceDocumentName,
      },
      (item) => [item.type, item.date, item.sourceDocumentId].join("|"),
    );
  };

  const addEvidence = ({
    key,
    value,
    type = "fact",
    confidence = 50,
    supportingText = "",
    eventDate = "",
    metadata = {},
  }) => {
    if (!key || !hasValue(value)) {
      return;
    }

    pushUnique(
      canonical.evidence,
      {
        key,
        value,
        type,
        confidence: normalizeConfidence(confidence, 50),
        supportingText: text(supportingText),
        eventDate: normalizeDate(eventDate),
        documentId: canonical.sourceDocumentId,
        documentName: canonical.sourceDocumentName,
        documentType: canonical.sourceDocumentType,
        extractedBy: "canonical_normalizer",
        metadata: {
          ...asObject(metadata),
          normalizerVersion: AI_CANONICAL_NORMALIZER_VERSION,
        },
      },
      (item) =>
        [
          item.key,
          JSON.stringify(item.value),
          item.documentId,
          item.eventDate,
        ].join("|"),
    );
  };

  const setCanonicalFact = (key, value, details = {}) => {
    if (!key || !hasValue(value)) {
      return;
    }

    canonical.canonicalFacts[key] = value;

    addEvidence({
      key,
      value,
      type: details.type || "fact",
      confidence: details.confidence || 50,
      supportingText: details.supportingText || "",
      eventDate: details.eventDate || "",
      metadata: {
        originalKey: details.originalKey || key,
        sourceCollection: details.sourceCollection || "",
        legalEffect: details.legalEffect || "",
      },
    });
  };

  const setCanonicalDate = (key, value, details = {}) => {
    const normalized = normalizeDate(value);

    if (!normalized) {
      return;
    }

    canonical.canonicalDates[key] = normalized;

    setCanonicalFact(key, normalized, {
      ...details,
      type: "date",
    });
  };

  const factAliases = {
    purchasePrice: [
      "purchaseprice",
      "salesprice",
      "saleprice",
      "contractprice",
      "listingprice",
      "listprice",
      "newlistingprice",
      "newlistprice",
      "revisedlistingprice",
      "revisedlistprice",
      "newprice",
      "price",
    ],

    earnestMoney: [
      "earnestmoney",
      "earnestmoneydeposit",
      "depositamount",
      "initialdeposit",
    ],

    optionFee: ["optionfee", "terminationoptionfee"],

    optionDays: ["optiondays", "optionperioddays", "terminationperioddays"],

    sellerCredit: [
      "sellercredit",
      "sellercredits",
      "sellerconcession",
      "sellerconcessions",
      "sellercontribution",
      "closingcostcredit",
      "creditamount",
    ],

    appraisalValue: [
      "appraisalvalue",
      "appraisedvalue",
      "cdaValue",
      "valuationamount",
    ],

    loanAmount: ["loanamount", "financingportion", "mortgageamount"],

    commissionPercent: [
      "commissionpercent",
      "commissionpercentage",
      "brokercommissionpercent",
      "listingcommissionpercent",
      "brokercompensationpercent",
      "brokercompensationpercentage",
      "listingbrokercompensation",
      "listingbrokercompensationpercent",
      "listingbrokercompensationpercentage",
    ],

    commissionAmount: [
      "commissionamount",
      "brokercommission",
      "listingcommission",
    ],

    propertyAddress: ["propertyaddress", "subjectaddress", "address"],

    apn: ["apn", "assessorsparcelnumber", "parcelnumber", "taxparcelnumber"],

    legalDescription: ["legaldescription", "propertylegaldescription"],
  };

  const aliasLookup = new Map();

  Object.entries(factAliases).forEach(([canonicalKey, aliases]) => {
    aliases.forEach((alias) => {
      aliasLookup.set(normalizedKey(alias), canonicalKey);
    });
  });

  const canonicalFactKey = (key) => aliasLookup.get(normalizedKey(key)) || "";

  const processFact = (rawKey, rawValue, details = {}) => {
    const canonicalKey = canonicalFactKey(rawKey);

    if (!canonicalKey) {
      return;
    }

    let value = rawValue;

    if (
      [
        "purchasePrice",
        "earnestMoney",
        "optionFee",
        "sellerCredit",
        "appraisalValue",
        "loanAmount",
        "commissionAmount",
      ].includes(canonicalKey)
    ) {
      value = normalizeMoney(rawValue);
    }

    if (["optionDays"].includes(canonicalKey)) {
      value = normalizeInteger(rawValue);
    }

    if (canonicalKey === "commissionPercent") {
      const number = Number(String(rawValue).replace(/[^\d.-]/g, ""));

      value = Number.isFinite(number) ? number : null;
    }

    if (!hasValue(value)) {
      return;
    }

    setCanonicalFact(canonicalKey, value, {
      ...details,
      originalKey: rawKey,
    });

    if (canonicalKey === "propertyAddress") {
      canonical.canonicalProperty.address = value;
    }

    if (canonicalKey === "apn") {
      canonical.canonicalProperty.apn = value;
    }

    if (canonicalKey === "legalDescription") {
      canonical.canonicalProperty.legalDescription = value;
    }
  };

  const processFactsObject = (facts, details = {}) => {
    if (Array.isArray(facts)) {
      facts.forEach((fact) => {
        if (!isObject(fact)) {
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

        processFact(key, value, {
          ...details,
          confidence: fact.confidence || details.confidence,
          supportingText: fact.supportingText || details.supportingText,
        });
      });

      return;
    }

    if (!isObject(facts)) {
      return;
    }

    Object.entries(facts).forEach(([key, entry]) => {
      if (isObject(entry)) {
        processFact(
          key,
          firstValue(
            entry.value,
            entry.normalizedValue,
            entry.extractedValue,
            entry.content,
            entry.text,
          ),
          {
            ...details,
            confidence: entry.confidence || details.confidence,
            supportingText: entry.supportingText || details.supportingText,
          },
        );

        return;
      }

      processFact(key, entry, details);
    });
  };

  const processAmountsCollection = (amounts, collectionName) => {
    asArray(amounts).forEach((item) => {
      if (!isObject(item)) {
        return;
      }

      processFact(
        firstValue(item.amountType, item.type, item.name, item.label, ""),
        item.value,
        {
          confidence: item.confidence || 70,
          supportingText: item.supportingText || "",
          sourceCollection: collectionName,
        },
      );
    });
  };

  const processEvidenceCollection = (evidence, collectionName) => {
    const items = Array.isArray(evidence)
      ? evidence
      : isObject(evidence)
        ? [
            ...asArray(evidence.items),
            ...asArray(evidence.records),
            ...asArray(evidence.evidence),
          ]
        : [];

    items.forEach((item) => {
      if (!isObject(item)) {
        return;
      }

      const details = {
        confidence: item.confidence || 50,
        supportingText: item.supportingText || item.description || "",
        sourceCollection: collectionName,
        eventDate: firstValue(
          item.eventDate,
          item.effectiveDate,
          item.date,
          "",
        ),
      };

      processFact(
        firstValue(item.key, item.name, item.field, item.path, ""),
        firstValue(item.value, item.normalizedValue, item.content, item.text),
        details,
      );

      processFactsObject(item.facts, details);

      const evidenceType = normalizedText(item.type);

      if (
        evidenceType.includes("closing term") ||
        evidenceType.includes("closing date")
      ) {
        setCanonicalDate("closingDate", item.value, details);
      }

      if (evidenceType.includes("execution evidence")) {
        const executionDate = normalizeDate(item.value);

        if (executionDate) {
          setCanonicalDate("contractSignatureDate", executionDate, details);
        }
      }

      if (evidenceType.includes("inspection identification")) {
        const inspectionDate = item.facts?.inspectionDate;

        setCanonicalDate("inspectionDate", inspectionDate, details);
      }
    });
  };

  const dateAliases = {
    effectiveDate: [
      "effective date",
      "contract effective date",
      "agreement effective date",
    ],

    contractSignatureDate: [
      "contract signature date",
      "contract execution date",
      "execution date",
    ],

    closingDate: [
      "closing date",
      "scheduled closing date",
      "amended closing date",
      "revised closing date",
      "contractual closing date",
    ],

    actualClosingDate: [
      "actual closing date",
      "settlement date",
      "recording date",
      "funding date",
      "disbursement date",
    ],

    earnestMoneyDeadline: [
      "earnest money deadline",
      "earnest money delivery deadline",
      "earnest money and option fee delivery deadline",
      "deposit deadline",
    ],

    inspectionDeadline: [
      "inspection deadline",
      "inspection contingency deadline",
      "due diligence deadline",
      "option termination deadline",
      "inspection termination deadline",
    ],

    inspectionDate: [
      "inspection date",
      "inspection report date",
      "inspection/report date",
      "property inspection date",
    ],

    appraisalDeadline: ["appraisal deadline", "appraisal contingency deadline"],

    appraisalDate: [
      "appraisal date",
      "appraisal effective date",
      "original appraisal effective date",
      "appraisal report date",
      "cda review effective date",
    ],

    financingDeadline: [
      "financing deadline",
      "financing contingency deadline",
      "buyer financing approval termination deadline",
      "loan approval deadline",
      "buyer approval deadline",
    ],

    walkthroughDate: [
      "walkthrough date",
      "final walkthrough date",
      "final walk-through date",
    ],

    possessionDate: ["possession date", "occupancy date"],

    terminationDate: [
      "termination date",
      "cancellation date",
      "contract termination date",
    ],

    listingStartDate: ["listing start date", "listing commencement date"],

    listingExpirationDate: [
      "listing expiration date",
      "listing termination date",
    ],
  };

  const dateAliasLookup = new Map();

  Object.entries(dateAliases).forEach(([canonicalKey, aliases]) => {
    aliases.forEach((alias) => {
      dateAliasLookup.set(normalizedKey(alias), canonicalKey);
    });
  });

  const canonicalDateKey = (dateType) => {
    const key = normalizedKey(dateType);

    if (dateAliasLookup.has(key)) {
      return dateAliasLookup.get(key);
    }

    for (const [alias, canonicalKey] of dateAliasLookup.entries()) {
      if (key.includes(alias) || alias.includes(key)) {
        return canonicalKey;
      }
    }

    return "";
  };

  const processDatesCollection = (dates, collectionName) => {
    asArray(dates).forEach((dateItem) => {
      if (!isObject(dateItem)) {
        return;
      }

      const dateType = firstValue(
        dateItem.dateType,
        dateItem.type,
        dateItem.name,
        dateItem.label,
        dateItem.eventType,
        "",
      );

      const canonicalKey = canonicalDateKey(dateType);

      if (!canonicalKey) {
        return;
      }

      const rawValue = firstValue(
        dateItem.value,
        dateItem.date,
        dateItem.eventDate,
        dateItem.effectiveDate,
        dateItem.dueDate,
        dateItem.signedDate,
        "",
      );

      const normalized = normalizeDate(rawValue);

      if (!normalized) {
        const relativeValue = text(rawValue);

        if (dateItem.isDeadline === true && relativeValue) {
          canonical.relativeDeadlines[canonicalKey] = {
            value: relativeValue,
            dependsOn: relativeValue.toLowerCase().includes("effective date")
              ? "effectiveDate"
              : relativeValue.toLowerCase().includes("closing date")
                ? "closingDate"
                : "",
            confidence: normalizeConfidence(dateItem.confidence, 70),
            supportingText: text(dateItem.supportingText),
            sourceCollection: collectionName,
            originalType: text(dateType),
          };
        }

        return;
      }

      setCanonicalDate(canonicalKey, normalized, {
        confidence: dateItem.confidence || 70,
        supportingText: dateItem.supportingText || "",
        originalKey: dateType,
        sourceCollection: collectionName,
        eventDate: normalized,
      });
    });
  };

  const processParties = (parties) => {
    asArray(parties).forEach((party) => {
      if (!isObject(party)) {
        return;
      }

      const role = normalizedText(
        firstValue(party.role, party.partyRole, party.type, ""),
      );

      const value = firstValue(
        party.name,
        party.partyName,
        party.entityName,
        party.value,
        "",
      );

      if (!role || !value) {
        return;
      }

      const canonicalRole = CANONICAL_PARTY_ROLE_ALIASES[role] || "";

      if (!canonicalRole) {
        return;
      }

      canonical.canonicalParties[canonicalRole] = value;

      setCanonicalFact(canonicalRole, value, {
        type: "party",
        confidence: party.confidence || 70,
        supportingText: party.supportingText || "",
        sourceCollection: "parties",
      });
    });
  };

  const signatures = [
    ...asArray(analysis.signatures),
    ...asArray(nestedAnalysis.signatures),
  ];

  const signedSignatures = signatures.filter(
    (signature) => isObject(signature) && signature.signed === true,
  );

  const execution = asObject(
    firstValue(analysis.execution, nestedAnalysis.execution, {}),
  );

  const executionStatus = normalizedText(
    firstValue(
      analysis.executionStatus,
      analysis.documentExecutionStatus,
      analysis.signatureStatus,
      nestedAnalysis.executionStatus,
      nestedAnalysis.documentExecutionStatus,
      nestedAnalysis.signatureStatus,
      execution.status,
      "",
    ),
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
    executionStatus === "fully executed";

  canonical.executionStatus = explicitlyExecuted
    ? "fully_executed"
    : signedSignatures.length
      ? "partially_or_indirectly_supported"
      : "unknown";

  const roleChecks = [
    {
      role: "purchase_contract",
      terms: [
        "purchase agreement",
        "purchase contract",
        "sales contract",
        "agreement of sale",
        "offer to purchase",
        "residential contract",
      ],
    },
    {
      role: "listing_agreement",
      terms: [
        "listing agreement",
        "listing contract",
        "exclusive right to sell",
        "exclusive agency",
      ],
    },
    {
      role: "amendment",
      terms: [
        "amendment",
        "addendum",
        "modification",
        "change form",
        "extension",
      ],
    },
    {
      role: "termination",
      terms: ["termination", "cancellation", "release", "rescission"],
    },
    {
      role: "closing_document",
      terms: [
        "settlement statement",
        "closing disclosure",
        "alta statement",
        "disbursement authorization",
        "recording confirmation",
      ],
    },
    {
      role: "inspection_report",
      terms: ["inspection report", "property inspection"],
    },
    {
      role: "appraisal",
      terms: ["appraisal", "valuation", "desktop analysis"],
    },
    {
      role: "seller_disclosure",
      terms: [
        "seller disclosure",
        "property disclosure",
        "residential disclosure",
      ],
    },
  ];

  for (const roleCheck of roleChecks) {
    if (roleCheck.terms.some((term) => semanticDocumentText.includes(term))) {
      canonical.documentRole = roleCheck.role;
      break;
    }
  }

  if (
    canonical.documentRole === "purchase_contract" &&
    (explicitlyExecuted || signedSignatures.length >= 2)
  ) {
    addLegalEffect("contractExecuted", {
      date: firstValue(
        execution.effectiveDate,
        execution.executionDate,
        signedSignatures.find((signature) => signature.signedDate)?.signedDate,
        "",
      ),
      confidence: explicitlyExecuted ? 95 : 85,
      supportingText:
        documentEffect ||
        "The document creates a purchase obligation and contains execution evidence.",
    });
  }

  if (
    canonical.documentRole === "listing_agreement" &&
    (explicitlyExecuted || signedSignatures.length >= 1)
  ) {
    addLegalEffect("listingAgreementExecuted", {
      date: firstValue(
        execution.effectiveDate,
        execution.executionDate,
        signedSignatures.find((signature) => signature.signedDate)?.signedDate,
        "",
      ),
      confidence: explicitlyExecuted ? 95 : 85,
      supportingText:
        documentEffect ||
        "The document creates listing authority and contains execution evidence.",
    });
  }

  if (
    canonical.documentRole === "amendment" &&
    (explicitlyExecuted || signedSignatures.length >= 1)
  ) {
    addLegalEffect("amendmentEffective", {
      date: firstValue(
        execution.effectiveDate,
        execution.executionDate,
        analysis.effectiveDate,
        signedSignatures.find((signature) => signature.signedDate)?.signedDate,
        "",
      ),
      confidence: explicitlyExecuted ? 95 : 85,
      supportingText:
        documentEffect || "The document modifies a prior agreement.",
    });
  }

  if (
    canonical.documentRole === "termination" &&
    (explicitlyExecuted || signedSignatures.length >= 1)
  ) {
    addLegalEffect("terminationEffective", {
      date: firstValue(
        execution.effectiveDate,
        execution.executionDate,
        analysis.terminationDate,
        signedSignatures.find((signature) => signature.signedDate)?.signedDate,
        "",
      ),
      confidence: explicitlyExecuted ? 95 : 85,
      supportingText:
        documentEffect ||
        "The document terminates or cancels a prior agreement.",
    });
  }

  if (canonical.documentRole === "inspection_report") {
    addLegalEffect("inspectionCompleted", {
      date: firstValue(
        analysis.inspectionDate,
        nestedAnalysis.inspectionDate,
        "",
      ),
      confidence: 85,
      supportingText:
        documentEffect ||
        "The document reports a completed property inspection.",
    });
  }

  if (canonical.documentRole === "appraisal") {
    addLegalEffect("appraisalCompleted", {
      date: firstValue(
        analysis.appraisalDate,
        analysis.effectiveDate,
        nestedAnalysis.appraisalDate,
        nestedAnalysis.effectiveDate,
        "",
      ),
      confidence: 85,
      supportingText:
        documentEffect ||
        "The document reports a completed appraisal or valuation.",
    });
  }

  processEvidenceCollection(analysis.evidence, "analysis.evidence");

  processEvidenceCollection(
    nestedAnalysis.evidence,
    "universalAnalysis.evidence",
  );

  processFactsObject(analysis.facts, {
    sourceCollection: "analysis.facts",
  });

  processFactsObject(nestedAnalysis.facts, {
    sourceCollection: "universalAnalysis.facts",
  });

  processDatesCollection(analysis.dates, "analysis.dates");

  processDatesCollection(nestedAnalysis.dates, "universalAnalysis.dates");

  const CANONICAL_PARTY_ROLE_ALIASES = {
    /*
     * Core transaction parties
     */

    buyer: "buyer",
    purchaser: "buyer",
    vendee: "buyer",

    seller: "seller",
    owner: "seller",
    vendor: "seller",

    /*
     * Buyer representation
     */

    "buyers agent": "buyerAgent",
    "buyer agent": "buyerAgent",
    "buying agent": "buyerAgent",
    "selling agent": "buyerAgent",
    "buyers representative": "buyerAgent",
    "buyer representative": "buyerAgent",
    "tenant representative": "tenantRepresentative",
    "tenant rep": "tenantRepresentative",

    "buyers broker": "buyerBroker",
    "buyer broker": "buyerBroker",
    "selling broker": "buyerBroker",
    "cooperating broker": "buyerBroker",

    /*
     * Seller and listing representation
     */

    "sellers agent": "listingAgent",
    "seller agent": "listingAgent",
    "listing agent": "listingAgent",
    "listing licensee": "listingAgent",
    "seller licensee": "listingAgent",
    "landlords agent": "landlordAgent",
    "landlord agent": "landlordAgent",
    "leasing agent": "leasingAgent",

    "sellers broker": "listingBroker",
    "seller broker": "listingBroker",
    "listing broker": "listingBroker",
    "landlords broker": "landlordBroker",
    "landlord broker": "landlordBroker",
    "leasing broker": "leasingBroker",

    /*
     * Leasing and property management
     */

    landlord: "landlord",
    lessor: "landlord",

    tenant: "tenant",
    lessee: "tenant",
    "residential tenant": "tenant",
    "commercial tenant": "commercialTenant",

    "property manager": "propertyManager",
    "property management company": "propertyManager",
    "community manager": "propertyManager",
    "asset manager": "assetManager",

    guarantor: "guarantor",
    occupant: "occupant",
    resident: "resident",

    /*
     * Ownership and legal capacity
     */

    trustee: "trustee",
    "successor trustee": "trustee",
    "co trustee": "trustee",
    cotrustee: "trustee",

    "personal representative": "personalRepresentative",
    administrator: "personalRepresentative",
    administratrix: "personalRepresentative",

    executor: "executor",
    executrix: "executor",

    guardian: "guardian",
    conservator: "conservator",

    attorney: "attorney",
    "attorney in fact": "attorneyInFact",
    "power of attorney": "attorneyInFact",

    corporation: "corporation",
    company: "company",
    partnership: "partnership",
    "limited partnership": "limitedPartnership",

    llc: "limitedLiabilityCompany",
    "limited liability company": "limitedLiabilityCompany",
    "llc manager": "llcManager",
    manager: "manager",
    member: "llcMember",
    "managing member": "llcManager",

    trust: "trust",
    estate: "estate",

    /*
     * Escrow, title, and settlement
     */

    "escrow agent": "escrowAgent",
    "escrow officer": "escrowOfficer",
    escrow: "escrowCompany",

    "title company": "titleCompany",
    "title officer": "titleOfficer",
    "title agent": "titleAgent",
    "settlement agent": "settlementAgent",
    "closing agent": "closingAgent",

    /*
     * Financing
     */

    lender: "lender",
    creditor: "lender",

    "loan officer": "loanOfficer",
    "mortgage broker": "mortgageBroker",
    "loan originator": "loanOfficer",
    "mortgage loan originator": "loanOfficer",
    underwriter: "underwriter",

    /*
     * Property professionals and vendors
     */

    inspector: "inspector",
    "home inspector": "inspector",
    "property inspector": "inspector",

    appraiser: "appraiser",
    "review appraiser": "reviewAppraiser",

    surveyor: "surveyor",
    engineer: "engineer",
    architect: "architect",

    contractor: "contractor",
    builder: "builder",
    developer: "developer",

    photographer: "photographer",
    "insurance agent": "insuranceAgent",
    insurer: "insuranceCompany",
    "home warranty company": "homeWarrantyCompany",

    /*
     * Associations
     */

    "property owners association": "hoa",
    "homeowners association": "hoa",
    "home owners association": "hoa",
    hoa: "hoa",

    "property owners association manager": "hoaManager",
    "homeowners association manager": "hoaManager",
    "association manager": "hoaManager",
    "hoa manager": "hoaManager",

    /*
     * Government and recording
     */

    recorder: "recorder",
    "county recorder": "recorder",
    assessor: "assessor",
    "tax assessor": "assessor",
    notary: "notary",
    "notary public": "notary",
  };

  processParties(
    firstValue(
      analysis.parties,
      analysis.people,
      nestedAnalysis.parties,
      nestedAnalysis.people,
      [],
    ),
  );

  asArray(
    firstValue(
      analysis.transactionEvents,
      nestedAnalysis.transactionEvents,
      [],
    ),
  ).forEach((event) => {
    if (!isObject(event)) {
      return;
    }

    const type = normalizedKey(
      firstValue(event.type, event.eventType, event.name, ""),
    );

    const eventDate = firstValue(
      event.eventDate,
      event.date,
      event.effectiveDate,
      "",
    );

    if (type.includes("closingdateamended")) {
      const date = normalizeDate(
        firstValue(event.newValue, event.value, event.dueDate, ""),
      );

      if (date) {
        setCanonicalDate("closingDate", date, {
          confidence: event.confidence || 90,
          supportingText: event.supportingText || event.description || "",
          eventDate,
          originalKey: event.eventType || event.type,
          sourceCollection: "transactionEvents",
          legalEffect: "amendmentEffective",
        });
      }
    }
  });

  if (
    !Object.keys(canonical.canonicalFacts).length &&
    !canonical.legalEffects.length
  ) {
    addWarning(
      "No canonical facts or legal effects were produced from this analysis.",
    );
  }

  return canonical;
}

function aiTestCanonicalNormalizer(analysis = {}) {
  const result = normalizeUniversalAnalysisToCanonicalEvidence(analysis);

  console.log("CANONICAL NORMALIZER RESULT");
  console.log(result);

  return result;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    normalizeUniversalAnalysisToCanonicalEvidence,
    AI_CANONICAL_NORMALIZER_VERSION,
  };
}

if (typeof window !== "undefined") {
  window.normalizeUniversalAnalysisToCanonicalEvidence =
    normalizeUniversalAnalysisToCanonicalEvidence;

  window.aiTestCanonicalNormalizer = aiTestCanonicalNormalizer;

  window.AI_CANONICAL_NORMALIZER_VERSION = AI_CANONICAL_NORMALIZER_VERSION;
}
