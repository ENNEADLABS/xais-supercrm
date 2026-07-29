import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  fetchCompanies,
  fetchCompany,
  createCompanyAction,
  updateCompanyAction,
  archiveCompanyAction,
} from "@/lib/actions/company";
import type {
  CreateCompanyInput,
  UpdateCompanyInput,
  CompanySearchInput,
} from "@/lib/schemas/company";

// --- Liste paginee des societes ---

export function useCompanies(params?: CompanySearchInput) {
  return useQuery({
    queryKey: ["companies", params],
    queryFn: () => fetchCompanies(params),
  });
}

// --- Detail d'une societe ---

export function useCompany(id: string | undefined) {
  return useQuery({
    queryKey: ["companies", id],
    queryFn: () => fetchCompany(id!),
    enabled: !!id,
  });
}

// --- Creation ---

export function useCreateCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateCompanyInput) => createCompanyAction(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      toast.success("Société créée");
    },
    onError: () => {
      toast.error("Erreur lors de la création de la société");
    },
  });
}

// --- Mise a jour ---

export function useUpdateCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ companyId, input }: { companyId: string; input: UpdateCompanyInput }) =>
      updateCompanyAction(companyId, input),
    onSuccess: (_data, { companyId }) => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      queryClient.invalidateQueries({ queryKey: ["companies", companyId] });
      toast.success("Société mise à jour");
    },
    onError: () => {
      toast.error("Erreur lors de la mise à jour de la société");
    },
  });
}

// --- Archivage ---

export function useArchiveCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (companyId: string) => archiveCompanyAction(companyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      toast.success("Société archivée");
    },
    onError: () => {
      toast.error("Erreur lors de l'archivage de la société");
    },
  });
}
