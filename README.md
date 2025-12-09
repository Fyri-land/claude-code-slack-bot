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
- **Assigné à** (optionnel - ex: "Thomas", "PA", "Michael")

3. Le bot propose un titre optimisé et une description structurée
4. L'utilisateur valide ("oui", "ok", "parfait", etc.)
5. La tâche est créée automatiquement dans ClickUp avec :
   - Les tags appropriés
   - Le screenshot attaché (si présent)
   - **L'assignation automatique à la personne spécifiée** ✨

## Architecture technique
Slack → Bot Node.js (Railway) → API Claude (analyse) + API ClickUp (création)

Composants :

- Slack App : Fyri Bug Reporter (socket mode)
- Hébergement : Railway (déploiement automatique via GitHub)
- IA : API Anthropic (Claude Sonnet)
- Backlog : API ClickUp

## Fichiers du projet
/
├── SYSTEM_PROMPT.md        ← Instructions du bot (modifiable facilement)
├── package.json
├── tsconfig.json
├── scripts/
│   └── fetchClickUpUsers.ts  ← Script pour récupérer les User IDs ClickUp
└── src/
    ├── index.ts            ← Point d'entrée
    ├── types.ts            ← Types TypeScript
    ├── claude.ts           ← Appels API Claude
    ├── clickup.ts          ← Appels API ClickUp + gestion assignations
    ├── userMapping.ts      ← Mapping des alias de noms → User IDs ClickUp
    └── slack.ts            ← Handlers Slack

## Variables d'environnement (Railway)
VariableDescriptionSLACK_BOT_TOKENToken du bot Slack (xoxb-...)SLACK_APP_TOKENToken app-level Slack (xapp-...)SLACK_SIGNING_SECRETSecret de signature SlackANTHROPIC_API_KEYClé API AnthropicCLICKUP_API_KEYClé API ClickUpCLICKUP_LIST_IDID de la liste Backlog

## Fonctionnalité : Assignation automatique des tâches 🎯

### Comment ça marche

Le bot utilise un **système hybride** pour assigner automatiquement les tâches :

1. **Mapping manuel** (fichier `src/userMapping.ts`) :
   - Définit des alias pratiques pour chaque membre
   - Exemples : "thomas", "tom", "pa", "michael"
   - Recherche instantanée, pas d'appel API

2. **Fallback API ClickUp** :
   - Si le nom n'est pas dans le mapping, le bot cherche automatiquement dans ClickUp
   - Détecte automatiquement les nouveaux membres

### Exemples d'utilisation

```
User: Crée une tâche pour corriger ce bug, attribuer à Thomas
→ ✅ Assigne à Thomas Sebbane (via mapping)

User: Assigner à Pierre-Alexandre Hurtubise
→ ✅ Assigne via mapping OU API ClickUp

User: Attribuer à PA
→ ✅ Assigne à Pierre-Alexandre (via alias)
```

### Ajouter un nouveau membre

#### Option 1 : Automatique (aucune action requise)
Les nouveaux membres ClickUp sont automatiquement détectés via l'API.

#### Option 2 : Ajouter des alias pratiques
Modifiez `src/userMapping.ts` :

```typescript
export const userMapping: Record<string, number> = {
  // Membres existants...

  // Nouveau membre
  "marie": 123456789,
  "marie dupont": 123456789,
};
```

### Récupérer les User IDs ClickUp

Pour connaître les User IDs des membres actuels :

```bash
npm run fetch-users
```

Cette commande affiche tous les membres avec leurs IDs.

## Modifier le comportement du bot

Pour ajuster les instructions, questions posées, format des réponses :

1. Modifier le fichier `SYSTEM_PROMPT.md`
2. Commit + push vers GitHub
3. Railway redéploie automatiquement

## Coûts estimés

- Railway : Inclus dans le plan existant
- Slack : Inclus dans le plan existant
- API Anthropic : ~0.01-0.03 USD par bug traité (~2-3 USD/mois pour 100 bugs)

## Membres de l'équipe actuelle

- **Pierre-Alexandre Hurtubise** (ID: 82410153)
  - Alias : "pa", "pierre-alexandre", "pahurtubise"
- **Thomas Sebbane** (ID: 88305701)
  - Alias : "thomas", "tom", "tsebbane"
- **Michael Carpentier** (ID: 90285364)
  - Alias : "michael", "mike", "mcarpentier"