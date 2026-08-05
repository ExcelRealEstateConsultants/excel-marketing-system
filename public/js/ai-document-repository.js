/**
 * ai-document-repository.js
 * RapportLink AI Platform
 * Version 2.0.0
 *
 * Permanent browser-side storage for document source assets and AI analysis.
 *
 * RESPONSIBILITIES
 * - Store original uploaded files in IndexedDB.
 * - Store extracted text and OCR metadata.
 * - Store rendered page images and image metadata.
 * - Store the latest AI analysis and optional analysis history.
 * - Rehydrate transaction documents without rerunning OCR or OpenAI.
 *
 * NON-RESPONSIBILITIES
 * - Does not perform OCR.
 * - Does not call OpenAI.
 * - Does not create evidence.
 * - Does not determine transaction state.
 * - Does not build the Transaction Brain.
 */

"use strict";

(function initializeAiDocumentRepository(globalScope) {
  const REPOSITORY_NAME = "RapportLink Document Repository";
  const REPOSITORY_VERSION = "2.0.0";

  const DATABASE_NAME = "RapportLinkDocumentRepository";
  const DATABASE_VERSION = 2;
  const STORE_DOCUMENTS = "documents";

  let databasePromise = null;

  function nowIso() {
    return new Date().toISOString();
  }

  function randomId() {
    if (
      typeof globalScope.crypto !== "undefined" &&
      typeof globalScope.crypto.randomUUID === "function"
    ) {
      return globalScope.crypto.randomUUID();
    }

    return (
      Date.now().toString(36) +
      "-" +
      Math.random().toString(36).slice(2) +
      "-" +
      Math.random().toString(36).slice(2)
    );
  }

  function asString(value) {
    return String(value ?? "").trim();
  }

  function asNumber(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function asArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function isObject(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  }

  function cloneValue(value) {
    if (value === undefined || value === null) {
      return value;
    }

    try {
      if (typeof globalScope.structuredClone === "function") {
        return globalScope.structuredClone(value);
      }
    } catch (error) {
      // Fall through to JSON cloning for JSON-safe values.
    }

    try {
      return JSON.parse(JSON.stringify(value));
    } catch (error) {
      return value;
    }
  }

  function mergeObjects(base, patch) {
    return {
      ...(isObject(base) ? base : {}),
      ...(isObject(patch) ? cloneValue(patch) : {}),
    };
  }

  function requireIndexedDb() {
    if (typeof globalScope.indexedDB === "undefined") {
      throw new Error(
        "RapportLink Document Repository requires IndexedDB support.",
      );
    }
  }

  function requireDocumentId(documentId) {
    const normalizedId = asString(documentId);

    if (!normalizedId) {
      throw new Error("Document Repository requires a valid documentId.");
    }

    return normalizedId;
  }

  function createEmptyOriginalDocument() {
    return {
      blob: null,
      fileName: "",
      mimeType: "",
      size: 0,
      uploadedAt: "",
    };
  }

  function createEmptyOcr() {
    return {
      extractedText: "",
      method: "",
      pages: 0,
      warnings: [],
      extractedAt: "",
    };
  }

  function createEmptyPageImages() {
    return {
      images: [],
      pageCount: 0,
      renderScale: 1.5,
      imageFormat: "image/jpeg",
      generatedAt: "",
    };
  }

  function createEmptyAi() {
    return {
      analysis: null,
      model: "",
      reviewedAt: "",
      promptVersion: "",
      engineVersion: "",
      schemaVersion: "",
      status: "Needs Analysis",
      error: null,
    };
  }

  function createRepositoryRecord(documentId, seed = {}) {
    const id = requireDocumentId(documentId);
    const now = nowIso();

    const record = {
      repositoryName: REPOSITORY_NAME,
      repositoryVersion: REPOSITORY_VERSION,
      repositoryCreatedAt:
        asString(seed.repositoryCreatedAt || seed.createdAt) || now,
      repositoryUpdatedAt: now,

      documentId: id,
      documentGuid: asString(seed.documentGuid) || randomId(),

      originalDocument: createEmptyOriginalDocument(),
      ocr: createEmptyOcr(),
      pageImages: createEmptyPageImages(),
      ai: createEmptyAi(),
      aiHistory: [],
      metadata: {},
    };

    return normalizeRepositoryRecord({
      ...record,
      ...cloneValue(seed),
      documentId: id,
    });
  }

  function normalizeOriginalDocument(value = {}, legacyRecord = {}) {
    const source = isObject(value) ? value : {};

    const legacyOriginalFile =
      legacyRecord.originalFile || legacyRecord.file || null;

    let blob = source.blob || source.file || legacyOriginalFile || null;

    if (
      blob !== null &&
      typeof globalScope.Blob !== "undefined" &&
      !(blob instanceof globalScope.Blob)
    ) {
      blob = null;
    }

    return {
      blob,
      fileName: asString(
        source.fileName ||
          source.name ||
          legacyRecord.fileName ||
          legacyRecord.name,
      ),
      mimeType: asString(
        source.mimeType ||
          source.type ||
          legacyRecord.mimeType ||
          legacyRecord.type,
      ),
      size: asNumber(
        source.size ?? blob?.size ?? legacyRecord.fileSize ?? legacyRecord.size,
        0,
      ),
      uploadedAt: asString(
        source.uploadedAt || legacyRecord.uploadedAt || legacyRecord.createdAt,
      ),
    };
  }

  function normalizeOcr(value = {}, legacyRecord = {}) {
    const source = isObject(value) ? value : {};

    return {
      extractedText: asString(
        source.extractedText ||
          source.text ||
          source.ocrText ||
          legacyRecord.extractedText ||
          legacyRecord.text ||
          legacyRecord.ocrText,
      ),
      method: asString(
        source.method ||
          legacyRecord.extraction?.method ||
          legacyRecord.ocrMethod,
      ),
      pages: asNumber(
        source.pages ??
          legacyRecord.extraction?.pages ??
          legacyRecord.pageCount,
        0,
      ),
      warnings: asArray(source.warnings || legacyRecord.extraction?.warnings)
        .map(asString)
        .filter(Boolean),
      extractedAt: asString(
        source.extractedAt || legacyRecord.extraction?.extractedAt,
      ),
    };
  }

  function normalizePageImage(image, index = 0) {
    if (!image) {
      return null;
    }

    if (typeof image === "string") {
      const dataUrl = asString(image);

      if (!dataUrl) {
        return null;
      }

      return {
        pageNumber: index + 1,
        mimeType: dataUrl.startsWith("data:image/png")
          ? "image/png"
          : "image/jpeg",
        dataUrl,
        width: 0,
        height: 0,
      };
    }

    if (!isObject(image)) {
      return null;
    }

    const dataUrl = asString(
      image.dataUrl || image.imageUrl || image.image_url || image.url,
    );

    const blob =
      image.blob &&
      typeof globalScope.Blob !== "undefined" &&
      image.blob instanceof globalScope.Blob
        ? image.blob
        : null;

    if (!dataUrl && !blob) {
      return null;
    }

    return {
      pageNumber: asNumber(image.pageNumber ?? image.page, index + 1),
      mimeType:
        asString(image.mimeType || image.type) ||
        (dataUrl.startsWith("data:image/png") ? "image/png" : "image/jpeg"),
      dataUrl,
      blob,
      width: asNumber(image.width, 0),
      height: asNumber(image.height, 0),
    };
  }

  function normalizePageImages(value = {}, legacyRecord = {}) {
    const source = Array.isArray(value)
      ? { images: value }
      : isObject(value)
        ? value
        : {};

    const rawImages =
      source.images || legacyRecord.pageImages || legacyRecord.images || [];

    const images = asArray(rawImages).map(normalizePageImage).filter(Boolean);

    return {
      images,
      pageCount: asNumber(
        source.pageCount ?? legacyRecord.pageCount ?? images.length,
        images.length,
      ),
      renderScale: asNumber(source.renderScale, 1.5),
      imageFormat:
        asString(source.imageFormat) ||
        asString(images[0]?.mimeType) ||
        "image/jpeg",
      generatedAt: asString(source.generatedAt),
    };
  }

  function normalizeAi(value = {}, legacyRecord = {}) {
    const source = isObject(value) ? value : {};

    const analysis =
      source.analysis ??
      legacyRecord.aiAnalysis ??
      legacyRecord.universalAnalysis ??
      null;

    return {
      analysis: analysis === null ? null : cloneValue(analysis),
      model: asString(source.model),
      reviewedAt: asString(source.reviewedAt),
      promptVersion: asString(source.promptVersion),
      engineVersion: asString(source.engineVersion || analysis?.engineVersion),
      schemaVersion: asString(source.schemaVersion || analysis?.schemaVersion),
      status:
        asString(source.status) || (analysis ? "Complete" : "Needs Analysis"),
      error: source.error ? cloneValue(source.error) : null,
    };
  }

  function normalizeRepositoryRecord(record = {}) {
    if (!isObject(record)) {
      throw new Error("Repository record must be an object.");
    }

    const documentId = requireDocumentId(
      record.documentId || record.id || record.sourceDocumentId,
    );

    const createdAt =
      asString(record.repositoryCreatedAt || record.createdAt) || nowIso();

    return {
      repositoryName: asString(record.repositoryName) || REPOSITORY_NAME,
      repositoryVersion: REPOSITORY_VERSION,
      repositoryCreatedAt: createdAt,
      repositoryUpdatedAt:
        asString(record.repositoryUpdatedAt || record.updatedAt) || createdAt,

      documentId,
      documentGuid: asString(record.documentGuid) || randomId(),

      originalDocument: normalizeOriginalDocument(
        record.originalDocument,
        record,
      ),

      ocr: normalizeOcr(record.ocr, record),

      pageImages: normalizePageImages(record.pageImages, record),

      ai: normalizeAi(record.ai, record),

      aiHistory: asArray(record.aiHistory).map(cloneValue),

      metadata: cloneValue(isObject(record.metadata) ? record.metadata : {}),
    };
  }

  function requestToPromise(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () =>
        reject(request.error || new Error("IndexedDB request failed."));
    });
  }

  function transactionToPromise(transaction) {
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve(true);
      transaction.onerror = () =>
        reject(transaction.error || new Error("IndexedDB transaction failed."));
      transaction.onabort = () =>
        reject(
          transaction.error || new Error("IndexedDB transaction was aborted."),
        );
    });
  }

  async function openRepositoryDatabase() {
    requireIndexedDb();

    if (databasePromise) {
      return databasePromise;
    }

    databasePromise = new Promise((resolve, reject) => {
      const request = globalScope.indexedDB.open(
        DATABASE_NAME,
        DATABASE_VERSION,
      );

      request.onupgradeneeded = (event) => {
        const database = event.target.result;
        let store;

        if (!database.objectStoreNames.contains(STORE_DOCUMENTS)) {
          store = database.createObjectStore(STORE_DOCUMENTS, {
            keyPath: "documentId",
          });
        } else {
          store = event.target.transaction.objectStore(STORE_DOCUMENTS);
        }

        if (!store.indexNames.contains("repositoryUpdatedAt")) {
          store.createIndex("repositoryUpdatedAt", "repositoryUpdatedAt", {
            unique: false,
          });
        }

        if (!store.indexNames.contains("repositoryCreatedAt")) {
          store.createIndex("repositoryCreatedAt", "repositoryCreatedAt", {
            unique: false,
          });
        }

        if (!store.indexNames.contains("transactionId")) {
          store.createIndex("transactionId", "metadata.transactionId", {
            unique: false,
          });
        }
      };

      request.onsuccess = () => {
        const database = request.result;

        database.onversionchange = () => {
          database.close();
          databasePromise = null;
        };

        resolve(database);
      };

      request.onerror = () => {
        databasePromise = null;
        reject(
          request.error ||
            new Error("Unable to open the RapportLink Document Repository."),
        );
      };

      request.onblocked = () => {
        console.warn(
          "RapportLink Document Repository upgrade is blocked by another open browser tab.",
        );
      };
    });

    return databasePromise;
  }

  async function readRecord(documentId) {
    const id = requireDocumentId(documentId);
    const database = await openRepositoryDatabase();
    const transaction = database.transaction(STORE_DOCUMENTS, "readonly");
    const store = transaction.objectStore(STORE_DOCUMENTS);
    const result = await requestToPromise(store.get(id));

    return result ? normalizeRepositoryRecord(result) : null;
  }

  async function writeRecord(record) {
    const normalized = normalizeRepositoryRecord(record);
    normalized.repositoryUpdatedAt = nowIso();

    const database = await openRepositoryDatabase();
    const transaction = database.transaction(STORE_DOCUMENTS, "readwrite");
    const store = transaction.objectStore(STORE_DOCUMENTS);

    store.put(normalized);
    await transactionToPromise(transaction);

    return normalizeRepositoryRecord(normalized);
  }

  async function mutateRecord(
    documentId,
    mutator,
    { createIfMissing = false } = {},
  ) {
    const id = requireDocumentId(documentId);
    const database = await openRepositoryDatabase();

    const transaction = database.transaction(STORE_DOCUMENTS, "readwrite");
    const store = transaction.objectStore(STORE_DOCUMENTS);

    const existingRaw = await requestToPromise(store.get(id));
    let record = existingRaw ? normalizeRepositoryRecord(existingRaw) : null;

    if (!record && !createIfMissing) {
      transaction.abort();
      throw new Error(`Document ${id} was not found.`);
    }

    if (!record) {
      record = createRepositoryRecord(id);
    }

    const result = await mutator(record);

    if (result === false) {
      transaction.abort();
      return false;
    }

    const nextRecord = normalizeRepositoryRecord(
      isObject(result) ? result : record,
    );

    nextRecord.repositoryUpdatedAt = nowIso();
    store.put(nextRecord);

    await transactionToPromise(transaction);

    return normalizeRepositoryRecord(nextRecord);
  }

  async function repoSaveDocument(documentId, assets = {}) {
    const id = requireDocumentId(documentId);

    if (!isObject(assets)) {
      throw new Error("Document assets must be an object.");
    }

    return mutateRecord(
      id,
      (record) => {
        const incoming = normalizeIncomingAssets(assets);

        if (incoming.originalDocument) {
          record.originalDocument = mergeObjects(
            record.originalDocument,
            incoming.originalDocument,
          );
        }

        if (incoming.ocr) {
          record.ocr = mergeObjects(record.ocr, incoming.ocr);
        }

        if (incoming.pageImages) {
          record.pageImages = mergeObjects(
            record.pageImages,
            incoming.pageImages,
          );
        }

        if (incoming.ai) {
          record.ai = mergeObjects(record.ai, incoming.ai);
        }

        if (incoming.aiHistory) {
          record.aiHistory = cloneValue(incoming.aiHistory);
        }

        if (incoming.metadata) {
          record.metadata = mergeObjects(record.metadata, incoming.metadata);
        }

        return record;
      },
      { createIfMissing: true },
    );
  }

  function normalizeIncomingAssets(assets = {}) {
    const incoming = {};

    if (
      Object.prototype.hasOwnProperty.call(assets, "originalDocument") ||
      Object.prototype.hasOwnProperty.call(assets, "originalFile") ||
      Object.prototype.hasOwnProperty.call(assets, "file")
    ) {
      incoming.originalDocument = normalizeOriginalDocument(
        assets.originalDocument,
        assets,
      );
    }

    if (
      Object.prototype.hasOwnProperty.call(assets, "ocr") ||
      Object.prototype.hasOwnProperty.call(assets, "extractedText") ||
      Object.prototype.hasOwnProperty.call(assets, "text") ||
      Object.prototype.hasOwnProperty.call(assets, "ocrText")
    ) {
      incoming.ocr = normalizeOcr(assets.ocr, assets);
    }

    if (
      Object.prototype.hasOwnProperty.call(assets, "pageImages") ||
      Object.prototype.hasOwnProperty.call(assets, "images")
    ) {
      incoming.pageImages = normalizePageImages(assets.pageImages, assets);
    }

    if (
      Object.prototype.hasOwnProperty.call(assets, "ai") ||
      Object.prototype.hasOwnProperty.call(assets, "aiAnalysis") ||
      Object.prototype.hasOwnProperty.call(assets, "universalAnalysis")
    ) {
      incoming.ai = normalizeAi(assets.ai, assets);
    }

    if (Object.prototype.hasOwnProperty.call(assets, "aiHistory")) {
      incoming.aiHistory = asArray(assets.aiHistory);
    }

    if (Object.prototype.hasOwnProperty.call(assets, "metadata")) {
      incoming.metadata = isObject(assets.metadata)
        ? cloneValue(assets.metadata)
        : {};
    }

    return incoming;
  }

  async function repoGetDocument(documentId) {
    return readRecord(documentId);
  }

  async function repoDocumentExists(documentId) {
    return Boolean(await readRecord(documentId));
  }

  async function repoDeleteDocument(documentId) {
    const id = requireDocumentId(documentId);
    const database = await openRepositoryDatabase();
    const transaction = database.transaction(STORE_DOCUMENTS, "readwrite");
    const store = transaction.objectStore(STORE_DOCUMENTS);

    store.delete(id);
    await transactionToPromise(transaction);

    return true;
  }

  async function repoReplaceDocument(documentId, record = {}) {
    const id = requireDocumentId(documentId);

    return writeRecord({
      ...cloneValue(record),
      documentId: id,
    });
  }

  async function repoTouchDocument(documentId) {
    return mutateRecord(documentId, (record) => record);
  }

  async function repoCountDocuments() {
    const database = await openRepositoryDatabase();
    const transaction = database.transaction(STORE_DOCUMENTS, "readonly");
    const store = transaction.objectStore(STORE_DOCUMENTS);

    return asNumber(await requestToPromise(store.count()), 0);
  }

  async function repoGetAllDocuments() {
    const database = await openRepositoryDatabase();
    const transaction = database.transaction(STORE_DOCUMENTS, "readonly");
    const store = transaction.objectStore(STORE_DOCUMENTS);

    const records = asArray(await requestToPromise(store.getAll()));

    return records.map(normalizeRepositoryRecord);
  }

  async function repoSaveOriginalDocument(documentId, originalDocument = {}) {
    const normalized = normalizeOriginalDocument(originalDocument, {});

    return mutateRecord(
      documentId,
      (record) => {
        record.originalDocument = mergeObjects(
          record.originalDocument,
          normalized,
        );
        return record;
      },
      { createIfMissing: true },
    );
  }

  async function repoGetOriginalDocument(documentId) {
    const record = await readRecord(documentId);
    return record ? cloneValue(record.originalDocument) : null;
  }

  async function repoGetOriginalDocumentBlob(documentId) {
    const originalDocument = await repoGetOriginalDocument(documentId);

    return originalDocument?.blob || null;
  }

  async function repoSaveOCR(documentId, ocr = {}) {
    const normalized = normalizeOcr(ocr, ocr);

    return mutateRecord(
      documentId,
      (record) => {
        record.ocr = mergeObjects(record.ocr, normalized);
        return record;
      },
      { createIfMissing: true },
    );
  }

  async function repoGetOCR(documentId) {
    const record = await readRecord(documentId);
    return record ? cloneValue(record.ocr) : null;
  }

  async function repoGetExtractedText(documentId) {
    const ocr = await repoGetOCR(documentId);
    return asString(ocr?.extractedText);
  }

  async function repoClearOCR(documentId) {
    const existing = await readRecord(documentId);

    if (!existing) {
      return false;
    }

    await mutateRecord(documentId, (record) => {
      record.ocr = createEmptyOcr();
      return record;
    });

    return true;
  }

  async function repoSavePageImages(
    documentId,
    pageImages = [],
    metadata = {},
  ) {
    const normalized = normalizePageImages(
      {
        images: pageImages,
        ...metadata,
      },
      {},
    );

    return mutateRecord(
      documentId,
      (record) => {
        record.pageImages = normalized;
        return record;
      },
      { createIfMissing: true },
    );
  }

  async function repoGetPageImages(documentId) {
    const record = await readRecord(documentId);
    return record ? cloneValue(record.pageImages) : null;
  }

  async function repoGetPageImageArray(documentId) {
    const section = await repoGetPageImages(documentId);
    return cloneValue(asArray(section?.images));
  }

  async function repoClearPageImages(documentId) {
    const existing = await readRecord(documentId);

    if (!existing) {
      return false;
    }

    await mutateRecord(documentId, (record) => {
      record.pageImages = createEmptyPageImages();
      return record;
    });

    return true;
  }

  async function repoSaveSourceAssets(
    documentId,
    {
      originalDocument = null,
      ocr = null,
      pageImages = null,
      pageImageMetadata = {},
      metadata = {},
    } = {},
  ) {
    const assets = { metadata };

    if (originalDocument) {
      assets.originalDocument = originalDocument;
    }

    if (ocr) {
      assets.ocr = ocr;
    }

    if (pageImages !== null) {
      assets.pageImages = {
        images: pageImages,
        ...pageImageMetadata,
      };
    }

    return repoSaveDocument(documentId, assets);
  }

  async function repoHasReusableSourceAssets(documentId) {
    const record = await readRecord(documentId);

    if (!record) {
      return false;
    }

    return Boolean(
      record.originalDocument?.blob ||
      asString(record.ocr?.extractedText) ||
      asArray(record.pageImages?.images).length,
    );
  }

  async function repoUpdateMetadata(documentId, metadata = {}) {
    if (!isObject(metadata)) {
      throw new Error("Repository metadata must be an object.");
    }

    return mutateRecord(
      documentId,
      (record) => {
        record.metadata = mergeObjects(record.metadata, metadata);
        return record;
      },
      { createIfMissing: true },
    );
  }

  async function repoGetMetadata(documentId) {
    const record = await readRecord(documentId);
    return record ? cloneValue(record.metadata) : null;
  }

  function normalizeAnalysis(analysis) {
    if (analysis === null || analysis === undefined) {
      return null;
    }

    if (!isObject(analysis)) {
      throw new Error("AI analysis must be an object.");
    }

    return cloneValue(analysis);
  }

  function buildHistoryEntry(aiSection = {}) {
    return {
      runId: randomId(),
      analysis: cloneValue(aiSection.analysis),
      model: asString(aiSection.model),
      reviewedAt: asString(aiSection.reviewedAt),
      promptVersion: asString(aiSection.promptVersion),
      engineVersion: asString(aiSection.engineVersion),
      schemaVersion: asString(aiSection.schemaVersion),
      status: asString(aiSection.status),
      archivedAt: nowIso(),
    };
  }

  async function repoSaveAnalysis(documentId, analysis, metadata = {}) {
    const normalizedAnalysis = normalizeAnalysis(analysis);

    return mutateRecord(
      documentId,
      (record) => {
        if (record.ai?.analysis) {
          record.aiHistory = asArray(record.aiHistory);
          record.aiHistory.push(buildHistoryEntry(record.ai));
        }

        record.ai = {
          analysis: normalizedAnalysis,
          model: asString(
            metadata.model || analysis?.usage?.model || analysis?.model,
          ),
          reviewedAt:
            asString(metadata.reviewedAt || analysis?.reviewedAt) || nowIso(),
          promptVersion: asString(metadata.promptVersion),
          engineVersion: asString(
            metadata.engineVersion || analysis?.engineVersion,
          ),
          schemaVersion: asString(
            metadata.schemaVersion || analysis?.schemaVersion,
          ),
          status: asString(metadata.status) || "Complete",
          error: null,
        };

        return record;
      },
      { createIfMissing: true },
    );
  }

  async function repoUpdateAnalysis(documentId, analysis, metadata = {}) {
    return repoSaveAnalysis(documentId, analysis, metadata);
  }

  async function repoGetAnalysis(documentId) {
    const record = await readRecord(documentId);

    return record?.ai?.analysis ? cloneValue(record.ai.analysis) : null;
  }

  async function repoGetAI(documentId) {
    const record = await readRecord(documentId);
    return record ? cloneValue(record.ai) : null;
  }

  async function repoMarkAnalysisPending(documentId, metadata = {}) {
    return mutateRecord(
      documentId,
      (record) => {
        record.ai = {
          ...createEmptyAi(),
          ...record.ai,
          model: asString(metadata.model || record.ai?.model),
          promptVersion: asString(
            metadata.promptVersion || record.ai?.promptVersion,
          ),
          status: "Pending",
          reviewedAt: "",
          error: null,
        };

        return record;
      },
      { createIfMissing: true },
    );
  }

  async function repoMarkAnalysisFailed(documentId, error, metadata = {}) {
    return mutateRecord(
      documentId,
      (record) => {
        record.ai = {
          ...createEmptyAi(),
          ...record.ai,
          model: asString(metadata.model || record.ai?.model),
          promptVersion: asString(
            metadata.promptVersion || record.ai?.promptVersion,
          ),
          status: "Failed",
          error: {
            name: asString(error?.name),
            code: asString(error?.code),
            message:
              asString(error?.message || error) || "Unknown analysis error.",
            failedAt: nowIso(),
          },
        };

        return record;
      },
      { createIfMissing: true },
    );
  }

  async function repoClearAnalysis(
    documentId,
    { preserveHistory = true } = {},
  ) {
    const existing = await readRecord(documentId);

    if (!existing) {
      return false;
    }

    await mutateRecord(documentId, (record) => {
      if (preserveHistory && record.ai?.analysis) {
        record.aiHistory = asArray(record.aiHistory);
        record.aiHistory.push(buildHistoryEntry(record.ai));
      }

      record.ai = createEmptyAi();
      return record;
    });

    return true;
  }

  async function repoGetAnalysisHistory(documentId) {
    const record = await readRecord(documentId);
    return record ? cloneValue(asArray(record.aiHistory)) : [];
  }

  async function repoClearAnalysisHistory(documentId) {
    const existing = await readRecord(documentId);

    if (!existing) {
      return false;
    }

    await mutateRecord(documentId, (record) => {
      record.aiHistory = [];
      return record;
    });

    return true;
  }

  async function repoRestoreAnalysisVersion(documentId, runId) {
    const record = await readRecord(documentId);

    if (!record) {
      throw new Error(`Document ${documentId} was not found.`);
    }

    const version = asArray(record.aiHistory).find(
      (item) => asString(item?.runId) === asString(runId),
    );

    if (!version) {
      throw new Error("Analysis version was not found.");
    }

    return repoSaveAnalysis(documentId, version.analysis, {
      model: version.model,
      promptVersion: version.promptVersion,
      engineVersion: version.engineVersion,
      schemaVersion: version.schemaVersion,
      reviewedAt: nowIso(),
      status: "Restored",
    });
  }

  async function repoHasAnalysis(documentId) {
    return Boolean(await repoGetAnalysis(documentId));
  }

  async function repoGetAnalysisStatus(documentId) {
    const record = await readRecord(documentId);
    return asString(record?.ai?.status) || "Unknown";
  }

  async function repoListDocuments() {
    const records = await repoGetAllDocuments();

    return records
      .map((record) => ({
        documentId: record.documentId,
        documentGuid: record.documentGuid,
        transactionId: asString(record.metadata?.transactionId),
        fileName: asString(
          record.originalDocument?.fileName ||
            record.metadata?.fileName ||
            record.metadata?.name,
        ),
        mimeType: asString(
          record.originalDocument?.mimeType || record.metadata?.mimeType,
        ),
        size: asNumber(
          record.originalDocument?.size || record.metadata?.size,
          0,
        ),
        pageCount: asNumber(
          record.pageImages?.pageCount || record.ocr?.pages,
          0,
        ),
        hasOriginalDocument: Boolean(record.originalDocument?.blob),
        hasExtractedText: Boolean(asString(record.ocr?.extractedText)),
        hasPageImages: asArray(record.pageImages?.images).length > 0,
        hasAnalysis: Boolean(record.ai?.analysis),
        analysisStatus: asString(record.ai?.status) || "Unknown",
        createdAt: record.repositoryCreatedAt,
        updatedAt: record.repositoryUpdatedAt,
      }))
      .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
  }

  async function repoFindByTransactionId(transactionId) {
    const normalizedTransactionId = asString(transactionId);

    if (!normalizedTransactionId) {
      return [];
    }

    const database = await openRepositoryDatabase();
    const transaction = database.transaction(STORE_DOCUMENTS, "readonly");
    const store = transaction.objectStore(STORE_DOCUMENTS);

    if (store.indexNames.contains("transactionId")) {
      const records = await requestToPromise(
        store.index("transactionId").getAll(normalizedTransactionId),
      );

      return asArray(records).map(normalizeRepositoryRecord);
    }

    const records = await repoGetAllDocuments();

    return records.filter(
      (record) =>
        asString(record.metadata?.transactionId) === normalizedTransactionId,
    );
  }

  async function repoBuildSourceDocument(documentId, fallbackDocument = {}) {
    const record = await readRecord(documentId);

    if (!record) {
      throw new Error(
        `Document ${documentId} was not found in the Document Repository.`,
      );
    }

    const original = record.originalDocument;
    const ocr = record.ocr;
    const pageImages = record.pageImages;
    const metadata = record.metadata;

    const name =
      asString(
        original.fileName ||
          metadata.fileName ||
          metadata.name ||
          fallbackDocument.originalName ||
          fallbackDocument.name,
      ) || "Uploaded Document";

    const mimeType = asString(
      original.mimeType ||
        metadata.mimeType ||
        fallbackDocument.mimeType ||
        fallbackDocument.type,
    );

    const size = asNumber(
      original.size ||
        metadata.size ||
        fallbackDocument.fileSize ||
        fallbackDocument.size,
      0,
    );

    return {
      ...cloneValue(fallbackDocument),

      id: asString(fallbackDocument.id) || record.documentId,
      sourceDocumentId: record.documentId,
      documentId: record.documentId,

      name,
      originalName: name,

      type: mimeType,
      mimeType,

      size,
      fileSize: size,

      uploadedAt: asString(
        original.uploadedAt ||
          metadata.uploadedAt ||
          fallbackDocument.uploadedAt,
      ),

      text: asString(ocr.extractedText),
      extractedText: asString(ocr.extractedText),
      ocrText: asString(ocr.extractedText),

      pageImages: cloneValue(asArray(pageImages.images)),
      pageCount: asNumber(pageImages.pageCount || ocr.pages, 0) || null,

      extraction: {
        method: asString(ocr.method) || "unknown",
        pages: asNumber(ocr.pages || pageImages.pageCount, 0),
        warnings: cloneValue(asArray(ocr.warnings)),
        extractedAt: asString(ocr.extractedAt),
      },

      aiAnalysis: record.ai.analysis ? cloneValue(record.ai.analysis) : null,

      universalAnalysis: record.ai.analysis
        ? cloneValue(record.ai.analysis)
        : null,

      repositoryRecordFound: true,
      repositoryVersion: REPOSITORY_VERSION,
    };
  }

  async function repoHydrateDocument(document = {}) {
    if (!isObject(document)) {
      throw new Error("Document must be an object.");
    }

    const documentId = requireDocumentId(
      document.id || document.documentId || document.sourceDocumentId,
    );

    const source = await repoBuildSourceDocument(documentId, document);

    return {
      ...document,
      ...source,
      id: document.id || source.id,
      aiAnalysis: source.aiAnalysis || document.aiAnalysis || null,
      universalAnalysis:
        source.universalAnalysis || document.universalAnalysis || null,
    };
  }

  async function repoSaveUploadedDocument({
    documentId,
    file = null,
    document = {},
    extraction = {},
    analysis = null,
    metadata = {},
  } = {}) {
    const id = requireDocumentId(
      documentId || document.id || document.documentId,
    );

    const pageImages = asArray(
      extraction.pageImages?.length
        ? extraction.pageImages
        : document.pageImages,
    );

    const assets = {
      metadata: {
        ...cloneValue(metadata),
        transactionId: asString(
          metadata.transactionId || document.transactionId,
        ),
        fileName: asString(
          file?.name || document.originalName || document.name,
        ),
        mimeType: asString(file?.type || document.mimeType || document.type),
        size: asNumber(file?.size || document.size, 0),
        uploadedAt: asString(document.uploadedAt) || nowIso(),
      },

      ocr: {
        extractedText:
          extraction.text ??
          extraction.extractedText ??
          document.extractedText ??
          document.text ??
          document.ocrText ??
          "",
        method: extraction.method || document.extraction?.method || "unknown",
        pages:
          extraction.pages ??
          document.extraction?.pages ??
          document.pageCount ??
          0,
        warnings: extraction.warnings || document.extraction?.warnings || [],
        extractedAt:
          extraction.extractedAt ||
          document.extraction?.extractedAt ||
          nowIso(),
      },

      pageImages: {
        images: pageImages,
        pageCount:
          extraction.pages ??
          document.extraction?.pages ??
          document.pageCount ??
          pageImages.length,
        renderScale:
          extraction.renderScale ||
          document.pageImageMetadata?.renderScale ||
          1.5,
        imageFormat:
          extraction.imageFormat ||
          document.pageImageMetadata?.imageFormat ||
          pageImages[0]?.mimeType ||
          "image/jpeg",
        generatedAt:
          extraction.extractedAt ||
          document.extraction?.extractedAt ||
          nowIso(),
      },
    };

    if (file) {
      assets.originalDocument = {
        blob: file,
        fileName: file.name || document.originalName || document.name,
        mimeType: file.type || document.mimeType || document.type,
        size: file.size || document.size,
        uploadedAt: document.uploadedAt || nowIso(),
      };
    }

    await repoSaveDocument(id, assets);

    if (analysis) {
      await repoSaveAnalysis(id, analysis, {
        model: analysis?.usage?.model || analysis?.model || "",
        reviewedAt: analysis?.reviewedAt || nowIso(),
        engineVersion: analysis?.engineVersion || "",
        schemaVersion: analysis?.schemaVersion || "",
        status: "Complete",
      });
    }

    return repoGetDocument(id);
  }

  function repoValidateRecord(record = {}) {
    const errors = [];
    const warnings = [];

    if (!isObject(record)) {
      return {
        valid: false,
        errors: ["Repository record must be an object."],
        warnings,
      };
    }

    let normalized;

    try {
      normalized = normalizeRepositoryRecord(record);
    } catch (error) {
      errors.push(
        asString(error?.message) ||
          "Repository record could not be normalized.",
      );

      return {
        valid: false,
        errors,
        warnings,
      };
    }

    if (!normalized.documentId) {
      errors.push("Repository record has no documentId.");
    }

    if (!isObject(normalized.originalDocument)) {
      errors.push("Repository record has no originalDocument section.");
    }

    if (!isObject(normalized.ocr)) {
      errors.push("Repository record has no OCR section.");
    }

    if (!isObject(normalized.pageImages)) {
      errors.push("Repository record has no pageImages section.");
    }

    if (!isObject(normalized.ai)) {
      errors.push("Repository record has no AI section.");
    }

    if (!Array.isArray(normalized.pageImages.images)) {
      errors.push("Repository pageImages.images must be an array.");
    }

    if (typeof normalized.ocr.extractedText !== "string") {
      errors.push("Repository OCR extractedText must be a string.");
    }

    if (
      !normalized.originalDocument.blob &&
      !normalized.ocr.extractedText &&
      normalized.pageImages.images.length === 0
    ) {
      warnings.push("Repository record contains no reusable source assets.");
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  async function repoValidateAll() {
    const records = await repoGetAllDocuments();

    return {
      valid: true,
      recordCount: records.length,
      records: records.map((record) => ({
        documentId: record.documentId,
        ...repoValidateRecord(record),
      })),
    };
  }

  async function repoGetStorageEstimate() {
    if (
      !globalScope.navigator?.storage ||
      typeof globalScope.navigator.storage.estimate !== "function"
    ) {
      return {
        supported: false,
        usage: null,
        quota: null,
        percentUsed: null,
      };
    }

    const estimate = await globalScope.navigator.storage.estimate();

    const usage = asNumber(estimate.usage, 0);
    const quota = asNumber(estimate.quota, 0);

    return {
      supported: true,
      usage,
      quota,
      percentUsed: quota > 0 ? Math.round((usage / quota) * 10000) / 100 : 0,
    };
  }

  async function repoDeleteTransactionDocuments(transactionId) {
    const records = await repoFindByTransactionId(transactionId);

    for (const record of records) {
      await repoDeleteDocument(record.documentId);
    }

    return records.length;
  }

  async function repoClearAllDocuments() {
    const database = await openRepositoryDatabase();
    const transaction = database.transaction(STORE_DOCUMENTS, "readwrite");
    const store = transaction.objectStore(STORE_DOCUMENTS);

    store.clear();
    await transactionToPromise(transaction);

    return true;
  }

  async function repoMigrateAllRecords() {
    const records = await repoGetAllDocuments();
    let migrated = 0;

    for (const record of records) {
      await writeRecord(normalizeRepositoryRecord(record));
      migrated += 1;
    }

    return {
      migrated,
      repositoryVersion: REPOSITORY_VERSION,
    };
  }

  async function repoHealthCheck() {
    try {
      const count = await repoCountDocuments();
      const storage = await repoGetStorageEstimate();

      return {
        ok: true,
        repositoryName: REPOSITORY_NAME,
        repositoryVersion: REPOSITORY_VERSION,
        databaseName: DATABASE_NAME,
        databaseVersion: DATABASE_VERSION,
        documentCount: count,
        storage,
        checkedAt: nowIso(),
      };
    } catch (error) {
      return {
        ok: false,
        repositoryName: REPOSITORY_NAME,
        repositoryVersion: REPOSITORY_VERSION,
        databaseName: DATABASE_NAME,
        databaseVersion: DATABASE_VERSION,
        error: {
          name: asString(error?.name),
          message:
            asString(error?.message) || "Repository health check failed.",
        },
        checkedAt: nowIso(),
      };
    }
  }

  const api = {
    name: REPOSITORY_NAME,
    version: REPOSITORY_VERSION,
    databaseName: DATABASE_NAME,
    databaseVersion: DATABASE_VERSION,

    openRepositoryDatabase,

    repoSaveDocument,
    repoGetDocument,
    repoDocumentExists,
    repoDeleteDocument,
    repoReplaceDocument,
    repoTouchDocument,
    repoCountDocuments,
    repoGetAllDocuments,
    repoListDocuments,
    repoFindByTransactionId,

    repoSaveOriginalDocument,
    repoGetOriginalDocument,
    repoGetOriginalDocumentBlob,

    repoSaveOCR,
    repoGetOCR,
    repoGetExtractedText,
    repoClearOCR,

    repoSavePageImages,
    repoGetPageImages,
    repoGetPageImageArray,
    repoClearPageImages,

    repoSaveSourceAssets,
    repoHasReusableSourceAssets,

    repoUpdateMetadata,
    repoGetMetadata,

    repoSaveAnalysis,
    repoUpdateAnalysis,
    repoGetAnalysis,
    repoGetAI,
    repoMarkAnalysisPending,
    repoMarkAnalysisFailed,
    repoClearAnalysis,
    repoGetAnalysisHistory,
    repoClearAnalysisHistory,
    repoRestoreAnalysisVersion,
    repoHasAnalysis,
    repoGetAnalysisStatus,

    repoBuildSourceDocument,
    repoHydrateDocument,
    repoSaveUploadedDocument,

    repoValidateRecord,
    repoValidateAll,
    repoGetStorageEstimate,
    repoDeleteTransactionDocuments,
    repoClearAllDocuments,
    repoMigrateAllRecords,
    repoHealthCheck,
  };

  globalScope.aiDocumentRepository = api;

  for (const [name, fn] of Object.entries(api)) {
    if (typeof fn === "function" && name.startsWith("repo")) {
      globalScope[name] = fn;
    }
  }

  console.log(`${REPOSITORY_NAME} v${REPOSITORY_VERSION} loaded`);
})(window);
