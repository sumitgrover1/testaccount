import type { Metadata } from 'next';
import { CompareTool } from '@/components/CompareTool';

export const metadata: Metadata = {
  title: 'Compare vehicles side by side',
  description:
    'Compare up to four variants of cars, bikes, buses or tractors on price, engine, mileage and full specifications.',
};

export default function ComparePage() {
  return (
    <div className="container-page py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Compare vehicles</h1>
        <p className="mt-1 text-sm text-slate-500">
          Add two to four variants to see price, engine, mileage and the full spec sheet side by side.
        </p>
      </header>
      <CompareTool />
    </div>
  );
}
