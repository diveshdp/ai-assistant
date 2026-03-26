'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useChatStore } from '@/store/chatStore';

export default function HomePage() {
  const router = useRouter();
  const token = useChatStore((s) => s.token);

  useEffect(() => {
    if (token) {
      router.replace('/chat');
    } else {
      router.replace('/login');
    }
  }, [token, router]);

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-teal-500 border-t-transparent" />
    </div>
  );
}
