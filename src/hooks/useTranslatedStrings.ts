import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';

const MAX_BATCH_TERMS = 120;
const MAX_TERM_LENGTH = 240;

function stableHash(values: string[]) {
  let hash = 2166136261;
  const input = values.join('\u001f');
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

/**
 * Batch-translates an array of Dutch medical strings to the current UI language.
 * Returns a lookup map: Dutch string -> translated string.
 * Results are cached per language for 24 hours.
 */
export function useTranslatedStrings(strings: string[]) {
  const { i18n } = useTranslation();
  const language = i18n.language;
  const needsTranslation = language !== 'nl';

  const uniqueStrings = useMemo(() => {
    return [...new Set(strings)]
      .map((value) => value?.trim())
      .filter((value): value is string => Boolean(value))
      .filter((value) => value.length <= MAX_TERM_LENGTH)
      .sort()
      .slice(0, MAX_BATCH_TERMS);
  }, [strings]);
  const cacheKey = useMemo(() => `${uniqueStrings.length}:${stableHash(uniqueStrings)}`, [uniqueStrings]);

  const { data: translationMap, isLoading } = useQuery({
    queryKey: ['translated-strings', 'v2', language, cacheKey],
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
