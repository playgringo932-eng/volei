import { SponsorLogo } from '@/types/volleyball';

export const DEFAULT_SPONSORS: SponsorLogo[] = [
  {
    id: 'sponsor-penalty',
    name: 'Penalty Esportes',
    category: 'Material Esportivo Oficial',
    isActive: true,
    logoUrl: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 50" width="160" height="50">
      <rect width="160" height="50" rx="8" fill="%230F172A"/>
      <path d="M18 16 C 26 12, 34 22, 28 34" stroke="%2338BDF8" stroke-width="4" fill="none" stroke-linecap="round"/>
      <circle cx="23" cy="25" r="3.5" fill="%2338BDF8"/>
      <text x="42" y="32" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="20" fill="%23FFFFFF" letter-spacing="1">PENALTY</text>
    </svg>`,
  },
  {
    id: 'sponsor-sicredi',
    name: 'Sicredi',
    category: 'Patrocinador Master',
    isActive: true,
    logoUrl: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 50" width="160" height="50">
      <rect width="160" height="50" rx="8" fill="%23007A33"/>
      <circle cx="24" cy="25" r="10" fill="%23FFFFFF"/>
      <path d="M24 18 L24 32 M17 25 L31 25" stroke="%23007A33" stroke-width="3" stroke-linecap="round"/>
      <text x="44" y="32" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="19" fill="%23FFFFFF" letter-spacing="0.5">Sicredi</text>
    </svg>`,
  },
  {
    id: 'sponsor-unimed',
    name: 'Unimed Saúde',
    category: 'Apoio Médico & Saúde',
    isActive: false,
    logoUrl: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 50" width="160" height="50">
      <rect width="160" height="50" rx="8" fill="%2300995D"/>
      <path d="M16 25 Q24 16 32 25 Q24 34 16 25 Z" fill="%23FFFFFF"/>
      <circle cx="24" cy="25" r="3" fill="%2300995D"/>
      <text x="42" y="32" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="18" fill="%23FFFFFF">Unimed</text>
    </svg>`,
  },
  {
    id: 'sponsor-prefeitura',
    name: 'Secretaria de Esportes',
    category: 'Apoio Institucional',
    isActive: false,
    logoUrl: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 50" width="160" height="50">
      <rect width="160" height="50" rx="8" fill="%231E3A8A"/>
      <polygon points="24,15 31,21 31,31 24,35 17,31 17,21" fill="%23FBBF24"/>
      <text x="42" y="24" font-family="Arial, Helvetica, sans-serif" font-weight="800" font-size="12" fill="%23FFFFFF">SEC. ESPORTES</text>
      <text x="42" y="36" font-family="Arial, Helvetica, sans-serif" font-weight="600" font-size="9" fill="%2393C5FD">INCENTIVO JOVEM</text>
    </svg>`,
  },
];
