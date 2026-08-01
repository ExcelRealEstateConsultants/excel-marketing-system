/* =====================================================
   RapportLink Email Designer Module
   Version 1
   ===================================================== */

/* ================= SEPARATE EMAIL DESIGNER V2 ================= */
let designerBlocks = [];
let selectedDesignerBlockId = null;
let selectedDesignerImageTarget = null;
let selectedDesignerSocialTarget = null;
let activeDraggedEmailWidgetType = null;
let activeDraggedSocialIconPlatform = null;
let socialIconTrayOpen = false;
let designerSortable = null;
let designerPaletteSortable = null;
let designerImageLibrary = JSON.parse(
  localStorage.getItem("excelEmailImageLibrary") || "[]",
);
let activeImageTarget = null;
let designerMeta = JSON.parse(
  localStorage.getItem("excelEmailDesignerMeta") ||
    '{"title":"","subject":"","preheader":""}',
);
let designerSettings = JSON.parse(
  localStorage.getItem("excelEmailDesignerSettings") ||
    '{"outerBg":"#f4f6f8","canvasBg":"#ffffff","emailWidth":680,"fontFamily":"Arial, sans-serif","outerBgImage":"","canvasBgImage":""}',
);

const socialBrandColors = {
  facebook: "#1877F2",
  instagram: "#E4405F",
  linkedin: "#0A66C2",
  youtube: "#FF0000",
  x: "#111827",
  tiktok: "#111827",
  website: "#00A143",
};
const socialIconLabels = {
  facebook: "f",
  instagram: "◎",
  linkedin: "in",
  youtube: "▶",
  x: "X",
  tiktok: "♪",
  website: "🌐",
};
const socialIconNames = {
  facebook: "Facebook",
  instagram: "Instagram",
  linkedin: "LinkedIn",
  youtube: "YouTube",
  x: "X",
  tiktok: "TikTok",
  website: "Website",
};

function renderSocialBrandIcon(platform, size = 36) {
  const iconSize = Math.max(14, Math.min(96, Number(size || 36)));
  const common = `width="${iconSize}" height="${iconSize}" viewBox="0 0 48 48" aria-hidden="true" style="display:block;width:${iconSize}px!important;height:${iconSize}px!important;max-width:${iconSize}px!important;max-height:${iconSize}px!important;"`;
  const icons = {
    facebook: `<svg ${common} xmlns="http://www.w3.org/2000/svg"><path fill="#1877F2" d="M29.5 48V29.3h6.3l1-7.3h-7.3v-4.6c0-2.1.6-3.6 3.7-3.6H37V7.3c-.7-.1-3.1-.3-5.9-.3-5.8 0-9.8 3.5-9.8 10v5h-6.6v7.3h6.6V48h8.2z"/></svg>`,
    instagram: `<svg ${common} xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="igGrad" x1="8" y1="42" x2="42" y2="8" gradientUnits="userSpaceOnUse"><stop stop-color="#FEDA75"/><stop offset=".25" stop-color="#FA7E1E"/><stop offset=".5" stop-color="#D62976"/><stop offset=".75" stop-color="#962FBF"/><stop offset="1" stop-color="#4F5BD5"/></linearGradient></defs><rect x="6" y="6" width="36" height="36" rx="10" fill="url(#igGrad)"/><circle cx="24" cy="24" r="9" fill="none" stroke="#fff" stroke-width="4"/><circle cx="34" cy="14" r="2.7" fill="#fff"/></svg>`,
    linkedin: `<svg ${common} xmlns="http://www.w3.org/2000/svg"><rect x="6" y="6" width="36" height="36" rx="4" fill="#0A66C2"/><rect x="13" y="20" width="6" height="17" fill="#fff"/><circle cx="16" cy="15" r="3" fill="#fff"/><path fill="#fff" d="M23 20h5.7v2.3h.1c.8-1.5 2.7-3.1 5.6-3.1 6 0 7.1 3.9 7.1 9V37h-6V29.2c0-1.9 0-4.3-2.6-4.3s-3 2-3 4.1V37h-6V20z"/></svg>`,
    youtube: `<svg ${common} xmlns="http://www.w3.org/2000/svg"><rect x="5" y="13" width="38" height="22" rx="6" fill="#FF0000"/><path d="M21 18.5v11l10-5.5-10-5.5z" fill="#fff"/></svg>`,
    x: `<svg ${common} xmlns="http://www.w3.org/2000/svg"><rect x="6" y="6" width="36" height="36" rx="6" fill="#000"/><path fill="#fff" d="M28.5 22.3 40 9h-2.7L27.3 20.6 19.3 9H10l12.1 17.6L10 40.7h2.7l10.6-12.3 8.4 12.3H41L28.5 22.3zm-3.8 4.4-1.2-1.8-9.8-14h4.3l7.9 11.3 1.2 1.8 10.3 14.8h-4.3l-8.4-12.1z"/></svg>`,
    tiktok: `<svg ${common} xmlns="http://www.w3.org/2000/svg"><rect x="6" y="6" width="36" height="36" rx="9" fill="#111827"/><path d="M29 13c.8 4.3 3.4 6.9 7 7v6c-2.7 0-5.1-.8-7-2.1v8.4c0 5.6-4.5 9.7-10.2 9.7-5.1 0-9.3-3.8-9.3-8.9 0-5.9 5.1-9.6 10.9-8.4v6.1c-2.1-.7-4.7.5-4.7 2.8 0 1.7 1.4 2.9 3.1 2.9 2 0 3.3-1.4 3.3-3.7V13h6.9z" fill="#25F4EE"/><path d="M31 15c.9 2.9 2.7 4.6 5 5v3.1c-2.2-.2-4.6-1.1-7-2.9V32c0 5.6-4.5 9.7-10.2 9.7-2.5 0-4.8-.9-6.4-2.4 1.7 1 3.8 1.4 6.1 1.1 4.9-.7 8.1-4.4 8.1-9.3V15h4.4z" fill="#FE2C55" opacity=".9"/></svg>`,
    website: `<svg ${common} xmlns="http://www.w3.org/2000/svg"><circle cx="24" cy="24" r="18" fill="none" stroke="#00A143" stroke-width="4"/><path d="M6 24h36M24 6c5 5.2 7.5 11.2 7.5 18S29 36.8 24 42M24 6c-5 5.2-7.5 11.2-7.5 18S19 36.8 24 42" fill="none" stroke="#00A143" stroke-width="3" stroke-linecap="round"/></svg>`,
  };
  return icons[platform] || icons.website;
}

const emailWidgetLibrary = [
  { type: "header", name: "Header", icon: "▰", desc: "Logo/title hero" },
  { type: "heading", name: "Heading", icon: "H", desc: "Section heading" },
  { type: "text", name: "Text", icon: "¶", desc: "Body copy" },
  { type: "image", name: "Image", icon: "▧", desc: "Single image" },
  { type: "button", name: "Button", icon: "●", desc: "Linked CTA" },
  { type: "divider", name: "Divider", icon: "━", desc: "Colored line" },
  { type: "spacer", name: "Spacer", icon: "↕", desc: "Vertical space" },
  { type: "social", name: "Social Icons", icon: "★", desc: "Brand icons" },
  { type: "video", name: "Video", icon: "▶", desc: "Video preview" },
  { type: "table", name: "Table", icon: "▦", desc: "Data table" },
  { type: "article", name: "Article", icon: "▤", desc: "Image + text" },
  { type: "twoColumn", name: "2 Columns", icon: "▥", desc: "Side-by-side" },
  { type: "sidebar", name: "Sidebar", icon: "▣", desc: "Main + sidebar" },
  { type: "imageGrid", name: "Image Grid", icon: "▦", desc: "2/4/6/8 images" },
  { type: "rsvp", name: "RSVP", icon: "✓", desc: "Yes/Maybe/No" },
  { type: "feedback", name: "Feedback", icon: "☺", desc: "Rating links" },
];

function edId(prefix = "ed") {
  return prefix + "-" + Date.now() + "-" + Math.floor(Math.random() * 100000);
}

function safeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function safeAttr(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function emailBlockDefaults(type) {
  const base = {
    id: edId(type),
    type,
    bg: "#ffffff",
    text: "#1f2937",
    padding: 24,
    radius: 0,
    borderWidth: 0,
    borderColor: "#e5e7eb",
    align: "left",
    bgImage: "",
    mediaUrl: "",
    mediaPosition: "top",
    mediaWidth: 38,
    mediaRadius: 0,
    mediaHeight: 0,
    mediaFit: "contain",
    mediaShadow: "no",
    blockWidth: 100,
    blockHeight: 0,
    blockTopSpacing: 24,
    blockBottomSpacing: 24,
    blockAlign: "center",
    socialIcons: [],
  };
  const map = {
    header: {
      ...base,
      bg: "#042C49",
      text: "#ffffff",
      align: "center",
      title: "Your Campaign Header",
      subtitle: "A short supporting message goes here.",
      padding: 36,
    },
    heading: {
      ...base,
      title: "Section Heading",
      subtitle: "Optional supporting text.",
      padding: 18,
    },
    text: {
      ...base,
      body: "Write your email copy here. Everything in this block can be customized.",
      fontSize: 16,
      lineHeight: 1.6,
    },
    image: {
      ...base,
      imageUrl: "",
      alt: "Email image",
      imageWidth: 100,
      imageHeight: 0,
      imageFit: "cover",
      imageRadius: 8,
      imageShape: "rounded",
      imageBorderWidth: 0,
      imageBorderColor: "#e5e7eb",
      imageShadow: "no",
      imageRotate: 0,
      align: "center",
    },
    button: {
      ...base,
      label: "Click Here",
      url: "#",
      buttonBg: "#00A143",
      buttonText: "#ffffff",
      buttonRadius: 8,
      buttonSize: "medium",
      fullWidth: "no",
      align: "center",
    },
    divider: {
      ...base,
      lineColor: "#00A143",
      thickness: 2,
      lineWidth: 100,
      padding: 0,
      blockTopSpacing: 6,
      blockBottomSpacing: 6,
      dividerTopSpacing: 6,
      dividerBottomSpacing: 6,
      align: "center",
    },
    spacer: {
      ...base,
      height: 32,
      padding: 0,
      blockTopSpacing: 0,
      blockBottomSpacing: 0,
    },
    social: {
      ...base,
      socialTitle: "",
      socialIcons: [
        {
          id: edId("social"),
          platform: "website",
          url: "",
          useCustomColor: "no",
          customColor: "#00A143",
        },
        {
          id: edId("social"),
          platform: "facebook",
          url: "",
          useCustomColor: "no",
          customColor: "#1877F2",
        },
        {
          id: edId("social"),
          platform: "instagram",
          url: "",
          useCustomColor: "no",
          customColor: "#E4405F",
        },
        {
          id: edId("social"),
          platform: "linkedin",
          url: "",
          useCustomColor: "no",
          customColor: "#0A66C2",
        },
      ],
      iconShape: "brand",
      iconSize: 36,
      showLabels: "no",
      align: "center",
      padding: 18,
    },
    video: {
      ...base,
      title: "Watch the Video",
      videoUrl: "#",
      imageUrl: "",
      buttonLabel: "Watch Video",
      buttonBg: "#00A143",
    },
    table: {
      ...base,
      title: "Data Table",
      headers: "Item,Details,Status",
      rows: "Open House,Saturday 11-2,Scheduled\nFollow Up,Call interested buyer,Pending",
    },
    article: {
      ...base,
      title: "Feature Article",
      body: "Use this for a market update, listing highlight, newsletter story, or client education.",
      buttonLabel: "Read More",
      buttonUrl: "",
      mediaUrl: "",
      mediaPosition: "top",
      mediaWidth: 40,
      borderWidth: 1,
      radius: 12,
    },
    twoColumn: {
      ...base,
      leftTitle: "Left Column",
      leftBody: "Left column content.",
      rightTitle: "Right Column",
      rightBody: "Right column content.",
      columnBg: "#f9fafb",
      gap: 14,
    },
    sidebar: {
      ...base,
      mainTitle: "Main Article",
      mainBody: "Main content goes here.",
      sidebarTitle: "Sidebar",
      sidebarBody: "Quick notes, links, or summary.",
      sidebarBg: "#f1f5f9",
      sidebarSide: "left",
    },
    imageGrid: { ...base, columns: 4, gap: 8, imageUrls: "" },
    rsvp: {
      ...base,
      title: "Will you be attending?",
      yesUrl: "#",
      maybeUrl: "#",
      noUrl: "#",
    },
    feedback: {
      ...base,
      title: "How did we do?",
      goodUrl: "#",
      okUrl: "#",
      badUrl: "#",
    },
  };
  return map[type] || { ...base, body: "New block" };
}

function initEmailDesignerIfNeeded() {
  renderEmailWidgetPalette();
  loadSavedEmailDesignerDraft();
  hydrateDesignerMetaInputs();
  renderEmailImageLibrary();
  loadEmailImagesFromServer();
  renderEmailDesigner();
  setupEmailDesignerDragDrop();
}

function renderEmailWidgetPalette() {
  const el = document.getElementById("emailWidgetPalette");
  if (!el) return;
  el.innerHTML = emailWidgetLibrary
    .map(
      (w) => `
    <div class="widget-card-v2" draggable="true" data-widget-type="${w.type}" ondragstart="startEmailWidgetDrag(event,'${w.type}')" onclick="addDesignerBlock('${w.type}')">
      <div class="widget-icon-preview"><b>${w.icon}</b></div>
      <b>${w.name}</b><br><small class="text-muted">${w.desc}</small>
    </div>
  `,
    )
    .join("");

  const tray = document.getElementById("emailSocialIconTray");
  if (tray) {
    tray.style.display = "none";
    tray.innerHTML = "";
  }
}

function setupEmailDesignerDragDrop() {
  const palette = document.getElementById("emailWidgetPalette");
  const canvas = document.getElementById("emailDesignerCanvas");
  if (!palette || !canvas || typeof Sortable === "undefined") return;

  if (!designerPaletteSortable) {
    designerPaletteSortable = Sortable.create(palette, {
      group: { name: "emailDesigner", pull: "clone", put: false },
      sort: false,
      animation: 150,
      draggable: ".widget-card-v2[data-widget-type]",
    });
  }

  if (designerSortable) designerSortable.destroy();
  designerSortable = Sortable.create(canvas, {
    group: { name: "emailDesigner", pull: true, put: true },
    animation: 150,
    draggable: ".email-block-v2",
    handle: ".email-block-drag-grip-v2",
    onAdd(evt) {
      const type = evt.item.getAttribute("data-widget-type");
      evt.item.remove();
      if (type) {
        const block = emailBlockDefaults(type);
        designerBlocks.splice(evt.newIndex, 0, block);
        selectedDesignerBlockId = block.id;
        renderEmailDesigner();
      }
    },
    onEnd() {
      const ids = Array.from(canvas.querySelectorAll(".email-block-v2"))
        .map((el) => el.dataset.blockId)
        .filter(Boolean);
      designerBlocks.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
      saveEmailDesignLocal(false);
    },
  });
}

function addDesignerBlock(type) {
  const block = emailBlockDefaults(type);
  designerBlocks.push(block);
  selectedDesignerBlockId = block.id;
  renderEmailDesigner();
}

function selectDesignerBlock(id) {
  selectedDesignerBlockId = id;
  selectedDesignerImageTarget = null;
  selectedDesignerSocialTarget = null;
  renderEmailDesigner();
}

function editDesignerBlock(id) {
  selectedDesignerBlockId = id;
  renderEmailDesigner();
  setTimeout(() => {
    const panel = document.getElementById("emailDesignerSettings");
    if (panel) {
      panel.scrollIntoView({ behavior: "smooth", block: "start" });
      panel.classList.add("email-designer-edit-flash");
      setTimeout(
        () => panel.classList.remove("email-designer-edit-flash"),
        1200,
      );
    }
    const firstField = document.querySelector(
      "#emailDesignerSettings input, #emailDesignerSettings textarea, #emailDesignerSettings select",
    );
    if (firstField) firstField.focus({ preventScroll: true });
  }, 80);
}

function duplicateDesignerBlock(id) {
  selectedDesignerImageTarget = null;
  const index = designerBlocks.findIndex((b) => b.id === id);
  if (index < 0) return;
  const clone = JSON.parse(JSON.stringify(designerBlocks[index]));
  clone.id = edId(clone.type);
  designerBlocks.splice(index + 1, 0, clone);
  selectedDesignerBlockId = clone.id;
  renderEmailDesigner();
}

function removeDesignerBlock(id) {
  selectedDesignerImageTarget = null;
  designerBlocks = designerBlocks.filter((b) => b.id !== id);
  if (selectedDesignerBlockId === id)
    selectedDesignerBlockId = designerBlocks[0]?.id || null;
  renderEmailDesigner();
}

function updateDesignerBlock(id, key, value) {
  const block = designerBlocks.find((b) => b.id === id);
  if (!block) return;
  if (
    [
      "padding",
      "radius",
      "borderWidth",
      "mediaWidth",
      "mediaRadius",
      "fontSize",
      "lineHeight",
      "imageWidth",
      "imageRadius",
      "imageHeight",
      "imageBorderWidth",
      "imageRotate",
      "thickness",
      "lineWidth",
      "height",
      "iconSize",
      "gap",
      "blockWidth",
      "blockHeight",
      "blockTopSpacing",
      "blockBottomSpacing",
      "dividerTopSpacing",
      "dividerBottomSpacing",
    ].includes(key)
  )
    value = Number(value || 0);
  block[key] = value;
  renderEmailDesigner(false);
}

function updateDesignerSetting(key, value) {
  if (["emailWidth"].includes(key)) value = Number(value || 680);
  designerSettings[key] = value;
  localStorage.setItem(
    "excelEmailDesignerSettings",
    JSON.stringify(designerSettings),
  );
  renderEmailDesigner(false);
}

function wrapBlock(block, inner, final = false) {
  const bgImage = block.bgImage
    ? `background-image:url('${safeAttr(block.bgImage)}');background-size:cover;background-position:center;`
    : "";
  const minHeight =
    Number(block.blockHeight || 0) > 0
      ? `min-height:${Number(block.blockHeight)}px;`
      : "";
  const sidePadding = block.type === "divider" ? 0 : Number(block.padding || 0);
  const topPadding = Number(block.blockTopSpacing ?? sidePadding);
  const bottomPadding = Number(block.blockBottomSpacing ?? sidePadding);
  const style = `background:${block.bg || "#ffffff"};color:${block.text || "#1f2937"};padding:${topPadding}px ${sidePadding}px ${bottomPadding}px ${sidePadding}px;border:${Number(block.borderWidth || 0)}px solid ${block.borderColor || "#e5e7eb"};border-radius:${Number(block.radius || 0)}px;${bgImage}${minHeight}`;
  const withMedia = renderOptionalMedia(block, inner);
  const socials =
    block.type === "social" ? "" : renderPlacedSocialIcons(block, final);
  return `<div class="email-block-inner-shell" style="${style}">${withMedia}${socials}</div>`;
}

function renderResizableImage({
  blockId,
  target = "image",
  src = "",
  alt = "",
  width = 100,
  height = 0,
  fit = "contain",
  radius = 0,
  border = "",
  shadow = "",
  rotate = "",
  extraStyle = "",
}) {
  if (!src) return "";
  const widthStyle =
    target === "media" ? "width:100%;" : `width:${Number(width || 100)}%;`;
  const isSelected =
    selectedDesignerImageTarget &&
    String(selectedDesignerImageTarget.blockId) === String(blockId) &&
    selectedDesignerImageTarget.target === target;
  return `<span class="email-image-resize-wrap ${isSelected ? "selected-image" : ""}" data-block-id="${blockId}" data-image-target="${target}" onclick="selectDesignerImage(event,'${blockId}','${target}')" ondblclick="event.stopPropagation();openEmailImagePicker('${blockId}','${target}')">
    <img src="${safeAttr(src)}" alt="${safeAttr(alt || "")}" style="${widthStyle}height:auto!important;object-fit:contain!important;border-radius:${Number(radius || 0)}px;${border || ""}${shadow || ""}${rotate || ""}${extraStyle || ""}display:block;cursor:pointer;max-width:100%;">
    <span class="email-img-resize-handle" title="Drag to resize image proportionally" onmousedown="startDesignerImageResize(event,'${blockId}','${target}')"></span>
  </span>`;
}

function selectDesignerImage(event, blockId, target = "image") {
  event.preventDefault();
  event.stopPropagation();
  selectedDesignerBlockId = blockId;
  selectedDesignerImageTarget = { blockId, target };
  selectedDesignerSocialTarget = null;
  renderEmailDesigner(false);
}

function renderOptionalMedia(block, inner) {
  if (!block.mediaUrl || ["image", "imageGrid"].includes(block.type))
    return inner;
  const mediaRadius = Number(block.mediaRadius || 0);
  const mediaShadow =
    block.mediaShadow === "yes"
      ? "box-shadow:0 10px 24px rgba(15,23,42,.18);"
      : "";
  const mediaFit = block.mediaFit || "cover";
  const img = `<div class="media-side" style="--media-width:${Number(block.mediaWidth || 38)}%;">${renderResizableImage({ blockId: block.id, target: "media", src: block.mediaUrl, alt: "Block image", width: 100, height: block.mediaHeight, fit: mediaFit, radius: mediaRadius, shadow: mediaShadow })}</div>`;
  if (block.mediaPosition === "left")
    return `<div class="email-media-flex">${img}<div class="content-side">${inner}</div></div>`;
  if (block.mediaPosition === "right")
    return `<div class="email-media-flex reverse">${img}<div class="content-side">${inner}</div></div>`;
  if (block.mediaPosition === "bottom")
    return `<div>${inner}<div style="height:14px"></div>${img}</div>`;
  return `<div>${img}<div style="height:14px"></div>${inner}</div>`;
}
function renderDesignerBlockInner(block) {
  const align = block.align || "left";
  if (block.type === "header")
    return `<div style="text-align:${align};"><h1 style="margin:0;font-size:30px;">${safeHtml(block.title)}</h1><p style="margin:8px 0 0 0;opacity:.9;">${safeHtml(block.subtitle)}</p></div>`;
  if (block.type === "heading")
    return `<div style="text-align:${align};"><h2 style="margin:0;color:inherit;">${safeHtml(block.title)}</h2>${block.subtitle ? `<p style="margin:8px 0 0 0;">${safeHtml(block.subtitle)}</p>` : ""}</div>`;
  if (block.type === "text")
    return `<div style="text-align:${align};font-size:${Number(block.fontSize || 16)}px;line-height:${Number(block.lineHeight || 1.6)};">${safeHtml(block.body).replace(/\n/g, "<br>")}</div>`;
  if (block.type === "image") {
    const url = block.imageUrl || block.mediaUrl || "";
    const shapeRadius =
      block.imageShape === "circle"
        ? 999
        : block.imageShape === "pill"
          ? 999
          : block.imageShape === "square"
            ? 0
            : Number(block.imageRadius || 8);
    const shadow =
      block.imageShadow === "yes"
        ? "box-shadow:0 12px 28px rgba(15,23,42,.20);"
        : "";
    const border =
      Number(block.imageBorderWidth || 0) > 0
        ? `border:${Number(block.imageBorderWidth)}px solid ${block.imageBorderColor || "#e5e7eb"};`
        : "";
    const rotate = Number(block.imageRotate || 0)
      ? `transform:rotate(${Number(block.imageRotate)}deg);`
      : "";
    return url
      ? `<div style="text-align:${align};">${renderResizableImage({ blockId: block.id, target: "image", src: url, alt: block.alt, width: block.imageWidth, height: block.imageHeight, fit: block.imageFit, radius: shapeRadius, border, shadow, rotate, extraStyle: "display:inline-block;" })}</div>`
      : `<div class="email-image-placeholder" onclick="event.stopPropagation();openEmailImagePicker('${block.id}','image')"><b>Click to choose an image</b><br><small>Upload or select from your image library</small></div>`;
  }
  if (block.type === "button") {
    const size =
      block.buttonSize === "large"
        ? "15px 28px"
        : block.buttonSize === "small"
          ? "9px 16px"
          : "12px 22px";
    return `<div style="text-align:${align};"><a href="${safeAttr(block.url)}" style="display:${block.fullWidth === "yes" ? "block" : "inline-block"};background:${block.buttonBg};color:${block.buttonText};padding:${size};border-radius:${Number(block.buttonRadius || 8)}px;text-decoration:none;font-weight:bold;">${safeHtml(block.label)}</a></div>`;
  }
  if (block.type === "divider") {
    return `<div style="text-align:${align};line-height:0;"><div style="display:inline-block;width:${Number(block.lineWidth || 100)}%;border-top:${Number(block.thickness || 2)}px solid ${block.lineColor || "#00A143"};"></div></div>`;
  }
  if (block.type === "spacer")
    return `<div style="height:${Number(block.height || 32)}px;"></div>`;
  if (block.type === "social") return renderSocialBlock(block);
  if (block.type === "video") {
    const img = block.imageUrl || block.mediaUrl;
    return `<div style="text-align:center;">${img ? `<img src="${safeAttr(img)}" style="width:100%;border-radius:12px;display:block;margin-bottom:14px;">` : ""}<h3 style="margin:0 0 12px 0;">${safeHtml(block.title)}</h3><a href="${safeAttr(block.videoUrl)}" style="display:inline-block;background:${block.buttonBg || "#00A143"};color:white;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:bold;">▶ ${safeHtml(block.buttonLabel)}</a></div>`;
  }
  if (block.type === "table") return renderTableBlock(block);
  if (block.type === "article")
    return `<h3 style="margin-top:0;">${safeHtml(block.title)}</h3><div style="line-height:1.6;">${safeHtml(block.body).replace(/\n/g, "<br>")}</div>${block.buttonUrl ? `<div style="margin-top:16px;"><a href="${safeAttr(block.buttonUrl)}" style="background:#00A143;color:white;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:bold;">${safeHtml(block.buttonLabel)}</a></div>` : ""}`;
  if (block.type === "twoColumn")
    return `<div style="display:grid;grid-template-columns:1fr 1fr;gap:${Number(block.gap || 14)}px;"><div style="background:${block.columnBg};padding:16px;border-radius:10px;"><h4>${safeHtml(block.leftTitle)}</h4><p>${safeHtml(block.leftBody)}</p></div><div style="background:${block.columnBg};padding:16px;border-radius:10px;"><h4>${safeHtml(block.rightTitle)}</h4><p>${safeHtml(block.rightBody)}</p></div></div>`;
  if (block.type === "sidebar") {
    const sidebar = `<div style="background:${block.sidebarBg};padding:16px;border-radius:10px;"><h4>${safeHtml(block.sidebarTitle)}</h4><p>${safeHtml(block.sidebarBody)}</p></div>`;
    const main = `<div><h3>${safeHtml(block.mainTitle)}</h3><p>${safeHtml(block.mainBody)}</p></div>`;
    return `<div style="display:grid;grid-template-columns:${block.sidebarSide === "right" ? "2fr 1fr" : "1fr 2fr"};gap:16px;">${block.sidebarSide === "right" ? main + sidebar : sidebar + main}</div>`;
  }
  if (block.type === "imageGrid") return renderImageGridBlock(block);
  if (block.type === "rsvp")
    return `<div style="text-align:center;"><h3>${safeHtml(block.title)}</h3><a href="${safeAttr(block.yesUrl)}" style="margin:4px;display:inline-block;background:#00A143;color:white;padding:10px 16px;border-radius:8px;text-decoration:none;">Yes</a><a href="${safeAttr(block.maybeUrl)}" style="margin:4px;display:inline-block;background:#f59e0b;color:white;padding:10px 16px;border-radius:8px;text-decoration:none;">Maybe</a><a href="${safeAttr(block.noUrl)}" style="margin:4px;display:inline-block;background:#dc2626;color:white;padding:10px 16px;border-radius:8px;text-decoration:none;">No</a></div>`;
  if (block.type === "feedback")
    return `<div style="text-align:center;"><h3>${safeHtml(block.title)}</h3><a href="${safeAttr(block.goodUrl)}" style="font-size:28px;margin:8px;text-decoration:none;">😀</a><a href="${safeAttr(block.okUrl)}" style="font-size:28px;margin:8px;text-decoration:none;">😐</a><a href="${safeAttr(block.badUrl)}" style="font-size:28px;margin:8px;text-decoration:none;">🙁</a></div>`;
  return safeHtml(block.body || "");
}

function renderSocialBlock(block, final = false) {
  if (!Array.isArray(block.socialIcons)) block.socialIcons = [];
  block.socialTitle = "";
  const row = renderPlacedSocialIcons(block, final);
  if (final) {
    return `<div style="text-align:${block.align || "center"};">${row}</div>`;
  }
  if (!block.socialIcons.length) {
    return `<div style="text-align:center;color:#6b7280;border:2px dashed #cbd5e1;border-radius:14px;padding:20px;">
      <b>Social Icons</b><br>
      <small>Use the Design Settings panel to choose which icons to show and add each link.</small>
    </div>`;
  }
  return `<div style="text-align:${block.align || "center"};">
    ${row}
    <div class="small-muted mt-2">Click this block to edit icons and links in Design Settings.</div>
  </div>`;
}
function renderPlacedSocialIcons(block, final = false) {
  if (!Array.isArray(block.socialIcons) || !block.socialIcons.length) return "";
  const align = block.align || (block.type === "social" ? "center" : "left");
  return `<div class="email-social-row-in-block ${align}">${block.socialIcons.map((icon, idx) => renderPlacedSocialIcon(block, icon, idx, final)).join("")}</div>`;
}

function renderPlacedSocialIcon(block, icon, idx, final = false) {
  const platform = icon.platform || "website";
  const size = Math.max(20, Math.min(72, Number(block.iconSize || 36)));
  const name = socialIconNames[platform] || platform;
  const selected =
    selectedDesignerSocialTarget &&
    String(selectedDesignerSocialTarget.blockId) === String(block.id) &&
    Number(selectedDesignerSocialTarget.index) === Number(idx);
  const labelHtml =
    block.showLabels === "yes"
      ? `<span style="margin-right:8px;">${safeHtml(name)}</span>`
      : "";
  const iconHtml = renderSocialBrandIcon(platform, size);

  if (final) {
    const href =
      icon.url && String(icon.url).trim() ? String(icon.url).trim() : "#";
    return `<a href="${safeAttr(href)}" title="${safeAttr(name)}" style="display:inline-flex;align-items:center;justify-content:center;text-decoration:none;margin:4px;vertical-align:middle;">${iconHtml}</a>${labelHtml}`;
  }

  return `<span class="email-social-icon-wrap ${selected ? "selected" : ""}" style="display:inline-flex;align-items:center;gap:3px;line-height:0;">
    <span class="email-social-placed ${selected ? "selected" : ""}" title="Click to edit ${safeAttr(name)} URL" style="width:${size}px!important;height:${size}px!important;min-width:${size}px!important;min-height:${size}px!important;line-height:0;background:transparent!important;border-radius:0!important;box-shadow:none!important;" onclick="editPlacedSocialIcon(event,'${block.id}',${idx})">${iconHtml}</span>
    <span class="email-social-icon-tools">
      <button class="email-social-icon-tool" title="Move left" onclick="event.stopPropagation();movePlacedSocialIcon('${block.id}',${idx},-1)">‹</button>
      <button class="email-social-icon-tool" title="Move right" onclick="event.stopPropagation();movePlacedSocialIcon('${block.id}',${idx},1)">›</button>
      <button class="email-social-icon-tool" title="Delete icon" onclick="event.stopPropagation();deletePlacedSocialIcon('${block.id}',${idx})">×</button>
    </span>
    ${labelHtml}
  </span>`;
}

function renderTableBlock(block) {
  const headers = String(block.headers || "")
    .split(",")
    .map((h) => h.trim())
    .filter(Boolean);
  const rows = String(block.rows || "")
    .split("\n")
    .map((r) => r.split(",").map((c) => c.trim()));
  return `<h3>${safeHtml(block.title)}</h3><table style="width:100%;border-collapse:collapse;">${headers.length ? `<tr>${headers.map((h) => `<th style="border:1px solid #e5e7eb;padding:8px;background:#f9fafb;text-align:left;">${safeHtml(h)}</th>`).join("")}</tr>` : ""}${rows.map((r) => `<tr>${r.map((c) => `<td style="border:1px solid #e5e7eb;padding:8px;">${safeHtml(c)}</td>`).join("")}</tr>`).join("")}</table>`;
}

function renderImageGridBlock(block) {
  const urls = String(block.imageUrls || "")
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);
  if (!urls.length)
    return `<div class="designer-empty-state">Add image URLs or choose images from the library.</div>`;
  return `<div style="display:grid;grid-template-columns:repeat(${Number(block.columns || 4)},1fr);gap:${Number(block.gap || 8)}px;">${urls.map((url) => `<img src="${safeAttr(url)}" style="width:100%;height:auto;border-radius:${Number(block.mediaRadius || 0)}px;display:block;">`).join("")}</div>`;
}

