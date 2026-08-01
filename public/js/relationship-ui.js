/* =====================================================
   RapportLink Relationship UI
   Version 11
   Any-Order Modern Relationship Wizard
   ===================================================== */

console.log("Relationship UI Loaded");

window.RelationshipUI = {
  activeContact: null,
  selectedContactId: "",
  selectedRoles: [],
  selectedReverseRoles: [],

  personRoles: [
    "Agent",
    "Attorney",
    "Buyer",
    "Client",
    "Contractor",
    "Escrow Officer",
    "Inspector",
    "Insurance Agent",
    "Investor",
    "Lender",
    "Photographer",
    "Referral Partner",
    "Related Contact",
    "Seller",
    "Title Officer",
  ],

  hideLegacyTagUI() {
    setTimeout(() => {
      ["editTags", "quickTagInput", "quickTagButtons"].forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;

        const wrapper =
          el.closest(".mb-3") ||
          el.closest(".form-group") ||
          el.closest(".col-md-12") ||
          el.parentElement;

        if (wrapper) wrapper.style.display = "none";
        else el.style.display = "none";
      });
    }, 50);
  },

  findPersonForContact(contact) {
    if (!window.RelationshipEngine || !contact) return null;
    const graph = window.RelationshipEngine.load();

    return (
      (graph.people || []).find((p) => {
        return (
          (contact.email && p.email === contact.email) ||
          (contact.id && String(p.sourceContactId) === String(contact.id))
        );
      }) || null
    );
  },

  getStatsForContact(contact) {
    const person = this.findPersonForContact(contact);

    if (!person || !window.RelationshipEngine) {
      return {
        synced: false,
        linkedRecords: 0,
        timelineEvents: 0,
        links: [],
        personId: "",
      };
    }

    return {
      synced: true,
      linkedRecords: window.RelationshipEngine.getLinkedRecords(
        "person",
        person.id,
      ).length,
      timelineEvents: window.RelationshipEngine.getTimelineFor(
        "person",
        person.id,
      ).length,
      links: window.RelationshipEngine.getLinkedRecords("person", person.id),
      personId: person.id,
    };
  },

  getLinkedRecordLabel(link) {
    const record = link.linkedRecord || {};
    return (
      record.fullName ||
      record.name ||
      record.address ||
      record.title ||
      record.email ||
      "Unnamed Record"
    );
  },

  normalizeRoles(value, fallback = "Relationship") {
    if (Array.isArray(value) && value.length) return value.filter(Boolean);
    if (typeof value === "string" && value.trim()) return [value.trim()];
    return fallback ? [fallback] : [];
  },

  getDisplayRelationshipType(link, currentPersonId) {
    const rel = link.relationship || {};

    const isReverseView =
      rel.toType === "person" &&
      String(rel.toId) === String(currentPersonId) &&
      rel.fromType === "person";

    const roles = isReverseView
      ? this.normalizeRoles(rel.toRoles, rel.toRole || "Related Contact")
      : this.normalizeRoles(
          rel.fromRoles,
          rel.fromRole || rel.relationshipType || "Relationship",
        );

    return roles.join(" • ");
  },

  getRelationshipIcon(type) {
    if (String(type || "").includes("Escrow Officer")) return "🤝";
    if (String(type || "").includes("Lender")) return "🏦";
    if (String(type || "").includes("Inspector")) return "🔎";
    if (String(type || "").includes("Attorney")) return "⚖️";
    if (String(type || "").includes("Photographer")) return "📸";
    if (String(type || "").includes("Contractor")) return "🛠️";
    if (String(type || "").includes("Insurance Agent")) return "🛡️";
    if (String(type || "").includes("Title Officer")) return "🏢";
    if (String(type || "").includes("Agent")) return "🏡";
    if (String(type || "").includes("Buyer")) return "👤";
    if (String(type || "").includes("Seller")) return "👤";
    if (String(type || "").includes("Investor")) return "💰";
    if (String(type || "").includes("Referral Partner")) return "🔁";
    if (String(type || "").includes("Client")) return "⭐";
    return "🔗";
  },

  renderRelationshipCard(contact) {
    this.hideLegacyTagUI();

    const stats = this.getStatsForContact(contact);

    const linkedHtml = stats.links.length
      ? stats.links
          .map((link) => {
            const relType = this.getDisplayRelationshipType(
              link,
              stats.personId,
            );
            const label = this.getLinkedRecordLabel(link);
            const icon = this.getRelationshipIcon(relType);

            return `
              <div class="contact-ai-metric">
                <span>${icon} ${relType}</span>
                <b>
                  ${label}
                  <button
                    type="button"
                    class="btn btn-sm btn-outline-danger ms-2"
                    onclick="window.RelationshipUI.removeRelationship('${link.relationship.id}')">
                    Remove
                  </button>
                </b>
              </div>
            `;
          })
          .join("")
      : `<div class="text-muted small mt-2">No linked relationships yet.</div>`;

    return `
      <div class="contact-ai-card">
        <div class="d-flex justify-content-between align-items-center gap-2 mb-3">
          <h5 class="mb-0">Relationship Intelligence</h5>
          <button
            type="button"
            class="btn btn-sm btn-primary"
            onclick="window.RelationshipUI.openRelationshipWizard()">
            Link
          </button>
        </div>

        <div class="contact-ai-metric">
          <span>Status</span>
          <b>${stats.synced ? "Synced" : "Not Synced"}</b>
        </div>

        <div class="contact-ai-metric">
          <span>Linked Records</span>
          <b>${stats.linkedRecords}</b>
        </div>

        <div class="contact-ai-metric">
          <span>Timeline Events</span>
          <b>${stats.timelineEvents}</b>
        </div>

        <hr>

        <div class="small-muted mb-2">Relationships</div>
        ${linkedHtml}
      </div>
    `;
  },

  renderQuickRelationshipButtons(contact) {
    this.hideLegacyTagUI();
    return "";
  },

  rolePillHtml(role, side) {
    return `
      <button
        type="button"
        class="relationship-role-pill"
        data-role="${role}"
        data-side="${side}"
        onclick="window.RelationshipUI.toggleRole('${role}', '${side}')">
        ${role}
      </button>
    `;
  },

  ensureModalStyles() {
    if (document.getElementById("relationshipWizardStyles")) return;

    const style = document.createElement("style");
    style.id = "relationshipWizardStyles";
    style.innerHTML = `
      .relationship-wizard-section {
        border: 1px solid #eef1f4;
        border-radius: 14px;
        padding: 16px;
        margin-bottom: 16px;
        background: #fafbfc;
      }

      .relationship-role-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(135px, 1fr));
        gap: 8px;
      }

      .relationship-role-pill {
        border: 1px solid #d6dee6;
        background: #ffffff;
        border-radius: 999px;
        padding: 9px 12px;
        font-size: 13px;
        cursor: pointer;
        transition: all 0.15s ease;
        text-align: center;
        width: 100%;
      }

      .relationship-role-pill:hover {
        border-color: #00a143;
        box-shadow: 0 2px 8px rgba(0,0,0,0.08);
      }

      .relationship-role-pill.active {
        background: #042c49;
        border-color: #042c49;
        color: #ffffff;
      }

      .relationship-search-result {
        padding: 12px 14px;
        border: 1px solid #e5e5e5;
        border-radius: 12px;
        margin-bottom: 8px;
        cursor: pointer;
        transition: all 0.15s ease;
      }

      .relationship-search-result:hover {
        border-color: #00a143 !important;
        box-shadow: 0 4px 14px rgba(0,0,0,0.08);
      }

      .relationship-search-result.selected {
        border-color: #00a143 !important;
        background: #f2fff8;
        box-shadow: 0 4px 14px rgba(0,161,67,0.12);
      }

      .relationship-selected-contact {
        border: 1px solid #00a143;
        background: #f2fff8;
        border-radius: 12px;
        padding: 12px 14px;
        margin-top: 12px;
      }
    `;

    document.head.appendChild(style);
  },

  ensureModal() {
    if (document.getElementById("relationshipWizardModal")) return;

    this.ensureModalStyles();

    const modal = document.createElement("div");
    modal.id = "relationshipWizardModal";
    modal.style.display = "none";
    modal.style.position = "fixed";
    modal.style.inset = "0";
    modal.style.background = "rgba(0,0,0,0.45)";
    modal.style.zIndex = "9999";
    modal.style.padding = "40px 16px";
    modal.style.overflowY = "auto";

    modal.innerHTML = `
      <div style="max-width:920px;margin:0 auto;background:#fff;border-radius:16px;box-shadow:0 18px 60px rgba(0,0,0,0.25);overflow:hidden;">
        <div style="padding:18px 22px;border-bottom:1px solid #e5e5e5;display:flex;justify-content:space-between;align-items:center;gap:12px;">
          <div>
            <h4 style="margin:0;">Link Relationship</h4>
            <div class="text-muted small">Select a person and choose roles in any order.</div>
          </div>
          <button type="button" class="btn btn-sm btn-outline-secondary" onclick="window.RelationshipUI.closeRelationshipWizard()">Close</button>
        </div>

        <div style="padding:22px;">
          <div class="relationship-wizard-section">
            <label class="form-label"><b>Search Existing Contacts</b></label>
            <input
              id="relationshipContactSearch"
              class="form-control"
              placeholder="Start typing a name, email, phone, or company..."
              oninput="window.RelationshipUI.renderContactSearchResults(this.value)"
            >

            <div id="relationshipSelectedContact"></div>

            <div id="relationshipSearchResults" style="margin-top:14px;">
              <div class="text-muted small">Start typing to search existing contacts.</div>
            </div>
          </div>

          <div class="relationship-wizard-section">
            <label class="form-label"><b>How do you see them?</b> <span class="text-muted small">(optional)</span></label>
            <div id="relationshipRolePills" class="relationship-role-grid">
              ${this.personRoles.map((role) => this.rolePillHtml(role, "from")).join("")}
            </div>
          </div>

          <div class="relationship-wizard-section">
            <label class="form-label"><b>How should they see you?</b> <span class="text-muted small">(optional, select multiple)</span></label>
            <div id="relationshipReverseRolePills" class="relationship-role-grid">
              ${this.personRoles.map((role) => this.rolePillHtml(role, "to")).join("")}
            </div>
          </div>

          <div class="d-flex justify-content-end gap-2">
            <button type="button" class="btn btn-outline-secondary" onclick="window.RelationshipUI.closeRelationshipWizard()">Cancel</button>
            <button type="button" class="btn btn-primary" onclick="window.RelationshipUI.saveSelectedRelationship()">Save Relationship</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  },

  openRelationshipWizard() {
    if (typeof currentContact === "undefined" || !currentContact) {
      alert("No contact is open.");
      return;
    }

    this.activeContact = currentContact;
    this.selectedContactId = "";
    this.selectedRoles = [];
    this.selectedReverseRoles = [];

    this.ensureModal();

    document.querySelectorAll(".relationship-role-pill").forEach((btn) => {
      btn.classList.remove("active");
    });

    const modal = document.getElementById("relationshipWizardModal");
    const searchInput = document.getElementById("relationshipContactSearch");
    const selected = document.getElementById("relationshipSelectedContact");
    const results = document.getElementById("relationshipSearchResults");

    if (searchInput) searchInput.value = "";
    if (selected) selected.innerHTML = "";
    if (results) {
      results.innerHTML =
        '<div class="text-muted small">Start typing to search existing contacts.</div>';
    }

    modal.style.display = "block";

    setTimeout(() => {
      if (searchInput) searchInput.focus();
    }, 100);
  },

  closeRelationshipWizard() {
    const modal = document.getElementById("relationshipWizardModal");
    if (modal) modal.style.display = "none";
  },

  toggleRole(role, side) {
    const list = side === "to" ? this.selectedReverseRoles : this.selectedRoles;
    const index = list.indexOf(role);

    if (index >= 0) {
      list.splice(index, 1);
    } else {
      list.push(role);
      list.sort((a, b) => a.localeCompare(b));
    }

    document
      .querySelectorAll(
        `.relationship-role-pill[data-side="${side}"][data-role="${role}"]`,
      )
      .forEach((btn) => btn.classList.toggle("active", list.includes(role)));
  },

  renderContactSearchResults(query = "") {
    const results = document.getElementById("relationshipSearchResults");
    if (!results) return;

    const q = String(query || "")
      .toLowerCase()
      .trim();

    if (q.length < 1) {
      results.innerHTML =
        '<div class="text-muted small">Start typing to search existing contacts.</div>';
      return;
    }

    const contacts = Array.isArray(contactsCache) ? contactsCache : [];

    const matches = contacts
      .filter((c) => {
        if (!this.activeContact) return false;
        if (String(c.id) === String(this.activeContact.id)) return false;

        const searchable = [
          c.firstName,
          c.lastName,
          c.email,
          c.workEmail,
          c.secondaryEmail,
          c.phone,
          c.workPhone,
          c.homePhone,
          c.company,
          c.type,
          Array.isArray(c.roles) ? c.roles.join(" ") : "",
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return searchable.includes(q);
      })
      .sort((a, b) => {
        const nameA = `${a.firstName || ""} ${a.lastName || ""}`.trim();
        const nameB = `${b.firstName || ""} ${b.lastName || ""}`.trim();
        return nameA.localeCompare(nameB);
      })
      .slice(0, 20);

    if (!matches.length) {
      results.innerHTML =
        '<div class="text-muted small">No matching contacts found.</div>';
      return;
    }

    results.innerHTML = matches
      .map((c) => {
        const name =
          `${c.firstName || ""} ${c.lastName || ""}`.trim() ||
          c.email ||
          "Unnamed Contact";

        const subline = [
          c.type,
          c.company,
          c.email,
          c.phone ? formatPhone(c.phone) : "",
        ]
          .filter(Boolean)
          .join(" • ");

        const selectedClass =
          String(this.selectedContactId) === String(c.id) ? " selected" : "";

        return `
          <div
            class="relationship-search-result${selectedClass}"
            onclick="window.RelationshipUI.selectRelationshipContact('${c.id}')">
            <div style="font-weight:700;">${name}</div>
            <div class="text-muted small">${subline || "No additional details"}</div>
          </div>
        `;
      })
      .join("");
  },

  selectRelationshipContact(contactId) {
    this.selectedContactId = contactId;

    const contacts = Array.isArray(contactsCache) ? contactsCache : [];
    const selectedContact = contacts.find(
      (c) => String(c.id) === String(contactId),
    );

    const selected = document.getElementById("relationshipSelectedContact");

    if (selectedContact && selected) {
      const name =
        `${selectedContact.firstName || ""} ${selectedContact.lastName || ""}`.trim() ||
        selectedContact.email ||
        "Unnamed Contact";

      const subline = [
        selectedContact.type,
        selectedContact.company,
        selectedContact.email,
        selectedContact.phone ? formatPhone(selectedContact.phone) : "",
      ]
        .filter(Boolean)
        .join(" • ");

      selected.innerHTML = `
        <div class="relationship-selected-contact">
          <b>Selected:</b> ${name}<br>
          <span class="text-muted small">${subline || "No additional details"}</span>
        </div>
      `;
    }

    const searchInput = document.getElementById("relationshipContactSearch");
    if (searchInput) this.renderContactSearchResults(searchInput.value);
  },

  saveSelectedRelationship() {
    if (!window.RelationshipEngine) {
      alert("Relationship Engine is not ready.");
      return;
    }

    if (!this.activeContact) {
      alert("No active contact is open.");
      return;
    }

    if (!this.selectedContactId) {
      alert("Please select a contact to link.");
      return;
    }

    const sourcePerson = this.findPersonForContact(this.activeContact);

    if (!sourcePerson) {
      alert("This contact has not synced yet. Refresh and try again.");
      return;
    }

    const contacts = Array.isArray(contactsCache) ? contactsCache : [];
    const selectedContact = contacts.find(
      (c) => String(c.id) === String(this.selectedContactId),
    );

    if (!selectedContact) {
      alert("Selected contact could not be found.");
      return;
    }

    let targetPerson = this.findPersonForContact(selectedContact);

    if (!targetPerson) {
      window.RelationshipEngine.migrateExistingContacts([selectedContact]);
      targetPerson = this.findPersonForContact(selectedContact);
    }

    if (!targetPerson) {
      alert("Could not sync the selected contact.");
      return;
    }

    const fromRoles = this.selectedRoles.length
      ? this.selectedRoles
      : ["Relationship"];

    const toRoles = this.selectedReverseRoles.length
      ? this.selectedReverseRoles
      : ["Related Contact"];

    const relationship = window.RelationshipEngine.linkRecords({
      fromType: "person",
      fromId: sourcePerson.id,
      toType: "person",
      toId: targetPerson.id,

      relationshipType: fromRoles.join(" • "),
      fromRole: fromRoles[0] || "Relationship",
      toRole: toRoles[0] || "Related Contact",
      fromRoles,
      toRoles,

      notes: `Linked existing contact. From roles: ${fromRoles.join(", ")}. To roles: ${toRoles.join(", ")}.`,
    });

    if (!relationship) {
      alert("That relationship may already exist.");
      return;
    }

    this.closeRelationshipWizard();

    if (typeof renderContactQuickSummary === "function") {
      renderContactQuickSummary();
    }

    alert("Relationship linked successfully.");
  },

  removeRelationship(relationshipId) {
    if (!window.RelationshipEngine) {
      alert("Relationship Engine is not ready.");
      return;
    }

    if (!confirm("Remove this linked relationship?")) return;

    const graph = window.RelationshipEngine.load();

    graph.relationships = (graph.relationships || []).filter(
      (rel) => String(rel.id) !== String(relationshipId),
    );

    window.RelationshipEngine.save(graph);

    if (typeof renderContactQuickSummary === "function") {
      renderContactQuickSummary();
    }

    alert("Relationship removed.");
  },
};
