// Text optimizer pentru a reduce consumul de token-uri AI
export interface TextOptimizationConfig {
  maxCharacters: number;
  preserveImportantSections: boolean;
  removeExtraWhitespace: boolean;
}

export const defaultTextConfig: TextOptimizationConfig = {
  maxCharacters: 50000, // Maxim 50k caractere (aproximativ 12.5k token-uri)
  preserveImportantSections: true,
  removeExtraWhitespace: true,
};

export function optimizeTextForAI(
  text: string, 
  config: TextOptimizationConfig = defaultTextConfig
): string {
  if (!text) return '';
  
  let optimizedText = text;
  
  // 1. Elimină spațiile extra și line breaks multiple
  if (config.removeExtraWhitespace) {
    optimizedText = optimizedText
      .replace(/\s+/g, ' ') // Înlocuiește multiple spații cu unul singur
      .replace(/\n\s*\n/g, '\n') // Elimină line breaks goale
      .trim();
  }
  
  // 2. Dacă textul este deja sub limită, returnează-l
  if (optimizedText.length <= config.maxCharacters) {
    return optimizedText;
  }
  
  // 3. Încearcă să păstreze secțiunile importante
  if (config.preserveImportantSections) {
    return smartTruncate(optimizedText, config.maxCharacters);
  }
  
  // 4. Truncare simplă
  return optimizedText.substring(0, config.maxCharacters) + '...';
}

function smartTruncate(text: string, maxLength: number): string {
  // Împarte textul în paragrafe
  const paragraphs = text.split('\n').filter(p => p.trim().length > 0);
  
  // Prioritizează paragrafele care conțin cuvinte cheie importante
  const importantKeywords = [
    'despre', 'servicii', 'produse', 'contact', 'preturi', 'oferta',
    'about', 'services', 'products', 'contact', 'price', 'offer',
    'home', 'acasa', 'principal', 'main', 'descriere', 'description'
  ];
  
  // Sortează paragrafele după importanță
  const sortedParagraphs = paragraphs.sort((a, b) => {
    const scoreA = getImportanceScore(a, importantKeywords);
    const scoreB = getImportanceScore(b, importantKeywords);
    return scoreB - scoreA;
  });
  
  // Construiește textul optimizat păstrând paragrafele cele mai importante
  let result = '';
  let currentLength = 0;
  
  for (const paragraph of sortedParagraphs) {
    const paragraphLength = paragraph.length + 1; // +1 pentru \n
    
    if (currentLength + paragraphLength <= maxLength) {
      result += paragraph + '\n';
      currentLength += paragraphLength;
    } else {
      // Dacă mai avem spațiu, adaugă o parte din paragraf
      const remainingSpace = maxLength - currentLength - 3; // -3 pentru '...'
      if (remainingSpace > 50) {
        result += paragraph.substring(0, remainingSpace) + '...';
      }
      break;
    }
  }
  
  return result.trim();
}

function getImportanceScore(text: string, keywords: string[]): number {
  const lowerText = text.toLowerCase();
  let score = 0;
  
  // Punctaj pentru cuvinte cheie
  for (const keyword of keywords) {
    const matches = (lowerText.match(new RegExp(keyword, 'g')) || []).length;
    score += matches * 10;
  }
  
  // Punctaj pentru lungime (paragrafele mai lungi sunt considerate mai importante)
  score += Math.min(text.length / 100, 5);
  
  // Punctaj pentru poziție (primele paragrafe sunt mai importante)
  // Acest lucru va fi calculat în funcția părinte
  
  return score;
}

export function getTextStats(text: string): {
  characters: number;
  estimatedTokens: number;
  paragraphs: number;
  words: number;
} {
  return {
    characters: text.length,
    estimatedTokens: Math.ceil(text.length / 4), // Aproximativ 4 caractere = 1 token
    paragraphs: text.split('\n').filter(p => p.trim().length > 0).length,
    words: text.split(/\s+/).filter(w => w.length > 0).length,
  };
}

export function logTextOptimization(originalText: string, optimizedText: string): void {
  const original = getTextStats(originalText);
  const optimized = getTextStats(optimizedText);
  
  console.log('[TEXT_OPTIMIZER] Optimization results:');
  console.log(`- Characters: ${original.characters} → ${optimized.characters} (${Math.round((1 - optimized.characters/original.characters) * 100)}% reduction)`);
  console.log(`- Estimated tokens: ${original.estimatedTokens} → ${optimized.estimatedTokens} (${Math.round((1 - optimized.estimatedTokens/original.estimatedTokens) * 100)}% reduction)`);
  console.log(`- Paragraphs: ${original.paragraphs} → ${optimized.paragraphs}`);
}