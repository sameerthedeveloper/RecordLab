"use client";

import { AdminMail } from "../AdminMail";
import { WhenLoaded } from "./LoadState";

export function MailPage() {
  return <WhenLoaded>{({ data, view, me }) => <AdminMail profiles={data.usage.profiles} adminEmail={me.email} collegeOf={view.collegeOf} />}</WhenLoaded>;
}
