'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { useChatStore } from '@/store/chatStore';
import { streamChat } from '@/lib/api';
import MessageBubble from './MessageBubble';
import { Send, Brain, BrainCircuit, Sparkles } from 'lucide-react';
import clsx from 'clsx';
import MemoryPanel from './MemoryPanel';

const SUGGESTED_PROMPTS = [
  'Summarize what we discussed last time',
  'Help me plan my week',
  'Explain async/await in Python',
  'Write a SQL query to find duplicates',
];

export default function ChatWindow() {
  const {
    activeConversationId, setActiveConversation,
    messages, appendMessage, appendToken, finalizeStreaming,
    upsertConversation, isStreaming, setIsStreaming, token,
  } = useChatStore();

  const [input, setInput] = useState('');
  const [showMemory, setShowMemory] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const activeMessages = activeConversationId ? (messages[activeConversationId] ?? []) : [];
  const isEmpty = activeMessages.length === 0;

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeMessages.length, activeMessages[activeMessages.length - 1]?.content]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 160) + 'px';
  }, [input]);

  const handleSend = useCallback(async (messageText?: string) => {
    const text = (messageText ?? input).trim();
    if (!text || isStreaming || !token) return;

    setInput('');
    setError('');

    // Determine conversation id - might be set mid-stream
    let conversationId = activeConversationId;

    // Optimistically add user message
    const tempConvoId = conversationId ?? `temp-${Date.now()}`;
    if (!conversationId) setActiveConversation(tempConvoId);

    appendMessage(tempConvoId, {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    });

    setIsStreaming(true);

    try {
      await streamChat(
        text,
        conversationId,
        token,
        // onToken
        (tok) => {
          const currentId = useChatStore.getState().activeConversationId;
          appendToken(currentId ?? tempConvoId, tok);
        },
        // onConversationId
        (id) => {
          // Replace temp id with real id
          const store = useChatStore.getState();
          const tempMsgs = store.messages[tempConvoId] ?? [];
          if (tempConvoId !== id) {
            store.setMessages(id, tempMsgs);
          }
          setActiveConversation(id);
          upsertConversation({ id, title: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
          conversationId = id;
        },
        // onDone
        () => {
          const currentId = useChatStore.getState().activeConversationId;
          if (currentId) finalizeStreaming(currentId);
          setIsStreaming(false);
        },
        // onError
        (err) => {
          setError(err);
          setIsStreaming(false);
        },
      );
    } catch (e: any) {
      setError(e.message ?? 'Stream failed');
      setIsStreaming(false);
    }
  }, [input, isStreaming, token, activeConversationId, appendMessage, appendToken, finalizeStreaming, setActiveConversation, setIsStreaming, upsertConversation]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-1 min-w-0 h-screen">
      {/* Main chat area */}
      <div className="flex flex-col flex-1 min-w-0">

        {/* Top bar */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <BrainCircuit className="w-5 h-5 text-teal-400" />
            <span className="text-sm font-medium text-gray-300">
              {activeConversationId ? 'Conversation' : 'New Chat'}
            </span>
          </div>
          <button
            onClick={() => setShowMemory(!showMemory)}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all duration-150',
              showMemory
                ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'
            )}
          >
            <Brain className="w-4 h-4" />
            <span>Memory</span>
          </button>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          {isEmpty ? (
            <div className="flex flex-col items-center justify-center h-full max-w-lg mx-auto text-center animate-fade-in">
              <div className="w-16 h-16 bg-teal-500/10 border border-teal-500/20 rounded-2xl flex items-center justify-center mb-5">
                <Sparkles className="w-7 h-7 text-teal-400" />
              </div>
              <h2 className="text-xl font-semibold text-gray-100 mb-2">What can I help with?</h2>
              <p className="text-gray-500 text-sm mb-8">I remember context from our past conversations to give you better, more personalized responses.</p>

              <div className="grid grid-cols-2 gap-2 w-full">
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => handleSend(prompt)}
                    className="text-left px-3 py-2.5 rounded-xl bg-gray-800/60 border border-gray-700/50
                               hover:border-teal-500/30 hover:bg-gray-800 text-sm text-gray-400
                               hover:text-gray-200 transition-all duration-150"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-5">
              {activeMessages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
              {error && (
                <div className="flex justify-center">
                  <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-2 rounded-lg">
                    {error}
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="px-4 pb-4 pt-2">
          <div className="max-w-3xl mx-auto">
            <div className={clsx(
              'flex items-end gap-2 bg-gray-800/80 border rounded-2xl px-4 py-3 transition-all duration-150',
              isStreaming ? 'border-teal-500/30' : 'border-gray-700/50 focus-within:border-teal-500/40'
            )}>
              <textarea
                ref={textareaRef}
                className="flex-1 bg-transparent text-gray-100 placeholder:text-gray-600 text-sm resize-none outline-none min-h-[24px] max-h-[160px] leading-relaxed"
                placeholder="Message AI Assistant... (Shift+Enter for new line)"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isStreaming}
                rows={1}
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || isStreaming}
                className={clsx(
                  'flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150',
                  input.trim() && !isStreaming
                    ? 'bg-teal-500 hover:bg-teal-600 text-white'
                    : 'bg-gray-700 text-gray-600 cursor-not-allowed'
                )}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="text-center text-xs text-gray-700 mt-2">
              AI can make mistakes · Check important information
            </p>
          </div>
        </div>
      </div>

      {/* Memory side panel */}
      {showMemory && (
        <aside className="w-80 shrink-0 border-l border-gray-800 bg-gray-900/80 animate-fade-in">
          <MemoryPanel onClose={() => setShowMemory(false)} />
        </aside>
      )}
    </div>
  );
}
