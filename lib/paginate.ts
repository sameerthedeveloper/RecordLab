import { escapeHTML, formatDate } from "./escapeHtml";
import { resolveSections, resultHeading } from "./sections";
import { CONTENT_WIDTH_MM, MANUAL_CALCULATION_LINES, resolvePageBorder, titleMoveCss } from "./types";
import { headerBorderVarsCss, headerLineCss, resolveHeaderUnderline } from "./types";
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
// ~5 lines at the record-body line-height (16px font-size * 1.5 line-height).
const FIVE_LINE_MIN_HEIGHT = 120;
// An empty ALGORITHM leaves 26 ruled-out lines (24px each) of room to write the steps by hand.
const HALF_PAGE_MIN_HEIGHT = 26 * 24;

const EMPTY_SECTION_MIN_HEIGHT: Record<string, number> = {
  aim: FIVE_LINE_MIN_HEIGHT,
  algorithm: HALF_PAGE_MIN_HEIGHT,
  result: FIVE_LINE_MIN_HEIGHT,
};

function emptyBlockStyleAttr(sectionId: string): string {
  // Custom-layout sections (ids start with c_) all leave a few lines to write in.
  const minHeight = EMPTY_SECTION_MIN_HEIGHT[sectionId] ?? (sectionId.startsWith("c_") ? FIVE_LINE_MIN_HEIGHT : undefined);
  return minHeight ? ` style="min-height:${minHeight}px"` : "";
}

type SectionType = "text" | "code" | "output" | "blank";

/** One line of record body text: 16px * 1.5 line-height. */
const BODY_LINE_PX = 24;
/** Fewest manual-calculation lines worth leaving at the bottom of a page before moving the rest on. */
const MANUAL_MIN_LINES_ON_PAGE = 3;

/** A section heading, or nothing for a block that continues the heading above it (code + output pairs share one). */
const headingTag = (heading: string): string => (heading ? `<h2 class="record-heading">${heading}</h2>` : "");

/** Blank hand-writing space; `cont` is the carry-over onto the next page (no second heading). */
function manualBlockHTML(heading: string, lines: number, cont: boolean): string {
  return `
        <section class="record-block record-block-manual${cont ? " record-block-cont" : ""}">
          ${cont ? "" : `<h2 class="record-heading">${heading}</h2>`}
          <div class="manual-calculation" style="height:${lines * BODY_LINE_PX}px"></div>
        </section>
      `;
}

interface Section {
  id: string;
  heading: string;
  type: SectionType;
  val?: string;
  textVal?: string;
  images?: OutputImage[];
  /** Blank-lines sections only. */
  lines?: number;
}

/** College sheet: heading block flush to the page border, title left-aligned beside EX / DATE. */
function createCollegeHeader(record: RecordState): string {
  const exNo = escapeHTML(record.exercise_number.trim());
  const date = escapeHTML(formatDate(record.date).replace(/-/g, "/"));
  const title = escapeHTML(record.title.trim());
  const h = record.headerLayout.height;
  const vars = headerBorderVarsCss(record.headerLayout);
  // The negative margins pull the table out over the 17mm/18mm content padding to the page border.
  const { inset } = resolvePageBorder(record.pageBorder);
  const dl = 17 - inset.left;
  const dr = 17 - inset.right;
  const dt = 18 - inset.top;
  return `
    <table class="record-header record-header--college" style="width:calc(100% + ${dl + dr}mm);margin:-${dt}mm -${dr}mm 0 -${dl}mm;${vars}">
      <tr>
        <td class="record-meta" style="height:${h}mm">
          <div class="rh-line">EX : ${exNo}</div>
          <div class="rh-line">DATE : ${date}</div>
        </td>
        <td class="record-title" style="height:${h}mm"><div style="${titleMoveCss(record.headerLayout, "college")}">${title}</div></td>
      </tr>
    </table>
    <div style="height:7mm"></div>
  `;
}

