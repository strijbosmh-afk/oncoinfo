import { useState, useEffect, useCallback } from 'react';

const FAVORITES_KEY = 'uroinfo_favorite_drugs';

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>([]);

  // Load favorites from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(FAVORITES_KEY);
    if (stored) {
      try {
        setFavorites(JSON.parse(stored));
      } catch {
        setFavorites([]);
      }
    }
  }, []);

  // Save favorites to localStorage when changed
  const saveFavorites = useCallback((newFavorites: string[]) => {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(newFavorites));
    setFavorites(newFavorites);
  }, []);

  const addFavorite = useCallback((drugId: string) => {
    const newFavorites = [...favorites, drugId];
    saveFavorites(newFavorites);
  }, [favorites, saveFavorites]);

  const removeFavorite = useCallback((drugId: string) => {
    const newFavorites = favorites.filter(id => id !== drugId);
    saveFavorites(newFavorites);
  }, [favorites, saveFavorites]);

  const toggleFavorite = useCallback((drugId: string) => {
    if (favorites.includes(drugId)) {
      removeFavorite(drugId);
    } else {
      addFavorite(drugId);
    }
  }, [favorites, addFavorite, removeFavorite]);

  const isFavorite = useCallback((drugId: string) => {
    return favorites.includes(drugId);
  }, [favorites]);

  return {
    favorites,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    isFavorite,
  };
}