function designerBlockOuterStyle(block) {
  const width = Math.max(25, Math.min(100, Number(block.blockWidth || 100)));
  const align = block.blockAlign || "center";
  let margin = "8px auto";
  if (align === "left") margin = "8px auto 8px 0";
  if (align === "right") margin = "8px 0 8px auto";
  const height = Number(block.blockHeight || 0);
  return `width:${width}%;margin:${margin};${height > 0 ? `--designer-block-height:${height}px;` : ""}`;
}

function startEmailWidgetDrag(event, type) {
  activeDraggedSocialIconPlatform = null;
  activeDraggedEmailWidgetType = type;
  try {
    event.dataTransfer.setData("text/plain", `widget:${type}`);
    event.dataTransfer.effectAllowed = "copyMove";
  } catch (e) {}
}

function startSocialIconDrag(event, platform) {
  event.stopPropagation();
  activeDraggedEmailWidgetType = null;
  activeDraggedSocialIconPlatform = platform;
  try {
    event.dataTransfer.setData("application/x-excel-social-icon", platform);
    event.dataTransfer.setData("text/plain", `socialIcon:${platform}`);
    event.dataTransfer.effectAllowed = "copy";
  } catch (e) {}
}

function getEmailDesignerDragPayload(event) {
  let plain = "";
  let social = activeDraggedSocialIconPlatform || "";
  try {
    if (event && event.dataTransfer) {
      social =
        social || event.dataTransfer.getData("application/x-excel-social-icon");
      plain = event.dataTransfer.getData("text/plain") || "";
    }
  } catch (e) {}
  if (social) return { kind: "social", value: social };
  if (String(plain).startsWith("socialIcon:"))
    return { kind: "social", value: String(plain).split(":")[1] };
  if (String(plain).startsWith("widget:"))
    return { kind: "widget", value: String(plain).split(":")[1] };
  if (activeDraggedEmailWidgetType)
    return { kind: "widget", value: activeDraggedEmailWidgetType };
  return { kind: "", value: "" };
}

