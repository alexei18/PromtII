'use client';

import { useState, useRef, useEffect } from 'react';
import { Bot, FileText, User, Sparkles } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DynamicOnboardingForm, type DynamicOnboardingData } from '@/components/DynamicOnboardingForm';
import { ResultDisplay } from '@/components/ResultDisplay';
import { PromptSandbox } from '@/components/PromptSandbox';
import { PersonaCard } from '@/components/PersonaCard';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import {
  startInitialAnalysisAction,
  performDeepCrawlAction,
  generateFinalPromptAction,
  generateSurveyWithoutWebsiteAction,
} from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import type { SurveyQuestion, WebsiteAnalysis, PersonaCardData } from '@/lib/types';
import { WebsiteAnalysisSchema } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

type Step = 'url' | 'manual-input' | 'form' | 'result';
type AppStatus = 'idle' | 'loading' | 'error';
type FlowMode = 'url' | 'manual';

export default function Home() {
  const [step, setStep] = useState<Step>('url');
  const [status, setStatus] = useState<AppStatus>('idle');
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState('');
  const [flowMode, setFlowMode] = useState<FlowMode>('url');

  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
  const [finalPrompt, setFinalPrompt] = useState('');
  const [personaCardData, setPersonaCardData] = useState<PersonaCardData | null>(null);
  const [initialAnalysis, setInitialAnalysis] = useState<WebsiteAnalysis | null>(null);

  const urlRef = useRef<string | null>(null);
  const initialCrawledTextRef = useRef<string | null>(null);
  const deepCrawlResultRef = useRef<string | null>(null);
  const { toast } = useToast();

  const manualForm = useForm<WebsiteAnalysis>({
    resolver: zodResolver(WebsiteAnalysisSchema),
    defaultValues: { industry: '', targetAudience: '', toneOfVoice: '' },
  });

  useEffect(() => {
    if (step === 'form' && urlRef.current && flowMode === 'url') {
      const startDeepCrawl = async (url: string) => {
        console.log('[BACKGROUND_CRAWL] Starting deep crawl...');
        toast({
          title: "Analiza detaliată a început",
          description: "În timp ce răspundeți la întrebări, analizăm întregul site în fundal.",
        });
        try {
          const resultText = await performDeepCrawlAction(url);
          deepCrawlResultRef.current = resultText;
          console.log('[BACKGROUND_CRAWL] Deep crawl finished.');
          toast({
            title: "Analiza detaliată a fost finalizată",
            description: "Suntem gata să generăm prompt-ul final.",
            className: "bg-green-500 text-white"
          });
        } catch (e: any) {
          console.error('[BACKGROUND_CRAWL] Deep crawl failed:', e);
          toast({
            variant: "destructive",
            title: "Eroare la analiza de fundal",
            description: "Vom folosi doar informațiile de bază. Prompt-ul va fi mai puțin detaliat.",
          });
        }
      };
      startDeepCrawl(urlRef.current);
    }
  }, [step, toast, flowMode]);

  const handleUrlSubmit = async (formData: FormData) => {
    const url = formData.get('url') as string;
    if (!url || !url.startsWith('http')) {
      setError('Vă rugăm să introduceți un URL valid.');
      return;
    }
    setError('');
    setStatus('loading'); // <-- MODIFICARE: Activăm starea de încărcare
    setLoadingMessage('Se scanează rapid site-ul...'); // <-- MODIFICARE: Setăm mesajul
    urlRef.current = url;
    setFlowMode('url');

    try {
      const { questions, analysis, initialCrawledText } = await startInitialAnalysisAction(url);
      setInitialAnalysis(analysis);
      setQuestions(questions);
      initialCrawledTextRef.current = initialCrawledText;
      setStep('form');
    } catch (err: any) {
      setError(`A apărut o eroare: ${err.message}`);
      toast({ variant: "destructive", title: "Eroare de analiză", description: err.message });
    } finally {
      setStatus('idle'); // <-- MODIFICARE: Oprim starea de încărcare indiferent de rezultat
    }
  };

  const handleSkipWebsite = () => {
    if (status === 'loading') return; // Siguranță suplimentară
    setFlowMode('manual');
    setStep('manual-input');
  };

  const handleManualAnalysisSubmit = async (data: WebsiteAnalysis) => {
    setStatus('loading');
    setLoadingMessage('Se generează întrebări personalizate...');
    setInitialAnalysis(data);

    try {
      const { questions } = await generateSurveyWithoutWebsiteAction(data);
      setQuestions(questions);
      setStep('form');
    } catch (err: any) {
      setError(`A apărut o eroare: ${err.message}`);
      toast({ variant: "destructive", title: "Eroare la generare", description: err.message });
    } finally {
      setStatus('idle');
    }
  };

  const handleFormSubmit = async (data: DynamicOnboardingData) => {
    if (!initialAnalysis) {
      setError("Eroare critică: Analiza inițială lipsește.");
      setStatus('error');
      return;
    }
    setStatus('loading');
    setLoadingMessage('Se combină răspunsurile și se generează prompt-ul AI...');

    const textToUse = deepCrawlResultRef.current || initialCrawledTextRef.current;

    try {
      const result = await generateFinalPromptAction({
        surveyResponses: data.responses,
        deepCrawledText: textToUse,
        initialAnalysis: initialAnalysis,
      });

      setFinalPrompt(result.finalPrompt);
      setPersonaCardData(result.personaCard);
      setStep('result');
    } catch (err: any) {
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
    setInitialAnalysis(null);
    urlRef.current = null;
    initialCrawledTextRef.current = null;
    deepCrawlResultRef.current = null;
    manualForm.reset();
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
              <CardDescription>Introduceți URL-ul site-ului dvs. sau completați manual informațiile.</CardDescription>
            </CardHeader>
            <form action={handleUrlSubmit}>
              <CardContent>
                <div className="grid w-full items-center gap-2">
                  <Label htmlFor="url">URL Website</Label>
                  <Input id="url" name="url" type="url" placeholder="https://exemplu.ro" required className="text-base" />
                  {error && <p className="text-sm text-destructive">{error}</p>}
                </div>
              </CardContent>
              <CardFooter className="flex-col gap-4">
                <Button type="submit" className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-semibold rounded-lg shadow-md" disabled={isLoading}>Începe Analiza</Button>
                {/* MODIFICARE: Adăugăm disabled={isLoading} pentru a preveni click-urile multiple */}
                <Button type="button" variant="ghost" className="w-full" onClick={handleSkipWebsite} disabled={isLoading}>Nu am un website</Button>
              </CardFooter>
            </form>
          </Card>
        )}

        {step === 'manual-input' && (
          <Card className="shadow-2xl animate-in fade-in zoom-in-95 bg-white/60 dark:bg-black/60 backdrop-blur-lg border-gray-200/50 dark:border-gray-800/50 rounded-2xl">
            <CardHeader>
              <CardTitle>Descrieți Afacerea Dvs.</CardTitle>
              <CardDescription>Completați aceste câmpuri pentru a ne ajuta să înțelegem afacerea dvs.</CardDescription>
            </CardHeader>
            <Form {...manualForm}>
              <form onSubmit={manualForm.handleSubmit(handleManualAnalysisSubmit)}>
                <CardContent className="space-y-4">
                  <FormField control={manualForm.control} name="industry" render={({ field }) => (
                    <FormItem><Label>Industrie</Label><FormControl><Input placeholder="Ex: Restaurant cu specific italian" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={manualForm.control} name="targetAudience" render={({ field }) => (
                    <FormItem><Label>Public Țintă</Label><FormControl><Input placeholder="Ex: Tineri, familii cu copii" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={manualForm.control} name="toneOfVoice" render={({ field }) => (
                    <FormItem><Label>Tonul Vocii</Label><FormControl><Input placeholder="Ex: Prietenos și informal" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </CardContent>
                <CardFooter>
                  <Button type="submit" className="w-full" disabled={isLoading}>Generează Întrebări</Button>
                </CardFooter>
              </form>
            </Form>
          </Card>
        )}

        {step === 'form' && questions.length > 0 && (
          <div className="space-y-4 animate-in fade-in zoom-in-95">
            <DynamicOnboardingForm questions={questions} onSubmit={handleFormSubmit} />
          </div>
        )}

        {/* MODIFICARE: Acest bloc este acum folosit de toate acțiunile asincrone */}
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
              <Button onClick={handleRestart} variant="outline"><FileText /> Începe o Nouă Analiză</Button>
              {personaCardData && (
                <Dialog>
                  <DialogTrigger asChild><Button variant="outline"><User />Arată Cardul de Personalitate</Button></DialogTrigger>
                  <DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Card de Personalitate AI</DialogTitle></DialogHeader><PersonaCard persona={personaCardData} /></DialogContent>
                </Dialog>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}