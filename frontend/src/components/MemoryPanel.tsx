'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from '@/lib/api';
import { Memory } from '@/lib/types';
import { Brain, Trash2, X, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import clsx from 'clsx';

interface Props {
  onClose: () => void;
}

export default function MemoryPanel({ onClose }: Props) {
  const qc = useQueryClient();

  const { data: memories = [], isLoading } = useQuery<Memory[]>({
    queryKey: ['memories'],
    queryFn: async () => (await authApi.getMemory()).data,
  });

  const clearMutation = useMutation({
    mutationFn: () => authApi.clearMemory(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['memories'] }),
  });

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-teal-400" />
          <span className="text-sm font-semibold text-gray-100">Memory</span>
          <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">
            {memories.length}
          </span>
        </div>
        <button onClick={onClose} className="btn-ghost p-1">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Info */}
      <div className="px-4 py-3 bg-teal-500/5 border-b border-gray-800">
        <p className="text-xs text-gray-500 leading-relaxed">
          Memory summaries are automatically generated from your conversations and used to personalize future responses. Stored in Redis (30-day TTL) and PostgreSQL.
        </p>
      </div>

      {/* Memory list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-5 h-5 text-gray-600 animate-spin" />
          </div>
        ) : memories.length === 0 ? (
          <div className="text-center py-10">
            <Brain className="w-10 h-10 text-gray-700 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No memories yet.</p>
            <p className="text-xs text-gray-600 mt-1">
              Memory is built from your conversations.
            </p>
          </div>
        ) : (
          memories.map((memory, i) => (
            <div
              key={memory.id}
              className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-3 animate-fade-in"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="text-xs font-medium text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded-full">
                  Memory #{memories.length - i}
                </span>
                <span className="text-xs text-gray-600">
                  {formatDistanceToNow(new Date(memory.created_at), { addSuffix: true })}
                </span>
              </div>
              <p className="text-sm text-gray-300 leading-relaxed">{memory.summary}</p>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      {memories.length > 0 && (
        <div className="p-4 border-t border-gray-800">
          <button
            onClick={() => clearMutation.mutate()}
            disabled={clearMutation.isPending}
            className="flex items-center gap-2 w-full justify-center px-4 py-2 rounded-lg
                       border border-red-500/30 text-red-400 hover:bg-red-500/10
                       text-sm transition-all duration-150 disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            {clearMutation.isPending ? 'Clearing...' : 'Clear all memory'}
          </button>
        </div>
      )}
    </div>
  );
}
