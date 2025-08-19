'use client';

import { useEffect, useState } from 'react';
import FollowUpPopup from '@/components/FollowUpPopup';

export default function DashboardPage() {
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowPopup(true);
    }, 10000); // 10 seconds

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <h1 className="text-4xl font-bold">Dashboard</h1>
      <FollowUpPopup isOpen={showPopup} onOpenChange={setShowPopup} />
    </div>
  );
}
