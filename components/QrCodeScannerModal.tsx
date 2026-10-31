'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Camera,
  CheckCircle2,
  AlertCircle,
  Upload,
  Volume2,
  VolumeX,
  RefreshCw,
  Zap,
  Sparkles,
  Keyboard,
  History,
  Users,
  Search,
  CheckCheck,
} from 'lucide-react';
import jsQR from 'jsqr';
import { Student, VolleyballClass } from '@/types/volleyball';
import { storageService } from '@/lib/storage';
import { getAthletePhoto } from '@/lib/avatarHelpers';

export interface CheckInRecord {
  id: string;
  studentId: string;
  studentName: string;
  photoUrl: string;
  registrationNumber: string;
  className: string;
  shift: string;
  timestamp: string;
  alreadyPresent: boolean;
}

interface QrCodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  classes: VolleyballClass[];
  selectedClassId?: string;
  selectedDate?: string;
  initialCode?: string;
  onCheckInSuccess?: (student: Student) => void;
}

export function QrCodeScannerModal({
  isOpen,
  onClose,
  students,
  classes,
  selectedClassId: propClassId,
  selectedDate: propSelectedDate,
  initialCode,
  onCheckInSuccess,
}: QrCodeScannerModalProps) {
  const [activeTab, setActiveTab] = useState<'camera' | 'upload' | 'manual'>('camera');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [lastCheckIn, setLastCheckIn] = useState<CheckInRecord | null>(null);
  const [checkInHistory, setCheckInHistory] = useState<CheckInRecord[]>([]);
  const [manualInput, setManualInput] = useState('');
  const [rosterSearch, setRosterSearch] = useState('');
  const [scanMessage, setScanMessage] = useState<{ type: 'success' | 'warning' | 'error'; text: string } | null>(null);

  // Active session context using overrides to avoid cascading renders
  const [selectedClassOverride, setSelectedClassOverride] = useState<string | null>(null);
  const [selectedDateOverride, setSelectedDateOverride] = useState<string | null>(null);

  const targetClassId = selectedClassOverride || propClassId || classes[0]?.id || '';
  const activeDate = selectedDateOverride || propSelectedDate || '2026-10-29';

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastScannedCodeRef = useRef<string>('');
  const lastScannedTimeRef = useRef<number>(0);
  const lastScanAttemptTimeRef = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isMountedRef = useRef<boolean>(true);
  const processFrameRef = useRef<() => void>(() => {});

  // Audio feedback via Web Audio API synth
  const playBeep = useCallback(
    (isSuccess = true) => {
      if (!soundEnabled || typeof window === 'undefined') return;
      try {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        if (isSuccess) {
          osc.frequency.setValueAtTime(880, ctx.currentTime);
          osc.frequency.setValueAtTime(1320, ctx.currentTime + 0.08);
          gain.gain.setValueAtTime(0.3, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.25);
        } else {
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(320, ctx.currentTime);
          gain.gain.setValueAtTime(0.2, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.25);
        }
      } catch {
        // AudioContext disabled or blocked
      }
    },
    [soundEnabled]
  );

  // Haptic feedback
  const triggerHaptic = useCallback(() => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([80, 50, 100]);
      } catch {
        // ignore
      }
    }
  }, []);

  // Process a decoded QR code, registration number, or student ID
  const handleProcessCode = useCallback(
    (rawCode: string) => {
      const trimmed = (rawCode || '').trim();
      if (!trimmed) return;

      // Cooldown check: avoid scanning the exact same code repeatedly within 2 seconds
      const now = Date.now();
      if (trimmed === lastScannedCodeRef.current && now - lastScannedTimeRef.current < 2000) {
        return;
      }
      lastScannedCodeRef.current = trimmed;
      lastScannedTimeRef.current = now;

      const result = storageService.checkInStudentByQrCode(trimmed, activeDate, targetClassId);

      if (result.success && result.student && result.classObj) {
        playBeep(true);
        triggerHaptic();

        const photoUrl =
          result.student.photoUrl ||
          getAthletePhoto(result.student.fullName, result.student.gender, result.student.jerseyNumber);

        const record: CheckInRecord = {
          id: `${result.student.id}_${now}`,
          studentId: result.student.id,
          studentName: result.student.fullName,
          photoUrl,
          registrationNumber: result.student.registrationNumber,
          className: result.classObj.name,
          shift: result.classObj.shift,
          timestamp: result.timestamp,
          alreadyPresent: !!result.alreadyPresent,
        };

        setLastCheckIn(record);
        setCheckInHistory((prev) => [record, ...prev.filter((r) => r.studentId !== record.studentId).slice(0, 9)]);
        setScanMessage({
          type: result.alreadyPresent ? 'warning' : 'success',
          text: result.message,
        });

        if (onCheckInSuccess) {
          onCheckInSuccess(result.student);
        }
      } else {
        playBeep(false);
        setScanMessage({
          type: 'error',
          text: result.message || 'Código não reconhecido no sistema.',
        });
      }
    },
    [activeDate, targetClassId, onCheckInSuccess, playBeep, triggerHaptic]
  );

  // Process initialCode on open in a microtask/timer to avoid cascading render lint
  useEffect(() => {
    if (isOpen && initialCode) {
      const timer = setTimeout(() => {
        if (isMountedRef.current) {
          handleProcessCode(initialCode);
        }
      }, 80);
      return () => clearTimeout(timer);
    }
  }, [isOpen, initialCode, handleProcessCode]);

  // Frame processing loop with throttling and resolution scaling
  useEffect(() => {
    processFrameRef.current = () => {
      if (!videoRef.current || !canvasRef.current) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;

      const now = Date.now();
      // Scan every 60ms with higher resolution (up to 960px) for instant autofocus and scan from distance
      if (now - lastScanAttemptTimeRef.current >= 60) {
        lastScanAttemptTimeRef.current = now;

        if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
          const scale = Math.min(1, 960 / video.videoWidth);
          const targetWidth = Math.round(video.videoWidth * scale);
          const targetHeight = Math.round(video.videoHeight * scale);

          if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
            canvas.width = targetWidth;
            canvas.height = targetHeight;
          }

          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (ctx) {
            ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
            const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);

            // Decode QR code with inversion attempts enabled
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: 'attemptBoth',
            });

            if (code && code.data) {
              handleProcessCode(code.data);
            }
          }
        }
      }

      if (isMountedRef.current && isOpen && activeTab === 'camera') {
        animationFrameRef.current = requestAnimationFrame(() => {
          processFrameRef.current();
        });
      }
    };
  }, [isOpen, activeTab, handleProcessCode]);

  // Camera initialization with fallbacks
  useEffect(() => {
    isMountedRef.current = true;

    if (!isOpen || activeTab !== 'camera') {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      return;
    }

    const initCamera = async () => {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        if (isMountedRef.current) {
          setCameraError('Câmera não suportada neste navegador ou ambiente.');
        }
        return;
      }

      // Clean up any existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }

      let stream: MediaStream | null = null;

      // Attempt 1: FacingMode with optimal resolution
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: facingMode,
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch (firstErr) {
        console.warn('Initial facingMode camera request failed, falling back to any video camera:', firstErr);
        // Attempt 2: Fallback to any camera without facingMode (crucial for PCs, laptops, external webcams)
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        } catch (fallbackErr) {
          console.error('All camera requests failed:', fallbackErr);
          if (isMountedRef.current) {
            setCameraError('Permissão de câmera negada ou nenhuma webcam disponível.');
            setIsScanning(false);
          }
          return;
        }
      }

      if (!isMountedRef.current || !stream) {
        stream?.getTracks().forEach((t) => t.stop());
        return;
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.muted = true;

        try {
          await videoRef.current.play();
        } catch (playErr) {
          console.warn('Autoplay waiting for user interaction:', playErr);
        }

        if (isMountedRef.current) {
          setCameraError(null);
          setIsScanning(true);
          animationFrameRef.current = requestAnimationFrame(() => {
            processFrameRef.current();
          });
        }
      }
    };

    initCamera();

    return () => {
      isMountedRef.current = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [isOpen, activeTab, facingMode]);

  // Scan uploaded image file
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Downscale large camera photos to max 1200px for instant decoding
        const maxDim = 1200;
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const offscreenCanvas = document.createElement('canvas');
        offscreenCanvas.width = width;
        offscreenCanvas.height = height;
        const ctx = offscreenCanvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const imageData = ctx.getImageData(0, 0, width, height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'attemptBoth',
          });

          if (code && code.data) {
            handleProcessCode(code.data);
          } else {
            playBeep(false);
            setScanMessage({
              type: 'error',
              text: 'Nenhum QR Code legível foi detectado nesta imagem. Tente uma foto mais aproximada e nítida.',
            });
          }
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Manual code submission
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    handleProcessCode(manualInput.trim());
    setManualInput('');
  };

  // Filter roster for quick simulation
  const filteredRoster = students.filter((s) => {
    if (!rosterSearch.trim()) return true;
    const q = rosterSearch.toLowerCase();
    return (
      s.fullName.toLowerCase().includes(q) ||
      s.registrationNumber.toLowerCase().includes(q) ||
      s.category.toLowerCase().includes(q)
    );
  });

  if (!isOpen) return null;

  const currentClassObj = classes.find((c) => c.id === targetClassId) || classes[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl border-2 border-blue-600 w-full max-w-2xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        {/* Header - Blue & White Theme */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-700 to-blue-800 text-white flex items-center justify-between border-b-2 border-blue-900 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white text-blue-700 flex items-center justify-center font-bold shadow-xs">
              <Camera className="w-5 h-5 text-blue-700" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-extrabold tracking-tight">
                  Leitor de QR Code — Chamada Automática
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500 text-white flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                  Ao Vivo
                </span>
              </div>
              <p className="text-xs text-blue-100">
                Aproxime o QR Code da carteirinha do atleta para registrar presença instantânea
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'Silenciar bip de leitura' : 'Ativar bip de leitura'}
              className="p-2 rounded-xl bg-blue-800/80 hover:bg-blue-800 text-white transition-colors"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-blue-300" />}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-blue-800/80 hover:bg-blue-900 text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Session Context Bar: Target Class & Date */}
        <div className="bg-blue-50/90 px-4 py-2 border-b border-blue-200/80 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-slate-600 font-bold">Turma:</span>
            <select
              value={targetClassId}
              onChange={(e) => setSelectedClassOverride(e.target.value)}
              className="bg-white border border-blue-300 text-blue-950 font-bold px-2.5 py-1 rounded-lg text-xs focus:outline-none focus:border-blue-600"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  [{c.shift}] {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-600 font-bold">Data:</span>
            <input
              type="date"
              value={activeDate}
              onChange={(e) => setSelectedDateOverride(e.target.value)}
              className="bg-white border border-blue-300 text-blue-950 font-mono font-bold px-2 py-1 rounded-lg text-xs focus:outline-none focus:border-blue-600"
            />
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="bg-slate-100 p-2 border-b border-slate-200 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setActiveTab('camera')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'camera'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-blue-900 hover:bg-white'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Câmera do Dispositivo</span>
            </button>

            <button
              onClick={() => setActiveTab('upload')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'upload'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-blue-900 hover:bg-white'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Enviar Foto / Imagem</span>
            </button>

            <button
              onClick={() => setActiveTab('manual')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'manual'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-blue-900 hover:bg-white'
              }`}
            >
              <Keyboard className="w-3.5 h-3.5" />
              <span>Lista de Alunos & Teste Rápido</span>
            </button>
          </div>
        </div>

        {/* Scanner Content Area */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          {/* TAB 1: LIVE CAMERA */}
          {activeTab === 'camera' && (
            <div className="space-y-3">
              <div className="relative w-full aspect-video sm:aspect-[4/3] bg-slate-950 rounded-2xl overflow-hidden border-2 border-blue-500 shadow-inner flex items-center justify-center">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  autoPlay
                  playsInline
                  muted
                />
                <canvas ref={canvasRef} className="hidden" />

                {/* Volleyball Court Demarcation Viewfinder Overlay */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6">
                  <div className="w-60 h-60 sm:w-68 sm:h-68 border-2 border-white/80 rounded-2xl relative shadow-[0_0_0_9999px_rgba(15,23,42,0.5)]">
                    {/* Court Net Line Demarcation in Viewfinder */}
                    <div className="absolute top-1/2 left-0 right-0 border-t-2 border-blue-400" />
                    <div className="absolute top-1/4 left-0 right-0 border-t border-dashed border-white/40" />
                    <div className="absolute bottom-1/4 left-0 right-0 border-t border-dashed border-white/40" />

                    {/* Corner Reticles */}
                    <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-cyan-400 rounded-tl-lg" />
                    <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-cyan-400 rounded-tr-lg" />
                    <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-cyan-400 rounded-bl-lg" />
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-cyan-400 rounded-br-lg" />

                    {/* Animated Scanning Laser */}
                    <div className="absolute left-2 right-2 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-bounce shadow-[0_0_12px_#38bdf8] top-1/2 -translate-y-1/2" />

                    <div className="absolute bottom-3 left-0 right-0 text-center">
                      <span className="bg-slate-900/85 text-white text-[10px] font-bold px-3 py-1 rounded-full border border-white/20">
                        Enquadre o QR Code da Carteirinha
                      </span>
                    </div>
                  </div>
                </div>

                {/* Camera error fallback */}
                {cameraError && (
                  <div className="absolute inset-0 bg-slate-900/90 text-white p-6 flex flex-col items-center justify-center text-center space-y-3 z-20">
                    <AlertCircle className="w-12 h-12 text-amber-400" />
                    <p className="text-sm font-bold text-amber-200">{cameraError}</p>
                    <p className="text-xs text-slate-300 max-w-sm">
                      Você pode usar os botões de <strong>Simulação Rápida</strong> logo abaixo, enviar uma foto na aba <strong>Enviar Foto</strong>, ou digitar a matrícula.
                    </p>
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => {
                          setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
                        }}
                        className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl"
                      >
                        Alternar Câmera
                      </button>
                      <button
                        onClick={() => setActiveTab('manual')}
                        className="px-3.5 py-1.5 bg-white text-slate-900 text-xs font-bold rounded-xl"
                      >
                        Lista de Alunos
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Controls bar below camera */}
              <div className="flex items-center justify-between text-xs text-slate-600 px-1">
                <div className="flex items-center gap-2">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                  <span className="font-semibold text-slate-700">Leitor ativo em tempo real</span>
                </div>

                <button
                  onClick={() => {
                    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 font-semibold text-slate-700 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
                  <span>Alternar Câmera</span>
                </button>
              </div>

              {/* Quick simulation bar: Click to simulate instant QR code read */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-blue-900 flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                    Simulação Instantânea (Clique em um atleta para registrar presença agora):
                  </span>
                  <button
                    onClick={() => setActiveTab('manual')}
                    className="text-blue-700 font-bold hover:underline cursor-pointer"
                  >
                    Ver Todos ({students.length})
                  </button>
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {students.slice(0, 6).map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => handleProcessCode(st.registrationNumber)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-blue-50 border border-slate-300 hover:border-blue-500 text-slate-800 text-xs font-bold shrink-0 transition-all active:scale-95 shadow-2xs cursor-pointer"
                    >
                      <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{st.fullName.split(' ')[0]}</span>
                      <span className="text-[10px] text-blue-700 font-mono">({st.registrationNumber})</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: UPLOAD IMAGE */}
          {activeTab === 'upload' && (
            <div className="space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-blue-400 hover:border-blue-600 rounded-3xl p-8 text-center cursor-pointer bg-blue-50/40 hover:bg-blue-50/80 transition-all flex flex-col items-center justify-center space-y-3"
              >
                <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md">
                  <Upload className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-blue-900">
                    Clique para selecionar a imagem da Carteirinha ou QR Code
                  </h4>
                  <p className="text-xs text-slate-500 pt-1">
                    Suporta imagens PNG, JPG, JPEG capturadas pelo celular ou câmera.
                  </p>
                </div>
                <button
                  type="button"
                  className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-xs"
                >
                  Procurar Arquivo de Imagem
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: MANUAL INPUT & ROSTER */}
          {activeTab === 'manual' && (
            <div className="space-y-4">
              <form onSubmit={handleManualSubmit} className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">
                  Digitar Número de Matrícula ou Código do Aluno
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    placeholder="Ex: VP-2026-0001 ou código completo"
                    className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white uppercase font-mono font-bold"
                  />
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                  >
                    Confirmar Presença
                  </button>
                </div>
              </form>

              {/* Search & Full Roster List */}
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-blue-600" />
                    Lista de Atletas — Clique em qualquer atleta para registrar presença:
                  </span>
                  <span className="text-[11px] text-slate-500 font-semibold">
                    {filteredRoster.length} atletas
                  </span>
                </div>

                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={rosterSearch}
                    onChange={(e) => setRosterSearch(e.target.value)}
                    placeholder="Filtrar por nome, matrícula ou categoria..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto p-1">
                  {filteredRoster.map((st) => {
                    const cls = classes.find((c) => c.id === st.classId);
                    const photo =
                      st.photoUrl || getAthletePhoto(st.fullName, st.gender, st.jerseyNumber);
                    return (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => handleProcessCode(st.registrationNumber)}
                        className="flex items-center gap-2.5 p-2 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/60 bg-white text-left transition-all group cursor-pointer"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={photo}
                          alt={st.fullName}
                          className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-slate-900 group-hover:text-blue-700 truncate">
                            {st.fullName}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono flex items-center justify-between">
                            <span>{st.registrationNumber}</span>
                            <span className="text-blue-700 font-bold">{cls?.name || 'Vôlei'}</span>
                          </div>
                        </div>
                        <div className="p-1 rounded-lg bg-emerald-50 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                          <CheckCheck className="w-4 h-4" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Alert / Notification Feedback Banner */}
          {scanMessage && (
            <div
              className={`p-3.5 rounded-2xl border flex items-center gap-2.5 text-xs font-bold animate-fadeIn ${
                scanMessage.type === 'success'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                  : scanMessage.type === 'warning'
                  ? 'bg-amber-50 border-amber-300 text-amber-900'
                  : 'bg-rose-50 border-rose-300 text-rose-800'
              }`}
            >
              {scanMessage.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
              )}
              <span className="flex-1">{scanMessage.text}</span>
              <button
                onClick={() => setScanMessage(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* Last Check-In Athlete Card */}
          {lastCheckIn && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-500 rounded-2xl p-4 shadow-sm relative overflow-hidden">
              <div className="absolute top-2 right-3 flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>Presença Confirmada</span>
              </div>

              <div className="flex items-center gap-3.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={lastCheckIn.photoUrl}
                  alt={lastCheckIn.studentName}
                  className="w-14 h-14 rounded-xl object-cover border-2 border-blue-600 shadow-xs shrink-0"
                />
                <div className="space-y-0.5 min-w-0">
                  <span className="text-[10px] font-mono font-bold text-blue-700 block">
                    {lastCheckIn.registrationNumber}
                  </span>
                  <h3 className="font-extrabold text-slate-900 text-sm truncate">
                    {lastCheckIn.studentName}
                  </h3>
                  <div className="text-[11px] text-slate-600 flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-blue-900">{lastCheckIn.className}</span>
                    <span>•</span>
                    <span>Turno: {lastCheckIn.shift}</span>
                    <span>•</span>
                    <span className="font-mono text-emerald-700 font-bold">
                      {lastCheckIn.timestamp}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Check-ins History of this session */}
          {checkInHistory.length > 0 && (
            <div className="border border-slate-200 rounded-2xl p-3 bg-slate-50 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-700 font-bold px-1">
                <div className="flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-blue-600" />
                  <span>Check-ins Recentes Desta Sessão ({checkInHistory.length})</span>
                </div>
                <span className="text-[10px] text-slate-500">Atualizado ao vivo</span>
              </div>

              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {checkInHistory.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white border border-slate-200 rounded-xl p-2 flex items-center justify-between text-xs shadow-2xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.photoUrl}
                        alt={item.studentName}
                        className="w-6 h-6 rounded-md object-cover border border-slate-200 shrink-0"
                      />
                      <span className="font-bold text-slate-900 truncate">{item.studentName}</span>
                      <span className="text-[10px] font-mono text-slate-500 hidden sm:inline">
                        ({item.registrationNumber})
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                        {item.className}
                      </span>
                      <span className="font-mono text-[10px] font-bold text-slate-600">
                        {item.timestamp}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>Presenças gravadas instantaneamente na turma {currentClassObj?.name}</span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
          >
            Concluir / Fechar Leitor
          </button>
        </div>
      </div>
    </div>
  );
}
