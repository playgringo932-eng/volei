'use client';

import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  Plus,
  Trash2,
  Check,
  Building2,
  Image as ImageIcon,
  Sparkles,
  Link as LinkIcon,
  RotateCcw,
  Sliders,
} from 'lucide-react';
import { SponsorLogo } from '@/types/volleyball';
import { storageService } from '@/lib/storage';
import { DEFAULT_SPONSORS } from '@/lib/sponsorPresets';

interface SponsorsManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSponsorsChange?: () => void;
}

export function SponsorsManagerModal({
  isOpen,
  onClose,
  onSponsorsChange,
}: SponsorsManagerModalProps) {
  const [sponsors, setSponsors] = useState<SponsorLogo[]>(() => storageService.getSponsors());
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('Patrocinador Oficial');
  const [newLogoUrl, setNewLogoUrl] = useState('');
  const [logoSourceMode, setLogoSourceMode] = useState<'upload' | 'url'>('upload');
  const [sponsorSize, setSponsorSize] = useState<number>(() => storageService.getSponsorSize());
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setSponsors(storageService.getSponsors());
      setSponsorSize(storageService.getSponsorSize());
      setErrorMsg(null);
    }
  }

  // Subscribe to external storage updates
  React.useEffect(() => {
    const unsubscribe = storageService.subscribe(() => {
      setSponsors(storageService.getSponsors());
      setSponsorSize(storageService.getSponsorSize());
    });
    return () => unsubscribe();
  }, []);

  const showSaveNotice = (msg: string) => {
    setSaveSuccessNotice(msg);
    setTimeout(() => setSaveSuccessNotice(null), 2500);
  };

  const handleSizeChange = (newSize: number) => {
    setSponsorSize(newSize);
    storageService.saveSponsorSize(newSize);
    showSaveNotice(`Tamanho atualizado para ${newSize}px!`);
    if (onSponsorsChange) onSponsorsChange();
  };

  const reloadSponsors = () => {
    const fresh = storageService.getSponsors();
    setSponsors(fresh);
    if (onSponsorsChange) onSponsorsChange();
  };

  const handleToggle = (id: string) => {
    storageService.toggleSponsor(id);
    reloadSponsors();
    showSaveNotice('Visibilidade do patrocinador salva com sucesso!');
  };

  const handleDelete = (id: string) => {
    storageService.deleteSponsor(id);
    reloadSponsors();
    showSaveNotice('Patrocinador removido e alterações salvas!');
  };

  // Redimensiona o logotipo para formato leve e otimizado (evita exceder o limite do navegador)
  const resizeLogo = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const MAX_WIDTH = 300;
          const MAX_HEIGHT = 150;
          let width = img.width;
          let height = img.height;

          if (width > MAX_WIDTH || height > MAX_HEIGHT) {
            const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(e.target?.result as string);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => reject(new Error('Erro ao ler a imagem.'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Erro no arquivo.'));
      reader.readAsDataURL(file);
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Por favor selecione um arquivo de imagem válido (PNG, JPG, SVG, WebP).');
      return;
    }

    try {
      setErrorMsg(null);
      const optimizedBase64 = await resizeLogo(file);
      setNewLogoUrl(optimizedBase64);
    } catch {
      setErrorMsg('Não foi possível processar a imagem. Tente outra foto.');
    }
  };

  const handleSaveNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      setErrorMsg('Informe o nome do patrocinador.');
      return;
    }
    if (!newLogoUrl.trim()) {
      setErrorMsg('Envie uma imagem ou informe a URL do logotipo.');
      return;
    }

    const cleanSlug = newName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const newSponsor: SponsorLogo = {
      id: `sponsor-${cleanSlug}-${sponsors.length + 1}`,
      name: newName.trim(),
      category: newCategory.trim() || 'Patrocinador Oficial',
      logoUrl: newLogoUrl.trim(),
      isActive: true,
    };

    storageService.addSponsor(newSponsor);
    reloadSponsors();
    showSaveNotice(`Patrocinador "${newName.trim()}" cadastrado e salvo com sucesso!`);
    setIsAddingNew(false);
    setNewName('');
    setNewCategory('Patrocinador Oficial');
    setNewLogoUrl('');
    setErrorMsg(null);
  };

  const handleAddPreset = (preset: SponsorLogo) => {
    // Check if already in list
    const exists = sponsors.some((s) => s.name.toLowerCase() === preset.name.toLowerCase());
    if (exists) {
      // Toggle it to active
      const target = sponsors.find((s) => s.name.toLowerCase() === preset.name.toLowerCase());
      if (target && !target.isActive) {
        storageService.toggleSponsor(target.id);
        reloadSponsors();
        showSaveNotice(`Patrocinador "${target.name}" ativado com sucesso!`);
      }
      return;
    }

    const toAdd: SponsorLogo = {
      ...preset,
      id: `sponsor-preset-${preset.id}-${sponsors.length + 1}`,
      isActive: true,
    };
    storageService.addSponsor(toAdd);
    reloadSponsors();
    showSaveNotice(`Patrocinador "${preset.name}" adicionado e salvo com sucesso!`);
  };

  const handleResetToDefaults = () => {
    storageService.saveSponsors(DEFAULT_SPONSORS);
    reloadSponsors();
    showSaveNotice('Patrocinadores restaurados para os padrões com sucesso!');
  };

  if (!isOpen) return null;

  const activeCount = sponsors.filter((s) => s.isActive).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-700 to-blue-800 text-white p-5 px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white shrink-0 border border-white/20">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg">Logos de Patrocinadores</h3>
              <p className="text-xs text-blue-100 font-medium">
                Exibidos no espaço oficial abaixo da foto na carteirinha ({activeCount} ativos)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
          {/* Banner de Confirmação de Salvamento Automático */}
          {saveSuccessNotice && (
            <div className="bg-emerald-50 border-2 border-emerald-500 rounded-2xl p-3 text-xs font-bold text-emerald-900 flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[3]" />
              <span>{saveSuccessNotice}</span>
            </div>
          )}

          {/* Info Banner */}
          <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-3.5 text-xs text-blue-900 flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              Os patrocinadores marcados como <strong>ativos</strong> são <strong>salvos automaticamente</strong> e aparecerão no verso de todas as carteirinhas de atletas.
            </div>
          </div>

          {/* Ajuste de Tamanho do Patrocínio */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-blue-600" />
                  <span>Tamanho do Patrocínio na Carteirinha</span>
                </span>
                <span className="text-[11px] text-slate-500">
                  Ajuste a altura dos logotipos para encaixar perfeitamente abaixo da foto
                </span>
              </div>
              <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-blue-100 text-blue-900 font-mono">
                {sponsorSize}px
              </span>
            </div>

            {/* Presets de tamanho */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'Pequeno', size: 20 },
                { label: 'Médio', size: 26 },
                { label: 'Grande', size: 34 },
                { label: 'Extra', size: 44 },
              ].map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => handleSizeChange(preset.size)}
                  className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    sponsorSize === preset.size
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white text-slate-700 border border-slate-200 hover:border-blue-300'
                  }`}
                >
                  {preset.label} ({preset.size}px)
                </button>
              ))}
            </div>

            {/* Slider de pixel */}
            <div className="flex items-center gap-3 pt-1">
              <span className="text-[10px] font-bold text-slate-400">16px</span>
              <input
                type="range"
                min="16"
                max="54"
                step="2"
                value={sponsorSize}
                onChange={(e) => handleSizeChange(parseInt(e.target.value, 10))}
                className="w-full accent-blue-600 cursor-pointer"
              />
              <span className="text-[10px] font-bold text-slate-400">54px</span>
            </div>
          </div>

          {/* Quick Add Presets Bar */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Sugestões Rápidas de Patrocínio
              </span>
              <button
                type="button"
                onClick={handleResetToDefaults}
                className="text-[11px] text-blue-700 hover:text-blue-900 font-semibold flex items-center gap-1 hover:underline cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Restaurar padrões</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {DEFAULT_SPONSORS.map((preset) => {
                const isCurrentActive = sponsors.some(
                  (s) => s.name.toLowerCase() === preset.name.toLowerCase() && s.isActive
                );

                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleAddPreset(preset)}
                    className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between h-20 ${
                      isCurrentActive
                        ? 'bg-blue-50/70 border-blue-400 ring-2 ring-blue-500/20'
                        : 'bg-slate-50 border-slate-200 hover:border-blue-300 hover:bg-white'
                    }`}
                  >
                    <div className="h-7 w-full flex items-center justify-start overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={preset.logoUrl}
                        alt={preset.name}
                        className="max-h-7 max-w-full object-contain"
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-800 w-full mt-1">
                      <span className="truncate">{preset.name}</span>
                      {isCurrentActive && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0 ml-1" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Current Sponsors List */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Patrocinadores Cadastrados ({sponsors.length})
              </span>
              {!isAddingNew && (
                <button
                  type="button"
                  onClick={() => setIsAddingNew(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-all active:scale-95 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Novo Patrocinador</span>
                </button>
              )}
            </div>

            {sponsors.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-300 rounded-2xl text-xs text-slate-400">
                Nenhum patrocinador cadastrado. Clique no botão acima ou selecione uma sugestão para adicionar.
              </div>
            ) : (
              <div className="space-y-2.5">
                {sponsors.map((sp) => (
                  <div
                    key={sp.id}
                    className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                      sp.isActive
                        ? 'bg-white border-blue-300 shadow-xs ring-1 ring-blue-500/10'
                        : 'bg-slate-50 border-slate-200 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Logo thumbnail */}
                      <div className="w-16 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center p-1 shrink-0 overflow-hidden shadow-2xs">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={sp.logoUrl}
                          alt={sp.name}
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>

                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                          {sp.name}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">
                          {sp.category || 'Patrocinador Oficial'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Active toggle button */}
                      <button
                        type="button"
                        onClick={() => handleToggle(sp.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          sp.isActive
                            ? 'bg-blue-100 text-blue-800 border border-blue-300'
                            : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                        }`}
                        title={sp.isActive ? 'Ativo na carteirinha (clique para ocultar)' : 'Oculto (clique para exibir)'}
                      >
                        {sp.isActive ? '✓ Exibir' : 'Oculto'}
                      </button>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => handleDelete(sp.id)}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
                        title="Remover Patrocinador"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Form to Add Custom Sponsor */}
          {isAddingNew && (
            <div className="bg-slate-50 border-2 border-blue-400/80 rounded-2xl p-4 sm:p-5 space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-blue-600" />
                  <span>Cadastrar Novo Patrocinador</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setIsAddingNew(false)}
                  className="text-xs text-slate-400 hover:text-slate-600 font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
              </div>

              {errorMsg && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-semibold">
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleSaveNew} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nome da Empresa / Marca *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Farmácia São João, Auto Posto Central..."
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Categoria ou Tipo de Apoio
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Patrocinador Master, Apoio Nutricional, Apoio de Transporte..."
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>

                {/* Logo input mode */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      Logotipo da Marca *
                    </label>
                    <div className="flex items-center gap-1 text-[11px] font-semibold">
                      <button
                        type="button"
                        onClick={() => setLogoSourceMode('upload')}
                        className={`px-2 py-0.5 rounded-lg transition-colors cursor-pointer ${
                          logoSourceMode === 'upload' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-200'
                        }`}
                      >
                        Enviar Imagem
                      </button>
                      <button
                        type="button"
                        onClick={() => setLogoSourceMode('url')}
                        className={`px-2 py-0.5 rounded-lg transition-colors cursor-pointer ${
                          logoSourceMode === 'url' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-200'
                        }`}
                      >
                        Inserir Link/URL
                      </button>
                    </div>
                  </div>

                  {logoSourceMode === 'upload' ? (
                    <div>
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full border-2 border-dashed border-slate-300 hover:border-blue-500 bg-white rounded-xl p-4 text-center cursor-pointer transition-colors flex flex-col items-center justify-center gap-1.5"
                      >
                        <Upload className="w-5 h-5 text-blue-600" />
                        <span className="text-xs font-bold text-blue-900">
                          {newLogoUrl ? 'Trocar Imagem Selecionada' : 'Clique para selecionar imagem do seu computador'}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Formatos aceitos: PNG (com fundo transparente), JPG, SVG, WebP (máx. 2MB)
                        </span>
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <LinkIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
                      <input
                        type="url"
                        placeholder="https://exemplo.com/logo-patrocinador.png"
                        value={newLogoUrl}
                        onChange={(e) => setNewLogoUrl(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-3.5 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-600"
                      />
                    </div>
                  )}

                  {/* Logo Preview */}
                  {newLogoUrl && (
                    <div className="mt-2.5 p-3 bg-white border border-slate-200 rounded-xl flex items-center gap-3">
                      <div className="w-20 h-10 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center p-1 shrink-0 overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={newLogoUrl}
                          alt="Pré-visualização do logotipo"
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                      <div className="text-[11px] text-slate-600 leading-tight">
                        <strong className="text-emerald-700 block">✓ Logo carregado com sucesso!</strong>
                        <span>Esta imagem será ajustada automaticamente para caber na carteirinha.</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingNew(false)}
                    className="px-4 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-all active:scale-95 cursor-pointer"
                  >
                    <Check className="w-4 h-4 stroke-[2.5]" />
                    <span>Salvar Patrocinador</span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 px-6 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500">
            {activeCount === 0
              ? 'Nenhum patrocinador ativo no momento.'
              : `${activeCount} ${activeCount === 1 ? 'patrocinador ativo' : 'patrocinadores ativos'} na carteirinha.`}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
          >
            Concluir e Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
