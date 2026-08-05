/* =====================================================
   RapportLink AI Extraction Engine
   Version 2
   Reads PDF, image, text, and supported Office documents
   ===================================================== */

console.log("AI Extraction Engine Loaded");

async function aiExtractDocumentText(file) {
  const result = {
    text: "",
    method: "none",
    pages: 0,
    warnings: [],
    extractedAt: new Date().toISOString(),
  };

  if (!file) {
    result.warnings.push("No file was provided.");
    return result;
  }

  const fileName = String(file.name || "").toLowerCase();
  const mimeType = String(file.type || "").toLowerCase();

  try {
    if (mimeType === "application/pdf" || fileName.endsWith(".pdf")) {
      return await aiExtractPdfText(file);
    }

    if (
      mimeType.startsWith("image/") ||
      /\.(png|jpg|jpeg|webp|bmp|gif|tif|tiff)$/i.test(fileName)
    ) {
      return await aiExtractImageText(file);
    }

    if (
      mimeType.startsWith("text/") ||
      /\.(txt|csv|json|xml|html|htm|md)$/i.test(fileName)
    ) {
      result.text = await file.text();
      result.method = "native-text";
      result.pages = 1;
      return result;
    }

    if (
      fileName.endsWith(".docx") ||
      mimeType.includes(
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      )
    ) {
      return await aiExtractDocxText(file);
    }

    result.warnings.push(
      `Text extraction is not yet supported for ${file.name}.`,
    );

    return result;
  } catch (error) {
    console.error("AI document extraction failed:", error);

    result.warnings.push(error?.message || "The document could not be read.");

    return result;
  }
}

async function aiExtractPdfText(file) {
  const result = {
    text: "",
    method: "pdf-text",
    pages: 0,
    warnings: [],
    pageImages: [],
    extractedAt: new Date().toISOString(),
  };

  if (!window.pdfjsLib) {
    result.warnings.push(
      "PDF.js is not loaded. PDF text and page images could not be extracted.",
    );

    return result;
  }

  const arrayBuffer = await file.arrayBuffer();

  const loadingTask = window.pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
  });

  const pdf = await loadingTask.promise;

  result.pages = pdf.numPages;

  const pageTexts = [];
  let pagesNeedingOcr = 0;

  /*
  -------------------------------------------------------
  Render controls

  Page images allow the Universal Document Engine to inspect
  signatures, initials, checkboxes, handwriting, stamps,
  strikeouts, and other visual evidence that PDF text
  extraction cannot reliably detect.

  JPEG is used instead of PNG to reduce request size.
  -------------------------------------------------------
  */

  const renderScale = 1.5;
  const jpegQuality = 0.78;

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);

    /*
    -------------------------------------------------------
    Extract machine-readable text
    -------------------------------------------------------
    */

    const textContent = await page.getTextContent();

    const pageText = textContent.items
      .map((item) => String(item.str || ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    if (pageText.length >= 40) {
      pageTexts.push(`--- PAGE ${pageNumber} ---\n${pageText}`);
    } else {
      pagesNeedingOcr++;

      const ocrText = await aiOcrPdfPage(page, pageNumber);

      pageTexts.push(`--- PAGE ${pageNumber} ---\n${ocrText}`);
    }

    /*
    -------------------------------------------------------
    Render the actual PDF page for visual analysis
    -------------------------------------------------------
    */

    try {
      const viewport = page.getViewport({
        scale: renderScale,
      });

      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d", {
        alpha: false,
      });

      if (!context) {
        throw new Error(
          `Canvas context could not be created for PDF page ${pageNumber}.`,
        );
      }

      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);

      /*
       * Use a white background so transparent PDF areas do
       * not become black when converted to JPEG.
       */
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);

      await page.render({
        canvasContext: context,
        viewport,
      }).promise;

      const imageDataUrl = canvas.toDataURL("image/jpeg", jpegQuality);

      if (
        typeof imageDataUrl === "string" &&
        imageDataUrl.startsWith("data:image/")
      ) {
        result.pageImages.push({
          pageNumber,
          mimeType: "image/jpeg",
          dataUrl: imageDataUrl,
        });
      } else {
        result.warnings.push(
          `PDF page ${pageNumber} could not be converted into a page image.`,
        );
      }

      /*
       * Release the temporary canvas memory after its data URL
       * has been created.
       */
      canvas.width = 1;
      canvas.height = 1;
    } catch (renderError) {
      console.warn(
        `Visual rendering failed for PDF page ${pageNumber}:`,
        renderError,
      );

      result.warnings.push(
        `Visual rendering failed for PDF page ${pageNumber}: ${
          renderError?.message || "Unknown rendering error."
        }`,
      );
    }

    if (typeof page.cleanup === "function") {
      page.cleanup();
    }
  }

  result.text = pageTexts.join("\n\n").trim();

  if (pagesNeedingOcr > 0) {
    result.method =
      pagesNeedingOcr === pdf.numPages
        ? "pdf-ocr-and-vision"
        : "pdf-text-ocr-and-vision";
  } else {
    result.method = "pdf-text-and-vision";
  }

  if (!result.text) {
    result.warnings.push("No readable text was found in the PDF.");
  }

  if (!result.pageImages.length) {
    result.warnings.push(
      "No PDF page images were generated for visual document review.",
    );
  }

  if (typeof pdf.cleanup === "function") {
    pdf.cleanup();
  }

  return result;
}

