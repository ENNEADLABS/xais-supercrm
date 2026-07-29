import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  fetchContentPieces,
  fetchBoardPieces,
  fetchContentPiece,
  createContentPieceAction,
  convertIdeaAction,
  updateContentPieceAction,
  moveContentPieceAction,
  deleteContentPieceAction,
  blockPieceAction,
  unblockPieceAction,
  validatePieceAction,
} from "@/lib/actions/content";
import type {
  CreateContentPieceInput,
  UpdateContentPieceInput,
  MoveContentPieceInput,
  ConvertIdeaInput,
  ContentPieceSearchInput,
  UpdateBlockedInput,
} from "@/lib/schemas/content";
import type { BoardPiece } from "@/types/database";

const BOARD_KEY = ["content-pieces", "board"] as const;

// --- Liste paginee ---

export function useContentPieces(params?: ContentPieceSearchInput) {
  return useQuery({
    queryKey: ["content-pieces", params],
    queryFn: () => fetchContentPieces(params),
  });
}

// --- Board (liste plate, groupee par statut au render) ---

export function useBoardPieces() {
  return useQuery({
    queryKey: BOARD_KEY,
    queryFn: () => fetchBoardPieces(),
  });
}

// --- Detail ---

export function useContentPiece(id: string | undefined) {
  return useQuery({
    queryKey: ["content-pieces", id],
    queryFn: () => fetchContentPiece(id!),
    enabled: !!id,
  });
}

// --- Creation ---

export function useCreateContentPiece() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateContentPieceInput) => createContentPieceAction(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content-pieces"] });
      toast.success("Contenu créé");
    },
    onError: () => toast.error("Erreur lors de la création du contenu"),
  });
}

// --- Conversion idee -> contenu ---

export function useConvertIdea() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ConvertIdeaInput) => convertIdeaAction(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content-pieces"] });
      queryClient.invalidateQueries({ queryKey: ["content-ideas"] });
      toast.success("Idée convertie en contenu");
    },
    onError: () => toast.error("Erreur lors de la conversion"),
  });
}

// --- Mise a jour ---

export function useUpdateContentPiece() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ pieceId, input }: { pieceId: string; input: UpdateContentPieceInput }) =>
      updateContentPieceAction(pieceId, input),
    onSuccess: (_data, { pieceId }) => {
      queryClient.invalidateQueries({ queryKey: ["content-pieces"] });
      queryClient.invalidateQueries({ queryKey: ["content-pieces", pieceId] });
      toast.success("Contenu mis à jour");
    },
    onError: () => toast.error("Erreur lors de la mise à jour du contenu"),
  });
}

// --- Deplacement kanban (optimistic, liste plate) ---

export function useMoveContentPiece() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ pieceId, input }: { pieceId: string; input: MoveContentPieceInput }) =>
      moveContentPieceAction(pieceId, input),
    onMutate: async ({ pieceId, input }) => {
      await queryClient.cancelQueries({ queryKey: BOARD_KEY });
      const previous = queryClient.getQueryData<BoardPiece[]>(BOARD_KEY);

      queryClient.setQueryData<BoardPiece[]>(BOARD_KEY, (old) => {
        if (!old) return old;
        return old.map((piece) =>
          piece.id === pieceId
            ? { ...piece, status: input.status, position: input.position }
            : piece,
        );
      });

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(BOARD_KEY, context.previous);
      }
      toast.error("Erreur lors du déplacement");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["content-pieces"] });
    },
  });
}

// --- Blocage / validation ---

function useInvalidatePieces() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["content-pieces"] });
}

export function useBlockPiece() {
  const invalidate = useInvalidatePieces();
  return useMutation({
    mutationFn: ({ pieceId, input }: { pieceId: string; input: UpdateBlockedInput }) =>
      blockPieceAction(pieceId, input),
    onSuccess: () => {
      invalidate();
      toast.success("Contenu marqué comme bloqué");
    },
    onError: () => toast.error("Erreur lors du blocage"),
  });
}

export function useUnblockPiece() {
  const invalidate = useInvalidatePieces();
  return useMutation({
    mutationFn: (pieceId: string) => unblockPieceAction(pieceId),
    onSuccess: () => {
      invalidate();
      toast.success("Contenu débloqué");
    },
    onError: () => toast.error("Erreur lors du déblocage"),
  });
}

export function useValidatePiece() {
  const invalidate = useInvalidatePieces();
  return useMutation({
    mutationFn: (pieceId: string) => validatePieceAction(pieceId),
    onSuccess: () => {
      invalidate();
      toast.success("Contenu validé");
    },
    onError: () => toast.error("Erreur lors de la validation"),
  });
}

// --- Suppression ---

export function useDeleteContentPiece() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (pieceId: string) => deleteContentPieceAction(pieceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content-pieces"] });
      toast.success("Contenu supprimé");
    },
    onError: () => toast.error("Erreur lors de la suppression du contenu"),
  });
}
