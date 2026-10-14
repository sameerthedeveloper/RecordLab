import { DEFAULT_HEADER_LAYOUT, resolvePageBorder, type HeaderLayout, type PageBorder, type RecordFormat, type RecordState } from "./types";

export const isCollege = (record: Pick<RecordState, "format">): boolean => record.format === "college";

/** Heading block of the college sheet: full width of the page border, only the bottom rule and the centre divider drawn. */
export const COLLEGE_HEADER: HeaderLayout = {
  x: -9,
  y: -10,
  width: 194,
  height: 28,
  borders: {
    top: { style: "none" },
    left: { style: "none" },
    right: { style: "none" },
    insideH: { style: "none" },
    bottom: { style: "solid", width: 1, color: "#111827" },
    insideV: { style: "solid", width: 1, color: "#111827" },
  },
};

/** Page padding the content area sits inside (mm) — see .a4-content. */
const PAD_X = 17;
const PAD_Y = 18;

/** Where the college heading block sits so it stays flush with the (variable) page border. */
export function collegeGeometry(pageBorder: Partial<PageBorder> | undefined): Pick<HeaderLayout, "x" | "y" | "width"> {
  const { inset } = resolvePageBorder(pageBorder);
  return { x: inset.left - PAD_X, y: inset.top - PAD_Y, width: 210 - inset.left - inset.right };
}

/** Applies a format: the format flag plus the heading-table geometry and borders that go with it. */
export function formatPatch(
  format: RecordFormat,
  current: HeaderLayout,
  pageBorder?: Partial<PageBorder>,
): Pick<RecordState, "format" | "headerLayout"> {
  if (format === "college") {
    return { format, headerLayout: { ...COLLEGE_HEADER, ...collegeGeometry(pageBorder), underline: { style: "none" } } };
  }
  return {
    format,
    headerLayout: {
      ...DEFAULT_HEADER_LAYOUT,
      underline: current.underline,
    },
  };
}
