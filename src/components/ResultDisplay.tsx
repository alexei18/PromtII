'use client';

import { Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';

interface ResultDisplayProps {
  prompt: string;
}

export function ResultDisplay({ prompt }: ResultDisplayProps) {
  const [hasCopied, setHasCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = () => {
    navigator.clipboard.writeText(prompt);
    setHasCopied(true);
    toast({
      title: 'Copiat!',
      description: 'Prompt-ul a fost copiat în clipboard.',
    });
    setTimeout(() => setHasCopied(false), 2000);
  };

  return (
    <Card className="w-full shadow-lg">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-2xl font-bold">Prompt-ul AI Generat</CardTitle>
            <CardDescription>
              Acesta este "system prompt-ul" pentru agentul dvs. AI.
            </CardDescription>
          </div>
          <Button variant="outline" size="icon" onClick={handleCopy}>
            {hasCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            <span className="sr-only">Copiază prompt-ul</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-60 w-full rounded-md border bg-gray-50 p-4">
          <pre className="whitespace-pre-wrap text-sm text-gray-800">
            {prompt}
          </pre>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
