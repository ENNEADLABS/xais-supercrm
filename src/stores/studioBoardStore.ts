import { create } from "zustand";

// Etat UI du board editorial (drag & drop).
// L'etat serveur reste dans TanStack Query ; ce store ne porte que l'UI ephemere.
interface StudioBoardStore {
  draggedPieceId: string | null;
  dragOverStatus: string | null;
  setDragged: (pieceId: string | null) => void;
  setDragOver: (status: string | null) => void;
  reset: () => void;
}

export const useStudioBoardStore = create<StudioBoardStore>((set) => ({
  draggedPieceId: null,
  dragOverStatus: null,
  setDragged: (pieceId) => set({ draggedPieceId: pieceId }),
  setDragOver: (status) => set({ dragOverStatus: status }),
  reset: () => set({ draggedPieceId: null, dragOverStatus: null }),
}));
