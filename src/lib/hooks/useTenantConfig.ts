import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { fetchTenantConfig, fetchPipelineStages } from "@/lib/actions/tenantConfig";
import {
  updateCommercialConfigAction,
  updatePipelineConfigAction,
  updateCompanyInfoAction,
} from "@/lib/actions/settings";
import type {
  CommercialConfigInput,
  CompanyInfoInput,
  PipelineStageInput,
} from "@/lib/schemas/settings";

// --- Configuration du tenant (staleTime long car change rarement) ---

export function useTenantConfig() {
  return useQuery({
    queryKey: ["tenant-config"],
    queryFn: () => fetchTenantConfig(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// --- Stages du pipeline ---

export function usePipelineStages() {
  return useQuery({
    queryKey: ["pipeline-stages"],
    queryFn: () => fetchPipelineStages(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// --- Mise a jour de la config commerciale ---

export function useUpdateCommercialConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CommercialConfigInput) => updateCommercialConfigAction(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-config"] });
      toast.success("Configuration commerciale mise à jour");
    },
    onError: () => {
      toast.error("Erreur lors de la mise à jour de la configuration commerciale");
    },
  });
}

// --- Mise a jour du pipeline ---

export function useUpdatePipelineConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      stages,
      probabilityMap,
    }: {
      stages: PipelineStageInput[];
      probabilityMap: Record<string, number>;
    }) => updatePipelineConfigAction(stages, probabilityMap),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-config"] });
      queryClient.invalidateQueries({ queryKey: ["pipeline-stages"] });
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      toast.success("Pipeline mis à jour");
    },
    onError: () => {
      toast.error("Erreur lors de la mise à jour du pipeline");
    },
  });
}

// --- Mise a jour des informations societe ---

export function useUpdateCompanyInfo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CompanyInfoInput) => updateCompanyInfoAction(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-config"] });
      toast.success("Informations société mises à jour");
    },
    onError: () => {
      toast.error("Erreur lors de la mise à jour des informations société");
    },
  });
}
