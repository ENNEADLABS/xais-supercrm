import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  fetchMembers,
  addMemberAction,
  updateMemberRoleAction,
  removeMemberAction,
} from "@/lib/actions/settings";
import type { MemberRole } from "@/types/database";

// --- Liste des membres ---

export function useMembers() {
  return useQuery({
    queryKey: ["members"],
    queryFn: () => fetchMembers(),
  });
}

// --- Ajout d'un membre ---

export function useAddMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: MemberRole }) =>
      addMemberAction(userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
      toast.success("Membre ajouté");
    },
    onError: () => {
      toast.error("Erreur lors de l'ajout du membre");
    },
  });
}

// --- Modification du role ---

export function useUpdateMemberRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: MemberRole }) =>
      updateMemberRoleAction(memberId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
      toast.success("Rôle modifié");
    },
    onError: () => {
      toast.error("Erreur lors de la modification du rôle");
    },
  });
}

// --- Suppression d'un membre ---

export function useRemoveMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (memberId: string) => removeMemberAction(memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
      toast.success("Membre supprimé");
    },
    onError: () => {
      toast.error("Erreur lors de la suppression du membre");
    },
  });
}
