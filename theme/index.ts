import { Platform } from 'react-native';

// ─── Raw Palette ─────────────────────────────────────────────────────
const palette = {
  navy: {
    950: '#03060E',
    900: '#060A14',
    800: '#090E1C',
    700: '#0D1424',
    600: '#11192E',
    500: '#172239',
    400: '#1D2C49',
    300: '#243558',
  },
  blue: {
    300: '#93C5FD',
    400: '#60A5FA',
    500: '#3B82F6',
    600: '#2563EB',
    700: '#1D4ED8',
  },
  emerald: {
    300: '#6EE7B7',
    400: '#34D399',
    500: '#10B981',
    600: '#059669',
  },
  amber: {
    300: '#FDE68A',
    400: '#FCD34D',
    500: '#F59E0B',
    600: '#D97706',
  },
  red: {
    300: '#FCA5A5',
    400: '#F87171',
    500: '#EF4444',
    600: '#DC2626',
  },
  violet: {
    300: '#C4B5FD',
    400: '#A78BFA',
    500: '#8B5CF6',
    600: '#7C3AED',
  },
  slate: {
    50:  '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A',
  },
};

// ─── Semantic Colors ─────────────────────────────────────────────────
export const Colors = {
  /* === Backgrounds === */
  bg: {
    base:     palette.navy[900],   // deepest layer — screen bg
    elevated: palette.navy[700],   // tab bar, modals
    card:     palette.navy[600],   // card bg
    surface:  palette.navy[500],   // interactive surface bg
    input:    palette.navy[800],   // text input bg
  },

  /* === Brand / Primary === */
  brand:       palette.blue[500],
  brandLight:  palette.blue[400],
  brandDark:   palette.blue[600],
  brandGlow:   'rgba(59,130,246,0.18)',
  brandBorder: 'rgba(59,130,246,0.28)',

  /* === Risk Semantic System === */
  risk: {
    safe: {
      main:   palette.emerald[500],
      light:  palette.emerald[400],
      bg:     'rgba(16,185,129,0.07)',
      bgHeavy:'rgba(16,185,129,0.14)',
      border: 'rgba(16,185,129,0.24)',
      glow:   'rgba(16,185,129,0.14)',
      badge:  'SIGUR',
    },
    medium: {
      main:   palette.amber[500],
      light:  palette.amber[400],
      bg:     'rgba(245,158,11,0.07)',
      bgHeavy:'rgba(245,158,11,0.14)',
      border: 'rgba(245,158,11,0.24)',
      glow:   'rgba(245,158,11,0.14)',
      badge:  'SUSPECT',
    },
    high: {
      main:   palette.red[500],
      light:  palette.red[400],
      bg:     'rgba(239,68,68,0.07)',
      bgHeavy:'rgba(239,68,68,0.14)',
      border: 'rgba(239,68,68,0.24)',
      glow:   'rgba(239,68,68,0.14)',
      badge:  'PERICULOS',
    },
    unknown: {
      main:   palette.violet[500],
      light:  palette.violet[400],
      bg:     'rgba(139,92,246,0.07)',
      bgHeavy:'rgba(139,92,246,0.14)',
      border: 'rgba(139,92,246,0.24)',
      glow:   'rgba(139,92,246,0.14)',
      badge:  'NECUNOSCUT',
    },
  },

  /* === Text Hierarchy === */
  text: {
    primary:   palette.slate[100],   // #F1F5F9
    secondary: palette.slate[300],   // #CBD5E1
    muted:     palette.slate[400],   // #94A3B8
    subtle:    palette.slate[500],   // #64748B
    inverse:   palette.navy[900],
  },

  /* === Borders === */
  border: {
    subtle:  'rgba(255,255,255,0.04)',
    default: 'rgba(255,255,255,0.08)',
    strong:  'rgba(255,255,255,0.15)',
  },

  /* === Glass overlays === */
  glass: {
    light: 'rgba(255,255,255,0.03)',
    mid:   'rgba(255,255,255,0.06)',
    heavy: 'rgba(255,255,255,0.10)',
  },

  // Utility
  palette,
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
};

