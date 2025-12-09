/**
 * Mapping manuel des alias de noms vers les User IDs ClickUp
 *
 * Ce fichier permet de définir des raccourcis et variations de noms
 * pour faciliter l'attribution de tâches via Slack.
 *
 * Si un nom n'est pas trouvé ici, le système cherchera automatiquement
 * dans l'API ClickUp en utilisant le nom exact.
 *
 * Exemples d'utilisation dans Slack:
 * - "Attribuer à Thomas" → trouve Thomas Sebbane
 * - "Attribuer à PA" → trouve Pierre-Alexandre Hurtubise
 * - "Attribuer à Michael Carpentier" → trouve via ce mapping OU via API
 */

export const userMapping: Record<string, number> = {
  // Pierre-Alexandre Hurtubise
  "pierre-alexandre hurtubise": 82410153,
  "pierre-alexandre": 82410153,
  "pierre alexandre": 82410153,
  "pa": 82410153,
  "pahurtubise": 82410153,

  // Thomas Sebbane
  "thomas sebbane": 88305701,
  "thomas": 88305701,
  "tom": 88305701,
  "tsebbane": 88305701,

  // Michael Carpentier
  "michael carpentier": 90285364,
  "michael": 90285364,
  "mike": 90285364,
  "mcarpentier": 90285364,
};

/**
 * Normalise un nom pour la recherche
 * - Convertit en minuscules
 * - Supprime les accents
 * - Trim les espaces
 */
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Supprime les accents
    .trim();
}