function toggleSocialIconTray() {
  socialIconTrayOpen = !socialIconTrayOpen;
  renderSocialIconTray(socialIconTrayOpen);
}

function renderSocialIconTray(show = socialIconTrayOpen) {
  socialIconTrayOpen = !!show;
  const tray = document.getElementById("emailSocialIconTray");
  if (!tray) return;
  tray.style.display = socialIconTrayOpen ? "block" : "none";
  const platforms = [
    "facebook",
    "instagram",
    "linkedin",
    "youtube",
    "x",
    "tiktok",
    "website",
  ];
  tray.innerHTML =
    `<div class="social-tray-title">Social Icons</div><div class="small-muted mb-2">Drag only the icons you use into any email block. Click a placed icon in the email to set its URL.</div><div class="social-picker-icon-grid">` +
    platforms
      .map(
        (p) =>
          `<button type="button" class="social-picker-icon" title="${safeAttr(socialIconNames[p])}" style="background:${safeAttr(socialBrandColors[p])}" draggable="true" ondragstart="startSocialIconDrag(event,'${p}')" onclick="addSocialIconToSelectedBlock('${p}')"><span>${safeHtml(socialIconLabels[p])}</span><small>${safeHtml(socialIconNames[p])}</small></button>`,
      )
      .join("") +
    `</div>`;
}

function addSocialIconToSelectedBlock(platform) {
  const block = designerBlocks.find(
    (b) => String(b.id) === String(selectedDesignerBlockId),
  );
  if (!block) {
    alert(
      "Select a block first, or drag the social icon directly onto the block where you want it to appear.",
    );
    return;
  }
  addSocialIconToBlock(block.id, platform);
}

function addSocialIconToBlock(blockId, platform) {
  const block = designerBlocks.find((b) => String(b.id) === String(blockId));
  if (!block || !platform) return;
  if (!Array.isArray(block.socialIcons)) block.socialIcons = [];
  block.socialIcons.push({
    id: edId("social"),
    platform,
    url: "",
    useCustomColor: "no",
    customColor: socialBrandColors[platform] || "#042C49",
  });
  selectedDesignerBlockId = block.id;
  selectedDesignerImageTarget = null;
  selectedDesignerSocialTarget = {
    blockId: block.id,
    index: block.socialIcons.length - 1,
  };
  activeDraggedSocialIconPlatform = null;
  activeDraggedEmailWidgetType = null;
  renderEmailDesigner();
}

function editPlacedSocialIcon(event, blockId, index) {
  event.preventDefault();
  event.stopPropagation();
  const block = designerBlocks.find((b) => String(b.id) === String(blockId));
  if (!block || !Array.isArray(block.socialIcons) || !block.socialIcons[index])
    return;
  selectedDesignerBlockId = block.id;
  selectedDesignerImageTarget = null;
  selectedDesignerSocialTarget = { blockId: block.id, index };
  renderEmailDesigner(false);
}

function updatePlacedSocialIcon(blockId, index, key, value) {
  const block = designerBlocks.find((b) => String(b.id) === String(blockId));
  if (!block || !Array.isArray(block.socialIcons) || !block.socialIcons[index])
    return;
  block.socialIcons[index][key] = value;
  selectedDesignerBlockId = block.id;
  selectedDesignerSocialTarget = { blockId: block.id, index };
  renderEmailDesigner(false);
}

function movePlacedSocialIcon(blockId, index, direction) {
  const block = designerBlocks.find((b) => String(b.id) === String(blockId));
  if (!block || !Array.isArray(block.socialIcons)) return;
  const next = index + direction;
  if (next < 0 || next >= block.socialIcons.length) return;
  const temp = block.socialIcons[index];
  block.socialIcons[index] = block.socialIcons[next];
  block.socialIcons[next] = temp;
  selectedDesignerSocialTarget = { blockId: block.id, index: next };
  renderEmailDesigner();
}

function deletePlacedSocialIcon(blockId, index) {
  const block = designerBlocks.find((b) => String(b.id) === String(blockId));
  if (!block || !Array.isArray(block.socialIcons)) return;
  block.socialIcons.splice(index, 1);
  selectedDesignerSocialTarget = null;
  renderEmailDesigner();
}

function allowDesignerBlockDrop(event) {
  const payload = getEmailDesignerDragPayload(event);
  if (!payload.kind) return;
  event.preventDefault();
  if (payload.kind === "social") event.dataTransfer.dropEffect = "copy";
  event.currentTarget.classList.add("drag-drop-target");
}

function dropWidgetIntoDesignerBlock(event, blockId) {
  event.preventDefault();
  event.stopPropagation();
  event.currentTarget.classList.remove("drag-drop-target");
  const payload = getEmailDesignerDragPayload(event);
  activeDraggedEmailWidgetType = null;
  activeDraggedSocialIconPlatform = null;
  const block = designerBlocks.find((b) => String(b.id) === String(blockId));
  if (!block || !payload.kind || !payload.value) return;

  selectedDesignerBlockId = block.id;
  selectedDesignerImageTarget = null;

  if (payload.kind === "social") {
    addSocialIconToBlock(block.id, payload.value);
    return;
  }

  if (payload.value === "image") {
    openEmailImagePicker(block.id, block.type === "image" ? "image" : "media");
    return;
  }

  const index = designerBlocks.findIndex(
    (b) => String(b.id) === String(blockId),
  );
  const newBlock = emailBlockDefaults(payload.value);
  designerBlocks.splice(index + 1, 0, newBlock);
  selectedDesignerBlockId = newBlock.id;
  renderEmailDesigner();
}

function renderEmailDesigner(autosave = true) {
  const canvas = document.getElementById("emailDesignerCanvas");
  if (!canvas) return;
  const wrap = document.getElementById("emailDesignerCanvasWrap");
  if (wrap) {
    wrap.style.backgroundColor = designerSettings.outerBg || "#f4f6f8";
    wrap.style.backgroundImage = designerSettings.outerBgImage
      ? `url('${designerSettings.outerBgImage}')`
      : "";
    wrap.style.backgroundSize = "cover";
    wrap.style.backgroundPosition = "center";
  }
  canvas.style.maxWidth = `${Number(designerSettings.emailWidth || 680)}px`;
  canvas.style.backgroundColor = designerSettings.canvasBg || "#ffffff";
  canvas.style.backgroundImage = designerSettings.canvasBgImage
    ? `url('${designerSettings.canvasBgImage}')`
    : "";
  canvas.style.backgroundSize = "cover";
  canvas.style.backgroundPosition = "center";
  canvas.style.fontFamily = designerSettings.fontFamily || "Arial, sans-serif";

  if (!designerBlocks.length) {
    canvas.innerHTML = `<div class="designer-empty-state" data-widget-type="text">Drag widgets here or click a widget card to start designing.</div>`;
  } else {
    canvas.innerHTML = designerBlocks
      .map(
        (block) => `
      <div class="email-block-v2 ${selectedDesignerBlockId === block.id ? "selected" : ""}" data-block-id="${block.id}" style="${designerBlockOuterStyle(block)}" onclick="selectDesignerBlock('${block.id}')" ondragover="allowDesignerBlockDrop(event)" ondragleave="this.classList.remove('drag-drop-target')" ondrop="dropWidgetIntoDesignerBlock(event,'${block.id}')">
        <div class="email-block-drag-grip-v2" title="Drag block">⋮⋮</div>
        <div class="email-block-toolbar-v2" onclick="event.stopPropagation()" title="Block tools">
          <button class="email-mini-btn-v2 primary" title="Edit block" onclick="editDesignerBlock('${block.id}')">✎</button>
          <button class="email-mini-btn-v2" title="Copy block" onclick="duplicateDesignerBlock('${block.id}')">⧉</button>
          <button class="email-mini-btn-v2 danger" title="Delete block" onclick="removeDesignerBlock('${block.id}')">×</button>
        </div>
        ${wrapBlock(block, renderDesignerBlockInner(block))}
        <span class="email-block-height-handle-v2" title="Drag up to shrink this block or down to add height" onmousedown="startDesignerBlockHeightDrag(event,'${block.id}')"></span>
        <span class="email-block-resize-handle-v2" title="Drag to resize block width" onmousedown="startDesignerBlockResize(event,'${block.id}')"></span>
      </div>
    `,
      )
      .join("");
  }
  renderEmailDesignerSettings();
  setupEmailDesignerDragDrop();
  if (autosave) saveEmailDesignLocal(false);
}

function getSocialPlatforms() {
  return [
    "website",
    "facebook",
    "instagram",
    "linkedin",
    "youtube",
    "x",
    "tiktok",
  ];
}

function findSocialIcon(block, platform) {
  if (!block || !Array.isArray(block.socialIcons)) return null;
  return block.socialIcons.find((icon) => icon.platform === platform) || null;
}

function updateSocialBlockPlatform(blockId, platform, enabled) {
  const block = designerBlocks.find((b) => String(b.id) === String(blockId));
  if (!block) return;
  if (!Array.isArray(block.socialIcons)) block.socialIcons = [];
  const exists = findSocialIcon(block, platform);
  if (enabled && !exists) {
    block.socialIcons.push({
      id: edId("social"),
      platform,
      url: "",
      useCustomColor: "no",
      customColor: socialBrandColors[platform] || "#042C49",
    });
  }
  if (!enabled && exists) {
    block.socialIcons = block.socialIcons.filter(
      (icon) => icon.platform !== platform,
    );
  }
  selectedDesignerBlockId = block.id;
  selectedDesignerSocialTarget = null;
  renderEmailDesigner(false);
}