// ─── Typography ──────────────────────────────────────────────────────
export const Typography = {
  size: {
    xs:    10,
    sm:    12,
    base:  14,
    md:    16,
    lg:    18,
    xl:    22,
    '2xl': 28,
    '3xl': 36,
    '4xl': 48,
  } as Record<string, number>,

  weight: {
    normal:    '400' as const,
    medium:    '500' as const,
    semibold:  '600' as const,
    bold:      '700' as const,
    extrabold: '800' as const,
    black:     '900' as const,
  },

  lineHeight: {
    xs:    14,
    sm:    18,
    base:  20,
    md:    24,
    lg:    28,
    xl:    32,
    '2xl': 38,
  } as Record<string, number>,

  tracking: {
    tighter: -0.6,
    tight:   -0.3,
    normal:   0,
    wide:     0.5,
    wider:    1.0,
    widest:   2.0,
  },

  family: {
    sans: Platform.select({ ios: 'System', android: 'sans-serif', default: 'System' }) ?? 'System',
    mono: Platform.select({ ios: 'Courier New', android: 'monospace', default: 'monospace' }) ?? 'monospace',
  },
};

// ─── Spacing (4-pt grid) ─────────────────────────────────────────────
export const Spacing: Record<string | number, number> = {
  px:  1,
  0:   0,
  0.5: 2,
  1:   4,
  1.5: 6,
  2:   8,
  2.5: 10,
  3:   12,
  3.5: 14,
  4:   16,
  5:   20,
  6:   24,
  7:   28,
  8:   32,
  9:   36,
  10:  40,
  12:  48,
  14:  56,
  16:  64,
  20:  80,
};

// ─── Border Radius ───────────────────────────────────────────────────
export const Radius: Record<string, number> = {
  xs:    4,
  sm:    6,
  md:    10,
  lg:    14,
  xl:    18,
  '2xl': 24,
  '3xl': 32,
  full:  9999,
};

// ─── Shadow ──────────────────────────────────────────────────────────
export const Shadow = {
  none: {},
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.20,
    shadowRadius:  6,
    elevation: 3,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius:  12,
    elevation: 6,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.36,
    shadowRadius:  20,
    elevation: 10,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.44,
    shadowRadius:  28,
    elevation: 16,
  },
};

// ─── Z-Index ─────────────────────────────────────────────────────────
export const ZIndex = {
  base:    0,
  raised:  10,
  overlay: 100,
  modal:   1000,
};

// ─── Motion ──────────────────────────────────────────────────────────
export const Motion = {
  duration: { fast: 150, normal: 250, slow: 400 },
};

// ─── Helpers ─────────────────────────────────────────────────────────

export type UserRiskLevel = 'safe' | 'suspect' | 'dangerous' | 'unknown';
export type UserRiskLabel = 'SIGUR' | 'SUSPECT' | 'PERICULOS' | 'NECUNOSCUT';

const USER_RISK_LABELS: Record<UserRiskLevel, UserRiskLabel> = {
  safe: 'SIGUR',
  suspect: 'SUSPECT',
  dangerous: 'PERICULOS',
  unknown: 'NECUNOSCUT',
};

/**
 * Normalize internal risk levels to UI-facing categories:
 * - safe: low/safe
 * - suspect: medium
 * - dangerous: high/critical
 * - unknown: everything else
 */
export function normalizeRiskLevelForDisplay(level: string): UserRiskLevel {
  switch ((level || '').toLowerCase()) {
    case 'critical':
    case 'high':
    case 'dangerous':
      return 'dangerous';
    case 'medium':
    case 'suspect':
      return 'suspect';
    case 'low':
    case 'safe':
      return 'safe';
    default:
      return 'unknown';
  }
}

/**
 * Returns the correct risk color token object for a given risk_level string.
 * Handles: 'critical', 'high', 'medium', 'low', 'safe', anything else → unknown
 */
export function getRiskToken(level: string) {
  switch (level?.toLowerCase()) {
    case 'critical':
    case 'high':
    case 'dangerous':
      return Colors.risk.high;
    case 'medium':
    case 'suspect':
      return Colors.risk.medium;
    case 'low':
    case 'safe':
      return Colors.risk.safe;
    default:
      return Colors.risk.unknown;
  }
}

/** Returns the Romanian badge label for a given risk_level string. */
export function getRiskBadgeLabel(level: string): string {
  return getRiskToken(level).badge;
}

/** Returns risk color token using the UI-facing 3-level model. */
export function getDisplayRiskToken(level: string) {
  return getRiskToken(normalizeRiskLevelForDisplay(level));
}

/** Returns the Romanian badge label for a given risk level (safe/suspect/dangerous/unknown). */
export function getDisplayRiskBadgeLabel(level: string): string {
  return USER_RISK_LABELS[normalizeRiskLevelForDisplay(level)];
}
