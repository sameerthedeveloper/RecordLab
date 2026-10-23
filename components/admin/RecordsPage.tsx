"use client";

import { AdminRecords } from "../AdminRecords";
import { WhenLoaded } from "./LoadState";

export function RecordsPage() {
  return <WhenLoaded>{({ data, view }) => <AdminRecords rows={data.records} error={data.recordsError} ownerName={view.ownerName} />}</WhenLoaded>;
}
