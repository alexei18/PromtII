// Utility pentru gestionarea prompturilor în localStorage

export interface SavedPrompt {
  id: string;
  finalPrompt: string;
  personaCardData?: {
    name: string;
    role: string;
    personality: string[];
    skills: string[];
  };
  metadata: {
    createdAt: string;
    url?: string;
    industry?: string;
    targetAudience?: string;
    toneOfVoice?: string;
  };
}

const STORAGE_KEY = 'aichat_prompts';
const MAX_STORED_PROMPTS = 10; // Limitează numărul de prompturi salvate

/**
 * Salvează un prompt în localStorage
 */
export function savePrompt(
  finalPrompt: string,
  personaCardData: any,
  metadata: {
    url?: string;
    industry?: string;
    targetAudience?: string;
    toneOfVoice?: string;
  } = {}
): string {
  try {
    const promptId = generatePromptId();
    const savedPrompt: SavedPrompt = {
      id: promptId,
      finalPrompt,
      personaCardData,
      metadata: {
        ...metadata,
        createdAt: new Date().toISOString(),
      },
    };

    const existingPrompts = getSavedPrompts();
    const updatedPrompts = [savedPrompt, ...existingPrompts];
    
    // Păstrează doar ultimele MAX_STORED_PROMPTS prompturi
    const trimmedPrompts = updatedPrompts.slice(0, MAX_STORED_PROMPTS);
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmedPrompts));
    console.log(`[PROMPT_STORAGE] Saved prompt with ID: ${promptId}`);
    
    return promptId;
  } catch (error) {
    console.error('[PROMPT_STORAGE] Error saving prompt:', error);
    throw new Error('Nu s-a putut salva promptul în localStorage');
  }
}

/**
 * Obține toate prompturile salvate
 */
export function getSavedPrompts(): SavedPrompt[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    
    const prompts = JSON.parse(stored);
    return Array.isArray(prompts) ? prompts : [];
  } catch (error) {
    console.error('[PROMPT_STORAGE] Error loading prompts:', error);
    return [];
  }
}

/**
 * Obține un prompt specific după ID
 */
export function getPromptById(id: string): SavedPrompt | null {
  const prompts = getSavedPrompts();
  return prompts.find(prompt => prompt.id === id) || null;
}

/**
 * Șterge un prompt după ID
 */
export function deletePrompt(id: string): boolean {
  try {
    const prompts = getSavedPrompts();
    const filteredPrompts = prompts.filter(prompt => prompt.id !== id);
    
    if (filteredPrompts.length === prompts.length) {
      return false; // Prompt-ul nu a fost găsit
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredPrompts));
    console.log(`[PROMPT_STORAGE] Deleted prompt with ID: ${id}`);
    return true;
  } catch (error) {
    console.error('[PROMPT_STORAGE] Error deleting prompt:', error);
    return false;
  }
}

/**
 * Șterge toate prompturile
 */
export function clearAllPrompts(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    console.log('[PROMPT_STORAGE] Cleared all prompts');
  } catch (error) {
    console.error('[PROMPT_STORAGE] Error clearing prompts:', error);
  }
}

/**
 * Obține statistici despre prompturile salvate
 */
export function getPromptStats(): {
  totalPrompts: number;
  oldestPrompt?: string;
  newestPrompt?: string;
  storageUsage: number;
} {
  const prompts = getSavedPrompts();
  const storageData = localStorage.getItem(STORAGE_KEY) || '';
  
  return {
    totalPrompts: prompts.length,
    oldestPrompt: prompts.length > 0 ? prompts[prompts.length - 1].metadata.createdAt : undefined,
    newestPrompt: prompts.length > 0 ? prompts[0].metadata.createdAt : undefined,
    storageUsage: new Blob([storageData]).size, // Mărimea în bytes
  };
}

/**
 * Verifică dacă localStorage este disponibil
 */
export function isLocalStorageAvailable(): boolean {
  try {
    const testKey = '__localStorage_test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Generează un ID unic pentru prompt
 */
function generatePromptId(): string {
  return `prompt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Formatează data pentru afișare
 */
export function formatPromptDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ro-RO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return 'Data necunoscută';
  }
}

/**
 * Exportă toate prompturile ca JSON pentru backup
 */
export function exportPromptsAsJSON(): string {
  const prompts = getSavedPrompts();
  return JSON.stringify(prompts, null, 2);
}

/**
 * Importă prompturi dintr-un JSON
 */
export function importPromptsFromJSON(jsonString: string): number {
  try {
    const importedPrompts = JSON.parse(jsonString);
    if (!Array.isArray(importedPrompts)) {
      throw new Error('Formatul JSON nu este valid');
    }

    const existingPrompts = getSavedPrompts();
    const allPrompts = [...importedPrompts, ...existingPrompts];
    
    // Elimină duplicatele pe baza ID-ului
    const uniquePrompts = allPrompts.filter((prompt, index, self) =>
      index === self.findIndex(p => p.id === prompt.id)
    );
    
    // Limitează numărul total
    const trimmedPrompts = uniquePrompts.slice(0, MAX_STORED_PROMPTS);
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmedPrompts));
    
    return importedPrompts.length;
  } catch (error) {
    console.error('[PROMPT_STORAGE] Error importing prompts:', error);
    throw new Error('Nu s-a putut importa JSON-ul. Verificați formatul.');
  }
}