# Prompt AI Platform - Generator Avansat de System Prompts

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Technology: Next.js](https://img.shields.io/badge/Next.js-15.x-black?logo=next.js)](https://nextjs.org/)
[![AI Framework: Genkit](https://img.shields.io/badge/Genkit-Google-orange?logo=google-cloud)](https://firebase.google.com/docs/genkit)
[![Styling: Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.x-blue?logo=tailwind-css)](https://tailwindcss.com/)

## 1. Prezentare Generală

**Prompt AI Platform** este o soluție software specializată, concepută pentru a accelera și a standardiza procesul de creare a "System Prompts" pentru agenți AI conversaționali (chatbots). Platforma se adresează companiilor și dezvoltatorilor care doresc să implementeze rapid un agent AI personalizat, inteligent și perfect aliniat cu identitatea, obiectivele și baza de cunoștințe a afacerii.

Prin intermediul unui flux de lucru intuitiv, platforma automatizează analiza de business, colectarea de informații contextuale și generarea unui prompt final, robust și gata de a fi integrat în orice model lingvistic major (LLM).

---

## 2. Arhitectură și Flux de Lucru

Platforma operează pe baza unui flux de lucru inteligent, în două faze, pentru a maximiza atât viteza, cât și acuratețea.

### Fluxul Principal (cu Website)

1.  **Faza 1: Analiză Rapidă (Quick Scan)**
    *   Utilizatorul introduce URL-ul website-ului.
    *   Sistemul efectuează o scanare superficială, dar strategică, a celor mai relevante 5 pagini (ex: homepage, despre noi, servicii) în sub 30 de secunde.
    *   Pe baza conținutului extras, un model AI determină profilul de bază al afacerii (industrie, public țintă, tonul vocii).
    *   Sunt generate dinamic un set de întrebări de onboarding, personalizate pentru contextul afacerii.

2.  **Faza 2: Analiză Detaliată și Generare Finală (Deep Crawl & Prompt Generation)**
    *   În timp ce utilizatorul completează chestionarul, platforma inițiază în fundal o analiză exhaustivă a întregului website (până la 50 de pagini, adâncime 2).
    *   La finalizarea chestionarului, răspunsurile utilizatorului sunt combinate cu datele complete extrase din deep crawl.
    *   Toate aceste informații sunt trimise unui meta-model AI care sintetizează și generează **System Prompt-ul final**.

### Fluxul Alternativ (Fără Website)

Platforma oferă suport complet și pentru utilizatorii care nu dețin un website:
1.  Utilizatorul optează pentru introducerea manuală a datelor.
2.  Completează un formular concis despre profilul afacerii (industrie, audiență, ton).
3.  Sistemul generează un set de întrebări adaptate pentru a extrage maximum de informații relevante direct de la utilizator.
4.  Prompt-ul final este construit exclusiv pe baza răspunsurilor din chestionar.

---

## 3. Caracteristici Cheie

*   **Modularitate și Integrare Facilă**: Logica de business este complet decuplată de interfața de utilizator, fiind expusă prin **Next.js Server Actions**. Acest design permite integrarea rapidă a funcționalității în orice alt proiect Next.js, prin simpla copiere a modulelor relevante și apelarea funcțiilor de acțiune.
*   **Performanță Asincronă**: Analiza detaliată a website-ului (deep crawl) rulează asincron, în fundal, fără a bloca interacțiunea utilizatorului cu formularul de onboarding.
*   **Generare Dinamică de Conținut**: Întrebările din chestionar nu sunt statice; ele sunt generate în timp real de AI pentru a fi perfect relevante pentru specificul fiecărei afaceri.
*   **Sandbox de Testare Integrat**: Utilizatorii pot testa interactiv performanța prompt-ului generat într-un mediu de chat simulat, direct în interfață.
*   **Card de Personalitate AI**: Platforma generează o sinteză vizuală a identității agentului AI (nume, personalitate, obiective, reguli cheie), facilitând alinierea cu strategia de brand.

---

## 4. Setup și Rulare Locală

Pentru a rula proiectul în mediul de dezvoltare local, urmați pașii de mai jos.

### Cerințe Preliminare
*   [Node.js](https://nodejs.org/en/) (v18 sau mai recent)
*   [npm](https://www.npmjs.com/) sau un manager de pachete echivalent

### Pași de Instalare

1.  **Clonați repository-ul:**
    ```bash
    git clone https://github.com/AndreiHlp/PromtII_V2.git
    cd PromtII_V2
    ```

2.  **Instalați dependențele:**
    ```bash
    npm install
    ```

3.  **Configurați variabilele de mediu:**
    Creați un fișier `.env` în rădăcina proiectului, pornind de la `.env.example` (dacă există) sau de la zero, și adăugați cheia API pentru modelul AI:
    ```env
    GEMINI_API_KEY="AIzaSy...Your...API...Key...Here"
    ```

4.  **Porniți serverele de dezvoltare:**
    Proiectul necesită două procese care să ruleze simultan. Deschideți două terminale.

    *   **Terminal 1: Porniți Serverul Genkit (AI Backend)**
        ```bash
        npm run genkit:watch
        ```
        Acest server va gestiona toate flow-urile AI și va rula, de obicei, pe portul `4000`.

    *   **Terminal 2: Porniți Aplicația Next.js (Frontend)**
        ```bash
        npm run dev
        ```
        Aplicația web va rula pe portul `9002`.

5.  **Accesați aplicația:**
    Deschideți browser-ul și navigați la `http://localhost:9002`.

---

## 5. Ghid de Integrare în Alt Proiect

Arhitectura modulară permite integrarea facilă a acestei platforme ca un modul într-o aplicație Next.js existentă.

### Pași de Integrare

1.  **Copiați Modulele Esențiale**:
    *   Copiați întregul director `src/ai` în proiectul țintă.
    *   Copiați întregul director `src/lib` în proiectul țintă.
    *   Copiați fișierul `src/app/actions.ts` în proiectul țintă (de ex., în `app/lib/actions/prompt-ai.ts`).

2.  **Instalați Dependențele**:
    Asigurați-vă că fișierul `package.json` al proiectului țintă include toate dependențele necesare din `package.json`-ul acestui proiect. Puteți rula `npm install` pentru pachetele lipsă (ex: `genkit`, `@genkit-ai/googleai`, `zod`, etc.).

3.  **Apelați Acțiunile Server**:
    Importați și utilizați funcțiile din `actions.ts` direct în componentele Server sau Client ale proiectului dumneavoastră.

### Exemplu de Utilizare (Flux cu Website)

```typescript
// În componenta dumneavoastră
import { startInitialAnalysisAction, generateFinalPromptAction } from '@/path/to/your/actions';

async function handleGenerate(url: string, surveyResponses: Record<string, string>) {
  // Pasul 1: Obține întrebările
  const { questions, analysis, initialCrawledText } = await startInitialAnalysisAction(url);
  
  // Afișează `questions` utilizatorului...
  // Apoi, după ce primești `surveyResponses`...

  // Pasul 2: Generează prompt-ul final (poți rula deep crawl separat dacă dorești)
  const result = await generateFinalPromptAction({
    surveyResponses,
    deepCrawledText: initialCrawledText, // Folosim textul inițial pentru simplitate
    initialAnalysis: analysis
  });

  console.log("Prompt generat:", result.finalPrompt);
}
```

---

## 6. Contribuții

Contribuțiile sunt binevenite. Pentru modificări majore, vă rugăm să deschideți un "issue" pentru a discuta ce doriți să schimbați. Pull request-urile sunt evaluate pe baza calității codului, a relevanței și a aderenței la arhitectura proiectului.

---

## 7. Licență

Acest proiect este licențiat sub licența MIT. Consultați fișierul `LICENSE` pentru mai multe detalii.