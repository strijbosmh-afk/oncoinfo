import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';

/**
 * Batch-translates an array of Dutch medical strings to the current UI language.
 * Returns a lookup map: Dutch string -> translated string.
 * Results are cached per language for 24 hours.
 */
export function useTranslatedStrings(strings: string[]) {
  const { i18n } = useTranslation();
  const language = i18n.language;
  const needsTranslation = language !== 'nl';

  // Deduplicate and sort for stable cache key
  const uniqueStrings = [...new Set(strings)].filter(Boolean).sort();
  const cacheKey = uniqueStrings.join('|').substring(0, 200); // truncate for reasonable key size

  const { data: translationMap, isLoading } = useQuery({
    queryKey: ['translated-strings', language, cacheKey],
    queryFn: async (): Promise<Record<string, string>> => {
      if (uniqueStrings.length === 0) return {};

      const { data, error } = await supabase.functions.invoke('translate-drug-content', {
        body: {
          content: { terms: uniqueStrings },
          target_language: language,
        },
      });

      if (error) {
        console.error('Batch translation error:', error);
        return {};
      }

      const translatedTerms: string[] = data?.translated?.terms || [];
      const map: Record<string, string> = {};
      uniqueStrings.forEach((str, i) => {
        if (translatedTerms[i]) {
          map[str] = translatedTerms[i];
        }
      });
      return map;
    },
    enabled: needsTranslation && uniqueStrings.length > 0,
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
  });

  const translate = (term: string): string => {
    if (!needsTranslation) return term;
    return translationMap?.[term] || term;
  };

  return { translate, isLoading: needsTranslation && isLoading };
}
