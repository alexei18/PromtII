'use client';

import { useState, useRef } from 'react';
import { Upload, FileText, RefreshCw, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { regeneratePromptWithKnowledgeBaseAction } from '@/app/actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface KnowledgeBaseUploaderProps {
  currentPrompt: string;
  onPromptRegenerated: (newPrompt: string) => void;
}

const ACCEPTED_FILE_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'text/csv',
];
const MAX_FILE_SIZE_MB = 10;

export function KnowledgeBaseUploader({ currentPrompt, onPromptRegenerated }: KnowledgeBaseUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    // Reset state
    setError(null);
    setFile(null);

    // Validate file type
    if (!ACCEPTED_FILE_TYPES.includes(selectedFile.type)) {
      setError(`Tip de fișier invalid. Vă rugăm să încărcați PDF, Word, Excel sau CSV.`);
      return;
    }

    // Validate file size
    if (selectedFile.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setError(`Fișierul este prea mare. Dimensiunea maximă este ${MAX_FILE_SIZE_MB}MB.`);
      return;
    }

    setFile(selectedFile);
  };

  const handleRegenerateClick = async () => {
    if (!file) {
      setError('Vă rugăm să selectați un fișier mai întâi.');
      return;
    }

    setIsLoading(true);
    setError(null);
    toast({ title: 'Se încarcă și se procesează fișierul...', description: 'Acest proces poate dura câteva momente.' });

    try {
      // Read file as base64
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64Content = (reader.result as string).split(',')[1];
        if (!base64Content) {
          throw new Error('Nu s-a putut citi conținutul fișierului.');
        }

        const fileData = {
          content: base64Content,
          type: file.type,
          name: file.name,
        };

        const newPrompt = await regeneratePromptWithKnowledgeBaseAction(currentPrompt, fileData);

        onPromptRegenerated(newPrompt);
        toast({
          title: 'Prompt regenerat cu succes!',
          description: 'Baza de cunoștințe a fost adăugată. Puteți testa noul prompt.',
          className: 'bg-green-500 text-white',
        });
        setFile(null); // Clear file after successful processing
      };
      reader.onerror = () => {
        throw new Error('A apărut o eroare la citirea fișierului.');
      };
    } catch (e: any) {
      console.error('Failed to regenerate prompt:', e);
      setError(e.message);
      toast({
        variant: 'destructive',
        title: 'Eroare la regenerarea promptului',
        description: e.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl mt-6 animate-in fade-in zoom-in-95">
      <CardHeader>
        <CardTitle>Îmbunătățiți Prompt-ul cu o Bază de Cunoștințe</CardTitle>
        <CardDescription>
          Adăugați un document (PDF, Word, Excel, CSV) cu produse, servicii sau alte informații relevante pentru a face asistentul AI mai inteligent.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept={ACCEPTED_FILE_TYPES.join(',')}
            className="hidden"
          />
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            <Upload className="mr-2 h-4 w-4" />
            Alege Fișier
          </Button>
          {file && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="h-4 w-4" />
              <span>{file.name}</span>
            </div>
          )}
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            <p>{error}</p>
          </div>
        )}

        <Button
          onClick={handleRegenerateClick}
          disabled={!file || isLoading}
          className="w-full sm:w-auto"
        >
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Regenerează Prompt
        </Button>
      </CardContent>
    </Card>
  );
}
