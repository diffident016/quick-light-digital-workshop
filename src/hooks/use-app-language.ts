/**
 * The language AI content should be written in. Placeholder until i18next is added:
 * then return `useTranslation().i18n.resolvedLanguage ?? "en"` here, and every caller
 * (including the AI action plan) follows the user's language automatically.
 */
export function useAppLanguage(): string {
  return "en";
}
