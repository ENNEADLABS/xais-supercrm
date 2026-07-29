import { create } from "zustand";
import type { EmailFolder } from "@/types/email";

interface EmailStore {
  selectedEmailId: string | null;
  setSelectedEmailId: (id: string | null) => void;
  activeFolder: EmailFolder;
  setActiveFolder: (folder: EmailFolder) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  // Compose
  composeOpen: boolean;
  setComposeOpen: (open: boolean) => void;
  // Reply
  replyingTo: string | null;
  setReplyingTo: (emailId: string | null) => void;
  replyAll: boolean;
  setReplyAll: (all: boolean) => void;
}

export const useEmailStore = create<EmailStore>((set) => ({
  selectedEmailId: null,
  setSelectedEmailId: (id) => set({ selectedEmailId: id }),
  activeFolder: "inbox",
  setActiveFolder: (folder) => set({ activeFolder: folder, selectedEmailId: null }),
  searchQuery: "",
  setSearchQuery: (query) => set({ searchQuery: query }),
  composeOpen: false,
  setComposeOpen: (open) => set({ composeOpen: open }),
  replyingTo: null,
  setReplyingTo: (emailId) => set({ replyingTo: emailId }),
  replyAll: false,
  setReplyAll: (all) => set({ replyAll: all }),
}));
