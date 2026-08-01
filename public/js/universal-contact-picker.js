/* =====================================================
   RapportLink Universal Contact Picker
   Version 1
   ===================================================== */

console.log("Universal Contact Picker Loaded");

window.RapportContactPicker = {
  ensureStyles() {
    if (document.getElementById("rapportContactPickerStyles")) return;

    const style = document.createElement("style");
    style.id = "rapportContactPickerStyles";
    style.innerHTML = `
      .rl-picker-wrap {
        position: relative;
      }

      .rl-picker-results {
        position: absolute;
        z-index: 99999;
        top: 100%;
        left: 0;
        right: 0;
        background: #fff;
        border: 1px solid #d6dee6;
        border-radius: 12px;
        box-shadow: 0 12px 30px rgba(0,0,0,0.16);
        margin-top: 6px;
        overflow: hidden;
        max-height: 280px;
        overflow-y: auto;
      }

      .rl-picker-result {
        padding: 11px 13px;
        cursor: pointer;
        border-bottom: 1px solid #eef1f4;
      }

      .rl-picker-result:hover {
        background: #f2fff8;
      }

      .rl-picker-result b {
        color: #042c49;
      }

      .rl-picker-selected-note {
        font-size: 12px;
        color: #00a143;
        margin-top: 4px;
        font-weight: 700;
      }
    `;
    document.head.appendChild(style);
  },

  contactName(contact) {
    if (!contact) return "";
    if (typeof window.contactName === "function")
      return window.contactName(contact);
    return (
      `${contact.firstName || ""} ${contact.lastName || ""}`.trim() ||
      "Unnamed Contact"
    );
  },

  contactDisplay(contact) {
    const name = this.contactName(contact);
    const parts = [
      contact.type || "",
      contact.company || "",
      contact.email || "",
      contact.phone ? formatPhone(contact.phone) : "",
    ].filter(Boolean);

    return {
      name,
      subline: parts.join(" • "),
    };
  },

  ensureHiddenInput(hiddenId, input) {
    let hidden = document.getElementById(hiddenId);

    if (!hidden) {
      hidden = document.createElement("input");
      hidden.type = "hidden";
      hidden.id = hiddenId;
      input.insertAdjacentElement("afterend", hidden);
    }

    return hidden;
  },

  enhanceField(config = {}) {
    this.ensureStyles();

    const input = document.getElementById(config.inputId);
    if (!input) return;

    const hidden = this.ensureHiddenInput(config.hiddenId, input);

    input.setAttribute("autocomplete", "off");

    let wrapper = input.closest(".rl-picker-wrap");

    if (!wrapper) {
      wrapper = document.createElement("div");
      wrapper.className = "rl-picker-wrap";
      input.parentNode.insertBefore(wrapper, input);
      wrapper.appendChild(input);
      wrapper.appendChild(hidden);
    }

    let note = wrapper.querySelector(".rl-picker-selected-note");
    if (!note) {
      note = document.createElement("div");
      note.className = "rl-picker-selected-note";
      note.style.display = hidden.value ? "block" : "none";
      note.innerText = hidden.value ? "Linked contact selected" : "";
      wrapper.appendChild(note);
    }

    let results = wrapper.querySelector(".rl-picker-results");
    if (!results) {
      results = document.createElement("div");
      results.className = "rl-picker-results";
      results.style.display = "none";
      wrapper.appendChild(results);
    }

    const render = () => {
      const q = String(input.value || "")
        .toLowerCase()
        .trim();

      if (!q) {
        results.style.display = "none";
        results.innerHTML = "";
        return;
      }

      const contacts = Array.isArray(window.contactsCache)
        ? window.contactsCache
        : [];

      const matches = contacts
        .filter((c) => {
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
        .sort((a, b) => this.contactName(a).localeCompare(this.contactName(b)))
        .slice(0, 12);

      if (!matches.length) {
        results.innerHTML = `<div class="rl-picker-result text-muted">No matching contacts found.</div>`;
        results.style.display = "block";
        return;
      }

      results.innerHTML = matches
        .map((contact) => {
          const display = this.contactDisplay(contact);
          return `
            <div class="rl-picker-result" data-contact-id="${String(contact.id)}">
              <b>${display.name}</b><br>
              <small>${display.subline || "No additional details"}</small>
            </div>
          `;
        })
        .join("");

      results.style.display = "block";

      results.querySelectorAll("[data-contact-id]").forEach((row) => {
        row.addEventListener("click", () => {
          const id = row.getAttribute("data-contact-id");
          const selected = contacts.find((c) => String(c.id) === String(id));
          if (!selected) return;

          const display = this.contactDisplay(selected);

          hidden.value = selected.id;
          input.value = display.name;
          note.innerText = `Linked: ${display.subline || display.name}`;
          note.style.display = "block";
          results.style.display = "none";

          if (typeof config.onSelect === "function") {
            config.onSelect(selected);
          }
        });
      });
    };

    input.oninput = () => {
      hidden.value = "";
      note.style.display = "none";
      render();
    };

    input.onfocus = render;

    document.addEventListener("click", (event) => {
      if (!wrapper.contains(event.target)) {
        results.style.display = "none";
      }
    });
  },
};

function txnInitContactPickers() {
  if (!window.RapportContactPicker) return;

  window.RapportContactPicker.enhanceField({
    inputId: "txnLender",
    hiddenId: "txnLenderContactId",
  });

  window.RapportContactPicker.enhanceField({
    inputId: "txnTitleCompany",
    hiddenId: "txnTitleContactId",
  });
}

function txnRelationshipPersonForContactId(contactId) {
  if (!window.RelationshipEngine || !contactId) return null;

  const contact = (contactsCache || []).find(
    (c) => String(c.id) === String(contactId),
  );
  if (!contact) return null;

  window.RelationshipEngine.migrateExistingContacts([contact]);

  const graph = window.RelationshipEngine.load();

  return (graph.people || []).find((p) => {
    return (
      (contact.email && p.email === contact.email) ||
      (contact.id && String(p.sourceContactId) === String(contact.id))
    );
  });
}

function txnLinkPartyToVendor(
  partyContactId,
  vendorContactId,
  vendorRole,
  partyRole,
) {
  if (!window.RelationshipEngine) return;
  if (!partyContactId || !vendorContactId) return;
  if (String(partyContactId) === String(vendorContactId)) return;

  const partyPerson = txnRelationshipPersonForContactId(partyContactId);
  const vendorPerson = txnRelationshipPersonForContactId(vendorContactId);

  if (!partyPerson || !vendorPerson) return;

  window.RelationshipEngine.linkRecords({
    fromType: "person",
    fromId: partyPerson.id,
    toType: "person",
    toId: vendorPerson.id,

    relationshipType: vendorRole,
    fromRole: vendorRole,
    toRole: partyRole,

    fromRoles: [vendorRole],
    toRoles: [partyRole],

    notes: "Auto-linked from transaction contact picker.",
  });
}

function txnSyncTransactionRelationships(txn = {}) {
  const partyIds = [];

  if (txn.buyerContactId) {
    partyIds.push({ id: txn.buyerContactId, role: "Buyer" });
  }

  if (txn.sellerContactId) {
    partyIds.push({ id: txn.sellerContactId, role: "Seller" });
  }

  (txn.parties || []).forEach((party) => {
    if (party.contactId) {
      partyIds.push({
        id: party.contactId,
        role: party.role || "Transaction Contact",
      });
    }
  });

  partyIds.forEach((party) => {
    if (txn.lenderContactId) {
      txnLinkPartyToVendor(party.id, txn.lenderContactId, "Lender", party.role);
    }

    if (txn.titleContactId) {
      txnLinkPartyToVendor(
        party.id,
        txn.titleContactId,
        "Title / Escrow",
        party.role,
      );
    }
  });
}
