'use client';

import { Bot, Target, ListChecks, Type } from 'lucide-react';
import type { PersonaCardData } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface PersonaCardProps {
  persona: PersonaCardData | null;
}

export function PersonaCard({ persona }: PersonaCardProps) {
  if (!persona) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Nu s-au putut încărca datele</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">Detaliile de personalitate nu sunt disponibile momentan.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="items-center text-center">
        <div className="p-3 bg-gray-100 rounded-full mb-2">
          <Bot className="h-10 w-10 text-gray-700" />
        </div>
        <CardTitle className="text-2xl font-bold">{persona.name || 'Asistent AI'}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-3">
          <Type className="h-5 w-5 mt-1 text-gray-600 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-gray-800">Personalitate</h3>
            <p className="text-sm text-gray-600">{persona.personality}</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Target className="h-5 w-5 mt-1 text-gray-600 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-gray-800">Obiectiv Principal</h3>
            <p className="text-sm text-gray-600">{persona.objective}</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <ListChecks className="h-5 w-5 mt-1 text-gray-600 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-gray-800">Reguli Cheie</h3>
            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1 mt-1">
              {persona.keyRules.map((rule, index) => (
                <li key={index}>{rule}</li>
              ))}
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
