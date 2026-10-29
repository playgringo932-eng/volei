'use client';

import React, { useMemo } from 'react';
import QRCode from 'qrcode';

interface QRCodeDisplayProps {
  value: string;
  size?: number;
  className?: string;
  altText?: string;
  colorDark?: string;
  colorLight?: string;
}

/**
 * High-performance, zero-delay SVG QR Code component.
 * Uses synchronous matrix calculation for instant rendering (no canvas delay or blank flash).
 */
export function QRCodeDisplay({
  value,
  size = 120,
  className = '',
  altText = 'QR Code de Presença do Aluno',
  colorDark = '#0F2A4A',
  colorLight = '#FFFFFF',
}: QRCodeDisplayProps) {
  const qrSvgData = useMemo(() => {
    try {
      const qr = QRCode.create(value || 'VOLEIPRO-DEMO', {
        errorCorrectionLevel: 'M',
      });
      const moduleCount = qr.modules.size;
      const margin = 1;
      const totalSize = moduleCount + margin * 2;
      const rects: string[] = [];

      for (let row = 0; row < moduleCount; row++) {
        for (let col = 0; col < moduleCount; col++) {
          if (qr.modules.get(row, col)) {
            rects.push(`M${col + margin},${row + margin}h1v1h-1z`);
          }
        }
      }

      return {
        viewBox: `0 0 ${totalSize} ${totalSize}`,
        path: rects.join(' '),
      };
    } catch (err) {
      console.error('Erro ao gerar matriz de QR Code:', err);
      return null;
    }
  }, [value]);

  if (!qrSvgData) {
    return (
      <div
        style={{ width: size, height: size }}
        className={`bg-slate-100 border border-slate-300 rounded-lg flex flex-col items-center justify-center text-[10px] text-blue-900 font-bold p-1 text-center ${className}`}
      >
        <span>QR CODE</span>
      </div>
    );
  }

  return (
    <div
      className={`relative inline-flex items-center justify-center bg-white rounded-lg p-1 border-2 border-blue-300 shadow-2xs ${className}`}
      style={{ width: size, height: size }}
      title={altText}
    >
      <svg
        viewBox={qrSvgData.viewBox}
        className="w-full h-full"
        shapeRendering="crispEdges"
        role="img"
        aria-label={altText}
      >
        <rect width="100%" height="100%" fill={colorLight} />
        <path d={qrSvgData.path} fill={colorDark} />
      </svg>
    </div>
  );
}
