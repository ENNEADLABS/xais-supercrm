import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { OnboardingWizard } from "@/components/onboarding";

export default async function OnboardingPage() {
  // Double check : si deja onboarde, redirect dashboard
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .limit(1);

  if (membership && membership.length > 0) {
    const { data: tenantData } = await supabase
      .from("tenant_config")
      .select("config")
      .eq("organization_id", membership[0].organization_id)
      .limit(1);

    const config = tenantData?.[0]?.config as Record<string, unknown> | undefined;
    if (config?.onboarding_completed === true) {
      redirect("/dashboard");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-2xl">
        <OnboardingWizard />
      </div>
    </div>
  );
}
