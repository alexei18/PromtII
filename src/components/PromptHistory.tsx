'use client';

import React, { useState, useEffect } from 'react';
import { Clock, Copy, Download, Trash2, Eye, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  getSavedPrompts,
  deletePrompt,
  clearAllPrompts,
  formatPromptDate,
  getPromptStats,
  exportPromptsAsJSON,
  type SavedPrompt
} from '@/lib/prompt-storage';

interface PromptHistoryProps {
  onPromptSelect?: (prompt: string) => void;
}

export function PromptHistory({ onPromptSelect }: PromptHistoryProps) {
  const [prompts, setPrompts] = useState<SavedPrompt[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<SavedPrompt | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadPrompts();
  }, []);

  const loadPrompts = () => {
    const savedPrompts = getSavedPrompts();
    setPrompts(savedPrompts);
  };

  const handleCopyPrompt = (prompt: string) => {
    navigator.clipboard.writeText(prompt);
    toast({
      title: "Copiat!",
      description: "Promptul a fost copiat în clipboard.",
    });
  };

  const handleDeletePrompt = (promptId: string) => {
    const success = deletePrompt(promptId);
    if (success) {
      loadPrompts();
      toast({
        title: "Șters cu succes",
        description: "Promptul a fost șters din istoric.",
      });
    } else {
      toast({
        variant: "destructive",
        title: "Eroare",
        description: "Nu s-a putut șterge promptul.",
      });
    }
  };

  const handleClearAll = () => {
    clearAllPrompts();
    loadPrompts();
    toast({
      title: "Istoric șters",
      description: "Toate prompturile au fost șterse din istoric.",
    });
  };

  const handleExportPrompts = () => {
    try {
      const jsonData = exportPromptsAsJSON();
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `prompturi_aichat_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Export reușit",
        description: "Prompturile au fost exportate ca fișier JSON.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Eroare export",
        description: "Nu s-au putut exporta prompturile.",
      });
    }
  };

  const handleSelectPrompt = (prompt: SavedPrompt) => {
    if (onPromptSelect) {
      onPromptSelect(prompt.finalPrompt);
      toast({
        title: "Prompt selectat",
        description: "Promptul a fost încărcat în editor.",
      });
    }
  };

  const truncateText = (text: string, maxLength: number = 100) => {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  const stats = getPromptStats();

  if (prompts.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Istoric Prompturi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-500 py-8">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">Niciun prompt salvat</p>
            <p className="text-sm">Prompturile generate vor apărea aici automat.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Istoric Prompturi ({prompts.length})
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPrompts}
              className="flex items-center gap-1"
            >
              <Download className="h-4 w-4" />
              Export
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Șterge toate prompturile?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Această acțiune va șterge definitiv toate prompturile salvate. 
                    Nu vei putea recupera aceste date.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Anulează</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClearAll} className="bg-destructive hover:bg-destructive/90">
                    Șterge Tot
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
        <div className="flex gap-4 text-sm text-gray-600">
          <span>Total: {stats.totalPrompts}</span>
          <span>Spațiu: {(stats.storageUsage / 1024).toFixed(1)} KB</span>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-96">
          <div className="space-y-4">
            {prompts.map((prompt, index) => (
              <div
                key={prompt.id}
                className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs">
                        {formatPromptDate(prompt.metadata.createdAt)}
                      </Badge>
                      {prompt.metadata.url && (
                        <Badge variant="secondary" className="text-xs">
                          Website
                        </Badge>
                      )}
                      {prompt.metadata.industry && (
                        <Badge variant="secondary" className="text-xs">
                          {prompt.metadata.industry}
                        </Badge>
                      )}
                    </div>
                    {prompt.metadata.url && (
                      <p className="text-sm text-blue-600 mb-1 font-medium">
                        {prompt.metadata.url}
                      </p>
                    )}
                    <p className="text-sm text-gray-700 mb-2">
                      {truncateText(prompt.finalPrompt, 150)}
                    </p>
                    {prompt.metadata.targetAudience && (
                      <p className="text-xs text-gray-500">
                        <strong>Public țintă:</strong> {prompt.metadata.targetAudience}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 ml-4">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedPrompt(prompt)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[80vh]">
                        <DialogHeader>
                          <DialogTitle>Prompt salvat</DialogTitle>
                          <DialogDescription>
                            Generat pe {formatPromptDate(prompt.metadata.createdAt)}
                            {prompt.metadata.url && ` pentru ${prompt.metadata.url}`}
                          </DialogDescription>
                        </DialogHeader>
                        <ScrollArea className="h-96 w-full rounded-md border p-4">
                          <pre className="whitespace-pre-wrap text-sm">
                            {prompt.finalPrompt}
                          </pre>
                        </ScrollArea>
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            onClick={() => handleCopyPrompt(prompt.finalPrompt)}
                          >
                            <Copy className="h-4 w-4 mr-2" />
                            Copiază
                          </Button>
                          {onPromptSelect && (
                            <Button onClick={() => handleSelectPrompt(prompt)}>
                              <ExternalLink className="h-4 w-4 mr-2" />
                              Utilizează
                            </Button>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopyPrompt(prompt.finalPrompt)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Șterge promptul?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Această acțiune va șterge definitiv promptul selectat.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Anulează</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => handleDeletePrompt(prompt.id)}
                            className="bg-destructive hover:bg-destructive/90"
                          >
                            Șterge
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
                {index < prompts.length - 1 && <Separator className="mt-4" />}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}