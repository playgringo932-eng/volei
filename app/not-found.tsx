import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center text-white text-2xl font-black mb-4 shadow-lg">
        404
      </div>
      <h2 className="text-xl font-black text-slate-900 mb-2">Página Não Encontrada</h2>
      <p className="text-xs text-slate-500 max-w-sm mb-6">
        A rota solicitada não existe ou foi movida no sistema oficial da Academia VoleiAraça.
      </p>
      <Link
        href="/"
        className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-colors"
      >
        Voltar para a Página Inicial
      </Link>
    </div>
  );
}