async function aiOcrPdfPage(page, pageNumber) {
  if (!window.Tesseract) {
    return `[Page ${pageNumber} appears scanned, but OCR is not loaded.]`;
  }

  const viewport = page.getViewport({ scale: 2 });

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", {
    willReadFrequently: true,
  });

  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);

  await page.render({
    canvasContext: context,
    viewport,
  }).promise;

  const ocrResult = await window.Tesseract.recognize(canvas, "eng", {
    logger(message) {
      if (message.status === "recognizing text") {
        console.log(
          `OCR page ${pageNumber}: ${Math.round(
            Number(message.progress || 0) * 100,
          )}%`,
        );
      }
    },
  });

  return String(ocrResult?.data?.text || "").trim();
}

async function aiExtractImageText(file) {
  const result = {
    text: "",
    method: "image-ocr",
    pages: 1,
    warnings: [],
    extractedAt: new Date().toISOString(),
  };

  if (!window.Tesseract) {
    result.warnings.push(
      "Tesseract OCR is not loaded. Image text could not be extracted.",
    );

    return result;
  }

  const ocrResult = await window.Tesseract.recognize(file, "eng", {
    logger(message) {
      if (message.status === "recognizing text") {
        console.log(
          `Image OCR: ${Math.round(Number(message.progress || 0) * 100)}%`,
        );
      }
    },
  });

  result.text = String(ocrResult?.data?.text || "").trim();

  if (!result.text) {
    result.warnings.push("No readable text was found in the image.");
  }

  return result;
}

async function aiExtractDocxText(file) {
  const result = {
    text: "",
    method: "docx-text",
    pages: 1,
    warnings: [],
    extractedAt: new Date().toISOString(),
  };

  if (!window.mammoth) {
    result.warnings.push(
      "Mammoth.js is not loaded. Word document text could not be extracted.",
    );

    return result;
  }

  const arrayBuffer = await file.arrayBuffer();

  const extraction = await window.mammoth.extractRawText({
    arrayBuffer,
  });

  result.text = String(extraction?.value || "").trim();

  if (Array.isArray(extraction?.messages)) {
    result.warnings.push(
      ...extraction.messages.map(
        (message) => message.message || String(message),
      ),
    );
  }

  if (!result.text) {
    result.warnings.push("No readable text was found in the Word document.");
  }

  return result;
}

window.aiExtractDocumentText = aiExtractDocumentText;
