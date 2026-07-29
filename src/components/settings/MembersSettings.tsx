"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader, CardTitle, CardAction } from "@/components/ui/card";
import { useMembers, useUpdateMemberRole, useRemoveMember } from "@/lib/hooks/useMembers";
import { useApiKeys } from "@/lib/hooks/useApiKeys";
import { MemberInviteDialog } from "./MemberInviteDialog";
import type { MemberRole, OrganizationMember } from "@/types/database";

const ROLE_BADGE: Record<
  MemberRole,
  { label: string; variant: "default" | "secondary" | "outline" }
> = {
  admin: { label: "Admin", variant: "default" },
  member: { label: "Membre", variant: "secondary" },
  viewer: { label: "Lecteur", variant: "outline" },
};

const ROLES: MemberRole[] = ["admin", "member", "viewer"];

/**
 * Gestion des membres de l'organisation : liste, roles, invitation, suppression.
 */
export function MembersSettings() {
  const { data: members, isLoading } = useMembers();
  const { data: apiKeys } = useApiKeys();
  const updateRole = useUpdateMemberRole();
  const removeMember = useRemoveMember();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Comptes robot (bots API) : identifies par leur cle active — sans ce
  // marquage, un bot n'est qu'un UUID anonyme qu'un admin "nettoie" sans
  // savoir qu'il casse le bot (garde serveur equivalente dans memberService).
  const botLabelByUserId = new Map(
    (apiKeys ?? []).filter((k) => !k.revoked_at).map((k) => [k.robot_user_id, k.label]),
  );

  // Compter les admins pour proteger le dernier
  const adminCount = members?.filter((m: OrganizationMember) => m.role === "admin").length ?? 0;

  const isLastAdmin = (member: OrganizationMember) => member.role === "admin" && adminCount <= 1;

  const handleRoleChange = (memberId: string, role: MemberRole) => {
    updateRole.mutate({ memberId, role });
  };

  const handleDelete = (memberId: string) => {
    removeMember.mutate(memberId);
    setConfirmDeleteId(null);
  };

  if (isLoading) {
    return <MembersSkeleton />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Membres de l&apos;organisation</CardTitle>
        <CardAction>
          <Button onClick={() => setInviteOpen(true)}>Inviter un membre</Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Utilisateur</TableHead>
              <TableHead>Rôle</TableHead>
              <TableHead>Date d&apos;ajout</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {members?.map((member: OrganizationMember) => (
              <TableRow key={member.id}>
                <TableCell className="font-mono text-xs">
                  {member.user_id.slice(0, 8)}...
                  {botLabelByUserId.has(member.user_id) && (
                    <Badge variant="outline" className="ml-2 font-sans">
                      Bot · {botLabelByUserId.get(member.user_id)}
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={ROLE_BADGE[member.role].variant}>
                    {ROLE_BADGE[member.role].label}
                  </Badge>
                </TableCell>
                <TableCell>{new Date(member.created_at).toLocaleDateString("fr-FR")}</TableCell>
                <TableCell>
                  {botLabelByUserId.has(member.user_id) ? null : confirmDeleteId === member.id ? (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(member.id)}
                        disabled={removeMember.isPending}
                      >
                        {removeMember.isPending ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          "Confirmer"
                        )}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setConfirmDeleteId(null)}>
                        Annuler
                      </Button>
                    </div>
                  ) : (
                    <MemberActions
                      member={member}
                      isLastAdmin={isLastAdmin(member)}
                      onRoleChange={handleRoleChange}
                      onDelete={() => setConfirmDeleteId(member.id)}
                    />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>

      <MemberInviteDialog open={inviteOpen} onOpenChange={setInviteOpen} />
    </Card>
  );
}

// --- Sous-composant pour les actions d'un membre ---

interface MemberActionsProps {
  member: OrganizationMember;
  isLastAdmin: boolean;
  onRoleChange: (memberId: string, role: MemberRole) => void;
  onDelete: () => void;
}

function MemberActions({ member, isLastAdmin, onRoleChange, onDelete }: MemberActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuContent>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger disabled={isLastAdmin}>Changer le rôle</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {ROLES.map((role) => (
              <DropdownMenuItem
                key={role}
                disabled={role === member.role}
                onClick={() => onRoleChange(member.id, role)}
              >
                {ROLE_BADGE[role].label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" disabled={isLastAdmin} onClick={onDelete}>
          Supprimer
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MembersSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="h-5 w-48 animate-pulse rounded bg-muted" />
      </CardHeader>
      <CardContent className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-10 w-full animate-pulse rounded bg-muted" />
        ))}
      </CardContent>
    </Card>
  );
}
