# Prompt AI Platform

## Descriere
Prompt AI este o platformă avansată pentru generarea de întrebări personalizate, analiză de website-uri și crearea de prompt-uri AI. Aceasta este destinată utilizatorilor non-tehnici care doresc să dezvolte chatbot-uri personalizate și să optimizeze experiența utilizatorilor.

## Funcționalități principale
1. **Analiza website-urilor**: Extrage informații cheie din conținutul unui website.
2. **Generarea de întrebări personalizate**: Creează chestionare dinamice bazate pe analiza website-ului.
3. **Crearea de prompt-uri AI**: Generează prompt-uri AI bazate pe răspunsurile utilizatorilor la chestionare.
4. **Carduri de personalitate**: Oferă o reprezentare vizuală a personalității chatbot-ului.

## Structura proiectului
- **src/ai**: Conține logica pentru analiză, generare de întrebări și prompt-uri.
- **src/app**: Include componentele principale ale aplicației și stilurile globale.
- **src/components**: Componente UI reutilizabile.
- **src/hooks**: Hook-uri personalizate pentru funcționalități specifice.
- **src/lib**: Tipuri și utilitare.

## Cum să folosești platforma
1. Clonează repository-ul:
   ```bash
   git clone https://github.com/AndreiHlp/PromtII_V2.git
   ```
2. Instalează dependențele:
   ```bash
   npm install
   ```
3. Rulează aplicația:
   ```bash
   npm run dev
   ```
4. Accesează aplicația în browser la `http://localhost:3000`.

## Configurare
- **.env**: Conține cheia API pentru Gemini:
  ```
  GEMINI_API_KEY=AIzaSyDqWW-YihOI7a58O44PwIFAnUWCidTqJt4
  ```

## Tehnologii utilizate
- **Next.js**: Framework pentru aplicații React.
- **Tailwind CSS**: Framework pentru stilizare.
- **TypeScript**: Limbaj de programare pentru tipuri statice.

## Contribuții
Contribuțiile sunt binevenite! Creează un pull request pentru orice îmbunătățiri sau funcționalități noi.

## Licență
Acest proiect este privat și nu poate fi redistribuit fără permisiunea autorului.

## Integrarea în website-ul propriu

Pentru a integra Prompt AI în website-ul propriu, urmați pașii de mai jos:

### 1. Instalare
Adăugați Prompt AI ca o dependență în proiectul dvs.:
```bash
npm install
```

### 2. Configurare
Asigurați-vă că aveți configurat fișierul `.env` cu cheia API Gemini:
```
GEMINI_API_KEY=
```

### 3. Utilizare
Prompt AI poate fi integrat în website-ul dvs. prin importarea componentelor și funcțiilor disponibile:

#### Exemple de utilizare:

##### Analiza unui website
```typescript
import { crawlAndExtractAction, analyzeWebsiteAction } from '@/app/actions';

async function analyzeWebsite(url: string) {
  const crawledText = await crawlAndExtractAction(url);
  const analysis = await analyzeWebsiteAction({ crawledText });
  console.log(analysis);
}
```

##### Generarea de întrebări personalizate
```typescript
import { generateSurveyAction } from '@/app/actions';

async function generateSurvey(crawledText: string, analysis: any) {
  const survey = await generateSurveyAction({ crawledText, analysis });
  console.log(survey.questions);
}
```

##### Crearea unui prompt AI
```typescript
import { generatePromptFromSurveyAction } from '@/app/actions';

async function createPrompt(surveyResponses: any, crawledText: string, analysis: any) {
  const result = await generatePromptFromSurveyAction({ surveyResponses, crawledText, analysis });
  console.log(result.finalPrompt);
}
```

### 4. Stilizare
Prompt AI folosește Tailwind CSS pentru stilizare. Asigurați-vă că Tailwind CSS este configurat în proiectul dvs.:

#### Configurare Tailwind CSS
Adăugați următorul fișier `tailwind.config.js`:
```javascript
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
};
```

### 5. Rulare
Pentru a testa integrarea, rulați aplicația:
```bash
npm run dev
```
Accesați aplicația la `http://localhost:3000` pentru a verifica funcționalitatea.

---
Pentru mai multe informații despre integrare, consultați documentația completă în repository-ul [Prompt AI](https://github.com/AndreiHlp/PromtII_V2).
