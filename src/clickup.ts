import axios from 'axios';
import FormData from 'form-data';

const CLICKUP_API_KEY = process.env.CLICKUP_API_KEY!;
const CLICKUP_LIST_ID = process.env.CLICKUP_LIST_ID!;

const priorityMap: Record<string, number> = {
  'Urgente': 1,
  'Élevée': 2,
  'Normale': 3,
  'Basse': 4,
};

export async function createTask(
  title: string,
  description: string,
  priority: string,
  type?: string,
  platform?: string,
  os?: string,
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

  // Créer la tâche
  const response = await axios.post(
    `https://api.clickup.com/api/v2/list/${CLICKUP_LIST_ID}/task`,
    {
      name: title,
      description: description,
      priority: priorityMap[priority] || 3,
      tags: tags,
    },
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