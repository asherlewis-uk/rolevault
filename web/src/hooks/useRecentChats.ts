import { useEffect, useState } from "react";
import { characters, type Character } from "@/data/characters";

export interface RecentChat {
  characterId: string;
  lastMessage: string;
  timestamp: number;
}

const STORAGE_KEY = "rolevault_recent_chats";
const MAX_RECENT = 3;

export function useRecentChats() {
  const [recents, setRecents] = useState<RecentChat[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    } catch {
      return [];
    }
  });

  const addRecentChat = (characterId: string, lastMessage: string) => {
    setRecents((prev) => {
      const filtered = prev.filter((r) => r.characterId !== characterId);
      const updated = [{ characterId, lastMessage, timestamp: Date.now() }, ...filtered].slice(0, 20);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  return {
    recents: recents.slice(0, MAX_RECENT),
    allRecents: recents,
    addRecentChat,
    getCharacter: (id: string): Character | undefined => characters.find((c) => c.id === id),
  };
}
