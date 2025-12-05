import { App } from '@slack/bolt';
import { setupHandlers } from './slack';

// Vérifier la configuration
const requiredEnvVars = [
  'SLACK_BOT_TOKEN',
  'SLACK_APP_TOKEN',
  'SLACK_SIGNING_SECRET',
  'ANTHROPIC_API_KEY',
  'CLICKUP_API_KEY',
  'CLICKUP_LIST_ID',
];

const missing = requiredEnvVars.filter(v => !process.env[v]);
if (missing.length > 0) {
  console.error('Variables d\'environnement manquantes:', missing.join(', '));
  process.exit(1);
}

// Initialiser l'app Slack
const app = new App({
  token: process.env.SLACK_BOT_TOKEN!,
  appToken: process.env.SLACK_APP_TOKEN!,
  signingSecret: process.env.SLACK_SIGNING_SECRET!,
  socketMode: true,
});

// Configurer les handlers
setupHandlers(app);

// Démarrer
(async () => {
  await app.start();
  console.log('Bot Fyri Backlog démarré!');
})();