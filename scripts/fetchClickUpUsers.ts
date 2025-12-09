import axios from 'axios';
import * as dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

const CLICKUP_API_KEY = process.env.CLICKUP_API_KEY;
const CLICKUP_LIST_ID = process.env.CLICKUP_LIST_ID;

async function fetchClickUpUsers() {
  if (!CLICKUP_API_KEY || !CLICKUP_LIST_ID) {
    console.error('❌ Erreur: CLICKUP_API_KEY ou CLICKUP_LIST_ID manquant dans .env');
    process.exit(1);
  }

  try {
    console.log('🔄 Récupération des membres ClickUp...\n');

    const response = await axios.get(
      `https://api.clickup.com/api/v2/list/${CLICKUP_LIST_ID}/member`,
      {
        headers: {
          'Authorization': CLICKUP_API_KEY,
        },
      }
    );

    // Debug: afficher la structure de la réponse
    console.log('📦 Structure de la réponse:', JSON.stringify(response.data, null, 2));

    const members = response.data.members;

    if (!members || members.length === 0) {
      console.log('⚠️  Aucun membre trouvé ou structure différente');
      console.log('Réponse complète:', response.data);
      return;
    }

    console.log('✅ Membres trouvés:\n');
    console.log('─'.repeat(60));

    members.forEach((member: any) => {
      const user = member.user || member;
      console.log(`Nom: ${user.username || user.name || 'N/A'}`);
      console.log(`Email: ${user.email || 'N/A'}`);
      console.log(`User ID: ${user.id}`);
      console.log(`Initiales: ${user.initials || 'N/A'}`);
      console.log('─'.repeat(60));
    });

    console.log('\n📋 Copiez ces informations pour créer votre userMapping.ts\n');
    console.log('Exemple de mapping:\n');
    console.log('export const userMapping: Record<string, number> = {');
    members.forEach((member: any) => {
      const user = member.user || member;
      const name = user.username || user.name || 'unknown';
      const nameLower = name.toLowerCase();
      console.log(`  "${nameLower}": ${user.id},`);
    });
    console.log('};\n');

  } catch (error: any) {
    console.error('❌ Erreur lors de la récupération des membres:', error.response?.data || error.message);
    process.exit(1);
  }
}

fetchClickUpUsers();
