'use client';

import React, { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { QuickSurveyData, QuickSurveyDataSchemaContents } from '@/lib/types';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface QuickScanSurveyProps {
  onAnswersChange: (data: QuickSurveyData) => void;
  onComplete: () => void;
  isAnalysisInProgress: boolean;
}

const surveyQuestions = [
  {
    id: 'communicationChannels' as const,
    type: 'checkbox' as const,
    label: 'Pe ce canale de comunicare veți integra asistentul aichat.md? (puteți selecta mai multe)',
    options: [
      'Website (Live Chat)',
      'Facebook & Instagram',
      'WhatsApp & Telegram',
      '999.md',
      'Alte canale (vă rugăm să specificați)',
    ],
  },
  {
    id: 'aiFamiliarity' as const,
    type: 'radio' as const,
    label: 'Cât de familiarizat sunteți cu soluțiile de inteligență artificială și automatizare?',
    options: [
      'Începător - este prima dată când folosesc o astfel de soluție.',
      'Mediu - am mai utilizat instrumente de automatizare simple.',
      'Avansat - am experiență cu platforme AI sau CRM-uri complexe.',
    ],
  },
  {
    id: 'messageVolume' as const,
    type: 'radio' as const,
    label: 'Ce volum lunar de mesaje estimați că primiți de la clienți?',
    options: [
      'Sub 500 de mesaje',
      'Între 500 și 2000 de mesaje',
      'Între 2000 și 5000 de mesaje',
      'Peste 5000 de mesaje',
    ],
  },
  {
    id: 'mainObjective' as const,
    type: 'radio' as const,
    label: 'Care este obiectivul principal pentru care doriți să utilizați asistentul AI?',
    options: [
      'Automatizarea răspunsurilor la întrebări frecvente.',
      'Creșterea vânzărilor și generarea de lead-uri.',
      'Oferirea de suport clienți non-stop (24/7).',
      'Reducerea timpului de răspuns și eficientizarea echipei.',
    ],
  },
  {
    id: 'userAction' as const,
    type: 'radio' as const,
    label: 'Ce acțiune specifică doriți ca utilizatorii să o poată realiza cel mai frecvent prin intermediul asistentului AI?',
    options: [
      'Să facă o programare sau o rezervare.',
      'Să afle statusul comenzii sau livrării.',
      'Să primească o ofertă de preț personalizată.',
      'Să lase date de contact pentru a fi sunați ulterior.',
    ],
  },
];

export function QuickScanSurvey({ onAnswersChange, onComplete, isAnalysisInProgress }: QuickScanSurveyProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const form = useForm<QuickSurveyData>({
    resolver: zodResolver(QuickSurveyDataSchemaContents),
    defaultValues: {
      communicationChannels: [],
      customChannel: '',
      aiFamiliarity: '',
      messageVolume: '',
      mainObjective: '',
      userAction: '',
    },
  });

  React.useEffect(() => {
    const subscription = form.watch((value) => {
      onAnswersChange(value as QuickSurveyData);
    });
    return () => subscription.unsubscribe();
  }, [form, onAnswersChange]);

  const currentQuestion = surveyQuestions[currentStep];
  const isLastStep = currentStep === surveyQuestions.length - 1;

  const isCurrentQuestionAnswered = () => {
    const value = form.getValues(currentQuestion.id);
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    return !!value;
  };

  const handleNext = () => {
    if (isLastStep) {
      if (!isAnalysisInProgress) {
        onComplete();
      }
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const watchChannels = form.watch('communicationChannels');
  const showCustomChannelInput = watchChannels?.includes('Alte canale (vă rugăm să specificați)');
  const progress = ((currentStep + 1) / surveyQuestions.length) * 100;

  const renderQuestion = () => {
    if (!currentQuestion) return null;

    if (currentQuestion.type === 'checkbox') {
      return (
        <FormField
          control={form.control}
          name={currentQuestion.id}
          render={() => (
            <FormItem>
              <FormLabel className="text-lg font-semibold text-gray-800">{currentQuestion.label}</FormLabel>
              <div className="space-y-3 pt-4">
                {currentQuestion.options.map((item) => (
                  <FormField
                    key={item}
                    control={form.control}
                    name={currentQuestion.id}
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                        <FormControl>
                          <Checkbox
                            checked={field.value?.includes(item)}
                            onCheckedChange={(checked) => {
                              const currentValue = Array.isArray(field.value) ? field.value : [];
                              return checked
                                ? field.onChange([...currentValue, item])
                                : field.onChange(currentValue.filter((value) => value !== item));
                            }}
                          />
                        </FormControl>
                        <FormLabel className="font-normal cursor-pointer flex-grow">{item}</FormLabel>
                      </FormItem>
                    )}
                  />
                ))}
              </div>
              {showCustomChannelInput && (
                <FormField
                  control={form.control}
                  name="customChannel"
                  render={({ field }) => (
                    <FormItem className="mt-4">
                      <FormControl><Input {...field} placeholder="Specificați aici..." /></FormControl>
                    </FormItem>
                  )}
                />
              )}
              <FormMessage />
            </FormItem>
          )}
        />
      );
    }

    if (currentQuestion.type === 'radio') {
      return (
        <FormField
          control={form.control}
          name={currentQuestion.id}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-lg font-semibold text-gray-800">{currentQuestion.label}</FormLabel>
              <FormControl className="pt-4">
                <RadioGroup onValueChange={field.onChange} value={field.value as string} className="space-y-3">
                  {currentQuestion.options.map((option) => (
                    <FormItem key={option} className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                      <FormControl><RadioGroupItem value={option} /></FormControl>
                      <FormLabel className="font-normal cursor-pointer flex-grow">{option}</FormLabel>
                    </FormItem>
                  ))}
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      );
    }
    return null;
  };

  const renderNextButtonContent = () => {
    if (isLastStep && isAnalysisInProgress) {
      return (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Așteptăm finalizarea analizei...
        </>
      );
    }
    return isLastStep ? 'Finalizează' : <>Următorul <ChevronRight className="ml-2 h-4 w-4" /></>;
  };

  return (
    <Card className="w-full max-w-2xl animate-in fade-in zoom-in-95">
      <CardHeader>
        <CardTitle>Vă rugăm să răspundeți la câteva întrebări</CardTitle>
        <div className="flex items-center gap-4 pt-2">
          <span className="text-sm font-medium text-gray-500">{Math.round(progress)}%</span>
          <Progress value={progress} className="w-full" />
        </div>
      </CardHeader>
      <CardContent className="min-h-[280px]">
        <Form {...form}>
          <form onSubmit={(e) => e.preventDefault()}>
            {renderQuestion()}
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button type="button" variant="outline" onClick={handlePrevious} disabled={currentStep === 0}>
          <ChevronLeft className="mr-2 h-4 w-4" /> Înapoi
        </Button>
        <Button
          type="button"
          onClick={handleNext}
          disabled={!isCurrentQuestionAnswered() || (isLastStep && isAnalysisInProgress)}
        >
          {renderNextButtonContent()}
        </Button>
      </CardFooter>
    </Card>
  );
}