function createHeader(record: RecordState): string {
  if (record.format === "college") return createCollegeHeader(record);
  const exNo = escapeHTML(record.exercise_number.trim());
  const formattedDate = escapeHTML(formatDate(record.date));
  const title = escapeHTML(record.title.trim());

  // `.record-header` defaults to width:100% of the content area, matching
  // headerLayout.width === CONTENT_WIDTH_MM out of the box (see
  // DEFAULT_HEADER_LAYOUT) — resizing it here (Settings modal default, or a
  // per-record override) narrows the table and grows/shrinks its min-height,
  // same field the canvas2pdf drag-resize already reads and writes.
  const widthPct = Math.min(100, (record.headerLayout.width / CONTENT_WIDTH_MM) * 100);
  const minHeightMm = record.headerLayout.height;

  // Moves the whole table sideways (x, mm from the left of the content area), never past the right edge.
  const offsetMm = Math.min(Math.max(0, record.headerLayout.x || 0), Math.max(0, CONTENT_WIDTH_MM - record.headerLayout.width));
  const underline = resolveHeaderUnderline(record.headerLayout);
  const underlineHTML =
    underline.style === "none"
      ? ""
      : `<div class="record-header-rule" style="margin-top:${underline.gap}mm;border-top:${headerLineCss(underline)}"></div>`;

  return `
    <table class="record-header" style="width:${widthPct}%;margin-left:${offsetMm}mm;${headerBorderVarsCss(record.headerLayout)}">
      <tr>
        <td class="record-meta" style="min-height:${minHeightMm}mm">
          <div>
            <span class="label">EX NO :</span>
            <span class="value">${exNo}</span>
          </div>
          <div class="record-meta-divider"></div>
          <div>
            <span class="label">DATE :</span>
            <span class="value">${formattedDate}</span>
          </div>
        </td>
        <td class="record-title" style="min-height:${minHeightMm}mm">
          <div style="${titleMoveCss(record.headerLayout)}">${title}</div>
        </td>
      </tr>
    </table>
    ${underlineHTML}
  `;
}

