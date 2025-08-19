'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckIcon, Rocket } from 'lucide-react';

interface SubscriptionPopupProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onConfirm: () => void;
  onClose: () => void;
}

export default function SubscriptionPopup({
  isOpen,
  onOpenChange,
  onConfirm,
  onClose,
}: SubscriptionPopupProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="items-center text-center">
          <div className="p-3 bg-gray-100 rounded-full mb-3">
            <Rocket className="w-8 h-8 text-gray-700" />
          </div>
          <DialogTitle className="text-2xl font-bold">Finalizați Configurarea</DialogTitle>
          <DialogDescription className="text-base">
            Agentul dvs. AI este gata. Faceți upgrade acum pentru a debloca întregul său potențial sau continuați cu funcționalități limitate.
          </DialogDescription>
        </DialogHeader>
        <div className="px-6 py-4">
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-center">
              <CheckIcon className="w-4 h-4 text-blue-600 mr-2" />
              Analiză aprofundată a site-ului
            </li>
            <li className="flex items-center">
              <CheckIcon className="w-4 h-4 text-blue-600 mr-2" />
              Prompt-uri personalizate nelimitate
            </li>
            <li className="flex items-center">
              <CheckIcon className="w-4 h-4 text-blue-600 mr-2" />
              Suport prioritar
            </li>
          </ul>
        </div>
        <DialogFooter className="flex-col sm:flex-col sm:space-x-0 gap-2">
          <Button
            className="w-full"
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
          >
            Vezi Pachetele Noastre
          </Button>
          <DialogClose asChild>
            <Button type="button" variant="ghost" onClick={onClose} className="w-full">
              Continuă Gratuit
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
