import { escapeHTML, formatDate } from "./escapeHtml";
import type { OutputImage, PageObject, RecordState } from "./types";

/**
 * Smart pagination engine — ported 1:1 from the original single-file app.
 * It measures real rendered heights in a hidden offscreen DOM node because
 * text wrapping / line-height depends on actual font rendering, which can't
 * be predicted analytically. Only runs in the browser.
 */

// Fixed inner height of A4 page content (297mm minus 36mm vertical padding ~= 986px)
const PAGE_HEIGHT = 986;
// Buffer subtracted from PAGE_HEIGHT for main-flow content, matching the
// original app's tuned safety margin.
const MAIN_FLOW_BUDGET = PAGE_HEIGHT - 12;
// Extra buffer (padding/margin around the pinned RESULT block) added on top
// of its measured height when checking whether it fits on the last page.
const RESULT_BLOCK_BUFFER = 24;

// Reserved blank space (in px) shown when a section is left empty, so the
// printed record still has room to fill in by hand.
// ~5 lines at the record-body line-height (12px font-size * 1.5 line-height).
const FIVE_LINE_MIN_HEIGHT = 90;
// Half a page of writing space for the (usually longer) algorithm section.
const HALF_PAGE_MIN_HEIGHT = Math.round(PAGE_HEIGHT / 2);

const EMPTY_SECTION_MIN_HEIGHT: Record<string, number> = {
  aim: FIVE_LINE_MIN_HEIGHT,
  algorithm: HALF_PAGE_MIN_HEIGHT,
  result: FIVE_LINE_MIN_HEIGHT,
};

function emptyBlockStyleAttr(sectionId: string): string {
  const minHeight = EMPTY_SECTION_MIN_HEIGHT[sectionId];
  return minHeight ? ` style="min-height:${minHeight}px"` : "";
}

type SectionType = "text" | "code" | "output";

interface Section {
  id: string;
  heading: string;
  type: SectionType;
  val?: string;
  textVal?: string;
  images?: OutputImage[];
}

function createHeader(record: RecordState): string {
  const exNo = escapeHTML(record.exercise_number.trim());
  const formattedDate = escapeHTML(formatDate(record.date));
  const title = escapeHTML(record.title.trim());

  return `
    <table class="record-header">
      <tr>
        <td class="record-meta">
          <div>
            <span class="label">EX NO :</span>
            <span class="value">${exNo}</span>
          </div>
          <div>
            <span class="label">DATE :</span>
            <span class="value">${formattedDate}</span>
          </div>
        </td>
        <td class="record-title">
          ${title}
        </td>
      </tr>
    </table>
  `;
}

function createMeasurePage(): HTMLDivElement {
  const page = document.createElement("div");
  page.className = "a4-page";
  page.style.position = "absolute";
  page.style.left = "-10000px";
  page.style.top = "0";
  page.style.height = "auto";
  page.style.minHeight = "297mm";
  page.style.overflow = "visible";
  page.style.visibility = "hidden";
  page.style.pointerEvents = "none";
  page.innerHTML = `
    <div class="a4-content" style="height:auto;min-height:261mm;overflow:visible;">
      <div class="a4-main-flow" style="height:auto;overflow:visible;"></div>
    </div>
  `;
  document.body.appendChild(page);
  return page;
}

/**
 * Builds the main-flow pages for a record, using the FULL page budget for
 * every section — no section is treated specially based on whether it's
 * "last". Keeping this pass simple and uniform means it can't accidentally
 * shrink the budget for an earlier section just because a later one happens
 * to be empty or missing. Whether RESULT fits on the resulting last page is
 * checked separately, afterward (see `paginateRecord`), which is far easier
 * to get right than trying to predict it up front.
 */
