# Prompt AI Platform - Generator Avansat de System Prompts

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Technology: Next.js](https://img.shields.io/badge/Next.js-15.x-black?logo=next.js)](https://nextjs.org/)
[![AI Framework: Genkit](https://img.shields.io/badge/Genkit-Google-orange?logo=google-cloud)](https://firebase.google.com/docs/genkit)
[![Styling: Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.x-blue?logo=tailwind-css)](https://tailwindcss.com/)

## 1. Prezentare Generală

**Prompt AI Platform** este o soluție software specializată, concepută pentru a accelera și a standardiza procesul de creare a "System Prompts" pentru agenți AI conversaționali (chatbots). Platforma se adresează companiilor și dezvoltatorilor care doresc să implementeze rapid un agent AI personalizat, inteligent și perfect aliniat cu identitatea, obiectivele și baza de cunoștințe a afacerii.

Prin intermediul unui flux de lucru intuitiv, platforma automatizează analiza de business, colectarea de informații contextuale și generarea unui prompt final, robust și gata de a fi integrat în orice model lingvistic major (LLM).

### 🚀 Noi Funcționalități (v2.0)

- **Sistem avansat de rate limiting** - Previne depășirea limitelor API
- **Rotația automată a API keys** - Load balancing inteligent între multiple chei
- **Gestionarea automată a erorilor** - Detectarea și excluderea cheilor suspendate/restricționate
- **Optimizarea automată a textului** - Reducerea consumului de token-uri cu până la 60%
- **Retry logic cu exponential backoff** - Mănuire robustă a erorilor temporare
- **Suport pentru restricții geografice** - Detectarea automată a limitărilor de locație

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
    *   În timp ce utilizatorul completează chestionarul, platforma inițiază în fundal o analiză exhaustivă a întregului website (până la 100 de pagini, adâncime 3).
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

### 🔧 Funcționalități Avansate

*   **Sistem Inteligent de Rate Limiting**: Monitorizează și previne depășirea limitelor API în timp real
*   **Multi-API Key Management**: Rotația automată între 5 API keys pentru distribuirea load-ului
*   **Gestionarea Avansată a Erorilor**: 
    - Detectarea automată a API keys suspendate (403 CONSUMER_SUSPENDED)
    - Gestionarea restricțiilor geografice (400 User location not supported)
    - Retry logic cu exponential backoff și jitter pentru erori temporare
*   **Optimizarea Inteligentă a Textului**: Reducere automată a consumului de token-uri cu 40-60%
*   **Load Balancing Dinamic**: Distribuirea automată a requesturilor pe baza utilizării curente

### 🏗️ Arhitectură și Performanță

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
*   **API Keys Google Gemini** - Vezi secțiunea de configurare de mai jos

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
    Creați un fișier `.env` în rădăcina proiectului, pornind de la `.env.example`:
    ```env
    # Multiple Google Gemini API Keys pentru load balancing
    GOOGLE_API_KEY_1=your_primary_gemini_api_key_here
    GOOGLE_API_KEY_2=your_secondary_gemini_api_key_here
    GOOGLE_API_KEY_3=your_third_gemini_api_key_here
    GOOGLE_API_KEY_4=your_fourth_gemini_api_key_here
    GOOGLE_API_KEY_5=your_fifth_gemini_api_key_here

    # Backward compatibility - dacă ai doar un API key
    GOOGLE_API_KEY=your_gemini_api_key_here

    # Configurare pentru rate limiting
    RATE_LIMIT_MAX_REQUESTS=10
    RATE_LIMIT_WINDOW_MS=120000

    # Configurare pentru text optimization
    MAX_TEXT_CHARACTERS=50000
    PRESERVE_IMPORTANT_SECTIONS=true

    # Altele
    NEXT_PUBLIC_APP_URL=http://localhost:3000
    ```

4.  **Porniți aplicația:**
    ```bash
    npm run dev
    ```
    Aplicația va rula pe portul `3000` (sau portul specificat).

5.  **Accesați aplicația:**
    Deschideți browser-ul și navigați la `http://localhost:3000`.

---

## 5. Configurarea API Keys

### Obținerea API Keys

1. **Accesați Google AI Studio**: https://aistudio.google.com/app/apikey
2. **Creați un nou API key** sau folosiți unul existent
3. **Repetați procesul** pentru a obține 2-5 API keys (recomandat pentru load balancing)

### ⚠️ Probleme Comune și Soluții

#### Eroare: "CONSUMER_SUSPENDED"
- **Cauza**: API key-ul a fost suspendat de Google
- **Soluția**: Înlocuiți API key-ul suspendat cu unul nou în `.env`

#### Eroare: "User location is not supported"
- **Cauza**: API key-ul nu are acces din locația ta geografică
- **Soluția**: 
  - Creați API keys dintr-o regiune suportată (SUA, EU de vest)
  - Folosiți un VPN pentru a crea keys dintr-o locație suportată
  - Contactați Google Support pentru access regional

#### Eroare: "Too Many Requests"
- **Cauza**: Ați depășit quota API
- **Soluția**: Sistemul va comuta automat la alt API key disponibil

### Verificarea Funcționalității

Sistemul afișează în console informații despre:
- Numărul de API keys detectate și activate
- Distribuirea load-ului între keys
- Detectarea automată a problemelor (suspendare, restricții geografice)

---

## 6. Integrarea în Alte Proiecte

### 🚀 Integrare Rapidă (Copiere Modulelor)

Arhitectura modulară permite integrarea facilă a acestei platforme ca un modul într-o aplicație Next.js existentă.

#### Pași de Integrare

1.  **Copiați Modulele Esențiale**:
    ```bash
    # Copiați în proiectul țintă:
    src/ai/              # Flow-urile AI și logica Genkit
    src/lib/             # Utilitare (rate limiting, API management, etc.)
    src/app/actions.ts   # Server Actions pentru Next.js
    ```

2.  **Instalați Dependențele**:
    ```bash
    npm install genkit @genkit-ai/googleai zod
    ```

3.  **Copiați configurarea din `.env.example`**

#### Exemplu de Utilizare (Flux cu Website)

```typescript
// În componenta dumneavoastră
import { startInitialAnalysisAction, generateFinalPromptAction } from '@/path/to/your/actions';

async function handleGenerate(url: string, surveyResponses: Record<string, string>) {
  try {
    // Pasul 1: Obține întrebările
    const { questions, analysis, initialCrawledText } = await startInitialAnalysisAction(url);
    
    // Afișează `questions` utilizatorului...
    // Apoi, după ce primești `surveyResponses`...

    // Pasul 2: Generează prompt-ul final
    const result = await generateFinalPromptAction({
      surveyResponses,
      deepCrawledText: initialCrawledText,
      initialAnalysis: analysis,
      quickSurveyResponses: {}
    });

    console.log("Prompt generat:", result.finalPrompt);
    console.log("Persona card:", result.personaCard);
    
  } catch (error) {
    console.error("Eroare la generarea prompt-ului:", error.message);
    
    // Sistem automat de error handling - verifică tipul erorii
    if (error.message.includes('suspendate sau indisponibile')) {
      // Ghidează utilizatorul să configureze API keys valide
    } else if (error.message.includes('restricționate geografic')) {
      // Ghidează utilizatorul să folosească API keys cu acces global
    }
  }
}
```

### 🤖 Integrare cu AI Assistant (Claude/ChatGPT)

Pentru dezvoltatorii care doresc să integreze această platformă cu ajutorul unui AI assistant:

#### Promptul pentru AI Assistant

```
Vreau să integrez Prompt AI Platform în proiectul meu Next.js. Te rog să mă ajuți cu:

1. Copierea și adaptarea modulelor necesare
2. Configurarea variabilelor de mediu
3. Crearea unei componente React care să folosească funcționalitățile
4. Gestionarea erorilor și edge cases-urilor

Proiectul meu are următoarea structură: [descrie structura ta]
Vreau să integrez funcționalitatea în: [descrie unde vrei s-o integrezi]
```

#### Exemplu de Componentă React Completă

```typescript
'use client';
import { useState } from 'react';
import { startInitialAnalysisAction, generateFinalPromptAction } from '@/lib/actions/prompt-ai';

export function PromptGenerator() {
  const [url, setUrl] = useState('');
  const [questions, setQuestions] = useState([]);
  const [responses, setResponses] = useState({});
  const [finalPrompt, setFinalPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAnalyze = async () => {
    setLoading(true);
    setError('');
    
    try {
      const result = await startInitialAnalysisAction(url);
      setQuestions(result.questions);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    
    try {
      const result = await generateFinalPromptAction({
        surveyResponses: responses,
        deepCrawledText: '',
        initialAnalysis: {},
        quickSurveyResponses: {}
      });
      setFinalPrompt(result.finalPrompt);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Input URL */}
      <div className="mb-6">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Introduceți URL-ul website-ului..."
          className="w-full p-3 border border-gray-300 rounded-lg"
        />
        <button
          onClick={handleAnalyze}
          disabled={loading || !url}
          className="mt-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Analizez...' : 'Analizează Website'}
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          <strong>Eroare:</strong> {error}
          {error.includes('API keys') && (
            <div className="mt-2 text-sm">
              💡 <strong>Soluție:</strong> Verificați configurarea API keys în fișierul .env
            </div>
          )}
        </div>
      )}

      {/* Questions */}
      {questions.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-4">Completați chestionarul:</h3>
          {questions.map((q, index) => (
            <div key={index} className="mb-4">
              <label className="block text-sm font-medium mb-2">{q.question}</label>
              <textarea
                value={responses[q.question] || ''}
                onChange={(e) => setResponses(prev => ({
                  ...prev,
                  [q.question]: e.target.value
                }))}
                className="w-full p-3 border border-gray-300 rounded-lg"
                rows={3}
                placeholder={q.placeholder}
              />
            </div>
          ))}
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'Generez Prompt...' : 'Generează System Prompt'}
          </button>
        </div>
      )}

      {/* Final Prompt */}
      {finalPrompt && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-4">System Prompt Generat:</h3>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <pre className="whitespace-pre-wrap text-sm">{finalPrompt}</pre>
          </div>
          <button
            onClick={() => navigator.clipboard.writeText(finalPrompt)}
            className="mt-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Copiază în Clipboard
          </button>
        </div>
      )}
    </div>
  );
}
```

#### Tips pentru AI Assistant

Când lucrezi cu un AI assistant pentru integrare, specifică:

1. **Structura proiectului tău actual**
2. **Framework-ul folosit** (Next.js, React, etc.)
3. **Unde vrei să integrezi** funcționalitatea
4. **Stilizarea dorită** (Tailwind, CSS modules, etc.)
5. **Nivel de customizare** necesar

AI Assistant-ul va putea adapta codul pentru nevoile tale specifice și va gestiona edge cases-urile automat.

---

## 7. API Reference

### Server Actions Disponibile

#### `startInitialAnalysisAction(url: string)`
Inițiază analiza rapidă a unui website.

**Parametri:**
- `url` (string): URL-ul website-ului de analizat

**Return:**
```typescript
{
  questions: SurveyQuestion[];
  analysis: WebsiteAnalysis;
  initialCrawledText: string;
}
```

#### `generateFinalPromptAction(params)`
Generează prompt-ul final pe baza răspunsurilor din chestionar.

**Parametri:**
```typescript
{
  surveyResponses: Record<string, string>;
  deepCrawledText: string | null;
  initialAnalysis: WebsiteAnalysis;
  quickSurveyResponses: QuickSurveyData;
}
```

**Return:**
```typescript
{
  finalPrompt: string;
  personaCard: PersonaCardData;
}
```

#### `generateSurveyWithoutWebsiteAction(manualAnalysis)`
Generează chestionar pentru utilizatorii fără website.

### Utilitare Disponibile

#### Rate Limiting
```typescript
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limiter';

const rateLimitResult = checkRateLimit(clientId);
if (!rateLimitResult.allowed) {
  // Handle rate limit exceeded
}
```

#### API Key Management
```typescript
import { getAvailableApiKey, recordApiKeyUsage } from '@/lib/api-key-manager';

const apiKey = getAvailableApiKey(); // Obține un API key disponibil
recordApiKeyUsage(apiKey, inputText); // Înregistrează utilizarea
```

#### Text Optimization
```typescript
import { optimizeTextForAI, logTextOptimization } from '@/lib/text-optimizer';

const optimizedText = optimizeTextForAI(originalText, {
  maxCharacters: 30000,
  preserveImportantSections: true,
  removeExtraWhitespace: true,
});
```

---

## 8. Troubleshooting

### Probleme Comune

#### 1. Erori de API Keys
**Simptome:** Aplicația returnează erori legate de API keys suspendate sau restricționate

**Soluții:**
- Verificați că API keys-urile din `.env` sunt valide și active
- Pentru restricții geografice, folosiți API keys create dintr-o regiune suportată
- Configurați multiple API keys pentru load balancing automat

#### 2. Rate Limiting
**Simptome:** Erori "Too Many Requests" sau "quota exceeded"

**Soluții:**
- Sistemul gestionează automat aceste erori prin rotația API keys
- Configurați mai multe API keys în `.env`
- Ajustați setările de rate limiting în `.env`

#### 3. Performanță
**Simptome:** Procesarea lentă a website-urilor mari

**Soluții:**
- Sistemul optimizează automat textul pentru a reduce consumul de token-uri
- Ajustați `MAX_TEXT_CHARACTERS` în `.env` pentru a limita dimensiunea textului procesat

#### 4. Integrarea în alte proiecte
**Simptome:** Erori la importarea modulelor

**Soluții:**
- Asigurați-vă că ați copiat toate modulele necesare (`src/ai`, `src/lib`, `actions.ts`)
- Instalați toate dependențele necesare
- Verificați că path-urile de import sunt corecte pentru structura proiectului vostru

---

## 9. Contribuții

Contribuțiile sunt binevenite! Pentru modificări majore, vă rugăm să deschideți un "issue" pentru a discuta ce doriți să schimbați.

### Cum să Contribuiți

1. Fork-uiți repository-ul
2. Creați o branch nouă (`git checkout -b feature/amazing-feature`)
3. Commit-uiți schimbările (`git commit -m 'Add amazing feature'`)
4. Push-uiți pe branch (`git push origin feature/amazing-feature`)
5. Deschideți un Pull Request

### Standardele de Cod

- Folosiți TypeScript pentru toate fișierele noi
- Urmăriți convențiile de naming existente
- Adăugați teste pentru funcționalitățile noi
- Documentați API-urile noi în README

---

## 10. Licență

Acest proiect este licențiat sub licența MIT. Consultați fișierul `LICENSE` pentru mai multe detalii.

---

## 11. Support și Contact

Pentru întrebări, probleme sau sugestii:

- **Issues GitHub**: [Deschideți un issue](https://github.com/AndreiHlp/PromtII_V2/issues)
- **Discussions**: Pentru întrebări generale și discuții
- **Email**: Contactați dezvoltatorii prin GitHub

### Actualizări și Versiuni

- **v2.0**: Sistem avansat de rate limiting și API management
- **v1.0**: Versiunea inițială cu funcționalități de bază

Pentru a rămâne la curent cu actualizările, urmăriți repository-ul și verificați [Releases](https://github.com/AndreiHlp/PromtII_V2/releases).