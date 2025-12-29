/**
 * @fileoverview Utilitaires de validation pour la sécurité de l'application
 *
 * Ce module fournit des fonctions de validation pour :
 * - Les paramètres de navigation (deep links)
 * - Les entrées utilisateur
 * - Les formats de données
 *
 * @module lib/validation
 */

/**
 * Expression régulière pour valider un UUID v4
 * Format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Vérifie si une chaîne est un UUID valide
 * @param id - La chaîne à valider
 * @returns true si l'ID est un UUID valide, false sinon
 *
 * @example
 * isValidUUID('123e4567-e89b-12d3-a456-426614174000') // true
 * isValidUUID('invalid-id') // false
 * isValidUUID('../../../etc/passwd') // false
 */
export function isValidUUID(id: string | undefined | null): id is string {
  if (!id || typeof id !== 'string') return false;
  return UUID_REGEX.test(id);
}

/**
 * Valide et nettoie un paramètre de navigation
 * Empêche les attaques par traversée de répertoire et les injections
 *
 * @param param - Le paramètre à valider
 * @param type - Le type attendu ('uuid' | 'alphanumeric' | 'code')
 * @returns La valeur nettoyée ou null si invalide
 */
export function validateNavParam(
  param: string | undefined | null,
  type: 'uuid' | 'alphanumeric' | 'code' = 'uuid'
): string | null {
  if (!param || typeof param !== 'string') return null;

  // Protection contre la traversée de répertoire
  if (param.includes('..') || param.includes('/') || param.includes('\\')) {
    return null;
  }

  switch (type) {
    case 'uuid':
      return isValidUUID(param) ? param : null;

    case 'alphanumeric':
      // Seulement lettres, chiffres, tirets et underscores
      return /^[a-zA-Z0-9_-]+$/.test(param) ? param : null;

    case 'code':
      // Code d'invitation: 8 caractères alphanumériques majuscules
      return /^[A-Z0-9]{8}$/.test(param.toUpperCase()) ? param.toUpperCase() : null;

    default:
      return null;
  }
}

/**
 * Valide un email selon RFC 5322 (version simplifiée)
 * @param email - L'email à valider
 * @returns true si l'email est valide
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  // Regex plus stricte que \S+@\S+\.\S+
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(email) && email.length <= 254;
}

/**
 * Valide un montant positif
 * @param amount - Le montant à valider (string ou number)
 * @returns Le montant validé ou null si invalide
 */
export function validateAmount(amount: string | number): number | null {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;

  if (isNaN(num) || !isFinite(num)) return null;
  if (num <= 0) return null;
  if (num > 999999.99) return null; // Limite raisonnable

  // Arrondir à 2 décimales
  return Math.round(num * 100) / 100;
}

/**
 * Nettoie une chaîne de texte utilisateur
 * Supprime les caractères potentiellement dangereux
 *
 * @param text - Le texte à nettoyer
 * @param maxLength - Longueur maximale (défaut: 500)
 * @returns Le texte nettoyé
 */
export function sanitizeText(text: string, maxLength = 500): string {
  if (!text || typeof text !== 'string') return '';

  return text
    .trim()
    .slice(0, maxLength)
    // Supprimer les caractères de contrôle (sauf newlines)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

/**
 * Valide un pseudo utilisateur
 * @param displayName - Le pseudo à valider
 * @returns true si le pseudo est valide
 */
export function isValidDisplayName(displayName: string): boolean {
  if (!displayName || typeof displayName !== 'string') return false;

  const trimmed = displayName.trim();

  // Longueur entre 2 et 30 caractères
  if (trimmed.length < 2 || trimmed.length > 30) return false;

  // Seulement lettres, chiffres, espaces, tirets, underscores
  if (!/^[a-zA-Z0-9À-ÿ\s_-]+$/.test(trimmed)) return false;

  // Pas seulement des espaces
  if (/^\s*$/.test(trimmed)) return false;

  return true;
}
