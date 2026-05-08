import { Suspense } from "react";
import { CompanySettings } from "@/components/settings/CompanySettings";
import { TeamSettings } from "@/components/settings/TeamSettings";
import { ProfileSettings } from "@/components/settings/ProfileSettings";

export default function SettingsPage() {
  return (
    <main className="bg-background p-6">
      <div className="mx-auto max-w-3xl space-y-10">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Paramètres
        </h1>
        <Suspense>
          <CompanySettings />
        </Suspense>
        <Suspense>
          <TeamSettings />
        </Suspense>
        <Suspense>
          <ProfileSettings />
        </Suspense>
      </div>
    </main>
  );
}
