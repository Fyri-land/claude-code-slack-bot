import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'fs';
import * as path from 'path';
import { ConversationMessage } from './types';

// Charger le system prompt
const systemPromptPath = path.join(__dirname, '..', 'SYSTEM_PROMPT.md');
const SYSTEM_PROMPT = fs.readFileSync(systemPromptPath, 'utf-8');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export async function callClaude(messages: ConversationMessage[]): Promise<string> {
  const apiMessages: Anthropic.MessageParam[] = messages.map(msg => {
    if (msg.role === 'user' && msg.imageBase64) {
      return {
        role: 'user' as const,
        content: [
          {
            type: 'image' as const,
            source: {
              type: 'base64' as const,
              media_type: 'image/png' as const,
              data: msg.imageBase64,
            },
          },
          {
            type: 'text' as const,
            text: msg.content,
          },
        ],
      };
    }
    return {
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    };
  });

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    system: SYSTEM_PROMPT,
    messages: apiMessages,
  });

  const textContent = response.content.find(c => c.type === 'text');
  if (!textContent || textContent.type !== 'text') {
    throw new Error('Pas de réponse texte de Claude');
  }

  return textContent.text;
}