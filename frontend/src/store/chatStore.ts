import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Message, Conversation, User } from '@/lib/types';

interface ChatMessage extends Message {
  isStreaming?: boolean;
}

interface ChatStore {
  // Auth
  token: string | null;
  user: User | null;
  setAuth: (token: string, user: User) => void;
  clearAuth: () => void;

  // Conversations
  conversations: Conversation[];
  activeConversationId: string | null;
  setConversations: (convos: Conversation[]) => void;
  setActiveConversation: (id: string | null) => void;
  upsertConversation: (convo: Conversation) => void;
  removeConversation: (id: string) => void;

  // Messages (keyed by conversation id)
  messages: Record<string, ChatMessage[]>;
  setMessages: (conversationId: string, messages: Message[]) => void;
  appendMessage: (conversationId: string, message: ChatMessage) => void;
  appendToken: (conversationId: string, token: string) => void;
  finalizeStreaming: (conversationId: string) => void;

  // UI
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  isStreaming: boolean;
  setIsStreaming: (v: boolean) => void;
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      // Auth
      token: null,
      user: null,
      setAuth: (token, user) => set({ token, user }),
      clearAuth: () => set({ token: null, user: null, conversations: [], messages: {}, activeConversationId: null }),

      // Conversations
      conversations: [],
      activeConversationId: null,
      setConversations: (conversations) => set({ conversations }),
      setActiveConversation: (id) => set({ activeConversationId: id }),
      upsertConversation: (convo) =>
        set((s) => {
          const exists = s.conversations.find((c) => c.id === convo.id);
          if (exists) {
            return { conversations: s.conversations.map((c) => (c.id === convo.id ? { ...c, ...convo } : c)) };
          }
          return { conversations: [convo, ...s.conversations] };
        }),
      removeConversation: (id) =>
        set((s) => ({
          conversations: s.conversations.filter((c) => c.id !== id),
          activeConversationId: s.activeConversationId === id ? null : s.activeConversationId,
          messages: Object.fromEntries(Object.entries(s.messages).filter(([k]) => k !== id)),
        })),

      // Messages
      messages: {},
      setMessages: (conversationId, messages) =>
        set((s) => ({ messages: { ...s.messages, [conversationId]: messages } })),
      appendMessage: (conversationId, message) =>
        set((s) => ({
          messages: {
            ...s.messages,
            [conversationId]: [...(s.messages[conversationId] ?? []), message],
          },
        })),
      appendToken: (conversationId, token) =>
        set((s) => {
          const msgs = s.messages[conversationId] ?? [];
          const last = msgs[msgs.length - 1];
          if (last?.isStreaming) {
            return {
              messages: {
                ...s.messages,
                [conversationId]: [
                  ...msgs.slice(0, -1),
                  { ...last, content: last.content + token },
                ],
              },
            };
          }
          // Create streaming placeholder
          const placeholder: ChatMessage = {
            id: `streaming-${Date.now()}`,
            role: 'assistant',
            content: token,
            created_at: new Date().toISOString(),
            isStreaming: true,
          };
          return {
            messages: {
              ...s.messages,
              [conversationId]: [...msgs, placeholder],
            },
          };
        }),
      finalizeStreaming: (conversationId) =>
        set((s) => ({
          messages: {
            ...s.messages,
            [conversationId]: (s.messages[conversationId] ?? []).map((m) =>
              m.isStreaming ? { ...m, isStreaming: false } : m
            ),
          },
        })),

      // UI
      isSidebarOpen: true,
      toggleSidebar: () => set((s) => ({ isSidebarOpen: !s.isSidebarOpen })),
      isStreaming: false,
      setIsStreaming: (v) => set({ isStreaming: v }),
    }),
    {
      name: 'ai-assistant-store',
      partialize: (s) => ({ token: s.token, user: s.user }),
    }
  )
);
