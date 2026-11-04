import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center">
        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
          404
        </div>
        <h1 className="text-xl font-bold text-slate-900 mb-2">Página Não Encontrada</h1>
        <p className="text-sm text-slate-500 mb-6">
          O endereço solicitado não existe ou foi removido do sistema.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl text-sm transition-colors"
        >
          Voltar para o Início
        </Link>
      </div>
    </div>
  );
}
