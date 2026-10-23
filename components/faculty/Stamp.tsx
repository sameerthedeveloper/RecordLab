import type { Verdict } from "@/lib/facultyService";

/** The rubber stamp. "Verified" in green; "Sent back" in red pencil. `fresh` plays the thump once. */
export function Stamp({ status, date, fresh = false }: { status: Exclude<Verdict, "pending">; date?: string; fresh?: boolean }) {
  const changes = status === "changes";
  return (
    <span className={`verified-stamp text-xl ${changes ? "is-changes" : ""} ${fresh ? "is-fresh" : ""}`} role="img" aria-label={changes ? "Sent back for changes" : "Verified"}>
      {changes ? "SENT BACK" : "VERIFIED"}
      {date && <small>{date}</small>}
    </span>
  );
}
