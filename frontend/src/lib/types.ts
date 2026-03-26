export interface User {
  id: string;
  email: string;
  display_name: string | null;
  created_at: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface Conversation {
  id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
  messages?: Message[];
}

export interface Memory {
  id: string;
  summary: string;
  created_at: string;
}

export interface StreamEvent {
  type: 'conversation_id' | 'token' | 'done' | 'error';
  content?: string;
  conversation_id?: string;
  message?: string;
}

export interface ApiError {
  detail: string;
}
