'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bot, FileText, User, Sparkles, ArrowRight, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AnimatePresence, motion } from 'framer-motion';

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
import SubscriptionPopup from '@/components/SubscriptionPopup';
import { Progress } from '@/components/ui/progress';

type Step = 'welcome' | 'url' | 'manual-input' | 'form' | 'result';
type AppStatus = 'idle' | 'loading' | 'error';
type FlowMode = 'url' | 'manual';

const WelcomeStep = ({ onStart }: { onStart: () => void }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.95 }}
    transition={{ duration: 0.3 }}
    className="text-center bg-white rounded-2xl shadow-2xl p-8 sm:p-12 max-w-lg mx-auto"
  >
    <div className="w-16 h-16 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
      <span className="text-3xl">👋</span>
    </div>
    <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Bine ai venit la aichat.md!</h1>
    <p className="text-gray-600 text-lg mb-8">
      Răspunde la câteva întrebări rapide pentru a ne ajuta să creăm asistentul perfect pentru afacerea ta.
    </p>
    <Button onClick={onStart} size="lg" className="w-full sm:w-auto">
      Începe Configurare <ArrowRight className="ml-2 h-5 w-5" />
    </Button>
  </motion.div>
);

export default function Home() {
  const [step, setStep] = useState<Step>('welcome');
  const [status, setStatus] = useState<AppStatus>('idle');
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState('');
  const [flowMode, setFlowMode] = useState<FlowMode>('url');

  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
  const [finalPrompt, setFinalPrompt] = useState('');
  const [personaCardData, setPersonaCardData] = useState<PersonaCardData | null>(null);
  const [initialAnalysis, setInitialAnalysis] = useState<WebsiteAnalysis | null>(null);
  const [formStep, setFormStep] = useState(0);
  
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const router = useRouter();

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
    setStatus('loading');
    setLoadingMessage('Se scanează rapid site-ul...');
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
      setStatus('idle');
    }
  };

  const handleSkipWebsite = () => {
    if (status === 'loading') return;
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
    if (isLoading) return; // Prevent spamming
    if (!initialAnalysis) {
      setError("Eroare critică: Analiza inițială lipsește.");
      toast({ variant: "destructive", title: "Eroare", description: "Analiza inițială lipsește." });
      setStatus('error');
      return;
    }
    setStatus('loading');
    setLoadingMessage('Se combină răspunsurile și se generează prompt-ul AI final...');

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
      setError(`A apărut o eroare la generarea prompt-ului final: ${err.message}`);
      toast({ variant: "destructive", title: "Eroare la generarea prompt-ului", description: err.message });
      setStatus('error'); // Keep user on the form to allow retry
      setStep('form'); // Or handle error state appropriately
    } finally {
      setStatus('idle');
      setLoadingMessage('');
    }
  };

  const handleRestart = () => {
    setStep('welcome');
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

  const handleFinalize = () => {
    setIsPopupOpen(true);
  };

  const handleConfirmSubscription = () => {
    router.push('/subscribe');
  };

  const handleClosePopup = () => {
    router.push('/dashboard');
  };
  
  const handleBack = () => {
    if (step === 'manual-input') setStep('url');
    if (step === 'form') {
      if (flowMode === 'url') setStep('url');
      else setStep('manual-input');
    }
  };

  const totalOnboardingSteps = 1 + questions.length;
  const getProgress = () => {
    if (questions.length === 0) return 0;
    let currentProgressStep = 0;
    if (step === 'url' || step === 'manual-input') {
      currentProgressStep = 1;
    } else if (step === 'form') {
      currentProgressStep = 1 + formStep + 1;
    }
    return (currentProgressStep / totalOnboardingSteps) * 100;
  };
  const progress = getProgress();

  const renderContent = () => {
    switch (step) {
      case 'welcome':
        return <WelcomeStep onStart={() => setStep('url')} />;
      case 'url':
      case 'manual-input':
      case 'form':
        return (
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl relative"
          >
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-800">Personalizează asistentul tău AI ✨</h2>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-gray-500">{Math.round(progress)}%</span>
                  <Button variant="ghost" size="icon" className="rounded-full" onClick={handleRestart}>
                    <X className="h-5 w-5 text-gray-500" />
                  </Button>
                </div>
              </div>
              <Progress value={progress} className="mb-8" />

              {step === 'url' && (
                <form action={handleUrlSubmit}>
                  <CardContent className="p-0">
                     <h3 className="text-lg font-semibold text-gray-800 mb-4">Introduceți URL-ul site-ului</h3>
                    <div className="grid w-full items-center gap-2">
                      <Input id="url" name="url" type="url" placeholder="https://exemplu.ro" required className="text-base" />
                      {error && <p className="text-sm text-destructive">{error}</p>}
                    </div>
                  </CardContent>
                  <CardFooter className="p-0 mt-8 flex flex-col gap-2 items-stretch">
                    <Button type="submit" className="w-full" disabled={isLoading}>Următorul <ChevronRight className="ml-2 h-4 w-4" /></Button>
                    <Button type="button" variant="link" className="w-full" onClick={handleSkipWebsite} disabled={isLoading}>Nu am un website</Button>
                  </CardFooter>
                </form>
              )}

              {step === 'manual-input' && (
                <Form {...manualForm}>
                  <form onSubmit={manualForm.handleSubmit(handleManualAnalysisSubmit)}>
                    <CardContent className="p-0 space-y-4">
                       <h3 className="text-lg font-semibold text-gray-800 mb-4">Descrieți Afacerea Dvs.</h3>
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
                    <CardFooter className="p-0 mt-8 flex items-center justify-between">
                       <Button type="button" variant="ghost" onClick={handleBack}><ChevronLeft className="mr-2 h-4 w-4" /> Înapoi</Button>
                       <Button type="submit" disabled={isLoading}>Următorul <ChevronRight className="ml-2 h-4 w-4" /></Button>
                    </CardFooter>
                  </form>
                </Form>
              )}

              {step === 'form' && questions.length > 0 && (
                <DynamicOnboardingForm 
                  questions={questions} 
                  onSubmit={handleFormSubmit}
                  onBack={handleBack}
                  onStepChange={setFormStep} 
                />
              )}
            </div>
          </motion.div>
        );
      case 'result':
        return (
           <div className="space-y-6 animate-in fade-in zoom-in-95 w-full max-w-4xl">
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
        )
      default:
        return null;
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8 bg-gray-200 dark:bg-gray-800">
       <AnimatePresence mode="wait">
        {renderContent()}
      </AnimatePresence>

      {isLoading && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
          <Bot className="h-16 w-16 animate-bounce text-primary" />
          <p className="mt-4 text-lg font-medium text-foreground">{loadingMessage}</p>
        </div>
      )}

      {step === 'result' && (
        <div className="fixed bottom-8 right-8 z-50">
          <Button onClick={handleFinalize} size="lg" className="bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 text-white font-semibold rounded-lg shadow-lg">
            Finalizeaza
          </Button>
        </div>
      )}

      <SubscriptionPopup
        isOpen={isPopupOpen}
        onOpenChange={setIsPopupOpen}
        onConfirm={handleConfirmSubscription}
        onClose={handleClosePopup}
      />
    </main>
  );
}
