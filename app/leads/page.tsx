"use client";

import { Suspense, useSyncExternalStore, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { DownloadCloud } from "lucide-react";
import { PageHeader } from "@/components/shared/page";
import { Button } from "@/components/ui/button";
import { LeadTable } from "@/components/leads/lead-table";
import { SyncMetaModal } from "@/components/modals/sync-meta-modal";
import { getLeads, store, syncLeadsFromDb } from "@/services/api";
import { useBranch } from "@/context/BranchContext";

const stageMap: Record<string, string> = {
  "New Leads": "New",
  Assigned: "Assigned",
  Contacted: "Contacted",
  Interested: "Interested",
  Counselling: "Counselling",
  Application: "Application",
  Documentation: "Documentation",
  Admission: "Admission",
  Converted: "Converted",
};

function LeadsContent() {
  const { branch } = useBranch();
  const searchParams = useSearchParams();
  const stage = searchParams.get("stage") ?? undefined;
  const search = searchParams.get("search") ?? searchParams.get("id") ?? undefined;
  const view = searchParams.get("view") ?? undefined;
  const isNew = searchParams.get("new") === "true";
  const [isMetaModalOpen, setIsMetaModalOpen] = useState(false);

  // Re-render when central store updates (new lead captured or synced)
  useSyncExternalStore(store.subscribe, store.getSnapshot, () => 0);
  const leads = getLeads(branch);
  const initialStage = stage ? (stageMap[stage] ?? stage) : undefined;

  useEffect(() => {
    syncLeadsFromDb();
  }, []);

  return (
    <div className="space-y-5 max-w-[1600px] mx-auto">
      <PageHeader
        title={`${branch === "masters" ? "Masters Abroad" : "MBBS Abroad"} Leads`}
        subtitle={`${leads.length} ${branch === "masters" ? "Masters" : "MBBS"} student leads in the workspace. Click any row to view complete profile, documents, calling history and payment schedules.`}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsMetaModalOpen(true)}
              className="gap-1.5 border-purple-200 bg-purple-50/70 text-purple-700 hover:bg-purple-100 hover:border-purple-300 dark:border-purple-900/60 dark:bg-purple-950/40 dark:text-purple-300 dark:hover:bg-purple-900/60 text-xs font-semibold cursor-pointer shadow-2xs h-9"
            >
              <DownloadCloud className="size-4" />
              Sync Meta Ads
            </Button>
          </div>
        }
      />
      <LeadTable
        leads={leads}
        initialStage={initialStage}
        initialSearch={search}
        initialView={view}
        openNewModal={isNew}
      />

      {/* Sync Meta Ads Modal */}
      <SyncMetaModal
        open={isMetaModalOpen}
        onClose={() => setIsMetaModalOpen(false)}
      />
    </div>
  );
}

export default function LeadsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-sm text-muted-foreground animate-pulse">
          Loading leads workspace…
        </div>
      }
    >
      <LeadsContent />
    </Suspense>
  );
}
