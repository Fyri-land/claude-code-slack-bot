export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  imageBase64?: string;
}

export interface ConversationState {
  messages: ConversationMessage[];
  imageUrl?: string;
}