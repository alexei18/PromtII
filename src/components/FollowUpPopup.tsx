'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

interface FollowUpPopupProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export default function FollowUpPopup({
  isOpen,
  onOpenChange,
}: FollowUpPopupProps) {
  const router = useRouter();

  const handleConfirm = () => {
    router.push('/subscribe');
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Don't miss out!</DialogTitle>
          <DialogDescription>
            Get full access to all our premium features. Try our Starter plan for free for 7 days.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Maybe later
          </Button>
          <Button onClick={handleConfirm}>See plans</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
