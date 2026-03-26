import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

// Attach JWT from localStorage on every request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Redirect to login on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;

// ── Auth ──────────────────────────────────────────────────────────
export const authApi = {
  register: (email: string, password: string, display_name?: string) =>
    api.post('/api/auth/register', { email, password, display_name }),
  login: (email: string, password: string) =>
    api.post('/api/auth/login', { email, password }),
  me: () => api.get('/api/auth/me'),
  getMemory: () => api.get('/api/auth/memory'),
  clearMemory: () => api.delete('/api/auth/memory'),
};

// ── Conversations ─────────────────────────────────────────────────
export const conversationApi = {
  list: () => api.get('/api/conversations'),
  get: (id: string) => api.get(`/api/conversations/${id}`),
  delete: (id: string, saveMemory = true) =>
    api.delete(`/api/conversations/${id}?save_memory=${saveMemory}`),
};

// ── Streaming chat (SSE, not axios) ──────────────────────────────
export async function streamChat(
  message: string,
  conversationId: string | null,
  token: string,
  onToken: (token: string) => void,
  onConversationId: (id: string) => void,
  onDone: () => void,
  onError: (err: string) => void,
): Promise<void> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  const response = await fetch(`${apiUrl}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ message, conversation_id: conversationId }),
  });

  if (!response.ok) {
    onError(`Request failed: ${response.status}`);
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) { onError('No response stream'); return; }

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      try {
        const event = JSON.parse(line.slice(6));
        if (event.type === 'conversation_id') onConversationId(event.conversation_id);
        else if (event.type === 'token') onToken(event.content);
        else if (event.type === 'done') onDone();
        else if (event.type === 'error') onError(event.message);
      } catch {}
    }
  }
}
