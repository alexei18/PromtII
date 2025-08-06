'use client';

import { useState, useRef, useEffect } from 'react';
import { Bot, User, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { testPromptAction } from '@/app/actions';
import type { ChatMessage } from '@/lib/types';
import { cn } from '@/lib/utils';

interface PromptSandboxProps {
  systemPrompt: string;
}

export function PromptSandbox({ systemPrompt }: PromptSandboxProps) {
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [userMessage, setUserMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
        scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth'});
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [history]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userMessage.trim()) return;

    const newUserMessage: ChatMessage = { role: 'user', content: userMessage };
    setHistory(prev => [...prev, newUserMessage]);
    setUserMessage('');
    setIsLoading(true);

    try {
      const response = await testPromptAction({
        systemPrompt,
        userMessage,
        history,
      });
      const newBotMessage: ChatMessage = { role: 'model', content: response };
      setHistory(prev => [...prev, newBotMessage]);
    } catch (error) {
      console.error('Error in sandbox:', error);
      const errorMessage: ChatMessage = {
        role: 'model',
        content: 'Ne pare rău, a apărut o eroare. Vă rugăm să încercați din nou.',
      };
      setHistory(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full shadow-2xl bg-white/60 dark:bg-black/60 backdrop-blur-lg border-gray-200/50 dark:border-gray-800/50 rounded-2xl">
      <CardHeader>
        <CardTitle>Testează Prompt-ul</CardTitle>
        <CardDescription>
          Interacționează cu agentul AI pentru a vedea cum răspunde cu prompt-ul generat.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col h-[400px]">
          <ScrollArea className="flex-grow p-4 border rounded-lg bg-gray-50/50 dark:bg-gray-900/50" ref={scrollAreaRef}>
            <div className="space-y-4">
              {history.map((msg, index) => (
                <div
                  key={index}
                  className={cn('flex items-start gap-3', {
                    'justify-end': msg.role === 'user',
                  })}
                >
                  {msg.role === 'model' && (
                    <div className="p-2 bg-primary/10 rounded-full">
                      <Bot className="w-6 h-6 text-primary" />
                    </div>
                  )}
                  <div
                    className={cn('p-3 rounded-lg max-w-xs sm:max-w-md', {
                      'bg-primary text-primary-foreground': msg.role === 'user',
                      'bg-muted': msg.role === 'model',
                    })}
                  >
                    <p className="text-sm">{msg.content}</p>
                  </div>
                   {msg.role === 'user' && (
                    <div className="p-2 bg-muted rounded-full">
                      <User className="w-6 h-6 text-foreground" />
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                 <div className="flex items-start gap-3">
                    <div className="p-2 bg-primary/10 rounded-full">
                        <Bot className="w-6 h-6 text-primary" />
                    </div>
                    <div className="p-3 bg-muted rounded-lg flex items-center">
                        <Loader2 className="w-5 h-5 animate-spin" />
                    </div>
                 </div>
              )}
            </div>
          </ScrollArea>
          <form onSubmit={handleSendMessage} className="flex gap-2 mt-4">
            <Input
              value={userMessage}
              onChange={e => setUserMessage(e.target.value)}
              placeholder="Scrie un mesaj..."
              disabled={isLoading}
            />
            <Button type="submit" disabled={isLoading || !userMessage.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