function updateSocialIconUrlForPlatform(blockId, platform, value) {
  const block = designerBlocks.find((b) => String(b.id) === String(blockId));
  if (!block) return;
  if (!Array.isArray(block.socialIcons)) block.socialIcons = [];
  let icon = findSocialIcon(block, platform);
  if (!icon) {
    icon = {
      id: edId("social"),
      platform,
      url: "",
      useCustomColor: "no",
      customColor: socialBrandColors[platform] || "#042C49",
    };
    block.socialIcons.push(icon);
  }
  icon.url = value;
  selectedDesignerBlockId = block.id;
  renderEmailDesigner(false);
}

function renderSocialBlockSettings(block) {
  if (!block || block.type !== "social") return "";
  const platformRows = getSocialPlatforms()
    .map((platform) => {
      const icon = findSocialIcon(block, platform);
      const checked = !!icon;
      const url = icon ? icon.url || "" : "";
      const color = socialBrandColors[platform] || "#042C49";
      return `<div class="clean-social-setting-row">
      <label class="clean-social-check">
        <input type="checkbox" ${checked ? "checked" : ""} onchange="updateSocialBlockPlatform('${block.id}','${platform}',this.checked)">
        <span class="clean-social-mini">${renderSocialBrandIcon(platform, 22)}</span>
        <b>${safeHtml(socialIconNames[platform] || platform)}</b>
      </label>
      <input class="form-control form-control-sm" value="${safeAttr(url)}" placeholder="https://..." ${checked ? "" : "disabled"} onchange="updateSocialIconUrlForPlatform('${block.id}','${platform}',this.value)">
    </div>`;
    })
    .join("");

  return `<div class="designer-simple-section">
    <div class="designer-simple-section-title">Social Icons</div>
    <div class="designer-simple-section mb-2" style="background:#fff;">
      <label style="font-size:11px;color:var(--muted);font-weight:800;text-transform:uppercase;letter-spacing:.03em;">Icon Size — all icons scale together</label>
      <div class="d-flex align-items-center gap-2">
        <input class="form-range flex-grow-1" type="range" min="20" max="72" step="2" value="${safeAttr(block.iconSize || 36)}" oninput="document.getElementById('socialIconSizeNumber-${block.id}').value=this.value; updateDesignerBlock('${block.id}','iconSize',this.value)">
        <input id="socialIconSizeNumber-${block.id}" class="form-control form-control-sm" style="width:78px;" type="number" min="20" max="72" step="2" value="${safeAttr(block.iconSize || 36)}" onchange="updateDesignerBlock('${block.id}','iconSize',this.value)">
      </div>
      <div class="small-muted">This changes the actual icon/logo size. All selected social icons scale together.</div>
    </div>
    <div class="setting-grid-v2 mb-2">
      <div><label>Show Labels</label><select class="form-control form-control-sm" onchange="updateDesignerBlock('${block.id}','showLabels',this.value)">
        ${["no", "yes"].map((o) => `<option value="${o}" ${String(block.showLabels || "no") === o ? "selected" : ""}>${o}</option>`).join("")}
      </select></div>
      <div><label>Alignment</label><select class="form-control form-control-sm" onchange="updateDesignerBlock('${block.id}','align',this.value)">
        ${["left", "center", "right"].map((o) => `<option value="${o}" ${String(block.align || "center") === o ? "selected" : ""}>${o}</option>`).join("")}
      </select></div>
    </div>
    <div class="clean-social-settings-list">${platformRows}</div>
    <div class="small-muted mt-2">Check only the platforms you want. Add the URL beside each selected icon.</div>
  </div>`;
}

function renderSelectedSocialIconSettings(block) {
  if (
    !selectedDesignerSocialTarget ||
    String(selectedDesignerSocialTarget.blockId) !== String(block.id)
  )
    return "";
  const index = Number(selectedDesignerSocialTarget.index);
  const icon = Array.isArray(block.socialIcons)
    ? block.socialIcons[index]
    : null;
  if (!icon) return "";
  const platform = icon.platform || "website";
  const name = socialIconNames[platform] || platform;
  const brandColor = socialBrandColors[platform] || "#042C49";
  return `<div class="designer-simple-section">
    <div class="designer-simple-section-title">Editing ${safeHtml(name)} Icon</div>
    <div class="setting-full-v2"><label>${safeHtml(name)} URL</label><input class="form-control form-control-sm" value="${safeAttr(icon.url || "")}" placeholder="https://..." onchange="updatePlacedSocialIcon('${block.id}',${index},'url',this.value)"></div>
    <div class="setting-grid-v2 mt-2">
      <div><label>Use Custom Color</label><select class="form-control form-control-sm" onchange="updatePlacedSocialIcon('${block.id}',${index},'useCustomColor',this.value)"><option value="no" ${icon.useCustomColor !== "yes" ? "selected" : ""}>No - Brand Color</option><option value="yes" ${icon.useCustomColor === "yes" ? "selected" : ""}>Yes</option></select></div>
      <div><label>Custom Color</label><input type="color" class="form-control form-control-sm" value="${safeAttr(icon.customColor || brandColor)}" onchange="updatePlacedSocialIcon('${block.id}',${index},'customColor',this.value)"></div>
    </div>
    <div class="d-flex gap-2 mt-2 flex-wrap">
      <button class="btn btn-sm btn-outline-primary" onclick="movePlacedSocialIcon('${block.id}',${index},-1)">Move Left</button>
      <button class="btn btn-sm btn-outline-primary" onclick="movePlacedSocialIcon('${block.id}',${index},1)">Move Right</button>
      <button class="btn btn-sm btn-outline-danger" onclick="deletePlacedSocialIcon('${block.id}',${index})">Delete Icon</button>
    </div>
  </div>`;
}

