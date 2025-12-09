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

    const members = response.data.members;

    console.log('✅ Membres trouvés:\n');
    console.log('─'.repeat(60));

    members.forEach((member: any) => {
      const user = member.user;
      console.log(`Nom: ${user.username}`);
      console.log(`Email: ${user.email}`);
      console.log(`User ID: ${user.id}`);
      console.log(`Initiales: ${user.initials || 'N/A'}`);
      console.log('─'.repeat(60));
    });

    console.log('\n📋 Copiez ces informations pour créer votre userMapping.ts\n');
    console.log('Exemple de mapping:\n');
    console.log('export const userMapping: Record<string, number> = {');
    members.forEach((member: any) => {
      const user = member.user;
      const nameLower = user.username.toLowerCase();
      console.log(`  "${nameLower}": ${user.id},`);
    });
    console.log('};\n');

  } catch (error: any) {
    console.error('❌ Erreur lors de la récupération des membres:', error.response?.data || error.message);
    process.exit(1);
  }
}

fetchClickUpUsers();
