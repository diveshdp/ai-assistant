'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useChatStore } from '@/store/chatStore';
import Sidebar from '@/components/Sidebar';
import ChatWindow from '@/components/ChatWindow';

export default function ChatPage() {
  const router = useRouter();
  const token = useChatStore((s) => s.token);

  useEffect(() => {
    if (!token) router.replace('/login');
  }, [token, router]);

  if (!token) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-gray-950">
      <Sidebar />
      <ChatWindow />
    </div>
  );
}