function renderEmailDesignerSettings() {
  const el = document.getElementById("emailDesignerSettings");
  if (!el) return;
  const block = designerBlocks.find((b) => b.id === selectedDesignerBlockId);
  const setInput = (obj, key, label, type = "text") =>
    `<div><label>${label}</label><input class="form-control form-control-sm" type="${type}" value="${safeAttr(obj[key])}" onchange="${obj === designerSettings ? `updateDesignerSetting('${key}',this.value)` : `updateDesignerBlock('${block.id}','${key}',this.value)`}"></div>`;
  const setArea = (key, label) =>
    `<div class="setting-full-v2 mt-2"><label>${label}</label><textarea class="form-control form-control-sm" rows="3" onchange="updateDesignerBlock('${block.id}','${key}',this.value)">${safeHtml(block[key])}</textarea></div>`;
  const setSelect = (key, label, options) =>
    `<div><label>${label}</label><select class="form-control form-control-sm" onchange="updateDesignerBlock('${block.id}','${key}',this.value)">${options.map((o) => `<option value="${o}" ${String(block[key]) === String(o) ? "selected" : ""}>${o}</option>`).join("")}</select></div>`;

  let html = `
    <div class="setting-grid-v2">
      ${setInput(designerSettings, "outerBg", "Page Background", "color")}
      ${setInput(designerSettings, "canvasBg", "Email Background", "color")}
      ${setInput(designerSettings, "emailWidth", "Width", "number")}
      <div><label>Font</label><select class="form-control form-control-sm" onchange="updateDesignerSetting('fontFamily',this.value)">
        ${["Arial, sans-serif", "Georgia, serif", "Verdana, sans-serif", "Tahoma, sans-serif", "Trebuchet MS, sans-serif"].map((f) => `<option value="${f}" ${designerSettings.fontFamily === f ? "selected" : ""}>${f.split(",")[0]}</option>`).join("")}
      </select></div>
    </div>
    <div class="setting-full-v2 mt-2"><label>Outer Background Image URL</label><div class="input-group input-group-sm"><input class="form-control" value="${safeAttr(designerSettings.outerBgImage)}" onchange="updateDesignerSetting('outerBgImage',this.value)"><button class="btn btn-outline-primary" onclick="openEmailImagePicker('outerBg','background')">Library</button></div></div>
    <div class="setting-full-v2 mt-2"><label>Email Background Image URL</label><div class="input-group input-group-sm"><input class="form-control" value="${safeAttr(designerSettings.canvasBgImage)}" onchange="updateDesignerSetting('canvasBgImage',this.value)"><button class="btn btn-outline-primary" onclick="openEmailImagePicker('canvasBg','background')">Library</button></div></div>
    <hr>
  `;

  if (!block) {
    el.innerHTML =
      html +
      '<div class="designer-simple-section"><div class="designer-simple-section-title">No block selected</div><div class="text-muted small">Click a block in the canvas to edit it. You can also drag widgets from the left into the email body.</div></div>';
    return;
  }

  html += `<div class="designer-panel-title">Editing ${block.type.charAt(0).toUpperCase() + block.type.slice(1)} Block</div>
    <div class="designer-settings-actions">
      <button class="btn btn-sm btn-outline-primary" onclick="duplicateDesignerBlock('${block.id}')">Copy Block</button>
      <button class="btn btn-sm btn-outline-danger" onclick="removeDesignerBlock('${block.id}')">Delete Block</button>
      
    </div>
    <div class="designer-simple-section"><div class="designer-simple-section-title">Block Style</div>
    <div class="small-muted mb-2">Click a block, then drag the Block Height handle at the bottom of that block. Drag up to tighten the block or down to add breathing room.</div>
    <div class="setting-grid-v2">
      ${setInput(block, "bg", "Background Color", "color")}
      ${setInput(block, "text", "Text Color", "color")}
      ${setInput(block, "padding", "Side Padding", "number")}
      ${setInput(block, "radius", "Radius", "number")}
      ${setInput(block, "borderWidth", "Border", "number")}
      ${setInput(block, "borderColor", "Border Color", "color")}
      ${setSelect("align", "Text Align", ["left", "center", "right"])}
      ${setSelect("blockAlign", "Block Position", ["left", "center", "right"])}
      ${setInput(block, "blockHeight", "Block Height px", "number")}
      ${setInput(block, "bgImage", "Background Image URL")}
    </div></div>
    ${renderSocialBlockSettings(block)}
    ${block.type !== "social" ? renderSelectedSocialIconSettings(block) : ""}
    <div class="designer-simple-section">
    <div class="designer-panel-title">Block Image</div>
    <div class="setting-full-v2"><label>Image URL</label><div class="input-group input-group-sm"><input class="form-control" value="${safeAttr(block.mediaUrl)}" onchange="updateDesignerBlock('${block.id}','mediaUrl',this.value)"><button class="btn btn-outline-primary" onclick="openEmailImagePicker('${block.id}','media')">Library</button></div></div>
    <div class="setting-grid-v2 mt-2">
      ${setSelect("mediaPosition", "Position", ["top", "bottom", "left", "right"])}
      ${setInput(block, "mediaWidth", "Image %", "number")}
      ${setInput(block, "mediaRadius", "Image Radius", "number")}${setInput(block, "mediaHeight", "Height px", "number")}${setSelect("mediaFit", "Fit", ["cover", "contain", "fill"])}${setSelect("mediaShadow", "Shadow", ["no", "yes"])}
    </div></div>
    <hr>
  `;

  if (["header", "heading"].includes(block.type))
    html += `<div class="setting-full-v2"><label>Title</label><input class="form-control form-control-sm" value="${safeAttr(block.title)}" onchange="updateDesignerBlock('${block.id}','title',this.value)"></div><div class="setting-full-v2 mt-2"><label>Subtitle</label><input class="form-control form-control-sm" value="${safeAttr(block.subtitle)}" onchange="updateDesignerBlock('${block.id}','subtitle',this.value)"></div>`;
  if (block.type === "text")
    html += `${setArea("body", "Body")}<div class="setting-grid-v2 mt-2">${setInput(block, "fontSize", "Font Size", "number")}${setInput(block, "lineHeight", "Line Height", "number")}</div>`;
  if (block.type === "image")
    html += `<div class="setting-full-v2"><label>Image URL</label><div class="input-group input-group-sm"><input class="form-control" value="${safeAttr(block.imageUrl)}" onchange="updateDesignerBlock('${block.id}','imageUrl',this.value)"><button class="btn btn-outline-primary" onclick="openEmailImagePicker('${block.id}','image')">Library</button></div></div><div class="setting-grid-v2 mt-2">${setInput(block, "alt", "Alt Text")}${setInput(block, "imageWidth", "Width %", "number")}${setInput(block, "imageHeight", "Height px", "number")}${setSelect("imageFit", "Fit", ["cover", "contain", "fill"])}${setSelect("imageShape", "Shape", ["rounded", "square", "circle", "pill", "custom"])}${setInput(block, "imageRadius", "Custom Radius", "number")}${setInput(block, "imageBorderWidth", "Border px", "number")}${setInput(block, "imageBorderColor", "Border Color", "color")}${setSelect("imageShadow", "Shadow", ["no", "yes"])}${setInput(block, "imageRotate", "Rotate Degrees", "number")}</div>`;
  if (block.type === "button")
    html += `<div class="setting-full-v2"><label>Label</label><input class="form-control form-control-sm" value="${safeAttr(block.label)}" onchange="updateDesignerBlock('${block.id}','label',this.value)"></div><div class="setting-full-v2 mt-2"><label>Link URL</label><input class="form-control form-control-sm" value="${safeAttr(block.url)}" onchange="updateDesignerBlock('${block.id}','url',this.value)"></div><div class="setting-grid-v2 mt-2">${setInput(block, "buttonBg", "Button Color", "color")}${setInput(block, "buttonText", "Text Color", "color")}${setSelect("buttonSize", "Button Size", ["small", "medium", "large"])}${setSelect("fullWidth", "Full Width", ["no", "yes"])}</div>`;
  if (block.type === "divider")
    html += `<div class="setting-grid-v2">${setInput(block, "lineColor", "Line Color", "color")}${setInput(block, "thickness", "Thickness", "number")}${setInput(block, "lineWidth", "Width %", "number")}</div><div class="small-muted mt-2">Drag the top or bottom edge of the divider block to move the line closer to the block above or below.</div>`;
  if (block.type === "spacer")
    html += `<div class="setting-grid-v2">${setInput(block, "height", "Height", "number")}</div>`;
  if (
    block.type !== "social" &&
    Array.isArray(block.socialIcons) &&
    block.socialIcons.length
  )
    html += `<div class="designer-simple-section"><div class="designer-simple-section-title">Social Icon Display</div><div class="setting-grid-v2">${setSelect("iconShape", "Icon Shape", ["circle", "rounded", "square"])}${setInput(block, "iconSize", "Icon Size", "number")}${setSelect("showLabels", "Show Labels", ["no", "yes"])}</div><div class="small-muted mt-2">Click an individual icon in the block to edit its URL, color, position, or delete it.</div></div>`;
  if (block.type === "video")
    html += `<div class="setting-full-v2"><label>Title</label><input class="form-control form-control-sm" value="${safeAttr(block.title)}" onchange="updateDesignerBlock('${block.id}','title',this.value)"></div><div class="setting-full-v2 mt-2"><label>Video URL</label><input class="form-control form-control-sm" value="${safeAttr(block.videoUrl)}" onchange="updateDesignerBlock('${block.id}','videoUrl',this.value)"></div><div class="setting-full-v2 mt-2"><label>Preview Image URL</label><input class="form-control form-control-sm" value="${safeAttr(block.imageUrl)}" onchange="updateDesignerBlock('${block.id}','imageUrl',this.value)"></div>`;
  if (block.type === "table")
    html += `<div class="setting-full-v2"><label>Title</label><input class="form-control form-control-sm" value="${safeAttr(block.title)}" onchange="updateDesignerBlock('${block.id}','title',this.value)"></div>${setArea("headers", "Headers, comma separated")}${setArea("rows", "Rows, one per line, comma separated")}`;
  if (block.type === "article")
    html += `<div class="setting-full-v2"><label>Title</label><input class="form-control form-control-sm" value="${safeAttr(block.title)}" onchange="updateDesignerBlock('${block.id}','title',this.value)"></div>${setArea("body", "Body")}<div class="setting-grid-v2 mt-2">${setInput(block, "buttonLabel", "Button Label")}${setInput(block, "buttonUrl", "Button URL")}</div>`;
  if (block.type === "twoColumn")
    html += `<div class="setting-grid-v2">${setInput(block, "leftTitle", "Left Title")}${setInput(block, "rightTitle", "Right Title")}</div>${setArea("leftBody", "Left Body")}${setArea("rightBody", "Right Body")}`;
  if (block.type === "sidebar")
    html += `<div class="setting-grid-v2">${setInput(block, "mainTitle", "Main Title")}${setInput(block, "sidebarTitle", "Sidebar Title")}${setSelect("sidebarSide", "Sidebar Side", ["left", "right"])}${setInput(block, "sidebarBg", "Sidebar BG", "color")}</div>${setArea("mainBody", "Main Body")}${setArea("sidebarBody", "Sidebar Body")}`;
  if (block.type === "imageGrid")
    html += `<div class="setting-grid-v2">${setSelect("columns", "Columns", ["2", "4", "6", "8"])}${setInput(block, "gap", "Gap", "number")}</div>${setArea("imageUrls", "Image URLs, one per line")}`;
  if (block.type === "rsvp")
    html += `<div class="setting-full-v2"><label>Title</label><input class="form-control form-control-sm" value="${safeAttr(block.title)}" onchange="updateDesignerBlock('${block.id}','title',this.value)"></div><div class="setting-grid-v2 mt-2">${setInput(block, "yesUrl", "Yes URL")}${setInput(block, "maybeUrl", "Maybe URL")}${setInput(block, "noUrl", "No URL")}</div>`;
  if (block.type === "feedback")
    html += `<div class="setting-full-v2"><label>Title</label><input class="form-control form-control-sm" value="${safeAttr(block.title)}" onchange="updateDesignerBlock('${block.id}','title',this.value)"></div><div class="setting-grid-v2 mt-2">${setInput(block, "goodUrl", "Good URL")}${setInput(block, "okUrl", "OK URL")}${setInput(block, "badUrl", "Bad URL")}</div>`;
  el.innerHTML = html;
}

function renderFinalEmailDesignerHtml() {
  syncDesignerMetaFromInputs();
  const encoded = encodeURIComponent(
    JSON.stringify({
      settings: designerSettings,
      blocks: designerBlocks,
      meta: designerMeta,
    }),
  );
  const outerBgImage = designerSettings.outerBgImage
    ? `background-image:url('${safeAttr(designerSettings.outerBgImage)}');background-size:cover;background-position:center;`
    : "";
  const canvasBgImage = designerSettings.canvasBgImage
    ? `background-image:url('${safeAttr(designerSettings.canvasBgImage)}');background-size:cover;background-position:center;`
    : "";
  const preheaderHtml = designerMeta.preheader
    ? `<div style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;mso-hide:all;">${safeHtml(designerMeta.preheader)}</div>`
    : "";
  return `<!--EXCEL_EMAIL_DESIGN_V2:${encoded}-->${preheaderHtml}<div style="margin:0;padding:0;background:${designerSettings.outerBg || "#f4f6f8"};${outerBgImage}"><div style="max-width:${Number(designerSettings.emailWidth || 680)}px;margin:0 auto;background:${designerSettings.canvasBg || "#ffffff"};${canvasBgImage}font-family:${designerSettings.fontFamily || "Arial, sans-serif"};">${designerBlocks.map((b) => wrapBlock(b, renderDesignerBlockInner(b), true)).join("")}</div></div>`;
}

function applyEmailDesignToCampaign() {
  if (!designerBlocks.length) {
    alert("Add at least one email design block first.");
    return;
  }
  const pkg = getEmailDesignPackage();
  campaignName.value = pkg.name || "";
  subject.value = pkg.subject || "";
  const preheaderField = document.getElementById("preheader");
  if (preheaderField) preheaderField.value = pkg.preheader || "";
  quill.root.innerHTML = pkg.html;
  alert(
    "Design copied into Email Campaigns. Add your recipients and send when ready.",
  );
  showTab("campaigns");
}

function previewEmailDesignerHtml() {
  const w = window.open("", "_blank");
  w.document.write(renderFinalEmailDesignerHtml());
  w.document.close();
}

function loadEmailDesignerStarter() {
  designerBlocks = [
    {
      ...emailBlockDefaults("header"),
      title: "RapportLink Update",
      subtitle: "Market news, listings, and helpful resources",
    },
    {
      ...emailBlockDefaults("article"),
      title: "Featured Update",
      body: "Use this area for your main story, listing highlight, market update, or client message.",
      mediaPosition: "top",
    },
    {
      ...emailBlockDefaults("twoColumn"),
      leftTitle: "Market Snapshot",
      leftBody: "Add quick market stats or notes.",
      rightTitle: "Next Steps",
      rightBody: "Invite readers to contact you or click a button.",
    },
    {
      ...emailBlockDefaults("button"),
      label: "Schedule a Call",
      url: "https://rapportlink.com",
    },
  ];
  selectedDesignerBlockId = designerBlocks[0].id;
  renderEmailDesigner();
}

function clearEmailDesigner() {
  if (!confirm("Clear the email designer canvas?")) return;
  designerBlocks = [];
  selectedDesignerBlockId = null;
  renderEmailDesigner();
}

function saveEmailDesignLocal(showAlert = true) {
  syncDesignerMetaFromInputs();
  localStorage.setItem(
    "excelEmailDesignerDraft",
    JSON.stringify({
      settings: designerSettings,
      blocks: designerBlocks,
      meta: designerMeta,
    }),
  );
  if (showAlert) alert("Email design draft saved in this browser.");
}

function loadSavedEmailDesignerDraft() {
  if (designerBlocks.length) return;
  const saved = JSON.parse(
    localStorage.getItem("excelEmailDesignerDraft") || "null",
  );
  if (saved && Array.isArray(saved.blocks)) {
    designerSettings = { ...designerSettings, ...(saved.settings || {}) };
    designerBlocks = saved.blocks.map((block) => {
      if (block && block.type === "social") {
        block.socialTitle = "";
        block.iconShape = "brand";
      }
      return block;
    });
    designerMeta = { ...designerMeta, ...(saved.meta || {}) };
    hydrateDesignerMetaInputs();
    selectedDesignerBlockId = designerBlocks[0]?.id || null;
  }
}

async function loadEmailImagesFromServer() {
  const localImages = JSON.parse(
    localStorage.getItem("excelEmailImageLibrary") || "[]",
  );
  try {
    const res = await fetch("/api/email-images");
    if (!res.ok) throw new Error("Image library unavailable");
    const serverImages = await res.json();
    if (Array.isArray(serverImages)) {
      const merged = [];
      const seen = new Set();
      [...serverImages, ...localImages, ...designerImageLibrary].forEach(
        (img) => {
          const key = img.id || img.data;
          if (img && img.data && !seen.has(key)) {
            seen.add(key);
            merged.push(img);
          }
        },
      );
      designerImageLibrary = merged.slice(0, 100);
      localStorage.setItem(
        "excelEmailImageLibrary",
        JSON.stringify(designerImageLibrary.slice(0, 60)),
      );
    }
  } catch (e) {
    designerImageLibrary = localImages.length
      ? localImages
      : designerImageLibrary;
  }
  renderEmailImageLibrary();
  renderEmailImagePickerGrid();
}

