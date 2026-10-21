import { Suspense } from "react";
import { ClassView } from "@/components/faculty/ClassView";

export default function Page() {
  return (
    <Suspense>
      <ClassView />
    </Suspense>
  );
}
