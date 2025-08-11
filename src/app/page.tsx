'use client';

import { useState, useRef, useEffect } from 'react'; // Adăugat useEffect
import { Bot, FileText, ChevronDown, ChevronUp, User, Save, Sparkles } from 'lucide-react';
import * as icons from 'lucide-react';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DynamicOnboardingForm, type DynamicOnboardingData } from '@/components/DynamicOnboardingForm';
import { ResultDisplay } from '@/components/ResultDisplay';
import { CrawlingStatusIndicator } from '@/components/CrawlingStatusIndicator';
import { AnalysisConfirmation } from '@/components/AnalysisConfirmation';
import { PromptSandbox } from '@/components/PromptSandbox';
import { PersonaCard } from '@/components/PersonaCard';
// MODIFICAT: Importăm noua acțiune pentru deep crawl
import {
  startInitialAnalysisAction,
  performDeepCrawlAction, // NOU
  generateFinalPromptAction,
  generatePersonaCardAction
} from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import type { SurveyQuestion, WebsiteAnalysis, PersonaCardData } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';


type Step = 'url' | 'form' | 'result'; // Am eliminat 'analysis'
type AppStatus = 'idle' | 'loading' | 'error';

export default function Home() {
  const [step, setStep] = useState<Step>('url');
  const [status, setStatus] = useState<AppStatus>('idle');
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState('');

  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
  const [finalPrompt, setFinalPrompt] = useState('');
  const [personaCardData, setPersonaCardData] = useState<PersonaCardData | null>(null);

  const urlRef = useRef<string | null>(null);
  const initialCrawledTextRef = useRef<string | null>(null); // Stocăm textul inițial ca fallback
  const deepCrawlResultRef = useRef<string | null>(null); // Stocăm rezultatul crawl-ului de fundal
  const { toast } = useToast();

  // NOU: Hook pentru a porni crawl-ul de fundal
  useEffect(() => {
    // Verificăm dacă suntem la pasul 'form' și dacă avem un URL
    if (step === 'form' && urlRef.current) {
      const startDeepCrawl = async (url: string) => {
        console.log('[BACKGROUND_CRAWL] Starting deep crawl in the background...');
        toast({
          title: "Analiza detaliată a început",
          description: "În timp ce răspundeți la întrebări, analizăm întregul site în fundal.",
        });
        try {
          const resultText = await performDeepCrawlAction(url);
          deepCrawlResultRef.current = resultText;
          console.log('[BACKGROUND_CRAWL] Deep crawl finished. Result is ready.');
          toast({
            title: "Analiza detaliată a fost finalizată",
            description: "Suntem gata să generăm prompt-ul final imediat ce trimiteți răspunsurile.",
            className: "bg-green-500 text-white"
          });
        } catch (e: any) {
          console.error('[BACKGROUND_CRAWL] Deep crawl failed:', e);
          toast({
            variant: "destructive",
            title: "Eroare la analiza de fundal",
            description: "Vom folosi doar informațiile de bază. Prompt-ul ar putea fi mai puțin detaliat.",
          });
          // Ca fallback, rezultatul va fi `null`, iar `handleFormSubmit` va folosi textul inițial
        }
      };

      // Apelăm funcția fără 'await' pentru a nu bloca UI-ul
      startDeepCrawl(urlRef.current);
    }
  }, [step, toast]); // Acest hook se va rula de fiecare dată când `step` se schimbă

  const handleUrlSubmit = async (formData: FormData) => {
    const url = formData.get('url') as string;
    if (!url || !url.startsWith('http')) {
      setError('Vă rugăm să introduceți un URL valid.');
      return;
    }
    setError('');
    setStatus('loading');
    setLoadingMessage('Se scanează rapid site-ul...');
    urlRef.current = url;

    try {
      const { questions, initialCrawledText } = await startInitialAnalysisAction(url);

      setQuestions(questions);
      initialCrawledTextRef.current = initialCrawledText;

      setStep('form');
      setStatus('idle');

    } catch (err: any) {
      console.error("Initial quick analysis failed:", err);
      setError(`A apărut o eroare: ${err.message}`);
      setStatus('error');
      toast({
        variant: "destructive",
        title: "Eroare de analiză",
        description: err.message || "Nu am putut analiza URL-ul furnizat.",
      });
      setStatus('idle');
    }
  };

  const handleFormSubmit = async (data: DynamicOnboardingData) => {
    setStatus('loading');
    setLoadingMessage('Se combină răspunsurile și se generează prompt-ul AI...');

    // Așteptăm ca deep crawl-ul să fie gata dacă încă nu este
    // Acest 'while' este un mod simplu de a aștepta. Într-o aplicație complexă, s-ar putea folosi un sistem de status mai avansat.
    let waitCycles = 0;
    while (deepCrawlResultRef.current === null && waitCycles < 20) { // Așteptăm max 20 secunde
      if (waitCycles === 0) console.log("Așteptăm finalizarea analizei de fundal...");
      setLoadingMessage('Finalizăm analiza de fundal...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      waitCycles++;
    }

    const textToUse = deepCrawlResultRef.current || initialCrawledTextRef.current;

    if (!textToUse) {
      setError("A apărut o eroare critică: nu există conținut de analizat.");
      setStatus('error');
      toast({ variant: "destructive", title: "Eroare", description: "Vă rugăm să reîncepeți procesul." });
      return;
    }

    try {
      const result = await generateFinalPromptAction({
        surveyResponses: data.responses,
        deepCrawledText: textToUse,
      });

      setFinalPrompt(result.finalPrompt);
      setPersonaCardData(result.personaCard);
      setStep('result');

    } catch (err: any) {
      console.error("Final prompt generation failed:", err);
      setError('A apărut o eroare la generarea prompt-ului final.');
      setStatus('error');
    } finally {
      setStatus('idle');
    }
  };

  const handleRestart = () => {
    setStep('url');
    setStatus('idle');
    setError('');
    setFinalPrompt('');
    setQuestions([]);
    setPersonaCardData(null);
    urlRef.current = null;
    initialCrawledTextRef.current = null;
    deepCrawlResultRef.current = null;
  };

  const isLoading = status === 'loading';

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8 bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 dark:from-gray-800 dark:via-gray-900 dark:to-black">
      <div className="absolute top-8 flex items-center gap-3 text-2xl font-bold text-gray-800 dark:text-gray-200">
        <Sparkles className="h-8 w-8 text-primary" />
        <h1>Prompt AI</h1>
      </div>

      <div className="w-full max-w-2xl">
        {step === 'url' && (
          <Card className="shadow-2xl animate-in fade-in zoom-in-95 bg-white/60 dark:bg-black/60 backdrop-blur-lg border-gray-200/50 dark:border-gray-800/50 rounded-2xl">
            <CardHeader>
              <CardTitle className="text-2xl">Creați un Agent AI Personalizat</CardTitle>
              <CardDescription>Introduceți URL-ul site-ului dvs. pentru a începe procesul de analiză și generare a prompt-ului.</CardDescription>
            </CardHeader>
            <form action={handleUrlSubmit}>
              <CardContent>
                <div className="grid w-full items-center gap-2">
                  <Label htmlFor="url">URL Website</Label>
                  <Input id="url" name="url" type="url" placeholder="https://exemplu.ro" required className="text-base" />
                  {error && <p className="text-sm text-destructive">{error}</p>}
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-semibold rounded-lg shadow-md" disabled={isLoading}>Începe Analiza</Button>
              </CardFooter>
            </form>
          </Card>
        )}

        {step === 'form' && questions.length > 0 && (
          <div className="space-y-4 animate-in fade-in zoom-in-95">
            <DynamicOnboardingForm questions={questions} onSubmit={handleFormSubmit} />
          </div>
        )}

        {isLoading && (
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
            <Bot className="h-16 w-16 animate-bounce text-primary" />
            <p className="mt-4 text-lg font-medium text-foreground">{loadingMessage}</p>
          </div>
        )}

        {step === 'result' && finalPrompt && (
          <div className="space-y-6 animate-in fade-in zoom-in-95 w-full">
            <ResultDisplay prompt={finalPrompt} />
            <PromptSandbox systemPrompt={finalPrompt} />

            <div className="flex flex-wrap justify-center gap-4">
              <Button onClick={handleRestart} variant="outline">
                <FileText />
                Începe o Nouă Analiză
              </Button>
              {personaCardData && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline"><User />Arată Cardul de Personalitate</Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Card de Personalitate AI</DialogTitle>
                    </DialogHeader>
                    <PersonaCard persona={personaCardData} />
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}