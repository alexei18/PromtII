'use client';

import { useState } from 'react';
import { Check, Copy, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';

interface ResultDisplayProps {
  prompt: string;
}

export function ResultDisplay({ prompt }: ResultDisplayProps) {
  const [hasCopied, setHasCopied] = useState(false);
  const { toast } = useToast();

  const copyToClipboard = () => {
    navigator.clipboard.writeText(prompt);
    setHasCopied(true);
    toast({
      title: 'Copiat!',
      description: 'Prompt-ul a fost copiat în clipboard.',
    });
    setTimeout(() => setHasCopied(false), 2000);
  };

  return (
    <Card className="w-full shadow-lg border-gray-200 rounded-2xl">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xl font-bold text-gray-800">
          {'Prompt-ul Tău Personalizat'}
        </CardTitle>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={copyToClipboard}>
            {hasCopied ? (
              <Check className="h-5 w-5 text-green-500" />
            ) : (
              <Copy className="h-5 w-5 text-gray-500" />
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-60 w-full rounded-md border bg-gray-50 p-4">
          <pre className="whitespace-pre-wrap text-sm text-gray-700">
            <code>{prompt}</code>
          </pre>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

