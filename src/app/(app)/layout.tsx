import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { CommandPalette } from "@/components/search";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// Shell des pages authentifiées (sidebar + header). L'auth (redirect /login si
// pas de session) et le gate onboarding (redirect /onboarding si incomplet) sont
// gérés dans le middleware (updateSession) à partir de request.nextUrl.pathname —
// fiable, contrairement à un header x-pathname à propager.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userName = user?.user_metadata?.full_name as string | undefined;
  const userEmail = user?.email;

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header userName={userName} userEmail={userEmail} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
      <CommandPalette />
    </div>
  );
}
