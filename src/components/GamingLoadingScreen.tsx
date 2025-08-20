'use client';

import { useState, useEffect } from 'react';
import { Bot, Zap, UploadCloud, BrainCircuit, Lightbulb } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

const tips = [
  {
    icon: <UploadCloud className="h-6 w-6 text-blue-500" />,
    title: "Extindeți Cunoștințele AI-ului",
    text: "Puteți încărca documente (.pdf, .txt, .md) pentru a adăuga informații noi în baza de cunoștințe a asistentului dvs."
  },
  {
    icon: <BrainCircuit className="h-6 w-6 text-green-500" />,
    title: "Testați în Sandbox",
    text: "Folosiți mediul de testare (Sandbox) pentru a vedea exact cum va răspunde asistentul AI înainte de a-l publica."
  },
  {
    icon: <Zap className="h-6 w-6 text-yellow-500" />,
    title: "Cardul de Personalitate",
    text: "Generăm un card de personalitate pentru fiecare AI, care vă ajută să înțelegeți rapid rolul și limitările acestuia."
  },
  {
    icon: <Lightbulb className="h-6 w-6 text-purple-500" />,
    title: "Regenerare Inteligentă",
    text: "După încărcarea unui document, sistemul va regenera automat prompt-ul pentru a integra noile informații în mod coerent."
  }
];

export const GamingLoadingScreen = ({ loadingMessage }: { loadingMessage: string }) => {
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const tipInterval = setInterval(() => {
      setCurrentTipIndex((prevIndex) => (prevIndex + 1) % tips.length);
    }, 5000); // Change tip every 5 seconds

    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        // Simulate slower progress towards the end
        const increment = prev > 80 ? Math.random() * 2 : Math.random() * 5;
        return Math.min(prev + increment, 99);
      });
    }, 400);

    return () => {
      clearInterval(tipInterval);
      clearInterval(progressInterval);
    };
  }, []);

  const currentTip = tips[currentTipIndex];

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
            <Bot className="h-10 w-10 text-primary animate-pulse" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">{loadingMessage}</CardTitle>
          <CardDescription>Asistentul tău este aproape gata...</CardDescription>
        </CardHeader>
        <CardContent className="px-6 pb-6">
          <div className="mt-4 mb-6 text-left p-4 bg-gray-50 rounded-lg border min-h-[110px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentTipIndex}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
                className="flex items-start gap-4"
              >
                <div className="flex-shrink-0 mt-1">{currentTip.icon}</div>
                <div>
                  <h3 className="font-semibold text-md text-gray-800">{currentTip.title}</h3>
                  <p className="text-gray-600 text-sm">{currentTip.text}</p>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
          <Progress value={progress} />
        </CardContent>
      </Card>
    </div>
  );
};