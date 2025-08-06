'use client';

import { Bot, Target, ShieldCheck, ListChecks, Type } from 'lucide-react';
import type { PersonaCardData } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface PersonaCardProps {
  persona: PersonaCardData | null;
}

export function PersonaCard({ persona }: PersonaCardProps) {
  if (!persona) {
    return (
      <Card className="w-full max-w-md glass-effect hover-elevate shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold tracking-tight">Nu s-au putut încărca datele</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-base text-muted-foreground">Detaliile de personalitate nu sunt disponibile momentan.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8 p-6 bg-card/50 backdrop-blur-sm rounded-lg">
      <div className="flex flex-col items-center text-center space-y-4">
        <div className="p-4 bg-primary/10 rounded-full glass-effect">
          <Bot className="h-12 w-12 text-primary" />
        </div>
        <h2 className="text-3xl font-bold tracking-tight">{persona.name || 'Asistent AI'}</h2>
      </div>

      <div className="space-y-6 bg-background/50 rounded-lg p-4">
        <div className="flex items-start gap-4">
          <Type className="h-5 w-5 mt-1 text-primary flex-shrink-0" />
          <div>
            <h3 className="font-semibold">Personalitate</h3>
            <p className="text-sm text-muted-foreground">{persona.personality}</p>
          </div>
        </div>
        <div className="flex items-start gap-4">
          <Target className="h-5 w-5 mt-1 text-primary flex-shrink-0" />
          <div>
            <h3 className="font-semibold">Obiectiv Principal</h3>
            <p className="text-sm text-muted-foreground">{persona.objective}</p>
          </div>
        </div>
        <div className="flex items-start gap-4">
          <ListChecks className="h-5 w-5 mt-1 text-primary flex-shrink-0" />
          <div>
            <h3 className="font-semibold">Reguli Cheie</h3>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 mt-1">
              {persona.keyRules.map((rule, index) => (
                <li key={index}>{rule}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
