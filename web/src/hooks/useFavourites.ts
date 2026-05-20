import { useState } from "react";
import { characters, type Character } from "@/data/characters";

const STORAGE_KEY = "rolevault_favourites";
const MAX_SHOWN = 5;

export function useFavourites() {
  const [favouriteIds, setFavouriteIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    } catch {
      return [];
    }
  });

  const toggleFavourite = (characterId: string) => {
    setFavouriteIds((prev) => {
      const next = prev.includes(characterId)
        ? prev.filter((id) => id !== characterId)
        : [characterId, ...prev];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const isFavourite = (characterId: string) => favouriteIds.includes(characterId);

  const favouriteChars: Character[] = favouriteIds
    .slice(0, MAX_SHOWN)
    .map((id) => characters.find((c) => c.id === id))
    .filter(Boolean) as Character[];

  return { favouriteIds, favouriteChars, toggleFavourite, isFavourite };
}