async function saveImageToServer(image) {
  try {
    const res = await fetch("/api/email-images", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(image),
    });
    if (res.ok) return await res.json();
  } catch (e) {}
  return { success: false };
}

function handleEmailImageUpload(event) {
  const files = Array.from(event.target.files || []);
  if (!files.length) return;
  let remaining = files.length;
  files.forEach((file) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const image = {
        id: edId("img"),
        name: file.name,
        data: e.target.result,
        createdAt: new Date().toISOString(),
      };
      designerImageLibrary.unshift(image);
      await saveImageToServer(image);
      remaining--;
      if (remaining === 0) {
        designerImageLibrary = designerImageLibrary.slice(0, 60);
        localStorage.setItem(
          "excelEmailImageLibrary",
          JSON.stringify(designerImageLibrary),
        );
        renderEmailImageLibrary();
        renderEmailImagePickerGrid();
      }
    };
    reader.readAsDataURL(file);
  });
  event.target.value = "";
}

function renderEmailImageLibrary() {
  const el = document.getElementById("emailImageLibrary");
  if (!el) return;
  if (!designerImageLibrary.length) {
    el.innerHTML =
      '<div class="text-muted small">No images uploaded yet. Upload images here and they will be reusable.</div>';
    return;
  }
  el.innerHTML = designerImageLibrary
    .slice(0, 24)
    .map(
      (img) =>
        `<div class="image-library-card-wrap"><button class="image-library-delete" title="Delete image" onclick="event.stopPropagation();deleteEmailLibraryImage('${img.id}')">×</button><div class="image-library-item" title="Click to add to selected block" onclick="useLibraryImage('${img.id}')"><img src="${img.data}"></div></div>`,
    )
    .join("");
}

function openEmailImagePicker(blockId = null, target = "image") {
  activeImageTarget = { blockId, target };
  const overlay = document.getElementById("emailImagePickerOverlay");
  if (overlay) overlay.style.display = "flex";
  renderEmailImagePickerGrid();
}

function closeEmailImagePicker() {
  const overlay = document.getElementById("emailImagePickerOverlay");
  if (overlay) overlay.style.display = "none";
  activeImageTarget = null;
}

function renderEmailImagePickerGrid() {
  const grid = document.getElementById("emailImagePickerGrid");
  if (!grid) return;
  if (!designerImageLibrary.length) {
    grid.innerHTML =
      '<div class="text-muted">No images in the library yet. Upload one above.</div>';
    return;
  }
  grid.innerHTML = designerImageLibrary
    .map(
      (img) => `
    <div class="image-picker-card image-library-card-wrap">
      <button class="image-library-delete" title="Delete image" onclick="event.stopPropagation();deleteEmailLibraryImage('${img.id}')">×</button>
      <div onclick="chooseImageForActiveTarget('${img.id}')">
        <img src="${img.data}">
        <div>${safeHtml(img.name || "Image")}</div>
      </div>
    </div>
  `,
    )
    .join("");
}

function applyImageToTarget(url) {
  if (!url) return;
  const target = activeImageTarget || {
    blockId: selectedDesignerBlockId,
    target: "image",
  };
  if (target.blockId === "canvasBg") {
    designerSettings.canvasBgImage = url;
  } else if (target.blockId === "outerBg") {
    designerSettings.outerBgImage = url;
  } else {
    const block =
      designerBlocks.find((b) => b.id === target.blockId) ||
      designerBlocks.find((b) => b.id === selectedDesignerBlockId);
    if (!block) {
      designerSettings.canvasBgImage = url;
    } else if (block.type === "image" || target.target === "image") {
      block.imageUrl = url;
    } else if (block.type === "imageGrid") {
      block.imageUrls = [block.imageUrls || "", url].filter(Boolean).join("\n");
    } else {
      block.mediaUrl = url;
    }
  }
  closeEmailImagePicker();
  selectedDesignerImageTarget =
    target.blockId && !["canvasBg", "outerBg"].includes(target.blockId)
      ? { blockId: target.blockId, target: target.target }
      : null;
  renderEmailDesigner();
}

function chooseImageForActiveTarget(id) {
  const img = designerImageLibrary.find((i) => i.id === id);
  if (!img) return;
  applyImageToTarget(img.data);
}

function usePickerImageUrl() {
  const input = document.getElementById("emailImagePickerUrl");
  const url = (input?.value || "").trim();
  if (!url) return;
  applyImageToTarget(url);
  if (input) input.value = "";
}

function useLibraryImage(id) {
  const img = designerImageLibrary.find((i) => i.id === id);
  if (!img) {
    return;
  }
  applyImageToTarget(img.data);
}

function setSelectedBlockImageFromPrompt() {
  const url = prompt("Paste image URL:");
  if (!url) return;
  applyImageToTarget(url);
}

async function clearEmailImageLibrary() {
  if (
    !confirm(
      "Clear uploaded image library from this browser and server storage?",
    )
  )
    return;
  designerImageLibrary = [];
  localStorage.removeItem("excelEmailImageLibrary");
  try {
    await fetch("/api/email-images", { method: "DELETE" });
  } catch (e) {}
  renderEmailImageLibrary();
  renderEmailImagePickerGrid();
}

function removeDesignerBlockImage(id, target = "image") {
  selectedDesignerImageTarget = null;
  const block = designerBlocks.find((b) => b.id === id);
  if (!block) return;
  if (target === "media") {
    block.mediaUrl = "";
  } else if (block.type === "image") {
    block.imageUrl = "";
    block.mediaUrl = "";
  } else {
    block.mediaUrl = "";
  }
  renderEmailDesigner();
}

async function deleteEmailLibraryImage(id) {
  const image = designerImageLibrary.find(
    (img) => String(img.id) === String(id),
  );
  if (!image) return;
  if (!confirm("Delete this image from the image library?")) return;
  designerImageLibrary = designerImageLibrary.filter(
    (img) => String(img.id) !== String(id),
  );
  localStorage.setItem(
    "excelEmailImageLibrary",
    JSON.stringify(designerImageLibrary.slice(0, 60)),
  );
  try {
    await fetch("/api/email-images/" + encodeURIComponent(id), {
      method: "DELETE",
    });
  } catch (e) {}
  renderEmailImageLibrary();
  renderEmailImagePickerGrid();
}

function startDesignerImageResize(event, blockId, target = "image") {
  event.preventDefault();
  event.stopPropagation();
  const block = designerBlocks.find((b) => String(b.id) === String(blockId));
  if (!block) return;
  selectedDesignerBlockId = blockId;
  selectedDesignerImageTarget = { blockId, target };
  const startX = event.clientX;
  const startWidth =
    target === "media"
      ? Number(block.mediaWidth || 38)
      : Number(block.imageWidth || 100);
  const img = event.target
    .closest(".email-image-resize-wrap")
    ?.querySelector("img");

  const move = (e) => {
    const deltaX = e.clientX - startX;
    const nextWidth = Math.max(
      target === "media" ? 18 : 12,
      Math.min(100, Math.round(startWidth + deltaX / 5)),
    );
    if (target === "media") {
      block.mediaWidth = nextWidth;
      block.mediaHeight = 0;
    } else {
      block.imageWidth = nextWidth;
      block.imageHeight = 0;
    }
    if (img && target !== "media") img.style.width = nextWidth + "%";
  };
  const up = () => {
    document.removeEventListener("mousemove", move);
    document.removeEventListener("mouseup", up);
    renderEmailDesigner(false);
    saveEmailDesignLocal(false);
  };
  document.addEventListener("mousemove", move);
  document.addEventListener("mouseup", up);
}

function startDesignerBlockSpacingDrag(event, blockId, edge) {
  event.preventDefault();
  event.stopPropagation();
  const block = designerBlocks.find((b) => String(b.id) === String(blockId));
  if (!block) return;
  selectedDesignerBlockId = blockId;
  selectedDesignerImageTarget = null;
  selectedDesignerSocialTarget = null;
  const startY = event.clientY;
  const key = edge === "top" ? "blockTopSpacing" : "blockBottomSpacing";
  const startValue = Number(block[key] ?? block.padding ?? 0);
  const blockEl = document.querySelector(
    `.email-block-v2[data-block-id="${blockId}"]`,
  );
  const inner = blockEl
    ? blockEl.querySelector(".email-block-inner-shell")
    : null;
  const move = (e) => {
    const deltaY = e.clientY - startY;
    const nextValue = Math.max(
      0,
      Math.min(120, Math.round(startValue + deltaY)),
    );
    block[key] = nextValue;
    if (inner) {
      if (edge === "top") inner.style.paddingTop = `${nextValue}px`;
      else inner.style.paddingBottom = `${nextValue}px`;
    }
  };
  const up = () => {
    document.removeEventListener("mousemove", move);
    document.removeEventListener("mouseup", up);
    renderEmailDesigner(false);
    saveEmailDesignLocal(false);
  };
  document.addEventListener("mousemove", move);
  document.addEventListener("mouseup", up);
}

function startDesignerBlockHeightDrag(event, blockId) {
  event.preventDefault();
  event.stopPropagation();
  const block = designerBlocks.find((b) => String(b.id) === String(blockId));
  if (!block) return;
  selectedDesignerBlockId = blockId;
  selectedDesignerImageTarget = null;
  selectedDesignerSocialTarget = null;

  const startY = event.clientY;
  const startTop = Number(block.blockTopSpacing ?? block.padding ?? 0);
  const startBottom = Number(block.blockBottomSpacing ?? block.padding ?? 0);
  const blockEl = document.querySelector(
    `.email-block-v2[data-block-id="${blockId}"]`,
  );
  const inner = blockEl
    ? blockEl.querySelector(".email-block-inner-shell")
    : null;

  const move = (e) => {
    const deltaY = e.clientY - startY;
    const nextTop = Math.max(
      0,
      Math.min(140, Math.round(startTop + deltaY / 2)),
    );
    const nextBottom = Math.max(
      0,
      Math.min(140, Math.round(startBottom + deltaY / 2)),
    );
    block.blockTopSpacing = nextTop;
    block.blockBottomSpacing = nextBottom;
    if (inner) {
      inner.style.paddingTop = `${nextTop}px`;
      inner.style.paddingBottom = `${nextBottom}px`;
    }
  };
  const up = () => {
    document.removeEventListener("mousemove", move);
    document.removeEventListener("mouseup", up);
    renderEmailDesigner(false);
    saveEmailDesignLocal(false);
  };
  document.addEventListener("mousemove", move);
  document.addEventListener("mouseup", up);
}

