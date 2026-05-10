'use client';

import Link from 'next/link';
import { Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex-center min-h-screen flex-col gap-6 p-4 text-center">
      <div className="glass p-12 max-w-md animate-fade">
        <h1 className="text-8xl font-bold gradient-text mb-4">404</h1>
        <h2 className="text-2xl font-semibold mb-2">Página no encontrada</h2>
        <p className="text-secondary mb-8">Parece que te has perdido en la matriz de la productividad.</p>
        
        <Link href="/" className="inline-flex items-center gap-2 bg-white text-black px-6 py-3 rounded-xl font-bold transition-all hover:-translate-y-1 hover:shadow-lg">
          <Home size={20} />
          Volver al Inicio
        </Link>
      </div>

      <style jsx>{`
        .flex-center {
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .gradient-text {
          background: linear-gradient(135deg, var(--color-q2), var(--color-q1));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .text-secondary {
          color: var(--text-secondary);
        }
      `}</style>
    </div>
  );
}
