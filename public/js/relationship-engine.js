/* =====================================================
   RapportLink Relationship Engine
   Version 2
   Universal Relationship Graph Foundation
   ===================================================== */

console.log("Relationship Engine Loaded");

window.RelationshipEngine = {
  version: "2.0",

  STORAGE_KEY: "rapportlink_relationship_graph_v2",

  defaultData() {
    return {
      registry: [],
      people: [],
      households: [],
      companies: [],
      vendors: [],
      properties: [],
      transactions: [],
      documents: [],
      tasks: [],
      calendarEvents: [],
      communications: [],
      campaigns: [],
      relationships: [],
      timeline: [],
    };
  },

  load() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (!raw) return this.defaultData();

      return {
        ...this.defaultData(),
        ...JSON.parse(raw),
      };
    } catch (err) {
      console.error("RelationshipEngine load error:", err);
      return this.defaultData();
    }
  },

  save(data) {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
      return true;
    } catch (err) {
      console.error("RelationshipEngine save error:", err);
      return false;
    }
  },

  generateId(prefix) {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  },

  now() {
    return new Date().toISOString();
  },

  getBucketName(type) {
    const map = {
      person: "people",
      household: "households",
      company: "companies",
      vendor: "vendors",
      property: "properties",
      transaction: "transactions",
      document: "documents",
      task: "tasks",
      calendarEvent: "calendarEvents",
      communication: "communications",
      campaign: "campaigns",
    };

    return map[type] || "";
  },

  upsertRegistryItem(data, item) {
    const existingIndex = data.registry.findIndex(
      (entry) => entry.id === item.id,
    );

    const registryItem = {
      id: item.id,
      type: item.type,
      label:
        item.label ||
        item.fullName ||
        item.name ||
        item.address ||
        item.title ||
        "Untitled",
      searchableText: this.buildSearchableText(item),
      createdAt: item.createdAt || this.now(),
      updatedAt: this.now(),
    };

    if (existingIndex >= 0) {
      data.registry[existingIndex] = {
        ...data.registry[existingIndex],
        ...registryItem,
      };
    } else {
      data.registry.push(registryItem);
    }
  },

  buildSearchableText(item) {
    return Object.values(item)
      .filter((value) => typeof value === "string")
      .join(" ")
      .toLowerCase();
  },

  createRecord(type, record = {}) {
    const data = this.load();
    const bucket = this.getBucketName(type);

    if (!bucket) {
      console.warn("RelationshipEngine unknown record type:", type);
      return null;
    }

    const newRecord = {
      ...record,
      id: record.id || this.generateId(type),
      type,
      createdAt: record.createdAt || this.now(),
      updatedAt: this.now(),
    };

    data[bucket].push(newRecord);
    this.upsertRegistryItem(data, newRecord);

    this.addTimelineEvent(data, {
      eventType: "record_created",
      recordType: type,
      recordId: newRecord.id,
      title: `${type} created`,
      description:
        newRecord.fullName ||
        newRecord.name ||
        newRecord.address ||
        newRecord.title ||
        "",
    });

    this.save(data);
    return newRecord;
  },

  createPerson(person = {}) {
    return this.createRecord("person", {
      firstName: person.firstName || "",
      lastName: person.lastName || "",
      fullName:
        person.fullName ||
        person.name ||
        `${person.firstName || ""} ${person.lastName || ""}`.trim(),
      email: person.email || "",
      phone: person.phone || "",
      tags: Array.isArray(person.tags) ? person.tags : [],
      notes: person.notes || "",
    });
  },

  createHousehold(household = {}) {
    return this.createRecord("household", {
      name: household.name || "New Household",
      members: Array.isArray(household.members) ? household.members : [],
      notes: household.notes || "",
    });
  },

  createCompany(company = {}) {
    return this.createRecord("company", {
      name: company.name || "New Company",
      companyType: company.companyType || "",
      website: company.website || "",
      phone: company.phone || "",
      email: company.email || "",
      address: company.address || "",
      notes: company.notes || "",
    });
  },

  createVendor(vendor = {}) {
    return this.createRecord("vendor", {
      personId: vendor.personId || "",
      companyId: vendor.companyId || "",
      vendorType: vendor.vendorType || "",
      preferred: Boolean(vendor.preferred),
      rating: vendor.rating || "",
      coverageArea: Array.isArray(vendor.coverageArea)
        ? vendor.coverageArea
        : [],
      notes: vendor.notes || "",
    });
  },

  createProperty(property = {}) {
    return this.createRecord("property", {
      address: property.address || "",
      city: property.city || "",
      state: property.state || "",
      zip: property.zip || "",
      propertyType: property.propertyType || "",
      notes: property.notes || "",
    });
  },

  createTransaction(transaction = {}) {
    return this.createRecord("transaction", {
      title: transaction.title || transaction.address || "New Transaction",
      transactionType: transaction.transactionType || "",
      status: transaction.status || "",
      propertyId: transaction.propertyId || "",
      closeDate: transaction.closeDate || "",
      notes: transaction.notes || "",
    });
  },

  linkRecords(link = {}) {
    const data = this.load();

    const relationship = {
      id: link.id || this.generateId("rel"),
      fromType: link.fromType || "",
      fromId: link.fromId || "",
      toType: link.toType || "",
      toId: link.toId || "",

      relationshipType: link.relationshipType || "",

      fromRole: link.fromRole || link.relationshipType || "",
      toRole: link.toRole || "",

      fromRoles: Array.isArray(link.fromRoles)
        ? link.fromRoles
        : [link.fromRole || link.relationshipType || "Relationship"].filter(
            Boolean,
          ),

      toRoles: Array.isArray(link.toRoles)
        ? link.toRoles
        : [link.toRole || "Related Contact"].filter(Boolean),

      connectionContext: Array.isArray(link.connectionContext)
        ? link.connectionContext
        : [],

      sharedTransactions: Array.isArray(link.sharedTransactions)
        ? link.sharedTransactions
        : [],

      sharedProperties: Array.isArray(link.sharedProperties)
        ? link.sharedProperties
        : [],

      notes: link.notes || "",

      createdAt: link.createdAt || this.now(),
      updatedAt: this.now(),
    };

    if (
      !relationship.fromType ||
      !relationship.fromId ||
      !relationship.toType ||
      !relationship.toId
    ) {
      console.warn(
        "RelationshipEngine linkRecords missing required fields:",
        relationship,
      );
      return null;
    }

    const duplicate = data.relationships.some(
      (rel) =>
        rel.fromType === relationship.fromType &&
        rel.fromId === relationship.fromId &&
        rel.toType === relationship.toType &&
        rel.toId === relationship.toId &&
        rel.relationshipType === relationship.relationshipType,
    );

    if (duplicate) {
      console.info(
        "RelationshipEngine duplicate relationship skipped:",
        relationship,
      );
      return null;
    }

    data.relationships.push(relationship);

    this.addTimelineEvent(data, {
      eventType: "relationship_created",
      recordType: relationship.fromType,
      recordId: relationship.fromId,
      relatedType: relationship.toType,
      relatedId: relationship.toId,
      title: `Relationship added: ${relationship.relationshipType || "Linked"}`,
      description: relationship.notes || "",
    });

    this.save(data);
    return relationship;
  },

  getRelationshipsFor(recordType, recordId) {
    const data = this.load();

    return data.relationships.filter(
      (rel) =>
        (rel.fromType === recordType && rel.fromId === recordId) ||
        (rel.toType === recordType && rel.toId === recordId),
    );
  },

  getLinkedRecords(recordType, recordId) {
    const data = this.load();
    const relationships = this.getRelationshipsFor(recordType, recordId);

    return relationships.map((rel) => {
      const isFrom = rel.fromType === recordType && rel.fromId === recordId;

      const linkedType = isFrom ? rel.toType : rel.fromType;
      const linkedId = isFrom ? rel.toId : rel.fromId;
      const bucket = this.getBucketName(linkedType);

      return {
        relationship: rel,
        linkedType,
        linkedId,
        linkedRecord:
          data[bucket]?.find((item) => item.id === linkedId) || null,
      };
    });
  },

  addTimelineEvent(data, event = {}) {
    data.timeline.push({
      id: event.id || this.generateId("timeline"),
      eventType: event.eventType || "note",
      recordType: event.recordType || "",
      recordId: event.recordId || "",
      relatedType: event.relatedType || "",
      relatedId: event.relatedId || "",
      title: event.title || "Timeline Event",
      description: event.description || "",
      occurredAt: event.occurredAt || this.now(),
      createdAt: event.createdAt || this.now(),
    });
  },

  getTimelineFor(recordType, recordId) {
    const data = this.load();

    return data.timeline
      .filter(
        (event) =>
          (event.recordType === recordType && event.recordId === recordId) ||
          (event.relatedType === recordType && event.relatedId === recordId),
      )
      .sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt));
  },

  searchAll(query = "") {
    const data = this.load();
    const q = query.toLowerCase().trim();

    if (!q) return data.registry;

    return data.registry.filter(
      (item) =>
        item.searchableText.includes(q) ||
        item.label.toLowerCase().includes(q) ||
        item.type.toLowerCase().includes(q),
    );
  },

  migrateExistingContacts(existingContacts = []) {
    const data = this.load();

    existingContacts.forEach((contact) => {
      const contactEmail = contact.email || "";
      const contactName = contact.name || contact.fullName || "";

      const alreadyExists = data.people.some(
        (person) =>
          (contactEmail && person.email === contactEmail) ||
          (contactName && person.fullName === contactName),
      );

      if (alreadyExists) return;

      const person = {
        id: contact.relationshipId || this.generateId("person"),
        type: "person",
        firstName: contact.firstName || "",
        lastName: contact.lastName || "",
        fullName:
          contactName ||
          `${contact.firstName || ""} ${contact.lastName || ""}`.trim(),
        email: contact.email || "",
        phone: contact.phone || "",
        tags: Array.isArray(contact.tags) ? contact.tags : [],
        notes: contact.notes || "",
        sourceContactId: contact.id || "",
        createdAt: contact.createdAt || this.now(),
        updatedAt: this.now(),
      };

      data.people.push(person);
      this.upsertRegistryItem(data, person);
    });

    this.save(data);
    return data.people;
  },

  rebuildRegistry() {
    const data = this.load();
    data.registry = [];

    [
      "people",
      "households",
      "companies",
      "vendors",
      "properties",
      "transactions",
      "documents",
      "tasks",
      "calendarEvents",
      "communications",
      "campaigns",
    ].forEach((bucket) => {
      data[bucket].forEach((item) => this.upsertRegistryItem(data, item));
    });

    this.save(data);
    return data.registry;
  },

  debug() {
    const data = this.load();
    console.log("RelationshipEngine Debug:", data);
    return data;
  },
};
