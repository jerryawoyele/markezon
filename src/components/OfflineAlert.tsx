import { useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';

export function OfflineAlert() {
  return (
    <div className="fixed inset-0 z-[9999] bg-black/95 flex flex-col items-center justify-center p-4">
      <div className="bg-red-900/60 border border-red-800 rounded-lg p-6 max-w-md text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-bold mb-2">You're offline</h2>
        <p className="text-white/80 mb-4">
          Please check your internet connection and try again. The app requires an internet connection to function.
        </p>
        <div className="animate-pulse flex items-center justify-center gap-2 text-white/60">
          <div className="w-2 h-2 bg-white/60 rounded-full"></div>
          <div className="w-2 h-2 bg-white/60 rounded-full"></div>
          <div className="w-2 h-2 bg-white/60 rounded-full"></div>
          <span>Waiting for connection</span>
        </div>
      </div>
    </div>
  );
} 