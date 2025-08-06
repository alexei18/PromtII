'use client';

import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Lightbulb, Users, Briefcase, Check, X } from 'lucide-react';
import type { WebsiteAnalysis } from '@/lib/types';
import { WebsiteAnalysisSchema } from '@/lib/types';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';


interface AnalysisConfirmationProps {
  initialAnalysis: WebsiteAnalysis;
  onConfirm: (data: WebsiteAnalysis) => void;
  onCancel: () => void;
}

export function AnalysisConfirmation({ initialAnalysis, onConfirm, onCancel }: AnalysisConfirmationProps) {

  const form = useForm<WebsiteAnalysis>({
    resolver: zodResolver(WebsiteAnalysisSchema),
    defaultValues: initialAnalysis,
  });

  const onSubmit = (data: WebsiteAnalysis) => {
    onConfirm(data);
  };

  return (
    <Card className="glass-effect hover-elevate shadow-2xl animate-in fade-in zoom-in-95">
      <CardHeader>
        <CardTitle className="text-3xl font-bold tracking-tight">Confirmare Analiză Inițială</CardTitle>
        <CardDescription className="text-lg text-muted-foreground">
          Am extras următoarele informații de pe site-ul dvs. Vă rugăm să le verificați și să le corectați dacă este necesar înainte de a continua.
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-8">
            <FormField
              control={form.control}
              name="industry"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-4 bg-background/50 rounded-lg p-4">
                    <Briefcase className="h-5 w-5 text-muted-foreground" />
                    <Label htmlFor="industry" className="font-semibold">Industrie</Label>
                  </div>
                  <FormControl>
                    <Input id="industry" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="targetAudience"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <Label htmlFor="targetAudience" className="font-semibold">Public Țintă</Label>
                  </div>
                  <FormControl>
                    <Input id="targetAudience" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="toneOfVoice"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-3">
                    <Lightbulb className="h-5 w-5 text-muted-foreground" />
                    <Label htmlFor="toneOfVoice" className="font-semibold">Tonul Vocii</Label>
                  </div>
                  <FormControl>
                    <Input id="toneOfVoice" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="flex justify-between border-t pt-6">
            <Button type="button" variant="ghost" onClick={onCancel}>
              <X className="mr-2 h-4 w-4" />
              Anulează
            </Button>
            <Button type="submit">
              <Check className="mr-2 h-4 w-4" />
              Confirmă și Continuă
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
