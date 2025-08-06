'use client';

import { Lightbulb } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';

interface QuestionSurveyProps {
  questions: string[];
}

export function QuestionSurvey({ questions }: QuestionSurveyProps) {
  if (!questions || questions.length === 0) {
    return null;
  }

  return (
     <Card className="shadow-2xl">
        <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
                <AccordionTrigger className="px-6">
                    <div className="flex items-center gap-3">
                        <Lightbulb className="h-5 w-5 text-primary" />
                        <div>
                            <p className="font-semibold text-left">Perfecționați Prompt-ul</p>
                            <p className="text-sm text-muted-foreground text-left">Întrebări suplimentare pentru rezultate mai bune</p>
                        </div>
                    </div>
                </AccordionTrigger>
                <AccordionContent className="px-6">
                     <p className="text-muted-foreground mb-4">
                        Răspunsurile la aceste întrebări vă pot ajuta să adăugați mai multe detalii specifice în prompt-ul generat, pentru un agent AI și mai eficient.
                    </p>
                    <ul className="space-y-3 list-disc list-inside">
                        {questions.map((q, index) => (
                        <li key={index} className="text-sm">
                            {q}
                        </li>
                        ))}
                    </ul>
                </AccordionContent>
            </AccordionItem>
        </Accordion>
    </Card>
  );
}
