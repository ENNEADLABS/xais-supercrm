"use client";

import { useRouter } from "next/navigation";
import { Trash2, RefreshCw, Mail, Globe, Server } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AccountStatusBadge, ProviderCard } from "@/components/emails";
import {
  useConnectedAccounts,
  useDisconnectAccount,
  useTriggerSync,
} from "@/lib/hooks/useConnectedAccounts";
import { formatRelativeDate } from "@/components/crm/utils/format-date";

/** Page de gestion des comptes email connectes */
export default function EmailAccountsPage() {
  const router = useRouter();
  const { data: accounts, isLoading } = useConnectedAccounts();
  const disconnect = useDisconnectAccount();
  const triggerSync = useTriggerSync();

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Comptes email</h1>
        <p className="text-sm text-muted-foreground">
          Connectez vos comptes pour synchroniser vos emails.
        </p>
      </div>

      {/* Selection du provider */}
      <div className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Ajouter un compte</h2>
        <ProviderCard
          provider="gmail"
          name="Gmail"
          description="Connectez votre compte Google via OAuth"
          icon={Mail}
          available
          onConnect={() => router.push("/api/emails/oauth/google")}
        />
        <ProviderCard
          provider="microsoft"
          name="Microsoft 365"
          description="Outlook, Hotmail, comptes Microsoft"
          icon={Globe}
          available={false}
        />
        <ProviderCard
          provider="imap_smtp"
          name="IMAP / SMTP"
          description="Connexion directe a n'importe quel serveur email"
          icon={Server}
          available={false}
        />
      </div>

      {/* Liste des comptes connectes */}
      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg bg-muted/40" />
          ))}
        </div>
      )}

      {!isLoading &&
        accounts?.map((account) => (
          <Card key={account.id} className="flex items-center justify-between p-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">{account.email_address}</span>
                <AccountStatusBadge status={account.status} />
              </div>
              <div className="flex gap-3 text-xs text-muted-foreground">
                <span>Provider : {account.provider}</span>
                {account.last_sync_at && (
                  <span>Derniere sync : {formatRelativeDate(account.last_sync_at)}</span>
                )}
              </div>
              {account.sync_error && <p className="text-xs text-red-600">{account.sync_error}</p>}
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => triggerSync.mutate(account.id)}
                disabled={account.status !== "connected" || triggerSync.isPending}
                title="Synchroniser"
              >
                <RefreshCw className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => disconnect.mutate(account.id)}
                disabled={disconnect.isPending}
                title="Deconnecter"
              >
                <Trash2 className="size-4 text-red-500" />
              </Button>
            </div>
          </Card>
        ))}

      {!isLoading && (!accounts || accounts.length === 0) && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Aucun compte connecte. Utilisez les cartes ci-dessus pour commencer.
        </p>
      )}
    </div>
  );
}
