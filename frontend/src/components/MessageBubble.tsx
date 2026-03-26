'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Message } from '@/lib/types';
import clsx from 'clsx';
import { BrainCircuit, User } from 'lucide-react';

interface Props {
  message: Message & { isStreaming?: boolean };
}

export default function MessageBubble({ message }: Props) {
  const isUser = message.role === 'user';

  return (
    <div
      className={clsx(
        'flex gap-3 animate-slide-up',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      {/* Avatar */}
      <div
        className={clsx(
          'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
          isUser
            ? 'bg-teal-500/20 border border-teal-500/40'
            : 'bg-navy-500/30 border border-navy-500/40'
        )}
        style={!isUser ? { backgroundColor: 'rgba(27,58,92,0.4)', borderColor: 'rgba(27,58,92,0.6)' } : {}}
      >
        {isUser
          ? <User className="w-4 h-4 text-teal-400" />
          : <BrainCircuit className="w-4 h-4 text-blue-400" />
        }
      </div>

      {/* Bubble */}
      <div
        className={clsx(
          'max-w-[75%] rounded-2xl px-4 py-3',
          isUser
            ? 'bg-teal-500/15 border border-teal-500/20 text-gray-100 rounded-tr-sm'
            : 'bg-gray-800/80 border border-gray-700/50 rounded-tl-sm'
        )}
      >
        {isUser ? (
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className={clsx('prose-chat', message.isStreaming && message.content && 'streaming-cursor')}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content || ''}
            </ReactMarkdown>
            {message.isStreaming && !message.content && (
              <div className="flex gap-1 py-1">
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
