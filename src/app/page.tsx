'use client';

import { useState, useRef } from 'react';
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
import {
  crawlAndExtractAction,
  analyzeWebsiteAction,
  generateSurveyAction,
  generatePromptFromSurveyAction,
  generatePersonaCardAction
} from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import type { SurveyQuestion, WebsiteAnalysis, PersonaCardData } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';


type Step = 'url' | 'analysis' | 'form' | 'result';
type AppStatus = 'idle' | 'loading' | 'error';


export default function Home() {
  const [step, setStep] = useState<Step>('url');
  const [status, setStatus] = useState<AppStatus>('idle');
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState('');

  const pageWrapperClasses = "container mx-auto px-4 py-8 max-w-7xl";
  const mainContentClasses = "space-y-8 relative z-10";
  const cardClasses = "glass-effect hover-elevate transition-all";

  const [analysisResult, setAnalysisResult] = useState<WebsiteAnalysis | null>(null);
  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
  const [finalPrompt, setFinalPrompt] = useState('');
  const [personaCardData, setPersonaCardData] = useState<PersonaCardData | null>(null);

  const [crawledTextForDebug, setCrawledTextForDebug] = useState('');

  const crawledTextRef = useRef<string | null>(null);
  const { toast } = useToast();

  const handleUrlSubmit = async (formData: FormData) => {
    const url = formData.get('url') as string;
    if (!url || !url.startsWith('http')) {
      setError('Vă rugăm să introduceți un URL valid.');
      return;
    }
    setError('');
    setStatus('loading');
    setLoadingMessage('Pasul 1/3: Se analizează site-ul...');
    setCrawledTextForDebug('');

    toast({
      title: "Analiză începută",
      description: "Am început procesul de analiză a site-ului dvs.",
      className: "bg-primary text-primary-foreground"
    });

    try {
      const crawledText = await crawlAndExtractAction(url);
      crawledTextRef.current = crawledText;
      setCrawledTextForDebug(crawledText);

      setLoadingMessage('Pasul 2/3: Se extrag informațiile cheie...');
      const initialAnalysis = await analyzeWebsiteAction({ crawledText });
      setAnalysisResult(initialAnalysis);

      setStep('analysis');
    } catch (err: any) {
      console.error("Crawling or initial analysis failed:", err);
      const errorMessage = `A apărut o eroare: ${err.message}`;
      setError(errorMessage);
      setStatus('error');
      toast({
        variant: "destructive",
        title: "Eroare de analiză",
        description: err.message || "Nu am putut analiza URL-ul furnizat.",
      });
    } finally {
      if (step !== 'analysis') {
        setStatus('idle');
      }
    }
  };

  const handleAnalysisConfirmation = async (confirmedAnalysis: WebsiteAnalysis) => {
    if (!crawledTextRef.current) {
      setError("Textul extras nu este disponibil. Vă rugăm să reîncercați.");
      setStatus('error');
      return;
    }
    setStatus('loading');
    setLoadingMessage('Pasul 3/3: Se generează întrebări personalizate...');
    setAnalysisResult(confirmedAnalysis);

    try {
      const survey = await generateSurveyAction({
        crawledText: crawledTextRef.current,
        analysis: confirmedAnalysis
      });
      setQuestions(survey.questions);
      setStep('form');
    } catch (err: any) {
      console.error("Survey generation failed:", err);
      setError(`A apărut o eroare la generarea întrebărilor: ${err.message}`);
      setStatus('error');
      toast({
        variant: "destructive",
        title: "Eroare la generare",
        description: "Nu am putut genera întrebările personalizate.",
      });
    } finally {
      setStatus('idle');
    }
  };


  const handleFormSubmit = async (data: DynamicOnboardingData) => {
    if (!crawledTextRef.current || !analysisResult) {
      setError("A apărut o eroare critică: datele necesare nu sunt disponibile.");
      setStatus('error');
      toast({ variant: "destructive", title: "Eroare", description: "Vă rugăm să reîncepeți procesul." });
      return;
    }

    setStatus('loading');
    setLoadingMessage('Se generează prompt-ul AI...');

    try {
      const result = await generatePromptFromSurveyAction({
        surveyResponses: data.responses,
        crawledText: crawledTextRef.current,
        analysis: analysisResult,
      });
      setFinalPrompt(result.finalPrompt);

      setLoadingMessage('Se generează cardul de personalitate...');
      const personaCardResult = await generatePersonaCardAction({ context: result.finalPrompt });
      setPersonaCardData(personaCardResult);
      setStep('result');
    } catch (err: any) {
      console.error("Prompt generation failed:", err);
      setError('A apărut o eroare la generarea prompt-ului.');
      setStatus('error');
      toast({
        variant: "destructive",
        title: "Eroare de generare",
        description: "Nu am putut genera prompt-ul AI.",
      });
    } finally {
      setStatus('idle');
    }
  };

  const handleSavePrompt = () => {
    toast({
      title: "Funcționalitate în dezvoltare",
      description: "Salvarea prompt-urilor va fi disponibilă în curând.",
    });
  };

  const handleRestart = () => {
    setStep('url');
    setStatus('idle');
    setError('');
    setFinalPrompt('');
    setQuestions([]);
    setAnalysisResult(null);
    setCrawledTextForDebug('');
    setPersonaCardData(null);
    crawledTextRef.current = null;
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

        {step === 'analysis' && analysisResult && (
          <AnalysisConfirmation
            initialAnalysis={analysisResult}
            onConfirm={handleAnalysisConfirmation}
            onCancel={handleRestart}
          />
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
              <Button onClick={handleSavePrompt} variant="outline">
                <Save />
                Salvează Prompt-ul
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
