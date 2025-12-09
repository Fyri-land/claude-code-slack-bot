import axios from 'axios';
import FormData from 'form-data';
import { userMapping, normalizeName } from './userMapping';

const CLICKUP_API_KEY = process.env.CLICKUP_API_KEY!;
const CLICKUP_LIST_ID = process.env.CLICKUP_LIST_ID!;

const priorityMap: Record<string, number> = {
  'Urgente': 1,
  'Élevée': 2,
  'Normale': 3,
  'Basse': 4,
};

/**
 * Récupère le User ID ClickUp à partir d'un nom
 * Stratégie hybride:
 * 1. Cherche d'abord dans le mapping manuel (userMapping.ts)
 * 2. Si non trouvé, fait un appel API ClickUp pour chercher le nom exact
 *
 * @param name - Le nom de l'utilisateur (ex: "Thomas", "thomas sebbane", "PA")
 * @returns Le User ID ClickUp ou null si non trouvé
 */
export async function getUserIdByName(name: string): Promise<number | null> {
  // Normaliser le nom de recherche
  const normalizedName = normalizeName(name);

  // 1. Chercher dans le mapping manuel
  if (userMapping[normalizedName]) {
    console.log(`✅ Utilisateur trouvé dans le mapping: ${name} → ${userMapping[normalizedName]}`);
    return userMapping[normalizedName];
  }

  // 2. Fallback: chercher via l'API ClickUp
  try {
    console.log(`🔍 Recherche de l'utilisateur dans ClickUp API: ${name}`);

    const response = await axios.get(
      `https://api.clickup.com/api/v2/list/${CLICKUP_LIST_ID}/member`,
      {
        headers: {
          'Authorization': CLICKUP_API_KEY,
        },
      }
    );

    const members = response.data.members;

    // Chercher une correspondance exacte (case-insensitive)
    for (const member of members) {
      const memberName = normalizeName(member.username);

      if (memberName === normalizedName || memberName.includes(normalizedName)) {
        console.log(`✅ Utilisateur trouvé via API: ${member.username} → ${member.id}`);
        return member.id;
      }
    }

    console.log(`⚠️  Utilisateur non trouvé: ${name}`);
    return null;

  } catch (error: any) {
    console.error('❌ Erreur lors de la recherche utilisateur:', error.response?.data || error.message);
    return null;
  }
}

export async function createTask(
  title: string,
  description: string,
  priority: string,
  type?: string,
  platform?: string,
  os?: string,
  assigneeName?: string,
  imageBuffer?: Buffer
): Promise<{ id: string; url: string }> {
  // Construire la liste des tags
  const tags: string[] = [];

  if (type) {
    tags.push(type); // bug, amélioration, demande client
  }

  if (platform) {
    tags.push(platform); // app techniciens, app proprio, app ingénieurs, web proprios, web ingénieurs
  }

  if (os && os !== 'none') {
    tags.push(os); // android, iOS, MacOS, Windows
  }

  // Récupérer le User ID si un assignee est spécifié
  let assigneeId: number | null = null;
  if (assigneeName) {
    assigneeId = await getUserIdByName(assigneeName);
    if (!assigneeId) {
      console.warn(`⚠️  Impossible de trouver l'utilisateur: ${assigneeName}. Tâche créée sans assignation.`);
    }
  }

  // Construire le body de la requête
  const taskData: any = {
    name: title,
    description: description,
    priority: priorityMap[priority] || 3,
    tags: tags,
  };

  // Ajouter les assignees si trouvé
  if (assigneeId) {
    taskData.assignees = [assigneeId];
  }

  // Créer la tâche
  const response = await axios.post(
    `https://api.clickup.com/api/v2/list/${CLICKUP_LIST_ID}/task`,
    taskData,
    {
      headers: {
        'Authorization': CLICKUP_API_KEY,
        'Content-Type': 'application/json',
      },
    }
  );

  const task = response.data;

  // Attacher l'image si présente
  if (imageBuffer) {
    try {
      const form = new FormData();
      form.append('attachment', imageBuffer, {
        filename: 'screenshot.png',
        contentType: 'image/png',
      });

      await axios.post(
        `https://api.clickup.com/api/v2/task/${task.id}/attachment`,
        form,
        {
          headers: {
            'Authorization': CLICKUP_API_KEY,
            ...form.getHeaders(),
          },
        }
      );
    } catch (error) {
      console.error('Erreur upload image vers ClickUp:', error);
    }
  }

  return {
    id: task.id,
    url: task.url,
  };
}