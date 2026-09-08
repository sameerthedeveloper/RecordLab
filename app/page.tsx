"use client";

import { useCallback, useRef, useState } from "react";
import { RecordEditorPanel } from "@/components/RecordEditorPanel";
import { PreviewPanel } from "@/components/PreviewPanel";
import { MobileNav } from "@/components/MobileNav";
import { AiAssistantModal } from "@/components/AiAssistantModal";
import { usePaginatedPages } from "@/lib/usePaginatedPages";
import { buildPrintDocumentHTML } from "@/lib/buildPrintHtml";
import { buildRecordDocx } from "@/lib/buildDocx";
import { DEFAULT_RECORD, DEFAULT_WATERMARK } from "@/lib/types";
import type { DownloadFormat, OutputImage, PdfEngine, RecordState, WatermarkOptions } from "@/lib/types";
import type { ParsedLabRecord } from "@/lib/aiAssistant";

function buildFilename(record: RecordState, extension: string): string {
  const title = record.title.trim();
  const rrn = record.rrn.trim();
  let filename = "record-lab";
  if (title) {
    filename += "-" + title.replace(/[<>:"/\\|?*]+/g, "").replace(/\s+/g, "-").toLowerCase();
  }
  if (rrn) {
    filename += "-" + rrn.replace(/[<>:"/\\|?*]+/g, "").replace(/\s+/g, "-").toLowerCase();
  }
  return `${filename}.${extension}`;
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function Home() {
  const [record, setRecord] = useState<RecordState>(DEFAULT_RECORD);
  const [watermark, setWatermark] = useState<WatermarkOptions>(DEFAULT_WATERMARK);
  const [mobilePanel, setMobilePanel] = useState<"inputs" | "preview">("inputs");
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [isSavingPdf, setIsSavingPdf] = useState(false);
  const [downloadFormat, setDownloadFormat] = useState<DownloadFormat>("pdf");
  const [pdfEngine, setPdfEngine] = useState<PdfEngine>("html2pdf");

  const printFrameRef = useRef<HTMLIFrameElement>(null);

  const pages = usePaginatedPages(record);

  const handleFieldChange = useCallback(
    <K extends keyof RecordState>(field: K, value: RecordState[K]) => {
      setRecord((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const handleImageUpload = useCallback((files: FileList) => {
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const src = e.target?.result;
        if (typeof src !== "string") return;
        const image: OutputImage = { id: Date.now() + Math.random(), src, name: file.name };
        setRecord((prev) => ({ ...prev, output_images: [...prev.output_images, image] }));
      };
      reader.readAsDataURL(file);
    });
  }, []);

  const handleRemoveImage = useCallback((id: number) => {
    setRecord((prev) => ({ ...prev, output_images: prev.output_images.filter((img) => img.id !== id) }));
  }, []);

  function handleSaveWork() {
    const payload = { version: 1, record, watermark };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });

    const title = record.title.trim();
    let filename = "record-lab";
    if (title) {
      filename += "-" + title.replace(/[<>:"/\\|?*]+/g, "").replace(/\s+/g, "-").toLowerCase();
    }
    filename += ".rlab.json";

    downloadBlob(blob, filename);
  }

  function handleLoadWork(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result;
        if (typeof text !== "string") throw new Error("Unable to read file.");
        const data = JSON.parse(text);
        const loadedRecord = data && typeof data === "object" && data.record ? data.record : data;
        if (!loadedRecord || typeof loadedRecord !== "object" || typeof loadedRecord.title !== "string") {
          throw new Error("This doesn't look like a Record Lab work file.");
        }
        setRecord({ ...DEFAULT_RECORD, ...loadedRecord });
        if (data.watermark && typeof data.watermark === "object") {
          setWatermark({ ...DEFAULT_WATERMARK, ...data.watermark });
        }
      } catch (error) {
        console.error("Load work failed:", error);
        alert("Unable to load this file. Please choose a valid Record Lab work file.");
      }
    };
    reader.readAsText(file);
  }

  function writePrintDocument(): Document | null {
    const iframe = printFrameRef.current;
    if (!iframe) return null;
    const iframeDocument = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDocument) return null;

    iframeDocument.open();
    iframeDocument.write(buildPrintDocumentHTML(pages, record.rrn, watermark));
    iframeDocument.close();
    return iframeDocument;
  }

  function handlePrint() {
    writePrintDocument();
    window.setTimeout(() => {
      const iframe = printFrameRef.current;
      if (!iframe?.contentWindow) return;
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    }, 500);
  }

  async function handleSaveCanvasPdf() {
    setIsSavingPdf(true);
    try {
      // Lazily imported: canvas2pdf pulls in a ~1.8MB bundled PDFKit build
      // (standard-font metrics included), so it shouldn't weigh down the
      // initial page load for users who never pick this engine.
      const { buildCanvasPdf } = await import("@/lib/buildCanvasPdf");
      const blob = await buildCanvasPdf(record, watermark);
      downloadBlob(blob, buildFilename(record, "pdf"));
    } catch (error) {
      console.error("Canvas PDF generation failed:", error);
      alert("Unable to generate the PDF.");
    } finally {
      setIsSavingPdf(false);
    }
  }

  async function handleSaveHtml2Pdf() {
    setIsSavingPdf(true);
    try {
      const iframeDocument = writePrintDocument();
      await new Promise((resolve) => window.setTimeout(resolve, 500));

      const pdfContent = iframeDocument?.querySelector(".print-document") as HTMLElement | null;
      if (!pdfContent) {
        throw new Error("PDF content not found.");
      }

      const filename = buildFilename(record, "pdf");

      if (!window.html2pdf) {
        throw new Error("PDF engine failed to load.");
      }

      await window
        .html2pdf()
        .set({
          margin: 0,
          filename,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            backgroundColor: "#ffffff",
            logging: false,
          },
          jsPDF: {
            unit: "mm",
            format: "a4",
            orientation: "portrait",
            compress: true,
          },
          // "legacy" mode adds its own heuristic page breaks on top of the
          // explicit ones from .a4-page{page-break-after:always}, which we
          // already set precisely to match the pagination engine's output.
          // Combining both caused content to shift off page 1 and a blank
          // trailing page to appear — "css" alone respects our breaks as-is.
          pagebreak: { mode: ["css"] },
        })
        .from(pdfContent)
        .save();
    } catch (error) {
      console.error("PDF generation failed:", error);
      alert("Unable to generate the PDF.");
    } finally {
      setIsSavingPdf(false);
    }
  }

  async function handleSaveDocx() {
    setIsSavingPdf(true);
    try {
      const blob = await buildRecordDocx(record, watermark);
      downloadBlob(blob, buildFilename(record, "docx"));
    } catch (error) {
      console.error("DOCX generation failed:", error);
      alert("Unable to generate the DOCX file.");
    } finally {
      setIsSavingPdf(false);
    }
  }

  function handleSave() {
    if (downloadFormat === "docx") {
      handleSaveDocx();
    } else if (pdfEngine === "canvas2pdf") {
      handleSaveCanvasPdf();
    } else {
      handleSaveHtml2Pdf();
    }
  }

  function handleAiImport(parsed: ParsedLabRecord, experimentTitle: string) {
    setRecord((prev) => {
      const newTitle = experimentTitle.trim() || prev.title.trim();
      return {
        ...prev,
        title: newTitle ? newTitle.toUpperCase() : prev.title,
        aim: (parsed.aim || "").trim(),
        algorithm: (parsed.algorithm || "").trim(),
        source_code: (parsed.sourceCode || "").trim(),
        output: (parsed.output || "").trim(),
        review_questions: (parsed.viva || "").trim(),
        review_questions_enabled: true,
        result: (parsed.result || "").trim(),
        output_images: [],
      };
    });
  }

  return (
    <>
      <div className="app-layout flex h-full w-full gap-3.5 md:gap-4 bg-gray-100 p-3.5 md:p-4 overflow-hidden">
        <RecordEditorPanel
          record={record}
          watermark={watermark}
          onFieldChange={handleFieldChange}
          onWatermarkChange={setWatermark}
          onImageUpload={handleImageUpload}
          onRemoveImage={handleRemoveImage}
          onOpenAiModal={() => setAiModalOpen(true)}
          onSaveWork={handleSaveWork}
          onLoadWork={handleLoadWork}
          visible={mobilePanel === "inputs"}
        />

        <PreviewPanel
          record={record}
          pages={pages}
          rrn={record.rrn}
          watermark={watermark}
          onFieldChange={handleFieldChange}
          onSave={handleSave}
          onPrint={handlePrint}
          isSaving={isSavingPdf}
          downloadFormat={downloadFormat}
          onDownloadFormatChange={setDownloadFormat}
          pdfEngine={pdfEngine}
          onPdfEngineChange={setPdfEngine}
          visible={mobilePanel === "preview"}
        />
      </div>

      <MobileNav activePanel={mobilePanel} onSelect={setMobilePanel} />

      <iframe
        ref={printFrameRef}
        title="Print Frame"
        style={{
          position: "fixed",
          width: 0,
          height: 0,
          border: 0,
          opacity: 0,
          pointerEvents: "none",
          left: "-10000px",
          top: "-10000px",
        }}
      />

      <AiAssistantModal open={aiModalOpen} onClose={() => setAiModalOpen(false)} onImport={handleAiImport} />
    </>
  );
}