function startDesignerBlockResize(event, blockId) {
  event.preventDefault();
  event.stopPropagation();
  const block = designerBlocks.find((b) => String(b.id) === String(blockId));
  if (!block) return;
  selectedDesignerBlockId = blockId;
  selectedDesignerImageTarget = null;
  selectedDesignerSocialTarget = null;
  const startX = event.clientX;
  const startY = event.clientY;
  const startWidth = Number(block.blockWidth || 100);
  const el = document.querySelector(
    `.email-block-v2[data-block-id="${blockId}"]`,
  );
  const inner = el ? el.querySelector(".email-block-inner-shell") : null;
  const startHeight = Number(
    block.blockHeight ||
      (inner ? Math.round(inner.getBoundingClientRect().height) : 0),
  );
  const canvas = document.getElementById("emailDesignerCanvas");
  const canvasWidth = Math.max(
    280,
    canvas ? canvas.getBoundingClientRect().width : 680,
  );
  const move = (e) => {
    const deltaX = ((e.clientX - startX) / canvasWidth) * 100;
    const deltaY = e.clientY - startY;
    block.blockWidth = Math.max(
      25,
      Math.min(100, Math.round(startWidth + deltaX)),
    );
    block.blockHeight = Math.max(0, Math.round(startHeight + deltaY));
    const blockEl = document.querySelector(
      `.email-block-v2[data-block-id="${blockId}"]`,
    );
    if (blockEl) blockEl.style.cssText += ";" + designerBlockOuterStyle(block);
  };
  const up = () => {
    document.removeEventListener("mousemove", move);
    document.removeEventListener("mouseup", up);
    renderEmailDesigner(false);
    saveEmailDesignLocal(false);
  };
  document.addEventListener("mousemove", move);
  document.addEventListener("mouseup", up);
}

function handleEmailDesignerKeyboard(event) {
  const tag = ((event.target && event.target.tagName) || "").toLowerCase();
  if (
    ["input", "textarea", "select"].includes(tag) ||
    event.target?.isContentEditable
  )
    return;
  const designerTab = document.getElementById("emailDesignerTab");
  if (!designerTab || designerTab.style.display === "none") return;
  if (event.key !== "Delete" && event.key !== "Backspace") return;
  if (selectedDesignerSocialTarget) {
    event.preventDefault();
    deletePlacedSocialIcon(
      selectedDesignerSocialTarget.blockId,
      selectedDesignerSocialTarget.index,
    );
    selectedDesignerSocialTarget = null;
    return;
  }
  if (selectedDesignerImageTarget) {
    event.preventDefault();
    removeDesignerBlockImage(
      selectedDesignerImageTarget.blockId,
      selectedDesignerImageTarget.target,
    );
    selectedDesignerImageTarget = null;
    return;
  }
  if (selectedDesignerBlockId) {
    event.preventDefault();
    removeDesignerBlock(selectedDesignerBlockId);
  }
}
if (!window.__excelEmailDesignerKeyboardBound) {
  document.addEventListener("keydown", handleEmailDesignerKeyboard);
  window.__excelEmailDesignerKeyboardBound = true;
}

function syncDesignerMetaFromInputs() {
  designerMeta = {
    title: document.getElementById("designerCampaignTitle")?.value || "",
    subject: document.getElementById("designerEmailSubject")?.value || "",
    preheader: document.getElementById("designerEmailPreheader")?.value || "",
  };
  localStorage.setItem("excelEmailDesignerMeta", JSON.stringify(designerMeta));
}

function hydrateDesignerMetaInputs() {
  const title = document.getElementById("designerCampaignTitle");
  const subjectEl = document.getElementById("designerEmailSubject");
  const preheaderEl = document.getElementById("designerEmailPreheader");
  if (title) title.value = designerMeta.title || "";
  if (subjectEl) subjectEl.value = designerMeta.subject || "";
  if (preheaderEl) preheaderEl.value = designerMeta.preheader || "";
  [title, subjectEl, preheaderEl].forEach((el) => {
    if (el && !el.dataset.bound) {
      el.addEventListener("input", syncDesignerMetaFromInputs);
      el.dataset.bound = "1";
    }
  });
}

function getEmailDesignPackage() {
  syncDesignerMetaFromInputs();
  const html = renderFinalEmailDesignerHtml();
  return {
    name: designerMeta.title || "Untitled Email Design",
    subject: designerMeta.subject || "",
    preheader: designerMeta.preheader || "",
    html,
    designData: {
      settings: designerSettings,
      blocks: designerBlocks,
      meta: designerMeta,
    },
  };
}

async function saveDesignerAsCampaign() {
  const pkg = getEmailDesignPackage();
  if (!designerBlocks.length) {
    alert("Add at least one block before saving a campaign.");
    return;
  }
  if (!pkg.name.trim()) {
    alert("Please add a design/campaign title.");
    return;
  }
  if (!pkg.subject.trim()) {
    alert("Please add an email subject.");
    return;
  }
  const issues = getEmailDesignIssues(pkg);
  const blockers = issues.filter((i) => i.level === "danger");
  if (
    blockers.length &&
    !confirm("The email test found serious issues. Save anyway?")
  )
    return;
  const res = await fetch("/api/campaigns", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(pkg),
  });
  const data = await res.json();
  if (data.success) {
    alert(
      "Email design saved as a campaign. You can use it now or later from Email Campaigns.",
    );
    loadCampaigns();
    loadDashboard();
  } else alert(data.error || "Campaign could not be saved.");
}

function extractLinksFromHtml(html) {
  return Array.from(String(html || "").matchAll(/href=["']([^"']+)["']/gi)).map(
    (m) => m[1],
  );
}

function getEmailDesignIssues(pkg) {
  const issues = [];
  const subjectText = pkg.subject || "";
  const preheaderText = pkg.preheader || "";
  const html = pkg.html || "";
  const plain = html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const links = extractLinksFromHtml(html);
  const spamWords = [
    "free money",
    "guaranteed",
    "act now",
    "risk free",
    "winner",
    "urgent",
    "limited time",
    "cash bonus",
    "100% free",
    "click here!!!",
  ];

  if (!pkg.name.trim())
    issues.push({
      level: "danger",
      title: "Missing campaign title",
      detail: "Add a title so this design can be saved and reused.",
    });
  if (!subjectText.trim())
    issues.push({
      level: "danger",
      title: "Missing subject line",
      detail: "Add a subject before sending.",
    });
  else if (subjectText.length > 60)
    issues.push({
      level: "warning",
      title: "Subject may be too long",
      detail: `${subjectText.length} characters. Try to keep it near 35–60 characters.`,
    });
  else
    issues.push({
      level: "good",
      title: "Subject length looks good",
      detail: `${subjectText.length} characters.`,
    });

  if (preheaderText.length > 100)
    issues.push({
      level: "warning",
      title: "Preheader may be too long",
      detail: `${preheaderText.length} characters. Aim for about 40–100 characters.`,
    });
  else if (preheaderText.trim())
    issues.push({
      level: "good",
      title: "Preheader length looks good",
      detail: `${preheaderText.length} characters.`,
    });
  else
    issues.push({
      level: "warning",
      title: "No preheader",
      detail: "A preheader can improve inbox appearance and open rate.",
    });

  if (designerBlocks.length === 0)
    issues.push({
      level: "danger",
      title: "No email content",
      detail: "Add at least one block to the design.",
    });
  if (plain.length < 80)
    issues.push({
      level: "warning",
      title: "Very little text content",
      detail:
        "Emails with only images or very little copy can look suspicious to filters.",
    });

  const badLinks = links.filter(
    (url) =>
      !url ||
      url === "#" ||
      (!/^https?:\/\//i.test(url) &&
        !/^mailto:/i.test(url) &&
        !/^tel:/i.test(url)),
  );
  if (badLinks.length)
    issues.push({
      level: "danger",
      title: "Broken or placeholder links",
      detail: `Found ${badLinks.length} link(s) that are blank, #, or missing https://.`,
    });
  else if (links.length)
    issues.push({
      level: "good",
      title: "Links are formatted",
      detail: `Found ${links.length} link(s) with valid-looking formats. This does not guarantee the websites are live.`,
    });
  else
    issues.push({
      level: "warning",
      title: "No links found",
      detail:
        "That may be fine, but most campaign emails include at least one clear call-to-action.",
    });

  const missingImages = designerBlocks.filter(
    (b) => b.type === "image" && !(b.imageUrl || b.mediaUrl),
  ).length;
  if (missingImages)
    issues.push({
      level: "danger",
      title: "Image block missing image",
      detail: `${missingImages} image block(s) need an image selected.`,
    });

  const missingAlt = designerBlocks.filter(
    (b) =>
      b.type === "image" &&
      (b.imageUrl || b.mediaUrl) &&
      !String(b.alt || "").trim(),
  ).length;
  if (missingAlt)
    issues.push({
      level: "warning",
      title: "Missing image alt text",
      detail: `${missingAlt} image(s) should have alt text for accessibility and deliverability.`,
    });

  const lower = `${subjectText} ${preheaderText} ${plain}`.toLowerCase();
  const foundSpam = spamWords.filter((w) => lower.includes(w));
  if (foundSpam.length)
    issues.push({
      level: "warning",
      title: "Possible spammy wording",
      detail: `Review these words/phrases: ${foundSpam.join(", ")}.`,
    });

  const repeated = plain.match(/\b(\w+)\s+\1\b/gi) || [];
  if (repeated.length)
    issues.push({
      level: "warning",
      title: "Possible repeated words",
      detail: `Found: ${Array.from(new Set(repeated)).slice(0, 5).join(", ")}`,
    });

  if ((html.match(/data:image\//g) || []).length > 6)
    issues.push({
      level: "warning",
      title: "Many embedded images",
      detail:
        "Large embedded images can make emails heavy. Hosted image URLs are better long-term.",
    });

  if (!issues.some((i) => i.level === "danger" || i.level === "warning"))
    issues.push({
      level: "good",
      title: "Email test passed",
      detail:
        "No obvious issues found. Still send a real test email to yourself before sending to a list.",
    });
  return issues;
}

function runEmailDesignTest() {
  const pkg = getEmailDesignPackage();
  const issues = getEmailDesignIssues(pkg);
  const panel = document.getElementById("emailDesignTestResults");
  if (!panel) return;
  panel.style.display = "block";
  const counts = {
    danger: issues.filter((i) => i.level === "danger").length,
    warning: issues.filter((i) => i.level === "warning").length,
    good: issues.filter((i) => i.level === "good").length,
  };
  panel.innerHTML =
    `<div class="d-flex justify-content-between align-items-center mb-2"><b>Email Test Results</b><span class="small-muted">${counts.danger} serious / ${counts.warning} warnings / ${counts.good} passed</span></div>` +
    issues
      .map(
        (i) =>
          `<div class="email-test-issue ${i.level}"><b>${safeHtml(i.title)}</b><br><small>${safeHtml(i.detail)}</small></div>`,
      )
      .join("");
}

function tryLoadDesignFromHtml(html) {
  const match = String(html || "").match(
    /<!--EXCEL_EMAIL_DESIGN_V2:([^]+?)-->/,
  );
  if (!match) return false;
  try {
    const data = JSON.parse(decodeURIComponent(match[1]));
    designerSettings = { ...designerSettings, ...(data.settings || {}) };
    designerBlocks = Array.isArray(data.blocks) ? data.blocks : [];
    designerMeta = { ...designerMeta, ...(data.meta || {}) };
    hydrateDesignerMetaInputs();
    selectedDesignerBlockId = designerBlocks[0]?.id || null;
    saveEmailDesignLocal(false);
    return true;
  } catch (e) {
    return false;
  }
}