function paginateMainFlow(record: RecordState, measureContent: HTMLElement, headerHTML: string): string[] {
  const rawPages: string[] = [];
  let currentMainFlowHTML = headerHTML;

  function measureMainFlowHeight(htmlContent: string): number {
    measureContent.innerHTML = `
      <div class="a4-main-flow" style="height:auto;overflow:visible;">
        ${htmlContent}
      </div>
    `;
    const el = measureContent.firstElementChild as HTMLElement | null;
    return el ? el.scrollHeight : 0;
  }

  function tryAddFragment(fragmentHTML: string): boolean {
    return measureMainFlowHeight(currentMainFlowHTML + fragmentHTML) <= MAIN_FLOW_BUDGET;
  }

  function commitCurrentPage(): void {
    if (currentMainFlowHTML.trim() !== "") {
      rawPages.push(currentMainFlowHTML);
      currentMainFlowHTML = "";
      measureContent.innerHTML = "";
    }
  }

  const sections: Section[] = [
    { id: "aim", heading: "AIM:", type: "text", val: record.aim },
    { id: "algorithm", heading: "ALGORITHM:", type: "text", val: record.algorithm },
    { id: "source_code", heading: "SOURCE CODE:", type: "code", val: record.source_code },
    { id: "output", heading: "OUTPUT:", type: "output", textVal: record.output, images: record.output_images },
    ...(record.review_questions_enabled
      ? [{ id: "review_questions", heading: "REVIEW QUESTIONS:", type: "text" as const, val: record.review_questions }]
      : []),
  ];

  function buildFullSectionHTML(sec: Section): string {
    if (sec.type === "text" || sec.type === "code") {
      const rawText = (sec.val || "").trim();
      if (!rawText) return "";
      const contentEscaped = rawText
        .split("\n")
        .map((l) => escapeHTML(l))
        .join("\n");
      const tag = sec.type === "code" ? "pre" : "div";
      const cls = sec.type === "code" ? "source-code" : "record-body";
      return `
        <section class="record-block">
          <h2 class="record-heading">${sec.heading}</h2>
          <${tag} class="${cls}">${contentEscaped}</${tag}>
        </section>
      `;
    } else if (sec.type === "output") {
      const textVal = (sec.textVal || "").trim();
      const images = sec.images || [];
      if (!textVal && images.length === 0) return "";
      let html = `<section class="record-block"><h2 class="record-heading">${sec.heading}</h2>`;
      if (textVal !== "") {
        html += `<div class="output-text">${textVal
          .split("\n")
          .map((l) => escapeHTML(l))
          .join("\n")}</div>`;
      }
      if (images.length > 0) {
        images.forEach((img) => {
          html += `<div class="output-image-item"><img src="${img.src}" class="output-image" alt="${escapeHTML(
            img.name
          )}" /></div>`;
        });
      }
      html += `</section>`;
      return html;
    }
    return "";
  }

  sections.forEach((sec) => {
    const fullSectionHTML = buildFullSectionHTML(sec);

    // 1. If full section fits on current page, add it in one piece!
    if (fullSectionHTML && tryAddFragment(fullSectionHTML)) {
      currentMainFlowHTML += fullSectionHTML;
      return;
    }

    // 2. If full section does NOT fit on current page:
    // Move section to a fresh page only if remaining space is less than 60px (orphan heading protection)
    const currentHeight = measureMainFlowHeight(currentMainFlowHTML);
    const spaceRemaining = MAIN_FLOW_BUDGET - currentHeight;

    // Never commit a page that holds nothing but the header — that would
    // strand the header alone on a near-blank page and shove the very first
    // section (e.g. a short AIM) onto page 2 for no real space reason.
    const hasContentBeyondHeader = currentMainFlowHTML.trim() !== headerHTML.trim();

    if (currentMainFlowHTML.trim() !== "" && hasContentBeyondHeader && spaceRemaining < 60) {
      commitCurrentPage();
      if (fullSectionHTML && tryAddFragment(fullSectionHTML)) {
        currentMainFlowHTML += fullSectionHTML;
        return;
      }
    }

    if (sec.type === "text" || sec.type === "code") {
      const rawText = sec.val || "";
      const tag = sec.type === "code" ? "pre" : "div";
      const cls = sec.type === "code" ? "source-code" : "record-body";

      if (rawText.trim() === "") {
        const emptyBlockHTML = `
          <section class="record-block">
            <h2 class="record-heading">${sec.heading}</h2>
            <${tag} class="${cls}"${emptyBlockStyleAttr(sec.id)}></${tag}>
          </section>
        `;
        // The reserved writing space is a nicety, not real content — if it
        // doesn't fit on the current page, don't force a page break just to
        // preserve it (that would shove already-placed real content, e.g. a
        // filled-in AIM, onto a page of its own). Fall back to an unreserved
        // block instead.
        if (tryAddFragment(emptyBlockHTML)) {
          currentMainFlowHTML += emptyBlockHTML;
        } else {
          const compactEmptyBlockHTML = `
            <section class="record-block">
              <h2 class="record-heading">${sec.heading}</h2>
              <${tag} class="${cls}"></${tag}>
            </section>
          `;
          currentMainFlowHTML += compactEmptyBlockHTML;
        }
        return;
      }

      const lines = rawText.split("\n");
      let isFirstLineOfSection = true;
      let currentSectionLines: string[] = [];

      let i = 0;
      while (i < lines.length) {
        const chunkLines = [lines[i]];
        // Group Question & Answer lines together
        if (
          /^Q\d+[:.]/i.test(lines[i].trim()) &&
          i + 1 < lines.length &&
          /^A\d+[:.]/i.test(lines[i + 1].trim())
        ) {
          chunkLines.push(lines[i + 1]);
          i++;
        }

        const testLines = [...currentSectionLines, ...chunkLines];
        const lineContentEscaped = testLines.map((l) => escapeHTML(l)).join("\n");
        const headingHTML = isFirstLineOfSection ? `<h2 class="record-heading">${sec.heading}</h2>` : "";

        const testBlockHTML = `
          <section class="record-block ${isFirstLineOfSection ? "" : "record-block-cont"}">
            ${headingHTML}
            <${tag} class="${cls}">${lineContentEscaped}</${tag}>
          </section>
        `;

        if (tryAddFragment(testBlockHTML)) {
          currentSectionLines.push(...chunkLines);
        } else {
          if (currentSectionLines.length === 0) {
            commitCurrentPage();
            currentSectionLines.push(...chunkLines);
          } else {
            const committedContent = currentSectionLines.map((l) => escapeHTML(l)).join("\n");
            const committedHeadingHTML = isFirstLineOfSection
              ? `<h2 class="record-heading">${sec.heading}</h2>`
              : "";
            const committedBlockHTML = `
              <section class="record-block ${isFirstLineOfSection ? "" : "record-block-cont"}">
                ${committedHeadingHTML}
                <${tag} class="${cls}">${committedContent}</${tag}>
              </section>
            `;
            currentMainFlowHTML += committedBlockHTML;
            commitCurrentPage();
            isFirstLineOfSection = false;
            currentSectionLines = [...chunkLines];
          }
        }
        i++;
      }

      if (currentSectionLines.length > 0) {
        const remainingContent = currentSectionLines.map((l) => escapeHTML(l)).join("\n");
        const remainingHeadingHTML = isFirstLineOfSection ? `<h2 class="record-heading">${sec.heading}</h2>` : "";
        const remainingBlockHTML = `
          <section class="record-block ${isFirstLineOfSection ? "" : "record-block-cont"}">
            ${remainingHeadingHTML}
            <${tag} class="${cls}">${remainingContent}</${tag}>
          </section>
        `;
        currentMainFlowHTML += remainingBlockHTML;
      }
    } else if (sec.type === "output") {
      const textVal = sec.textVal || "";
      const images = sec.images || [];

      if (textVal.trim() === "" && images.length === 0) {
        const emptyBlockHTML = `
          <section class="record-block">
            <h2 class="record-heading">${sec.heading}</h2>
            <div class="output-text"></div>
          </section>
        `;
        if (!tryAddFragment(emptyBlockHTML)) {
          commitCurrentPage();
        }
        currentMainFlowHTML += emptyBlockHTML;
        return;
      }

      let isFirstPartOfOutput = true;
      if (textVal.trim() !== "") {
        const lines = textVal.split("\n");
        let currentTextLines: string[] = [];

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const testLines = [...currentTextLines, line];
          const lineContentEscaped = testLines.map((l) => escapeHTML(l)).join("\n");
          const headingHTML = isFirstPartOfOutput ? `<h2 class="record-heading">${sec.heading}</h2>` : "";
          const testBlockHTML = `
            <section class="record-block ${isFirstPartOfOutput ? "" : "record-block-cont"}">
              ${headingHTML}
              <div class="output-text">${lineContentEscaped}</div>
            </section>
          `;

          if (tryAddFragment(testBlockHTML)) {
            currentTextLines.push(line);
          } else {
            if (currentTextLines.length === 0) {
              commitCurrentPage();
              currentTextLines.push(line);
            } else {
              const committedContent = currentTextLines.map((l) => escapeHTML(l)).join("\n");
              const committedHeadingHTML = isFirstPartOfOutput
                ? `<h2 class="record-heading">${sec.heading}</h2>`
                : "";
              const committedBlockHTML = `
                <section class="record-block ${isFirstPartOfOutput ? "" : "record-block-cont"}">
                  ${committedHeadingHTML}
                  <div class="output-text">${committedContent}</div>
                </section>
              `;
              currentMainFlowHTML += committedBlockHTML;
              commitCurrentPage();
              isFirstPartOfOutput = false;
              currentTextLines = [line];
            }
          }
        }

        if (currentTextLines.length > 0) {
          const remainingContent = currentTextLines.map((l) => escapeHTML(l)).join("\n");
          const remainingHeadingHTML = isFirstPartOfOutput ? `<h2 class="record-heading">${sec.heading}</h2>` : "";
          const remainingBlockHTML = `
            <section class="record-block ${isFirstPartOfOutput ? "" : "record-block-cont"}">
              ${remainingHeadingHTML}
              <div class="output-text">${remainingContent}</div>
            </section>
          `;
          currentMainFlowHTML += remainingBlockHTML;
          isFirstPartOfOutput = false;
        }
      }

      if (images.length > 0) {
        images.forEach((image, imgIdx) => {
          // Only the very first image of the OUTPUT section (when no output
          // text preceded it) starts a fresh block with its own heading and
          // section spacing. Every other image continues the same logical
          // OUTPUT block, so it must use record-block-cont like every other
          // continuation chunk in this file — otherwise the block-level
          // margin-top (18px) stacks on top of .output-image-item's own
          // margin-top (10px) and blows out the gap between images.
          const showHeading = isFirstPartOfOutput && imgIdx === 0;
          // Use the section's real heading ("OUTPUT:"), not a hardcoded
          // label — and keep it if this image gets bumped to a fresh page
          // below, since it's still the first thing in the section there.
          const headingHTML = showHeading ? `<h2 class="record-heading">${sec.heading}</h2>` : "";
          const imageBlockHTML = `
            <section class="record-block ${showHeading ? "" : "record-block-cont"}">
              ${headingHTML}
              <div class="output-image-item">
                <img src="${image.src}" class="output-image" alt="${escapeHTML(image.name)}" />
              </div>
            </section>
          `;

          if (tryAddFragment(imageBlockHTML)) {
            currentMainFlowHTML += imageBlockHTML;
          } else {
            commitCurrentPage();
            const newPageImageBlockHTML = `
              <section class="record-block">
                ${headingHTML}
                <div class="output-image-item">
                  <img src="${image.src}" class="output-image" alt="${escapeHTML(image.name)}" />
                </div>
              </section>
            `;
            currentMainFlowHTML += newPageImageBlockHTML;
          }
          isFirstPartOfOutput = false;
        });
      }
    }
  });

  commitCurrentPage();
  return rawPages;
}

