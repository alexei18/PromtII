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
      className: "bg-accent text-accent-foreground border-0"
    });
    setTimeout(() => setHasCopied(false), 2000);
  };

  return (
    <Card className="glass-effect hover-elevate shadow-2xl">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-3xl font-bold tracking-tight">Prompt-ul AI Generat</CardTitle>
            <CardDescription className="text-lg text-muted-foreground">
              Acesta este "system prompt-ul" pentru agentul dvs. AI.
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={handleCopy}>
            {hasCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            <span className="sr-only">Copiază prompt-ul</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-64 w-full rounded-lg border bg-background/50 backdrop-blur-sm p-6">
          <pre className="whitespace-pre-wrap text-base text-foreground font-medium">
            {prompt}
          </pre>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
