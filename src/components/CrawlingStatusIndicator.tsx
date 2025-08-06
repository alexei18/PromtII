'use client';

import { CheckCircle2, Loader2, XCircle, FileSearch } from 'lucide-react';

type CrawlingStatus = 'idle' | 'running' | 'completed' | 'error';

interface CrawlingStatusIndicatorProps {
  status: CrawlingStatus;
}

const statusConfig = {
  idle: {
    Icon: FileSearch,
    text: 'În așteptarea analizei...',
    color: 'text-muted-foreground',
    animation: '',
  },
  running: {
    Icon: Loader2,
    text: 'Se analizează site-ul... Acest proces poate dura câteva momente.',
    color: 'text-primary',
    animation: 'animate-spin',
  },
  completed: {
    Icon: CheckCircle2,
    text: 'Analiza site-ului a fost finalizată cu succes!',
    color: 'text-green-600',
    animation: '',
  },
  error: {
    Icon: XCircle,
    text: 'Analiza site-ului a eșuat. Vă rugăm să reîncercați.',
    color: 'text-destructive',
    animation: '',
  },
};

export function CrawlingStatusIndicator({ status }: CrawlingStatusIndicatorProps) {
  const { Icon, text, color, animation } = statusConfig[status];

  return (
    <div className={`flex items-center justify-center space-x-4 rounded-lg border bg-card/50 backdrop-blur-sm p-6 glass-effect hover-elevate ${color}`}>
      <Icon className={`h-8 w-8 ${animation}`} />
      <p className="text-base font-medium tracking-tight">{text}</p>
    </div>
  );
}