export function paginateRecord(record: RecordState): PageObject[] {
  const measurePage = createMeasurePage();
  const measureContent = measurePage.querySelector(".a4-content") as HTMLElement;

  const resultVal = record.result;
  const resultBlockContent = `
    <section class="record-block record-block-result">
      <h2 class="record-heading">RESULT:</h2>
      <div class="record-body"${resultVal.trim() === "" ? emptyBlockStyleAttr("result") : ""}>${escapeHTML(resultVal)}</div>
    </section>
  `;

  function measureMainFlowHeight(htmlContent: string): number {
    measureContent.innerHTML = `
      <div class="a4-main-flow" style="height:auto;overflow:visible;">
        ${htmlContent}
      </div>
    `;
    const el = measureContent.firstElementChild as HTMLElement | null;
    return el ? el.scrollHeight : 0;
  }

  measureContent.innerHTML = `<div class="a4-bottom-result">${resultBlockContent}</div>`;
  const resultEl = measureContent.firstElementChild as HTMLElement | null;
  const resultBlockHeight = resultEl ? resultEl.offsetHeight : 50;
  measureContent.innerHTML = "";

  const headerHTML = createHeader(record);
  const rawPages = paginateMainFlow(record, measureContent, headerHTML);
  const validPages = rawPages.filter((p) => p && p.trim() !== "");

  // Does RESULT fit appended to the bottom of the last page along with that
  // page's already-placed content? Check after the fact instead of trying to
  // predict it during pagination — much less error-prone.
  let resultNeedsOwnPage = false;
  if (validPages.length > 0) {
    const lastPageHeight = measureMainFlowHeight(validPages[validPages.length - 1]);
    resultNeedsOwnPage = lastPageHeight + resultBlockHeight + RESULT_BLOCK_BUFFER > PAGE_HEIGHT;
  }

  measurePage.remove();

  const pageObjects: PageObject[] = [];

  if (validPages.length === 0) {
    pageObjects.push({ main: "", result: resultBlockContent });
  } else {
    validPages.forEach((mainHTML, index) => {
      const isLastPage = index === validPages.length - 1;
      pageObjects.push({
        main: mainHTML,
        result: isLastPage && !resultNeedsOwnPage ? resultBlockContent : "",
      });
    });
    if (resultNeedsOwnPage) {
      pageObjects.push({ main: "", result: resultBlockContent });
    }
  }

  return pageObjects;
}
