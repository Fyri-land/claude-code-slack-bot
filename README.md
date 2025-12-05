# Résumé du projet BacklogBot

## Objectif
Créer un bot Slack qui permet à l'équipe Fyri de signaler des bugs ou améliorations directement depuis Slack, avec création automatique de tâches bien structurées dans ClickUp.

## Comment ça fonctionne

1. Un membre de l'équipe mentionne @BacklogBot dans Slack avec une description du problème (+ screenshot optionnel)
2. Le bot analyse le message et demande les informations manquantes :

- Plateforme (App Techniciens, App Proprio, App Ingénieurs, Web Proprios, Web Ingénieurs)
- Type (Bug, Amélioration, Demande client)
- Priorité (Urgente, Élevée, Normale, Basse)
- OS si c'est une app (Android, iOS, MacOS, Windows)

3. Le bot propose un titre optimisé et une description structurée
4. L'utilisateur valide ("oui", "ok", "parfait", etc.)
5. La tâche est créée automatiquement dans ClickUp avec les tags appropriés et le screenshot attaché

## Architecture technique
Slack → Bot Node.js (Railway) → API Claude (analyse) + API ClickUp (création)

Composants :

- Slack App : Fyri Bug Reporter (socket mode)
- Hébergement : Railway (déploiement automatique via GitHub)
- IA : API Anthropic (Claude Sonnet)
- Backlog : API ClickUp

## Fichiers du projet
/
├── SYSTEM_PROMPT.md    ← Instructions du bot (modifiable facilement)
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts        ← Point d'entrée
    ├── types.ts        ← Types TypeScript
    ├── claude.ts       ← Appels API Claude
    ├── clickup.ts      ← Appels API ClickUp
    └── slack.ts        ← Handlers Slack

## Variables d'environnement (Railway)
VariableDescriptionSLACK_BOT_TOKENToken du bot Slack (xoxb-...)SLACK_APP_TOKENToken app-level Slack (xapp-...)SLACK_SIGNING_SECRETSecret de signature SlackANTHROPIC_API_KEYClé API AnthropicCLICKUP_API_KEYClé API ClickUpCLICKUP_LIST_IDID de la liste Backlog

## Modifier le comportement du bot
Pour ajuster les instructions, questions posées, format des réponses :

1. Modifier le fichier SYSTEM_PROMPT.md
2. Commit + push vers GitHub
3. Railway redéploie automatiquement

## Coûts estimés

- Railway : Inclus dans le plan existant
- Slack : Inclus dans le plan existant
- API Anthropic : ~0.01-0.03 USD par bug traité (~2-3 USD/mois pour 100 bugs)