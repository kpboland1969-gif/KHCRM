'use client';
import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[dashboard/error]', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0b0f19]">
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl max-w-lg w-full flex flex-col items-center">
        <h1 className="text-2xl font-bold text-white mb-2">Dashboard error</h1>
        <p className="text-white/80 mb-4 text-center">
          An error occurred in the dashboard. Please try again or contact support if the problem
          persists.
        </p>
        <button
          className="mt-2 mb-4 px-4 py-2 rounded-lg bg-white/10 text-white font-semibold hover:bg-white/20 transition"
          onClick={reset}
        >
          Try again
        </button>
        {error.digest && (
          <div className="mt-2 text-xs text-white/50 bg-black/20 rounded p-2 w-full text-center">
            Error code: {error.digest}
          </div>
        )}
      </div>
    </div>
  );
}
