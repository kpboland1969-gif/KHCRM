import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0b0f19]">
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl max-w-lg w-full flex flex-col items-center">
        <h1 className="text-2xl font-bold text-white mb-2">Page not found</h1>
        <p className="text-white/80 mb-4 text-center">
          Sorry, the page you requested does not exist.
        </p>
        <Link
          href="/dashboard"
          className="mt-2 mb-4 px-4 py-2 rounded-lg bg-white/10 text-white font-semibold hover:bg-white/20 transition"
        >
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}
