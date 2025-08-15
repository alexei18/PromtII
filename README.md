README.md
code
Markdown
# Prompt AI Platform

## Descriere
Prompt AI este o platformă avansată pentru generarea de prompt-uri AI personalizate pentru chatbot-uri. Aceasta este destinată utilizatorilor, inclusiv celor non-tehnici, care doresc să dezvolte rapid un agent AI inteligent, bazat pe conținutul website-ului lor sau pe descrierea afacerii.

## Funcționalități principale
1.  **Analiza Website-urilor (Opțional)**: Extrage informații cheie din conținutul unui website printr-o scanare rapidă, urmată de o analiză detaliată în fundal.
2.  **Flux Fără Website**: Permite utilizatorilor fără un website să descrie manual afacerea lor.
3.  **Generarea de Întrebări Personalizate**: Creează chestionare dinamice și inteligente, adaptate fiecărei afaceri, pentru a colecta informații esențiale.
4.  **Crearea de Prompt-uri AI**: Combină datele de pe website (dacă există) cu răspunsurile utilizatorului pentru a genera un "system prompt" complet și eficient.
5.  **Card de Personalitate**: Oferă o sinteză vizuală a personalității, obiectivelor și regulilor chatbot-ului.
6.  **Sandbox de Testare**: Permite testarea interactivă a prompt-ului generat.

## Structura proiectului
- **src/ai**: Conține toate fluxurile Genkit pentru analiză, generare de întrebări și prompt-uri.
- **src/app**: Include paginile aplicației, logica de acțiuni server (`actions.ts`) și stilurile globale.
- **src/components**: Componente UI reutilizabile (formulare, carduri, etc.).
- **src/lib**: Definiții de tipuri (TypeScript) și funcții utilitare.

## Cum să rulezi proiectul local
1. Clonează repository-ul:
   ```bash
   git clone https://github.com/AndreiHlp/PromtII_V2.git
Instalează dependențele:
code
Bash
npm install
Configurează variabilele de mediu. Creează un fișier .env în rădăcina proiectului:
code
Code
GEMINI_API_KEY=CHEIA_TA_API_AICI
Rulează simultan aplicația Next.js și serverul Genkit:
code
Bash
# Într-un terminal
npm run genkit:watch

# Într-un alt terminal
npm run dev
Accesează aplicația în browser la http://localhost:9002.
Integrarea în alt proiect (Modularitate)
Platforma a fost concepută pentru a fi modulară. Logica de business este expusă prin Next.js Server Actions în fișierul src/app/actions.ts, care poate fi considerat un API intern.
Pentru a integra această funcționalitate în alt proiect Next.js:
Copiați directoarele src/ai, src/lib, și fișierul src/app/actions.ts în proiectul țintă.
Asigurați-vă că aveți instalate toate dependențele din package.json.
Puteți acum apela acțiunile direct din componentele server sau client ale proiectului vostru.
Exemple de Utilizare a Acțiunilor
1. Fluxul cu analiză de website
code
TypeScript
// Componenta ta (ex: in alt proiect)
import { startInitialAnalysisAction, performDeepCrawlAction, generateFinalPromptAction } from '@/path/to/actions';

async function handleWebsiteFlow(url: string, surveyResponses: Record<string, string>) {
  // Faza 1: Scanare rapidă și obținere întrebări
  const { questions, analysis, initialCrawledText } = await startInitialAnalysisAction(url);
  // Acum poți afișa întrebările utilizatorului...

  // Faza 2 (Partea 1): Pornește deep crawl în fundal (fără await)
  performDeepCrawlAction(url).then(deepText => {
    // Faza 2 (Partea 2): Când utilizatorul a terminat chestionarul, generează promptul final
    generateFinalPromptAction({
      surveyResponses,
      deepCrawledText: deepText,
      initialAnalysis: analysis
    }).then(result => {
      console.log("Prompt final:", result.finalPrompt);
      console.log("Card personalitate:", result.personaCard);
    });
  });
}
2. Fluxul fără website (manual)
code
TypeScript
// Componenta ta (ex: in alt proiect)
import { generateSurveyWithoutWebsiteAction, generateFinalPromptAction } from '@/path/to/actions';
import type { WebsiteAnalysis } from '@/lib/types';

async function handleManualFlow(manualData: WebsiteAnalysis, surveyResponses: Record<string, string>) {
  // Faza 1: Obține întrebări pe baza datelor manuale
  const { questions } = await generateSurveyWithoutWebsiteAction(manualData);
  // Acum poți afișa întrebările utilizatorului...
  
  // Faza 2: Generează promptul final (fără text de pe site)
  const result = await generateFinalPromptAction({
    surveyResponses,
    deepCrawledText: null, // Important: trimitem null
    initialAnalysis: manualData
  });

  console.log("Prompt final:", result.finalPrompt);
  console.log("Card personalitate:", result.personaCard);
}
Aceste modificări aliniază proiectul la noua viziune, îl fac mai robust, mai flexibil și mult mai ușor de integrat. Spor la codat!