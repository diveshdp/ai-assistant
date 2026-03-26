'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useChatStore } from '@/store/chatStore';
import { authApi } from '@/lib/api';
import { BrainCircuit } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useChatStore((s) => s.setAuth);
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError('');
    setLoading(true);
    try {
      let token: string;
      if (isRegister) {
        const res = await authApi.register(email, password, displayName || undefined);
        token = res.data.access_token;
      } else {
        const res = await authApi.login(email, password);
        token = res.data.access_token;
      }
      localStorage.setItem('token', token);
      const meRes = await authApi.me();
      setAuth(token, meRes.data);
      router.push('/chat');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-teal-500/10 border border-teal-500/30 rounded-2xl mb-4">
            <BrainCircuit className="w-8 h-8 text-teal-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-100">AI Assistant</h1>
          <p className="text-gray-500 text-sm mt-1">Persistent memory · Powered by GPT-4o</p>
        </div>

        {/* Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
          <h2 className="text-lg font-semibold text-gray-100 mb-6">
            {isRegister ? 'Create account' : 'Welcome back'}
          </h2>

          <div className="space-y-4">
            {isRegister && (
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Display name</label>
                <input
                  className="input-field"
                  placeholder="Your name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>
            )}
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Email</label>
              <input
                className="input-field"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Password</label>
              <input
                className="input-field"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              />
            </div>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading || !email || !password}
            className="btn-primary w-full mt-6"
          >
            {loading ? 'Loading...' : isRegister ? 'Create account' : 'Sign in'}
          </button>

          <p className="text-center text-sm text-gray-500 mt-4">
            {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              onClick={() => { setIsRegister(!isRegister); setError(''); }}
              className="text-teal-400 hover:text-teal-300"
            >
              {isRegister ? 'Sign in' : 'Register'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
