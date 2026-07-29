"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useAddMember } from "@/lib/hooks/useMembers";
import { inviteMemberSchema, type InviteMemberInput } from "@/lib/schemas/settings";
import type { MemberRole } from "@/types/database";

const ROLES: { value: MemberRole; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "member", label: "Membre" },
  { value: "viewer", label: "Lecteur" },
];

interface MemberInviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Dialog d'invitation d'un nouveau membre (V1 simplifiee : email direct).
 */
export function MemberInviteDialog({ open, onOpenChange }: MemberInviteDialogProps) {
  const addMember = useAddMember();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InviteMemberInput>({
    resolver: zodResolver(inviteMemberSchema),
    defaultValues: { email: "", role: "member" },
  });

  const onSubmit = (data: InviteMemberInput) => {
    // V1 : on passe l'email comme userId (sera remplace par un lookup plus tard)
    addMember.mutate(
      { userId: data.email, role: data.role },
      {
        onSuccess: () => {
          reset();
          onOpenChange(false);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Inviter un membre</DialogTitle>
          <DialogDescription>L&apos;utilisateur doit déjà avoir un compte.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="invite-email">Email</Label>
            <Input
              id="invite-email"
              type="email"
              placeholder="membre@example.com"
              {...register("email")}
            />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="invite-role">Rôle</Label>
            <select
              id="invite-role"
              {...register("role")}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
            {errors.role && <p className="text-sm text-destructive">{errors.role.message}</p>}
          </div>

          <DialogFooter>
            <Button type="submit" disabled={addMember.isPending}>
              {addMember.isPending && <Loader2 className="size-4 animate-spin" />}
              Inviter
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
