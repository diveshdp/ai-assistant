'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { conversationApi } from '@/lib/api';
import { useChatStore } from '@/store/chatStore';
import { Conversation } from '@/lib/types';
import {
  Plus, MessageSquare, Trash2, BrainCircuit, LogOut, ChevronLeft, ChevronRight
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';

export default function Sidebar() {
  const router = useRouter();
  const qc = useQueryClient();
  const {
    activeConversationId, setActiveConversation,
    setMessages, isSidebarOpen, toggleSidebar,
    clearAuth, removeConversation,
  } = useChatStore();

  const { data: conversations = [] } = useQuery<Conversation[]>({
    queryKey: ['conversations'],
    queryFn: async () => (await conversationApi.list()).data,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => conversationApi.delete(id, true),
    onSuccess: (_, id) => {
      removeConversation(id);
      qc.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  const handleSelectConversation = async (id: string) => {
    setActiveConversation(id);
    const res = await conversationApi.get(id);
    setMessages(id, res.data.messages);
  };

  const handleNewChat = () => {
    setActiveConversation(null);
  };

  const handleLogout = () => {
    clearAuth();
    localStorage.removeItem('token');
    router.push('/login');
  };

  return (
    <>
      {/* Sidebar */}
      <aside
        className={clsx(
          'flex flex-col bg-gray-900 border-r border-gray-800 transition-all duration-300 shrink-0',
          isSidebarOpen ? 'w-64' : 'w-14'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-gray-800">
          {isSidebarOpen && (
            <div className="flex items-center gap-2">
              <BrainCircuit className="w-5 h-5 text-teal-400 shrink-0" />
              <span className="text-sm font-semibold text-gray-100">AI Assistant</span>
            </div>
          )}
          <button onClick={toggleSidebar} className="btn-ghost ml-auto p-1.5">
            {isSidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>

        {/* New Chat */}
        <div className="p-2">
          <button
            onClick={handleNewChat}
            className={clsx(
              'flex items-center gap-2 w-full px-3 py-2 rounded-lg',
              'bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/20 hover:border-teal-500/40',
              'text-teal-400 text-sm font-medium transition-all duration-150'
            )}
            title="New chat"
          >
            <Plus className="w-4 h-4 shrink-0" />
            {isSidebarOpen && <span>New chat</span>}
          </button>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5">
          {conversations.map((convo) => (
            <div
              key={convo.id}
              onClick={() => handleSelectConversation(convo.id)}
              className={clsx(
                'group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all duration-150',
                activeConversationId === convo.id
                  ? 'bg-gray-700 text-gray-100'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
              )}
            >
              <MessageSquare className="w-4 h-4 shrink-0" />
              {isSidebarOpen && (
                <>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{convo.title || 'New conversation'}</p>
                    <p className="text-xs text-gray-600 truncate">
                      {formatDistanceToNow(new Date(convo.updated_at), { addSuffix: true })}
                    </p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(convo.id); }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:text-red-400 transition-all"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-2 border-t border-gray-800">
          <button
            onClick={handleLogout}
            className="btn-ghost w-full flex items-center gap-2 text-sm"
            title="Sign out"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {isSidebarOpen && <span>Sign out</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
