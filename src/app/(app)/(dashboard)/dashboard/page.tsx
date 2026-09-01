"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";

export default function DashboardPage() {
  const router = useRouter();
  const { data: orgs, isLoading } = trpc.organization.list.useQuery();

  useEffect(() => {
    if (orgs && orgs.length > 0) {
      router.replace(`/org/${orgs[0].slug}`);
    }
  }, [orgs, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse text-muted-foreground">
        {isLoading ? "Loading..." : orgs?.length === 0 ? "No organization found." : "Redirecting..."}
      </div>
    </div>
  );
}
