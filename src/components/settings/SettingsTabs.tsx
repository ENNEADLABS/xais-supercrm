"use client";

import {
  Settings,
  GitBranch,
  Receipt,
  Users,
  Building,
  Palette,
  Trash2,
  KeyRound,
} from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCurrentRole } from "@/lib/hooks/useCurrentRole";
import { OrganizationSettings } from "./OrganizationSettings";
import { PipelineSettings } from "./PipelineSettings";
import { CommercialSettings } from "./CommercialSettings";
import { MembersSettings } from "./MembersSettings";
import { CompanyInfoSettings } from "./CompanyInfoSettings";
import { AppearanceSettings } from "./AppearanceSettings";
import { TrashSettings } from "./TrashSettings";
import { ApiKeysSettings } from "./ApiKeysSettings";

/**
 * Onglets principaux de la page Paramètres.
 */
export function SettingsTabs() {
  // Onglet Cles API reserve aux admins : sans ce gate, un non-admin voyait un
  // etat vide mensonger (fetchApiKeys echoue en requireAdmin cote serveur).
  const { data: role } = useCurrentRole();
  const isAdmin = role === "admin";

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Paramètres</h1>

      <Tabs defaultValue="organization">
        <TabsList>
          <TabsTrigger value="organization">
            <Settings className="size-4" />
            Organisation
          </TabsTrigger>
          <TabsTrigger value="pipeline">
            <GitBranch className="size-4" />
            Pipeline
          </TabsTrigger>
          <TabsTrigger value="commercial">
            <Receipt className="size-4" />
            Commercial
          </TabsTrigger>
          <TabsTrigger value="members">
            <Users className="size-4" />
            Membres
          </TabsTrigger>
          <TabsTrigger value="company">
            <Building className="size-4" />
            Société
          </TabsTrigger>
          <TabsTrigger value="appearance">
            <Palette className="size-4" />
            Apparence
          </TabsTrigger>
          <TabsTrigger value="trash">
            <Trash2 className="size-4" />
            Corbeille
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="api-keys">
              <KeyRound className="size-4" />
              Clés API
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="organization" className="mt-6">
          <OrganizationSettings />
        </TabsContent>
        <TabsContent value="pipeline" className="mt-6">
          <PipelineSettings />
        </TabsContent>
        <TabsContent value="commercial" className="mt-6">
          <CommercialSettings />
        </TabsContent>
        <TabsContent value="members" className="mt-6">
          <MembersSettings />
        </TabsContent>
        <TabsContent value="company" className="mt-6">
          <CompanyInfoSettings />
        </TabsContent>
        <TabsContent value="appearance" className="mt-6">
          <AppearanceSettings />
        </TabsContent>
        <TabsContent value="trash" className="mt-6">
          <TrashSettings />
        </TabsContent>
        {isAdmin && (
          <TabsContent value="api-keys" className="mt-6">
            <ApiKeysSettings />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
