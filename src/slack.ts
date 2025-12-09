import { App } from '@slack/bolt';
import axios from 'axios';
import { ConversationState } from './types';
import { callClaude } from './claude';
import { createTask } from './clickup';

// Store des conversations par thread
const conversations = new Map<string, ConversationState>();

function getThreadKey(channel: string, threadTs: string): string {
  return `${channel}:${threadTs}`;
}

async function downloadSlackFile(url: string, token: string): Promise<Buffer> {
  const response = await axios.get(url, {
    headers: { 'Authorization': `Bearer ${token}` },
    responseType: 'arraybuffer',
  });
  return Buffer.from(response.data);
}

// Parse le marqueur [CREATE_TASK] dans la réponse de Claude
function parseCreateTaskMarker(response: string): {
  hasMarker: boolean;
  title?: string;
  priority?: string;
  type?: string;
  platform?: string;
  os?: string;
  assignee?: string;
  description?: string;
  cleanResponse: string;
} {
  const markerRegex = /\[CREATE_TASK\]\s*\n([\s\S]*?)\[\/CREATE_TASK\]/;
  const match = response.match(markerRegex);

  if (!match) {
    return { hasMarker: false, cleanResponse: response };
  }

  const markerContent = match[1];

  // Parser les champs
  const titleMatch = markerContent.match(/title:\s*(.+?)(?:\n|$)/);
  const priorityMatch = markerContent.match(/priority:\s*(.+?)(?:\n|$)/);
  const typeMatch = markerContent.match(/type:\s*(.+?)(?:\n|$)/);
  const platformMatch = markerContent.match(/platform:\s*(.+?)(?:\n|$)/);
  const osMatch = markerContent.match(/os:\s*(.+?)(?:\n|$)/);
  const assigneeMatch = markerContent.match(/assignee:\s*(.+?)(?:\n|$)/);
  const descriptionMatch = markerContent.match(/description:\s*([\s\S]*?)$/);

  // Retirer le marqueur de la réponse
  const cleanResponse = response.replace(markerRegex, '').trim();

  return {
    hasMarker: true,
    title: titleMatch ? titleMatch[1].trim() : undefined,
    priority: priorityMatch ? priorityMatch[1].trim() : undefined,
    type: typeMatch ? typeMatch[1].trim().toLowerCase() : undefined,
    platform: platformMatch ? platformMatch[1].trim().toLowerCase() : undefined,
    os: osMatch ? osMatch[1].trim().toLowerCase() : undefined,
    assignee: assigneeMatch ? assigneeMatch[1].trim() : undefined,
    description: descriptionMatch ? descriptionMatch[1].trim() : undefined,
    cleanResponse,
  };
}

async function handleMessage(
  app: App,
  channel: string,
  threadTs: string,
  userText: string,
  files: any[] | undefined,
  say: any
) {
  const threadKey = getThreadKey(channel, threadTs);
  const token = process.env.SLACK_BOT_TOKEN!;

  // Récupérer ou créer la conversation
  let conversation = conversations.get(threadKey);
  if (!conversation) {
    conversation = { messages: [] };
    conversations.set(threadKey, conversation);
  }

  // Télécharger l'image si présente
  let imageBase64: string | undefined;

  if (files && files.length > 0) {
    const imageFile = files.find(f =>
      f.mimetype?.startsWith('image/') ||
      ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(f.filetype)
    );

    if (imageFile) {
      try {
        const imageBuffer = await downloadSlackFile(imageFile.url_private, token);
        imageBase64 = imageBuffer.toString('base64');
        conversation.imageUrl = imageFile.url_private;
      } catch (error) {
        console.error('Erreur téléchargement image:', error);
      }
    }
  }

  // Ajouter le message à la conversation
  conversation.messages.push({
    role: 'user',
    content: userText,
    imageBase64: imageBase64,
  });

  try {
    // Appeler Claude
    const response = await callClaude(conversation.messages);

    // Vérifier si Claude a inclus le marqueur de création
    const parsed = parseCreateTaskMarker(response);

    // Ajouter la réponse (nettoyée) à la conversation
    conversation.messages.push({
      role: 'assistant',
      content: parsed.cleanResponse,
    });

    // Envoyer la réponse nettoyée à Slack
    await say({
      text: parsed.cleanResponse,
      thread_ts: threadTs,
    });

    // Si le marqueur est présent, créer la tâche
    if (parsed.hasMarker && parsed.title && parsed.description) {
      try {
        // Récupérer l'image si stockée
        let imgBuffer: Buffer | undefined;
        if (conversation.imageUrl) {
          try {
            imgBuffer = await downloadSlackFile(conversation.imageUrl, token);
          } catch (e) {
            console.error('Erreur re-téléchargement image:', e);
          }
        }

        // Créer la tâche ClickUp
        const task = await createTask(
          parsed.title,
          parsed.description,
          parsed.priority || 'Normale',
          parsed.type,
          parsed.platform,
          parsed.os,
          parsed.assignee,
          imgBuffer
        );

        await say({
          text: `Tâche créée : ${task.url}`,
          thread_ts: threadTs,
        });

        // Nettoyer la conversation
        conversations.delete(threadKey);
      } catch (error: any) {
        console.error('Erreur création tâche:', error);
        await say({
          text: `Erreur lors de la création : ${error.message}`,
          thread_ts: threadTs,
        });
      }
    }
  } catch (error: any) {
    console.error('Erreur Claude:', error);
    await say({
      text: `Erreur : ${error.message}`,
      thread_ts: threadTs,
    });
  }
}

export function setupHandlers(app: App) {
  // Mention du bot
  app.event('app_mention', async ({ event, say }) => {
    const text = event.text.replace(/<@[^>]+>/g, '').trim();
    const threadTs = event.thread_ts || event.ts;
    const files = (event as any).files;

    await handleMessage(app, event.channel, threadTs, text, files, say);
  });

  // Messages dans un thread existant (sans mention)
  app.event('message', async ({ event, say }) => {
    if ((event as any).bot_id) return;

    const threadTs = (event as any).thread_ts;
    if (!threadTs) return;

    const threadKey = getThreadKey(event.channel, threadTs);
    if (!conversations.has(threadKey)) return;

    const text = (event as any).text || '';
    const files = (event as any).files;

    await handleMessage(app, event.channel, threadTs, text, files, say);
  });
}