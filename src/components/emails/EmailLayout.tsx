"use client";

import { PenSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEmailStore } from "@/stores/emailStore";
import { EmailSidebar } from "./EmailSidebar";
import { EmailList } from "./EmailList";
import { EmailReader } from "./EmailReader";
import { ComposeDialog } from "./ComposeDialog";

/** Layout 3 colonnes pour la page emails */
export function EmailLayout() {
  const { setComposeOpen } = useEmailStore();

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* Sidebar dossiers — masquee sur mobile */}
      <div className="hidden lg:block">
        <div className="p-2">
          <Button className="w-full" onClick={() => setComposeOpen(true)}>
            <PenSquare className="mr-1.5 size-4" />
            Nouveau
          </Button>
        </div>
        <EmailSidebar />
      </div>

      {/* Liste emails */}
      <div className="w-full lg:w-96">
        <EmailList />
      </div>

      {/* Lecteur email — masque sur mobile */}
      <div className="hidden flex-1 lg:flex">
        <EmailReader />
      </div>

      {/* Modale de composition */}
      <ComposeDialog />
    </div>
  );
}