function createMeasurePage(format?: string): HTMLDivElement {
  const page = document.createElement("div");
  page.className = format === "college" ? "a4-page fmt-college" : "a4-page";
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

  // Legacy programming-lab fields or the record's custom layout: lib/sections.ts decides which.
  const sections: Section[] = resolveSections(record, true).map((r) => ({
    id: r.id,
    heading: r.heading,
    type: r.kind === "lines" ? ("blank" as const) : r.kind,
    val: r.value,
    textVal: r.value,
    images: r.images,
    lines: r.lines,
  }));

  function buildFullSectionHTML(sec: Section): string {
    if (sec.type === "blank") return manualBlockHTML(sec.heading, sec.lines ?? MANUAL_CALCULATION_LINES, false);
    if (sec.type === "text" || sec.type === "code") {
      const rawText = (sec.val || "").trim();
      if (!rawText) return "";
      const contentEscaped = rawText
        .split("\n")
        .map((l) => escapeHTML(l))
        .join("\n");
      const tag = sec.type === "code" ? "pre" : "div";
      const cls = sec.type === "code" ? "source-code" : "record-body";
      if (record.format === "college" && sec.id === "aim") {
        // College sheet: "AIM: text…" runs on from the heading.
        return `
        <section class="record-block">
          <div class="record-body"><strong class="record-inline-heading">AIM:</strong> ${contentEscaped}</div>
        </section>
      `;
      }
      return `
        <section class="record-block">
          ${headingTag(sec.heading)}
          <${tag} class="${cls}">${contentEscaped}</${tag}>
        </section>
      `;
    } else if (sec.type === "output") {
      const textVal = (sec.textVal || "").trim();
      const images = sec.images || [];
      if (!textVal && images.length === 0) return "";
      let html = `<section class="record-block">${headingTag(sec.heading)}`;
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

    // Manual calculation: starts right under the previous section. If all its lines fit on this page
    // it stays; otherwise it fills what room is left (at least MIN lines) and the remaining lines
    // continue at the top of the next page. With less room than that, it all moves to the next page.
    if (sec.type === "blank") {
      const total = sec.lines ?? MANUAL_CALCULATION_LINES;
      if (tryAddFragment(fullSectionHTML)) {
        currentMainFlowHTML += fullSectionHTML;
        return;
      }
      let fit = 0;
      for (let k = total - 1; k >= MANUAL_MIN_LINES_ON_PAGE; k--) {
        if (tryAddFragment(manualBlockHTML(sec.heading, k, false))) {
          fit = k;
          break;
        }
      }
      if (fit > 0) {
        currentMainFlowHTML += manualBlockHTML(sec.heading, fit, false);
        commitCurrentPage();
        currentMainFlowHTML += manualBlockHTML(sec.heading, total - fit, true);
      } else {
        if (currentMainFlowHTML.trim() !== headerHTML.trim()) commitCurrentPage();
        currentMainFlowHTML += fullSectionHTML;
      }
      return;
    }

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
            ${headingTag(sec.heading)}
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
              ${headingTag(sec.heading)}
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
        const headingHTML = isFirstLineOfSection ? headingTag(sec.heading) : "";

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
              ? headingTag(sec.heading)
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
        const remainingHeadingHTML = isFirstLineOfSection ? headingTag(sec.heading) : "";
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
            ${headingTag(sec.heading)}
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
          const headingHTML = isFirstPartOfOutput ? headingTag(sec.heading) : "";
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
                ? headingTag(sec.heading)
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
          const remainingHeadingHTML = isFirstPartOfOutput ? headingTag(sec.heading) : "";
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
          const headingHTML = showHeading ? headingTag(sec.heading) : "";
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
  const measurePage = createMeasurePage(record.format);
  const measureContent = measurePage.querySelector(".a4-content") as HTMLElement;

  const resultHeadingText = resultHeading(record);
  const resultVal = record.result;
  const resultIsEmpty = resultVal.trim() === "";
  const resultBlockContent = `
    <section class="record-block record-block-result">
      <h2 class="record-heading">${resultHeadingText}</h2>
      <div class="record-body"${resultIsEmpty ? emptyBlockStyleAttr("result") : ""}>${escapeHTML(resultVal)}</div>
    </section>
  `;
  // Fallback used when the reserved writing space for an empty RESULT
  // doesn't fit on the last page — dropping the reserved height (rather
  // than forcing the whole block onto a fresh, near-blank page) mirrors
  // how empty AIM/ALGORITHM sections already degrade in paginateMainFlow.
  const compactResultBlockContent = `
    <section class="record-block record-block-result">
      <h2 class="record-heading">${resultHeadingText}</h2>
      <div class="record-body">${escapeHTML(resultVal)}</div>
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

  function measureBlockHeight(html: string): number {
    measureContent.innerHTML = `<div class="a4-bottom-result">${html}</div>`;
    const el = measureContent.firstElementChild as HTMLElement | null;
    const height = el ? el.offsetHeight : 50;
    measureContent.innerHTML = "";
    return height;
  }

  const resultBlockHeight = measureBlockHeight(resultBlockContent);

  const headerHTML = createHeader(record);
  const rawPages = paginateMainFlow(record, measureContent, headerHTML);
  const validPages = rawPages.filter((p) => p && p.trim() !== "");

  // Does RESULT fit appended to the bottom of the last page along with that
  // page's already-placed content? Check after the fact instead of trying to
  // predict it during pagination — much less error-prone.
  let resultNeedsOwnPage = false;
  let finalResultBlockContent = resultBlockContent;
  if (validPages.length > 0) {
    const lastPageHeight = measureMainFlowHeight(validPages[validPages.length - 1]);
    resultNeedsOwnPage = lastPageHeight + resultBlockHeight + RESULT_BLOCK_BUFFER > PAGE_HEIGHT;

    if (resultNeedsOwnPage && resultIsEmpty) {
      const compactHeight = measureBlockHeight(compactResultBlockContent);
      if (lastPageHeight + compactHeight + RESULT_BLOCK_BUFFER <= PAGE_HEIGHT) {
        resultNeedsOwnPage = false;
        finalResultBlockContent = compactResultBlockContent;
      }
    }
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
        result: isLastPage && !resultNeedsOwnPage ? finalResultBlockContent : "",
      });
    });
    if (resultNeedsOwnPage) {
      pageObjects.push({ main: "", result: resultBlockContent });
    }
  }

  return dropBlankTrailingPages(pageObjects);
}

// A page whose main-flow is just the header table (no section content) and
// which carries no RESULT block either would render as a visually blank
// page in the PDF/print output — strip those out rather than emit them.
function isBlankPage(page: PageObject): boolean {
  if (page.result.trim() !== "") return false;
  const withoutHeader = page.main.replace(/<table class="record-header">[\s\S]*?<\/table>/, "");
  return withoutHeader.trim() === "";
}

function dropBlankTrailingPages(pages: PageObject[]): PageObject[] {
  if (pages.length <= 1) return pages;
  const filtered = pages.filter((page) => !isBlankPage(page));
  return filtered.length > 0 ? filtered : [pages[0]];
}
