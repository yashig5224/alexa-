import { create } from 'zustand';
import type { ChatMessage } from '../services/endpoints';

interface ChatStore {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  addMessage: (msg: ChatMessage) => void;
  setLoading: (v: boolean) => void;
  setError: (e: string | null) => void;
  clearMessages: () => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  messages: [],
  isLoading: false,
  error: null,
  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  clearMessages: () => set({ messages: [], error: null }),
}));

/* ── UI state (sidebar open/close, active project) ─────────── */

interface UIStore {
  sidebarOpen: boolean;
  activeProjectId: string | null;
  toggleSidebar: () => void;
  setActiveProject: (id: string | null) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  sidebarOpen: true,
  activeProjectId: null,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setActiveProject: (activeProjectId) => set({ activeProjectId }),
}));
