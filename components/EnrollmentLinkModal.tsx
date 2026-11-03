'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Copy,
  Check,
  Share2,
  ExternalLink,
  QrCode,
  Printer,
  Sparkles,
  Users,
  CheckCircle2,
  Calendar,
  MapPin,
} from 'lucide-react';
import { QRCodeDisplay } from '@/components/QRCodeDisplay';

interface EnrollmentLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function EnrollmentLinkModal({ isOpen, onClose }: EnrollmentLinkModalProps) {
  const [copied, setCopied] = useState(false);
  const enrollmentUrl = typeof window !== 'undefined' ? `${window.location.origin}/inscricao` : '/inscricao';

  if (!isOpen) return null;

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard && enrollmentUrl) {
        await navigator.clipboard.writeText(enrollmentUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch (err) {
      console.error('Erro ao copiar link:', err);
    }
  };

  const handleShareWhatsApp = () => {
    const text = `🏐 *SECRETARIA DE ESPORTES DE ARAÇARIGUAMA - VÔLEI JUVENIL (07 A 17 ANOS)*\n\nOlá pais e responsáveis! Estão abertas as inscrições oficiais para as turmas de Voleibol.\n\n👉 *Faça a inscrição online pelo link oficial:*\n${enrollmentUrl}\n\n✅ Vagas gratuitas\n✅ Categorias Sub-10, Sub-13 e Sub-17\n✅ Matrícula e carteirinha digital geradas na hora!\n\n_Secretaria Municipal de Esportes, Lazer e Eventos • Araçariguama-SP_`;
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  const handlePrintFlyer = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Cartaz de Inscrições - VoleiAraça</title>
          <style>
            @page { size: A4 portrait; margin: 15mm; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              color: #0f172a;
              text-align: center;
              padding: 20px;
              margin: 0;
            }
            .border-wrap {
              border: 4px solid #1d4ed8;
              border-radius: 20px;
              padding: 40px 30px;
              max-width: 650px;
              margin: 0 auto;
            }
            .badge {
              display: inline-block;
              background-color: #dbeafe;
              color: #1e40af;
              font-weight: 800;
              font-size: 14px;
              padding: 6px 16px;
              border-radius: 9999px;
              text-transform: uppercase;
              letter-spacing: 0.05em;
              margin-bottom: 15px;
            }
            h1 {
              font-size: 32px;
              margin: 0 0 10px 0;
              color: #1e3a8a;
              font-weight: 900;
            }
            h2 {
              font-size: 18px;
              font-weight: 600;
              color: #475569;
              margin: 0 0 30px 0;
            }
            .qr-box {
              background: #f8fafc;
              border: 2px dashed #93c5fd;
              border-radius: 16px;
              padding: 24px;
              display: inline-block;
              margin-bottom: 25px;
            }
            .link-text {
              font-size: 15px;
              font-weight: bold;
              color: #2563eb;
              word-break: break-all;
              margin-top: 15px;
            }
            .instructions {
              font-size: 16px;
              color: #334155;
              line-height: 1.6;
              margin: 20px 0;
            }
            .categories {
              display: flex;
              justify-content: center;
              gap: 15px;
              margin: 20px 0;
            }
            .cat-pill {
              background: #f1f5f9;
              border: 1px solid #cbd5e1;
              padding: 8px 14px;
              border-radius: 10px;
              font-weight: 700;
              font-size: 13px;
            }
            .footer {
              margin-top: 30px;
              font-size: 12px;
              color: #64748b;
              border-top: 1px solid #e2e8f0;
              padding-top: 15px;
            }
          </style>
        </head>
        <body>
          <div class="border-wrap">
            <span class="badge">Inscrições Oficiais Abertas</span>
            <h1>AULAS DE VOLEIBOL JUVENIL</h1>
            <h2>Secretaria Municipal de Esportes, Lazer e Eventos • Araçariguama-SP</h2>

            <div class="categories">
              <span class="cat-pill">🏐 Sub-10 (07 a 10 anos)</span>
              <span class="cat-pill">🏐 Sub-13 (11 a 13 anos)</span>
              <span class="cat-pill">🏐 Sub-17 (14 a 17 anos)</span>
            </div>

            <p class="instructions">
              <strong>Aponte a câmera do seu celular para o QR Code abaixo</strong><br />
              e preencha o formulário de matrícula online:
            </p>

            <div class="qr-box">
              <img src="https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(enrollmentUrl)}" width="220" height="220" alt="QR Code Inscrição" />
              <div class="link-text">${enrollmentUrl}</div>
            </div>

            <p class="instructions" style="font-size: 14px; color: #64748b;">
              100% Gratuito • Quadra Municipal • Araçariguama-SP
            </p>

            <div class="footer">
              Sistema Oficial desenvolvido por Hian Salles • Prefeitura de Araçariguama
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header com Identidade Araçariguama */}
        <div className="bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 text-white p-5 sm:p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-xl text-blue-100 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Fechar janela"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-white/10 p-2 backdrop-blur-xs flex items-center justify-center border border-white/20">
              <Share2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/90 text-white">
                  Link Ativo & Conectado
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-blue-500/40 text-blue-100">
                  07 a 17 Anos
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight mt-1">
                Link de Inscrição Oficial
              </h2>
              <p className="text-xs text-blue-200 font-medium">
                Secretaria Municipal de Esportes, Lazer e Eventos • Araçariguama-SP
              </p>
            </div>
          </div>
        </div>

        {/* Conteúdo com Rolagem */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Caixa de Explicação */}
          <div className="bg-blue-50/80 border border-blue-200 rounded-2xl p-4 flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
            <div className="text-xs text-blue-900 leading-relaxed">
              <span className="font-bold">Integração em Tempo Real: </span>
              Envie este link para pais e responsáveis. Ao finalizarem o preenchimento, o novo aluno aparece 
              <span className="font-bold text-emerald-800"> automaticamente</span> na lista de matrículas deste sistema,
              com número oficial gerado, categoria atribuída (Sub-10, Sub-13 ou Sub-17) e carteirinha com QR Code pronta.
            </div>
          </div>

          {/* Campo de Copiar Link */}
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-wide text-slate-700 flex items-center justify-between">
              <span>Link Público de Inscrição</span>
              {copied && (
                <span className="text-emerald-600 font-bold flex items-center gap-1 animate-pulse">
                  <Check className="w-3.5 h-3.5" /> Link copiado!
                </span>
              )}
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  readOnly
                  value={enrollmentUrl || 'Carregando link...'}
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                  className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-3.5 py-3 text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:border-blue-600 font-mono select-all"
                />
              </div>
              <button
                onClick={handleCopyLink}
                className={`flex items-center gap-1.5 px-4 sm:px-5 py-3 rounded-xl font-black text-xs transition-all active:scale-95 cursor-pointer shadow-xs ${
                  copied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copiado!' : 'Copiar'}</span>
              </button>
            </div>
          </div>

          {/* Ações Rápidas: WhatsApp e Visualizar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={handleShareWhatsApp}
              className="flex items-center justify-center gap-2.5 px-4 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
              <span>Enviar no WhatsApp dos Pais</span>
            </button>

            <a
              href="/inscricao"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs sm:text-sm border border-slate-300 transition-all active:scale-95 text-center"
            >
              <ExternalLink className="w-4 h-4 text-slate-600" />
              <span>Abrir Página de Inscrição</span>
            </a>
          </div>

          {/* Seção com QR Code para Balcão / Cartaz */}
          <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200 flex flex-col sm:flex-row items-center gap-5">
            <div className="bg-white p-3 rounded-2xl border-2 border-blue-200 shadow-sm shrink-0">
              {enrollmentUrl ? (
                <QRCodeDisplay
                  value={enrollmentUrl}
                  size={140}
                  altText="QR Code para Inscrição nas Aulas de Vôlei"
                />
              ) : (
                <div className="w-[140px] h-[140px] bg-slate-100 animate-pulse rounded-xl" />
              )}
            </div>

            <div className="space-y-2 text-center sm:text-left flex-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[11px] font-bold">
                <QrCode className="w-3.5 h-3.5" />
                <span>QR Code para Balcão ou Cartaz da Quadra</span>
              </div>
              <h4 className="text-sm font-black text-slate-900">
                Imprima para os pais escanearem no ginásio
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Deixe o cartaz com o QR Code na secretaria do ginásio ou quadra poliesportiva. Os pais apontam a câmera e fazem o cadastro na hora pelo celular.
              </p>

              <button
                onClick={handlePrintFlyer}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-blue-900 font-bold text-xs border border-blue-200 shadow-xs transition-all cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-blue-700" />
                <span>Imprimir Cartaz com QR Code (A4)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Rodapé com Assinatura Oficial */}
        <div className="bg-slate-100 px-5 py-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          <span className="text-[11px] text-slate-500 font-semibold">
            Sistema Oficial desenvolvido por Hian Salles
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
