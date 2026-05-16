"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { areWriteRoutesDisabled, hasDatabaseUrl } from "@/lib/env";
import { runIngestion } from "@/ingestion/run";

export async function triggerIngestion() {
  if (areWriteRoutesDisabled() || !hasDatabaseUrl()) {
    redirect("/ops?ingest=disabled");
  }

  let summary;
  try {
    summary = await runIngestion();
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    redirect(`/ops?ingest=error&message=${encodeURIComponent(message)}`);
  }

  revalidatePath("/");
  revalidatePath("/ops");
  redirect(
    `/ops?ingest=success&persisted=${summary.totalPersisted}&failed=${summary.totalFailed}&candidates=${summary.totalCandidates}`,
  );
}
