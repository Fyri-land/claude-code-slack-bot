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

export async function extractTaskInfo(messages: ConversationMessage[]): Promise<{
  title: string;
  description: string;
  priority: string;
  app: string;
  type: string;
}> {
  const extractionPrompt = `Basé sur la conversation précédente, extrais les informations de la tâche au format JSON suivant. Réponds UNIQUEMENT avec le JSON, sans autre texte:

{
  "title": "[App] Écran : Description concise",
  "description": "La description complète en markdown",
  "priority": "Urgente|Élevée|Normale|Basse",
  "app": "App Technicien|App Propriétaire|Web Ingénieur|Web Propriétaire",
  "type": "Bug|Amélioration|Demande client"
}`;

  const apiMessages: Anthropic.MessageParam[] = [
    ...messages.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    })),
    {
      role: 'user' as const,
      content: extractionPrompt,
    },
  ];

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1500,
    system: 'Tu es un assistant qui extrait des informations structurées. Réponds uniquement en JSON valide.',
    messages: apiMessages,
  });

  const textContent = response.content.find(c => c.type === 'text');
  if (!textContent || textContent.type !== 'text') {
    throw new Error('Pas de réponse texte de Claude');
  }

  const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Pas de JSON dans la réponse');
  }

  return JSON.parse(jsonMatch[0]);
}