import { App } from '@slack/bolt';
import axios from 'axios';
import { ConversationState } from './types';
import { callClaude, extractTaskInfo } from './claude';
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

function isValidationMessage(text: string): boolean {
  const validationPatterns = [
    /^ok$/i,
    /^go$/i,
    /^oui$/i,
    /^yes$/i,
    /^crée/i,
    /^créer/i,
    /^create/i,
    /^valide/i,
    /^confirme/i,
    /^c'est bon/i,
    /^parfait/i,
    /✅/,
    /👍/,
  ];
  return validationPatterns.some(pattern => pattern.test(text.trim()));
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

  // Vérifier si c'est une validation
  if (isValidationMessage(userText) && conversation.messages.length > 0) {
    try {
      await say({
        text: 'Création de la tâche en cours...',
        thread_ts: threadTs,
      });

      // Extraire les infos de la tâche
      const taskInfo = await extractTaskInfo(conversation.messages);

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
        taskInfo.title,
        taskInfo.description,
        taskInfo.priority,
        imgBuffer
      );

      await say({
        text: `Tâche créée : ${task.url}`,
        thread_ts: threadTs,
      });

      // Nettoyer la conversation
      conversations.delete(threadKey);
      return;
    } catch (error: any) {
      console.error('Erreur création tâche:', error);
      await say({
        text: `Erreur lors de la création : ${error.message}`,
        thread_ts: threadTs,
      });
      return;
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

    // Ajouter la réponse à la conversation
    conversation.messages.push({
      role: 'assistant',
      content: response,
    });

    // Envoyer la réponse
    await say({
      text: response,
      thread_ts: threadTs,
    });
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