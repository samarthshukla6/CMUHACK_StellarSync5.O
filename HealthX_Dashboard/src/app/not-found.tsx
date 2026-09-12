import Link from "next/link";

export default function NotFoundPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-white">
      <div className="text-center px-6">
        <p className="text-indigo-600 font-bold text-6xl">404</p>
        <h1 className="font-semibold text-2xl text-slate-900 mt-4">Page not found</h1>
        <p className="text-slate-500 mt-2">This page does not exist.</p>
        <Link
          href="/"
          className="inline-block mt-6 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Back to trip planner
        </Link>
      </div>
    </div>
  );
}
