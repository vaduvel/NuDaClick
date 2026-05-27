import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Clipboard, ShieldAlert, Sparkles, Image as ImageIcon, QrCode, ArrowRight, Mail } from 'lucide-react-native';
import { getDisplayRiskBadgeLabel, normalizeRiskLevelForDisplay } from '../theme';
import QRScannerModal from '../components/QRScannerModal';
import type {
  IncomingShareRawPayload,
  IncomingShareRequest,
  IncomingShareResolvedPayload,
} from '../hooks/shareIntake.types';

interface ScanScreenProps {
  onScanComplete: (result: any) => void;
  backendUrl: string;
  incomingShareRequest?: IncomingShareRequest | null;
  onIncomingShareHandled?: () => void;
}

type RiskLevel = 'low' | 'medium' | 'high';

type PickedImageAsset = ImagePicker.ImagePickerAsset & {
  file?: File;
};

type PickedDocumentAsset = DocumentPicker.DocumentPickerAsset & {
  file?: File;
};

interface OfflineRule {
  id: string;
  family: string;
  claimedBrand: string;
  baseScore: number;
  keywords: string[];
  highSignals: string[];
  urlSignals: string[];
  suspiciousDomains: string[];
  allowedDomains: string[];
  reasons: string[];
  keyDangers: string[];
  safeActions: string[];
  isGeneric?: boolean;
}

const URL_REGEX = /(?:https?:\/\/|www\.)[\w\-.~:/?#\[\]@!$&'()*+,;=%]+/gi;

const TRUSTED_OFFICIAL_DOMAINS = {
  fanCourier: ['fancourier.ro', 'fanbox.ro', 'fan-courier.ro', 'selfawb.ro'],
  postaRomana: ['posta-romana.ro'],
  anaf: ['anaf.ro', 'mfinante.gov.ro', 'mfinante.ro'],
  cardAndBanks: [
    'revolut.com',
    'revolut.me',
    'revolut.space',
    'ing.ro',
    'ing.com',
    'ingbusiness.ro',
    'bcr.ro',
    'george.bcr.ro',
    'bancatransilvania.ro',
    'btpay.ro',
    'neo-bt.ro',
    'neo.bancatransilvania.ro',
  ],
  remoteAccess: ['anydesk.com', 'teamviewer.com'],
  whatsapp: ['whatsapp.com', 'web.whatsapp.com', 'wa.me', 'whatsapp.net'],
} as const;

const URL_SHORTENER_KEYWORDS = [
  'bit.ly',
  'bitly.com',
  'tinyurl.com',
  't.co',
  'tinyurl',
  'is.gd',
  'tiny.cc',
  't.ly',
  'goo.gl',
  'ow.ly',
  'shorturl',
  'shorturl.at',
  'rebrandly',
  'cutt.ly',
  'bl.ink',
  'short.io',
  'lnkd.in',
  'qr.ae',
  'adf.ly',
  'surl.li',
  's.id',
  'rb.gy',
];

const OFFLINE_RULES: OfflineRule[] = [
  {
    id: 'fan-courier',
    family: 'Curier fals / FAN Courier',
    claimedBrand: 'FAN Courier',
    baseScore: 78,
    keywords: ['fancourier', 'fan courier', 'colet', 'locker', 'awb', 'ridica', 'ridicare', 'livrare'],
    highSignals: ['link', 'urgent', 'pret', 'taxa', 'comanda', 'actualizeaza', 'actualizare', 'tracking'],
    urlSignals: ['fancourier', 'locker', 'fancourier'],
    suspiciousDomains: ['.ru', '.top', '.click', '.biz', '.info'],
    allowedDomains: [...TRUSTED_OFFICIAL_DOMAINS.fanCourier],
    reasons: [
      'Mesajul folosește context de colet, locker sau AWB, frecvent asociat cu escrocherii de livrări.',
      'Se cere acțiune rapidă pe un link aparent legat de curier.',
    ],
    keyDangers: [
      'Trimiterea datelor personale sau cardului pe pagini de clonă.',
      'Exfiltrarea codurilor OTP trimise prin SMS.',
    ],
    safeActions: [
      'Nu accesați linkul din mesaj.',
      'Verificați AWB doar pe fancourier.ro sau aplicația oficială.',
      'Cereți confirmare pe numărul oficial al curierului.',
    ],
  },
  {
    id: 'posta-romana',
    family: 'Posta Română falsă',
    claimedBrand: 'Poșta Română',
    baseScore: 72,
    keywords: ['posta', 'poșta', 'postaromana', 'colet', 'taxa', 'eliberare', 'ridicare'],
    highSignals: ['plata', 'factură', 'avizare', 'sms', 'comanda', 'livrare'],
    urlSignals: ['posta', 'colet', 'dostava', 'taxa'],
    suspiciousDomains: ['.top', '.info', '.xyz', '.pw', '.cf'],
    allowedDomains: [...TRUSTED_OFFICIAL_DOMAINS.postaRomana],
    reasons: [
      'Există solicitare de plată suplimentară pe link extern pentru eliberare livrare.',
      'Mesajul imitativ folosește termeni Poșta Română fără context oficial verificabil.',
    ],
    keyDangers: [
      'Plata poate trimite victima pe portal fals.',
      'Datele introduse pot fi intercepționate.',
    ],
    safeActions: [
      'Nu plătiți taxe pe link-uri din SMS.',
      'Verificați statusul coletului doar în aplicația/portalul oficial.',
      'Nu transmiteți date personale prin mesaj.',
    ],
  },
  {
    id: 'anaf-spv',
    family: 'ANAF / SPV fals',
    claimedBrand: 'ANAF / SPV',
    baseScore: 80,
    keywords: ['anaf', 'spv', 'spatiul privat', 'spatiul virtual', 'impozit', 'datorie', 'rambursare', 'debitor', 'aviz', 'taxa', 'sosire', 'factura'],
    highSignals: ['urgent', 'blocat', 'plateste', 'plata', 'nu o', 'redeschide', 'reactiveaza', 'actualizeaza'],
    urlSignals: ['anaf', 'mfinante', 'spv', 'taxa', 'suspension'],
    suspiciousDomains: ['.ro', '.top', '.xyz', '.info', '.shop', '.online', '.biz'],
    allowedDomains: [...TRUSTED_OFFICIAL_DOMAINS.anaf],
    reasons: [
      'Mesajul introduce termeni fiscali clari: ANAF/SPV, plata sau deblocare cont.',
      'Limbajul de urgență sugerează presiune de răspuns rapid.',
    ],
    keyDangers: [
      'Datele introduse pot ajunge la pagini clonă din sfera fiscală.',
      'Poate redirecționa către malware prin portal fals.',
    ],
    safeActions: [
      'Nu intrați pe linkuri din SMS.',
      'Verificați personal în SPV/anaf.ro după autentificare oficială.',
      'Cereți confirmare pe numărul oficial ANAF.',
    ],
  },
  {
    id: 'card-otp',
    family: 'Furt date card / OTP',
    claimedBrand: 'Nespecificat',
    baseScore: 88,
    keywords: ['card', 'cvc', 'cvv', 'cvv2', 'otp', 'cod', 'pin', 'parola', 'iban', 'plateste', 'transfer', 'plata'],
    highSignals: ['nu', 'nu o', 'nu impart', 'actualizeaza', 'activa', 'inregistreaza', 'valideaza'],
    urlSignals: ['card', 'plata', 'banca', 'revolut', 'bt', 'bcr', 'ing', 'otp', '3d'],
    suspiciousDomains: ['.ru', '.top', '.xyz', '.pw'],
    allowedDomains: [...TRUSTED_OFFICIAL_DOMAINS.cardAndBanks],
    reasons: [
      'Textul solicită informații asociate de siguranță bancară sau card.',
      'Se observă indicii de presiune pentru acțiune rapidă.',
    ],
    keyDangers: [
      'Datele cardului sau codurile OTP pot fi capturate de falsiști.',
      'Risc de tranzacții neautorizate imediat după divulgare.',
    ],
    safeActions: [
      'Nu introduceți niciodată cardul sau OTP-ul pe site-uri trimise prin mesaj.',
      'Blocați imediat cardul și schimbați parolele dacă ați introdus date.',
      'Confirmați direct în aplicația băncii.',
    ],
  },
  {
    id: 'remote-access',
    family: 'Remote access / remote support fraud',
    claimedBrand: 'Remote Access',
    baseScore: 84,
    keywords: ['anydesk', 'teamviewer', 'quicksupport', 'ultravnc', 'any desk', 'aplicatie', 'tehnic', 'remote', 'acces la telefon', 'ecran'],
    highSignals: ['instrucțiuni', 'instaleaza', 'acces', 'partajeaza', 'telefo', 'comanda'],
    urlSignals: ['anydesk', 'teamviewer', 'remote', 'apk'],
    suspiciousDomains: ['.ru', '.top', '.xyz', '.site', '.fun'],
    allowedDomains: [...TRUSTED_OFFICIAL_DOMAINS.remoteAccess],
    reasons: [
      'Mesajul sugerează instalarea sau pornirea unui acces la distanță.',
      'Acest tip de solicitare este folosit frecvent pentru furt de control asupra telefonului.',
    ],
    keyDangers: ['Pierdere control dispozitiv', 'Instalare malware prin aplicații false', 'furt conturi'],
    safeActions: [
      'Nu instalați aplicații de acces la distanță la cerere din chat.',
      'Deconectați Wi-Fi/DATA și schimbați parolele dacă ați instalat ceva.',
      'Contactați echipa oficială a aplicației pe canale cunoscute.',
    ],
  },
  {
    id: 'whatsapp-takeover',
    family: 'Compromitere WhatsApp',
    claimedBrand: 'WhatsApp',
    baseScore: 70,
    keywords: ['whatsapp', 'cod', 'sms', 'dispozitiv', 'device', 'two factor', '2fa', 'sesizare', 'numar', 'apel'],
    highSignals: ['cont', 'deconectat', 'verificare', 'intrat', 'suspendat', 'compromis'],
    urlSignals: ['whatsapp', 'whatsapp.com', 'api.whatsapp.com', 'wa.me'],
    suspiciousDomains: ['.ru', '.top', '.click'],
    allowedDomains: [...TRUSTED_OFFICIAL_DOMAINS.whatsapp],
    reasons: [
      'Există indicatori de recuperare sau verificare de cont prin cod.',
      'Acest pattern apare la încercări de preluare de cont.',
    ],
    keyDangers: ['Acces neautorizat la conversații', 'Răspândire de mesaje de phishing'],
    safeActions: [
      'Activați verificarea în doi pași.',
      'Revocați dispozitivele asociate din setări.',
      'Nu trimiteți niciodată coduri de verificare altcuiva.',
    ],
  },
  {
    id: 'generic-link-risk',
    family: 'Mesaj cu linkuri suspecte',
    claimedBrand: 'Nespecificat',
    baseScore: 28,
    keywords: ['link', 'click', 'accesa', 'deschide', 'verifica'],
    highSignals: ['urgent', 'imiineata', 'acum', 'nu astepta'],
    urlSignals: [],
    suspiciousDomains: ['.top', '.xyz', '.info', '.shop', '.online', '.biz'],
    allowedDomains: [],
    reasons: ['Mesajul include link sau indica acțiune rapidă prin intermediul unei pagini externe.'],
    keyDangers: ['Posibilă exfiltrare de date', 'Redirecționare către portal clonat'],
    safeActions: [
      'Verificați întotdeauna domeniul manual.',
      'Nu trimiteți date confidențiale până când sursa nu este autentică.',
    ],
    isGeneric: true,
  },
];

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

const stripPunctuationFromUrl = (url: string) => url.replace(/[)\]\}\>\.,;:!?]+$/g, '');

const extractUrls = (value: string): string[] => {
  const raw = value.match(URL_REGEX) || [];
  const uniq = new Set(raw.map(stripPunctuationFromUrl));
  return [...uniq];
};

const normalizeToken = (value: string) => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const toDomain = (value: string) => {
  try {
    const normalized = value.startsWith('http') ? value : `https://${value}`;
    return new URL(normalized).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return '';
  }
};

const isAllowedDomain = (domain: string, allowedDomains: string[]) =>
  allowedDomains.some((allowedDomain) =>
    domain === allowedDomain || domain.endsWith(`.${allowedDomain}`)
  );

const containsAny = (value: string, terms: string[]) =>
  terms.filter((term) => value.includes(normalizeToken(term)));

const isShortUrl = (url: string) =>
  URL_SHORTENER_KEYWORDS.some((keyword) => url.toLowerCase().includes(keyword));

const hasSuspiciousTld = (domain: string) =>
  /\.(top|xyz|info|click|shop|online|biz|pw|club|site|tk|ga|cf|gq|ml|ru|cc|link|live|space)$/i.test(domain);

const isIpAddress = (domain: string) => /\b\d{1,3}(?:\.\d{1,3}){3}\b/.test(domain);

const filenameFromUri = (uri: string, fallback = 'screenshot.jpg') => {
  const withoutQuery = uri.split('?')[0];
  return withoutQuery.split('/').pop() || fallback;
};

const mimeTypeFromFilename = (filename: string) => {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (ext === 'eml') return 'message/rfc822';
  if (ext === 'msg') return 'application/vnd.ms-outlook';
  if (ext === 'pdf') return 'application/pdf';
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  return 'image/jpeg';
};

const isEmlFilename = (filename: string) => filename.toLowerCase().endsWith('.eml');
const isPdfFilename = (filename: string) => filename.toLowerCase().endsWith('.pdf');
const isHtmlFilename = (filename: string) =>
  filename.toLowerCase().endsWith('.html') || filename.toLowerCase().endsWith('.htm');
const looksLikeUrl = (value: string) => /^(https?:\/\/|www\.)\S+$/i.test(value.trim());
const normalizeSharedUrl = (value: string) =>
  value.trim().startsWith('http') ? value.trim() : `https://${value.trim()}`;

const isSingleUrlText = (value: string) => {
  const trimmed = value.trim();
  return looksLikeUrl(trimmed) && !/\s/.test(trimmed);
};

const normalizeMime = (value?: string) => (value || '').toLowerCase();

const isTextMimeType = (mimeType?: string) => {
  const normalized = normalizeMime(mimeType);
  return normalized.startsWith('text/') || normalized === 'application/json';
};

const isHtmlMimeType = (mimeType?: string) => {
  const normalized = normalizeMime(mimeType);
  return normalized.includes('html');
};

const evaluateRiskLevel = (score: number): RiskLevel => {
  if (score >= 70) {
    return 'high';
  }
  if (score >= 45) {
    return 'medium';
  }
  return 'low';
};

interface OfflineAssessment {
  family: string;
  claimedBrand: string;
  riskLevel: RiskLevel;
  riskScore: number;
  reasons: string[];
  keyDangers: string[];
  safeActions: string[];
  evidence: {
    extracted_urls: string[];
    matched_keywords?: string[];
    url_signals?: string[];
  };
}

interface RuleMatch {
  rule: OfflineRule;
  score: number;
  matchedKeywords: string[];
  matchedHighSignals: string[];
  matchedUrlSignals: string[];
}

const evaluateOfflineText = (scannedText: string): OfflineAssessment => {
  const normalized = normalizeText(scannedText);
  const urls = extractUrls(scannedText);
  const domains = urls.map(toDomain).filter(Boolean);

  let bestMatch: RuleMatch | null = null;
  const matchedReasonSet = new Set<string>();
  const matchedDangers = new Set<string>();
  const matchedSafeActions = new Set<string>();
  const extractedUrls = [...urls];
  const suspiciousUrls = urls.filter((url) => {
    const domain = toDomain(url);
    if (!domain) {
      return false;
    }
    return hasSuspiciousTld(domain) || isIpAddress(domain) || isShortUrl(url);
  });
  const hasUrl = urls.length > 0;
  const hasLinksRisk = hasUrl && suspiciousUrls.length > 0 ? 16 : 0;

  OFFLINE_RULES.forEach((rule) => {
    const matchedKeywords = containsAny(normalized, rule.keywords);
    if (matchedKeywords.length === 0) return;

    let score = rule.baseScore;
    const matchedHighSignals = containsAny(normalized, rule.highSignals);
    const matchedUrlSignals = urls.filter((url) => {
      const lower = url.toLowerCase();
      return rule.urlSignals.some((signal) => lower.includes(signal));
    });
    const suspiciousTldHit = domains.some((domain) => hasSuspiciousTld(domain) || isIpAddress(domain));
    const shortUrlHit = urls.some(isShortUrl);
    const suspiciousDomainHit = domains.some((domain) => {
      if (rule.allowedDomains.length === 0) {
        return hasSuspiciousTld(domain) || isIpAddress(domain);
      }
      return !isAllowedDomain(domain, rule.allowedDomains);
    });

    score += matchedKeywords.length * 8;
    score += matchedHighSignals.length * 10;
    score += matchedUrlSignals.length * 12;
    score += hasLinksRisk;

    if (shortUrlHit) {
      score += 14;
      matchedReasonSet.add('Există link scurtat, care ascunde frecvent ținta reală.');
      matchedSafeActions.add('Evitați linkurile scurtate; deschideți pagina doar prin link explicit.');
      matchedDangers.add('Linkul poate ascunde un domeniu de trapaș.');
    }

    if (suspiciousTldHit) {
      score += 12;
      matchedReasonSet.add('Domeniul folosit folosește extensii frecvent utilizate în phishing.');
    }

    if (suspiciousDomainHit) {
      score += 16;
      matchedReasonSet.add('Domeniul nu aparține clar operatorului oficial menționat.');
      if (rule.allowedDomains.length > 0) {
        matchedSafeActions.add(`Verificați doar subdomain-uri cunoscute: ${rule.allowedDomains.join(', ')}.`);
      }
    }

    const genericPenalty = rule.isGeneric ? 0.9 : 1;
    const finalScore = Math.max(
      score * genericPenalty,
      rule.baseScore + matchedHighSignals.length * 9
    );

    if (!bestMatch || finalScore > bestMatch.score) {
      bestMatch = {
        rule,
        score: finalScore,
        matchedKeywords,
        matchedHighSignals,
        matchedUrlSignals,
      };
    }
  });

  if (!bestMatch) {
    const hasNoisyText = normalized.includes('plata') || normalized.includes('verifica') || normalized.includes('click');
    const linkRisk = urls.length > 0 ? (normalized.includes('urgent') ? 20 : 10) : 0;
    const score = hasNoisyText ? 30 + linkRisk : 8;
    return {
      family: 'Necunoscut',
      claimedBrand: 'Nespecificat',
      riskLevel: evaluateRiskLevel(score),
      riskScore: score,
      reasons: hasNoisyText
        ? ['Textul conține indicatori comuni de risc, dar fără un profil clar de scam cunoscut.']
        : ['Nu s-au detectat semne clare de fraudă.'],
      keyDangers: ['Posibil conținut dubios, dar fără dovezi suficiente'],
      safeActions: [
        'Verificați manual expeditorul și domeniul.',
        'Nu trimiteți date de autentificare sau card.',
      ],
      evidence: {
        extracted_urls: extractedUrls,
      },
    };
  }

  const confirmedMatch = bestMatch as RuleMatch;

  confirmedMatch.rule.reasons.forEach((reason: string) => matchedReasonSet.add(reason));
  confirmedMatch.rule.keyDangers.forEach((item: string) => matchedDangers.add(item));
  confirmedMatch.rule.safeActions.forEach((item: string) => matchedSafeActions.add(item));
  confirmedMatch.matchedKeywords.forEach((term: string) =>
    matchedReasonSet.add(`Indicator detectat: „${term}”.`)
  );
  confirmedMatch.matchedHighSignals.forEach((term: string) =>
    matchedReasonSet.add(`Semnal de risc suplimentar: „${term}”.`)
  );

  const finalScore = Math.min(
    100,
    Math.max(confirmedMatch.score, confirmedMatch.rule.baseScore + confirmedMatch.matchedKeywords.length)
  );
  const riskLevel = evaluateRiskLevel(finalScore);
  const finalRule = confirmedMatch.rule;
  const evidenceSignals = confirmedMatch.matchedUrlSignals.filter((url: string) => {
    const lower = url.toLowerCase();
    return finalRule.urlSignals.some((signal: string) => lower.includes(signal));
  });

  if (hasUrl) {
    matchedReasonSet.add('Mesajul conține linkuri pentru verificare suplimentară manuală.');
  }

  return {
    family: finalRule.family,
    claimedBrand: finalRule.claimedBrand,
    riskLevel,
    riskScore: Math.min(100, Math.round(finalScore)),
    reasons: [...matchedReasonSet],
    keyDangers: [...matchedDangers],
    safeActions: [...matchedSafeActions],
    evidence: {
      extracted_urls: extractedUrls,
      matched_keywords: confirmedMatch.matchedKeywords,
      url_signals: evidenceSignals,
    },
  };
};

type UploadableFile = {
  uri: string;
  name: string;
  type?: string | null;
  webFile?: File;
};

const buildUploadableFile = (input: {
  uri: string;
  name?: string | null;
  type?: string | null;
  webFile?: File;
}): UploadableFile => {
  const name = input.name || filenameFromUri(input.uri, 'shared-file');
  return {
    uri: input.uri,
    name,
    type: input.type || mimeTypeFromFilename(name),
    webFile: input.webFile,
  };
};

export default function ScanScreen({
  onScanComplete,
  backendUrl,
  incomingShareRequest,
  onIncomingShareHandled,
}: ScanScreenProps) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [isQrScannerVisible, setIsQrScannerVisible] = useState(false);

  const appendUploadToFormData = async (
    formData: FormData,
    fieldName: string,
    file: UploadableFile
  ) => {
    if (Platform.OS === 'web') {
      if (file.webFile) {
        formData.append(fieldName, file.webFile, file.name);
        return;
      }

      const fileResponse = await fetch(file.uri);
      const blob = await fileResponse.blob();
      formData.append(fieldName, blob, file.name);
      return;
    }

    // @ts-ignore React Native FormData accepts the { uri, name, type } shape.
    formData.append(fieldName, {
      uri: file.uri,
      name: file.name,
      type: file.type || 'application/octet-stream',
    });
  };

  const readTextFromUri = async (uri: string) => {
    try {
      const response = await fetch(uri);
      if (!response.ok) {
        return null;
      }

      const text = await response.text();
      return text;
    } catch (err) {
      console.log('Cannot read shared content as text', err);
      return null;
    }
  };

  const readSharedTextPayload = async (payload: IncomingShareResolvedPayload) => {
    const sharedText = payload.value?.trim();
    if (sharedText) {
      return sharedText;
    }

    const sharedUri = payload.contentUri;
    if (!sharedUri) {
      return null;
    }

    return readTextFromUri(sharedUri);
  };

  const submitUrlScan = async (
    scannedUrl: string,
    sourceChannel = 'manual',
    offlineFallback = true,
    customLoadingMsg = 'Analizăm linkul direct...'
  ) => {
    const normalizedUrl = normalizeSharedUrl(scannedUrl);
    setText(normalizedUrl);
    setLoading(true);
    setLoadingMsg(customLoadingMsg);

    try {
      const response = await fetch(`${backendUrl}/v1/scan/url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: normalizedUrl,
          source_channel: sourceChannel,
        }),
      });

      if (!response.ok) {
        throw new Error('Eroare la verificarea URL-ului.');
      }

      const data = await response.json();
      onScanComplete(data);
      return true;
    } catch (err: any) {
      if (offlineFallback) {
        Alert.alert('Atenție', 'Nu s-a putut verifica linkul direct. Rulăm scanarea offline.');
        simulateOfflineScan(normalizedUrl);
      } else {
        Alert.alert('Scanare indisponibilă', String(err?.message || 'Nu am putut analiza acest link acum.'));
      }
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handlePaste = async () => {
    // In React Native Web, Clipboard might be different. We handle it safely.
    try {
      if (Platform.OS === 'web') {
        const clipboardText = await navigator.clipboard.readText();
        setText(clipboardText);
      } else {
        // Native fallback
        Alert.alert("Clipboard", "Lipiți manual textul în casetă.");
      }
    } catch (err) {
      console.log("Clipboard paste failed", err);
    }
  };

  const submitTextScan = async (
    scannedText: string,
    sourceChannel = 'manual',
    offlineFallback = true,
    customLoadingMsg = 'Analizăm textul și link-urile...'
  ) => {
    if (!scannedText.trim()) {
      Alert.alert('Eroare', 'Vă rugăm să introduceți sau să lipiți un text suspect.');
      return false;
    }

    if (isSingleUrlText(scannedText)) {
      return submitUrlScan(scannedText, sourceChannel, offlineFallback, 'Verificăm linkul partajat direct...');
    }

    setText(scannedText);
    setLoading(true);
    setLoadingMsg(customLoadingMsg);

    try {
      const response = await fetch(`${backendUrl}/v1/scan/text`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: scannedText,
          source_channel: sourceChannel,
        }),
      });

      if (!response.ok) {
        throw new Error('Eroare la comunicarea cu serverul.');
      }

      const data = await response.json();
      onScanComplete(data);
      return true;
    } catch (err: any) {
      if (offlineFallback) {
        Alert.alert('Atenție', 'Nu s-a putut conecta la motorul de scanare local. Rulăm scanarea offline locală.');
        simulateOfflineScan(scannedText);
      } else {
        Alert.alert('Scanare indisponibilă', String(err?.message || 'Nu am putut analiza acest mesaj acum.'));
      }
      return false;
    } finally {
      setLoading(false);
    }
  };

  const submitEmailScanFromHtml = async (htmlContent: string, sourceChannel = 'email_html_upload') => {
    setLoading(true);
    setLoadingMsg('Citim conținutul HTML partajat și căutăm butoanele ascunse...');

    try {
      const formData = new FormData();
      formData.append('source_channel', sourceChannel);
      formData.append('html_content', htmlContent);

      const response = await fetch(`${backendUrl}/v1/scan/email`, {
        method: 'POST',
        body: formData,
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        const responseText = await response.text().catch(() => '');
        throw new Error(responseText || 'Eroare la scanarea emailului HTML.');
      }

      const data = await response.json();
      onScanComplete(data);
      return true;
    } finally {
      setLoading(false);
    }
  };

  const handleScanText = async () => {
    await submitTextScan(text);
  };

  const simulateOfflineScan = (scannedText: string) => {
    const assessment = evaluateOfflineText(scannedText);
    const userRiskLevel = normalizeRiskLevelForDisplay(assessment.riskLevel);
    const userRiskLabel = getDisplayRiskBadgeLabel(userRiskLevel);

    onScanComplete({
      scan_id: `offline_${Math.random().toString(36).substring(4)}`,
      risk_score: assessment.riskScore,
      risk_level: assessment.riskLevel,
      user_risk_level: userRiskLevel,
      user_risk_label: userRiskLabel,
      detected_family: assessment.family,
      claimed_brand: assessment.claimedBrand,
      reasons: assessment.reasons,
      redacted_text: scannedText,
      ai_verdict: `Alertă offline: status ${userRiskLabel}`,
      ai_explanation: 'Detecție locală offline bazată pe reguli. Pentru o analiză completă verificați backend-ul.',
      key_dangers: assessment.keyDangers,
      safe_actions: assessment.safeActions,
      evidence: assessment.evidence,
    });
  };

  const showImageScanUnavailableResult = (message?: string) => {
    const userRiskLevel = normalizeRiskLevelForDisplay('medium');
    const userRiskLabel = getDisplayRiskBadgeLabel(userRiskLevel);

    onScanComplete({
      scan_id: `ocr_unavailable_${Math.random().toString(36).substring(4)}`,
      risk_score: 30,
      risk_level: 'medium',
      user_risk_level: userRiskLevel,
      user_risk_label: userRiskLabel,
      user_risk_text: 'Nu am putut verifica poza complet',
      user_recommended_action:
        'Nu apăsați pe linkuri din poză până nu trimiteți textul copiat sau captura poate fi citită prin OCR.',
      detected_family: 'Verificare OCR incompletă',
      claimed_brand: 'Necunoscut',
      reasons: [
        'Nu s-a putut extrage text real din imagine în acest moment.',
        message || 'Motorul OCR nu a răspuns pentru această scanare.',
      ],
      redacted_text: '',
      ocr_extracted_text: '',
      ai_verdict: `Scanare parțială: status ${userRiskLabel}`,
      ai_explanation:
        'Imaginea nu a primit un verdict complet. Pentru detecție reală, încercați din nou după ce OCR-ul este disponibil sau lipiți textul mesajului.',
      key_dangers: ['Linkul real din poză poate duce către o pagină falsă.'],
      safe_actions: [
        'Nu deschideți linkul din imagine.',
        'Copiați textul mesajului și rulați scanarea pe text.',
        'Verificați doar în aplicația sau site-ul oficial al brandului menționat.',
      ],
      evidence: {
        extracted_urls: [],
      },
      warning: 'OCR indisponibil pentru această imagine.',
    });
  };

  const submitImageScan = async (file: UploadableFile, sourceChannel = 'image_upload') => {
    setLoading(true);
    setLoadingMsg('Extragem textul din screenshot prin OCR...');

    try {
      const formData = new FormData();
      formData.append('source_channel', sourceChannel);
      await appendUploadToFormData(formData, 'image_file', file);

      const response = await fetch(`${backendUrl}/v1/scan/image`, {
        method: 'POST',
        body: formData,
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Eroare la scanarea imaginii.');
      }

      const data = await response.json();
      onScanComplete(data);
      return true;
    } finally {
      setLoading(false);
    }
  };

  const submitEmailScan = async (file: UploadableFile, sourceChannel = 'email_upload') => {
    setLoading(true);
    setLoadingMsg('Citim emailul original si cautam butoanele sau linkurile ascunse...');

    try {
      const formData = new FormData();
      formData.append('source_channel', sourceChannel);
      await appendUploadToFormData(formData, 'email_file', file);

      const response = await fetch(`${backendUrl}/v1/scan/email`, {
        method: 'POST',
        body: formData,
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        const responseText = await response.text().catch(() => '');
        throw new Error(responseText || 'Eroare la scanarea emailului original.');
      }

      const data = await response.json();
      onScanComplete(data);
      return true;
    } finally {
      setLoading(false);
    }
  };

  const submitPdfScan = async (file: UploadableFile, sourceChannel = 'pdf_upload') => {
    setLoading(true);
    setLoadingMsg('Citim documentul si verificam textul extras...');

    try {
      const formData = new FormData();
      formData.append('source_channel', sourceChannel);
      await appendUploadToFormData(formData, 'pdf_file', file);

      const response = await fetch(`${backendUrl}/v1/scan/pdf`, {
        method: 'POST',
        body: formData,
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        const responseText = await response.text().catch(() => '');
        throw new Error(responseText || 'Eroare la scanarea PDF-ului.');
      }

      const data = await response.json();
      onScanComplete(data);
      return true;
    } finally {
      setLoading(false);
    }
  };

  const handleQrScanResult = async ({ data }: { data: string; type: string }) => {
    const scannedValue = data.trim();
    setIsQrScannerVisible(false);

    if (!scannedValue) {
      Alert.alert('QR gol', 'Codul scanat nu conține text utilizabil.');
      return;
    }

    if (isSingleUrlText(scannedValue)) {
      await submitUrlScan(scannedValue, 'qr_scan', true, 'Verificăm linkul extras din codul QR...');
      return;
    }

    await submitTextScan(scannedValue, 'qr_scan', true, 'Analizăm textul extras din codul QR...');
  };

  const handlePickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert('Permisiune necesară', 'Avem nevoie de acces la galerie pentru a selecta screenshot-ul.');
      return;
    }

    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 1,
    });

    if (pickerResult.canceled) return;

    const asset = pickerResult.assets[0] as PickedImageAsset;
    const uploadable = buildUploadableFile({
      uri: asset.uri,
      name: asset.fileName || asset.file?.name || filenameFromUri(asset.uri),
      type: asset.mimeType || asset.file?.type,
      webFile: asset.file,
    });

    try {
      await submitImageScan(uploadable, Platform.OS === 'web' ? 'web_image_upload' : 'image_upload');
    } catch (err: any) {
      console.log(err);
      Alert.alert('OCR indisponibil', 'Nu s-a putut scana captura reală acum. Afișăm un rezultat parțial, fără demo fals.');
      showImageScanUnavailableResult(String(err?.message || 'Eroare la scanarea imaginii.'));
    }
  };

  const handlePickEmail = async () => {
    setLoading(true);
    setLoadingMsg('Citim emailul original si cautam butoanele sau linkurile ascunse...');

    try {
      const pickerResult = await DocumentPicker.getDocumentAsync({
        type: ['message/rfc822', 'application/octet-stream', 'text/plain', 'text/html', 'application/vnd.ms-outlook'],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (pickerResult.canceled) {
        return;
      }

      const asset = pickerResult.assets[0] as PickedDocumentAsset;
      const filename = asset.name || filenameFromUri(asset.uri, 'email-suspect.eml');
      const mimeType = normalizeMime(asset.mimeType || asset.file?.type);
      const uploadable = buildUploadableFile({
        uri: asset.uri,
        name: filename,
        type: mimeType,
        webFile: asset.file,
      });

      if (isTextMimeType(mimeType) && !isEmlFilename(filename) && !isHtmlFilename(filename)) {
        const rawText = await readTextFromUri(asset.uri);
        if (!rawText?.trim()) {
          Alert.alert('Fișier text gol', 'Fișierul ales nu conține text de analizat.');
          return;
        }

        await submitTextScan(rawText, 'manual_text_file', true, 'Analizăm conținutul textului partajat...');
        return;
      }

      if (isHtmlFilename(filename) || isHtmlMimeType(mimeType)) {
        const htmlText = await readTextFromUri(asset.uri);
        if (!htmlText?.trim()) {
          Alert.alert('Fișier HTML gol', 'Nu s-a putut extrage conținutul HTML din fișier.');
          return;
        }

        await submitEmailScanFromHtml(htmlText, Platform.OS === 'web' ? 'web_shared_html_upload' : 'shared_html_upload');
        return;
      }

      if (!isEmlFilename(filename) && mimeType !== 'message/rfc822' && mimeType !== 'application/vnd.ms-outlook') {
        Alert.alert(
          'Format nepotrivit',
          'Pentru analiza completa a emailului, incarcati fisierul original .eml.'
        );
        return;
      }

      await submitEmailScan(uploadable, Platform.OS === 'web' ? 'web_email_upload' : 'email_upload');
    } catch (err: any) {
      console.log(err);
      Alert.alert(
        'Scanare email indisponibila',
        `Nu am putut analiza emailul original acum. ${String(err?.message || 'Incercati din nou.')}`
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!incomingShareRequest?.id) {
      return;
    }

    let active = true;

    const handleIncomingShare = async () => {
      try {
        const rawPayloads = incomingShareRequest.sharedPayloads || [];
        const resolvedPayloads = incomingShareRequest.resolvedSharedPayloads || [];

        const firstRawText = rawPayloads.find(
          (payload: IncomingShareRawPayload) =>
            (payload.shareType === 'text' || payload.shareType === 'url') && payload.value?.trim()
        );

        if (firstRawText?.value?.trim()) {
          const sharedValue = firstRawText.value.trim();
          if (firstRawText.shareType === 'url' || isSingleUrlText(sharedValue)) {
            await submitUrlScan(
              sharedValue,
              firstRawText.shareType === 'url' ? 'shared_url' : 'shared_text',
              true,
              'Verificăm linkul partajat direct din telefon...'
            );
          } else {
            await submitTextScan(
              sharedValue,
              firstRawText.shareType === 'text' ? 'shared_text' : 'shared_url',
              true,
              'Analizăm mesajul partajat direct din telefon...'
            );
          }
          return;
        }

        const firstResolved = resolvedPayloads.find(
          (payload: IncomingShareResolvedPayload) => Boolean(payload.contentUri || payload.value)
        );

        if (!firstResolved) {
          Alert.alert('Share gol', 'Nu am primit continut utilizabil din Share Sheet.');
          return;
        }

        const sharedUri = firstResolved.contentUri || firstResolved.value;
        const sharedName =
          firstResolved.originalName ||
          filenameFromUri(firstResolved.contentUri || firstResolved.value, 'shared-item');
        const sharedMime = normalizeMime(firstResolved.contentMimeType || firstResolved.mimeType);
        const uploadable = buildUploadableFile({
          uri: sharedUri,
          name: sharedName,
          type: sharedMime,
        });

        if (firstResolved.contentType === 'text' && firstResolved.value?.trim()) {
          await submitTextScan(
            firstResolved.value,
            'shared_text',
            true,
            'Analizăm textul partajat direct din telefon...'
          );
          return;
        }

        if (firstResolved.contentType === 'website' && firstResolved.value?.trim()) {
          const websiteValue = firstResolved.value.trim();
          if (isSingleUrlText(websiteValue)) {
            await submitUrlScan(websiteValue, 'shared_url', true, 'Verificăm linkul partajat direct din telefon...');
          } else {
            await submitTextScan(
              websiteValue,
              'shared_url',
              true,
              'Analizăm conținutul web partajat...'
            );
          }
          return;
        }

        if (firstResolved.contentType === 'image') {
          await submitImageScan(uploadable, 'shared_image');
          return;
        }

        if (isHtmlMimeType(uploadable.type ?? undefined) || isHtmlFilename(uploadable.name)) {
          const htmlContent = await readSharedTextPayload(firstResolved);
          if (typeof htmlContent === 'string' && htmlContent.trim()) {
            await submitEmailScanFromHtml(htmlContent, 'shared_html_file');
            return;
          }
        }

        if (
          isTextMimeType(uploadable.type ?? undefined) &&
          !isHtmlMimeType(uploadable.type ?? undefined)
        ) {
          const textContent = await readSharedTextPayload(firstResolved);
          if (typeof textContent === 'string' && textContent.trim()) {
            await submitTextScan(textContent, 'shared_text_file', true, 'Analizăm conținutul partajat din fișier text...');
            return;
          }
        }

        if (
          isPdfFilename(uploadable.name) ||
          uploadable.type === 'application/pdf'
        ) {
          await submitPdfScan(uploadable, 'shared_pdf');
          return;
        }

        if (isEmlFilename(uploadable.name) || uploadable.type === 'message/rfc822') {
          await submitEmailScan(uploadable, 'shared_email');
          return;
        }

        if (uploadable.type === 'application/vnd.ms-outlook') {
          const content = await readSharedTextPayload(firstResolved);
          if (!content?.trim()) {
            Alert.alert('Fișier .msg incomplet', 'Nu s-a putut extrage text din fișierul Outlook. Încearcă exportul ca .eml.');
            return;
          }

          await submitEmailScanFromHtml(content, 'shared_outlook_msg');
          return;
        }

        if (uploadable.type === 'text/uri-list' && firstResolved.value?.trim()) {
          await submitUrlScan(firstResolved.value, 'shared_url', true, 'Verificăm linkul din listă...');
          return;
        }

        Alert.alert(
          'Tip de continut neacoperit',
          'Momentan putem analiza direct text, linkuri, imagini, PDF și emailuri originale .eml.'
        );
      } catch (err: any) {
        console.log('Failed to process incoming share', err);
        Alert.alert(
          'Share indisponibil',
          `Nu am putut procesa acest continut partajat. ${String(err?.message || 'Incearca din nou.')}`
        );
      } finally {
        if (active) {
          onIncomingShareHandled?.();
        }
      }
    };

    handleIncomingShare();

    return () => {
      active = false;
    };
  }, [incomingShareRequest?.id]);

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <ShieldAlert size={28} color="#3B82F6" />
          <Text style={styles.logoText}>NuDa<Text style={{ color: '#3B82F6' }}>Click</Text></Text>
        </View>
        <Text style={styles.tagline}>Asistentul tău anti-scam localizat pentru România</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>{loadingMsg}</Text>
          <Text style={styles.loadingSubtext}>Scanăm în siguranță fără a deschide linkurile</Text>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Introduceți mesajul sau linkul suspect</Text>
          <Text style={styles.cardSubtitle}>
            Copiați un SMS, WhatsApp, e-mail sau link primit și lipiți-l mai jos.
            Pentru emailuri cu butoane, încărcați emailul original `.eml`.
          </Text>

              {Platform.OS !== 'web' && (
            <View style={styles.shareHintCard}>
              <Text style={styles.shareHintTitle}>Pe telefon: trimite direct cu Share</Text>
              <Text style={styles.shareHintText}>
                Din SMS/Gmail/WhatsApp: apasă `Share` → alege `NuDaClick` → analizăm automat.
                Funcționează pe linkuri (`URL`) și fișiere (`.eml`, `.html`, PDF, imagini).
                Dacă mesajul are buton „Apasă aici”, trimite `.eml` originalul pentru a vedea linkul ascuns.
              </Text>
            </View>
          )}

          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="Ex: FAN Courier: Pachetul tau nu a putut fi livrat..."
              placeholderTextColor="#6B7280"
              multiline
              numberOfLines={5}
              value={text}
              onChangeText={setText}
            />
            {Platform.OS === 'web' && (
              <TouchableOpacity style={styles.pasteButton} onPress={handlePaste}>
                <Clipboard size={16} color="#9CA3AF" />
                <Text style={styles.pasteText}>Lipește</Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity style={styles.scanButton} onPress={handleScanText}>
            <Sparkles size={20} color="#FFF" style={styles.buttonIcon} />
            <Text style={styles.scanButtonText}>Scanează acum</Text>
            <ArrowRight size={18} color="#FFF" />
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>SAU</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.grid}>
            <TouchableOpacity style={styles.gridButton} onPress={handlePickImage}>
              <ImageIcon size={24} color="#3B82F6" />
              <Text style={styles.gridButtonTitle}>Încarcă Screenshot</Text>
              <Text style={styles.gridButtonDesc}>Analiză text & OCR</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.gridButton} onPress={handlePickEmail}>
              <Mail size={24} color="#F59E0B" />
              <Text style={styles.gridButtonTitle}>Încarcă Email</Text>
              <Text style={styles.gridButtonDesc}>Original .eml</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.gridButton}
              onPress={() => setIsQrScannerVisible(true)}
            >
              <QrCode size={24} color="#10B981" />
              <Text style={styles.gridButtonTitle}>Scanează QR</Text>
              <Text style={styles.gridButtonDesc}>Scanare live cu camera</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.emailHintCard}>
            <Text style={styles.emailHintTitle}>Email cu buton suspect?</Text>
            <Text style={styles.emailHintText}>
              Dacă vezi doar un buton de tip „Apasă aici”, poza nu ne arată mereu linkul real. Fișierul `.eml`
              ne lasă să verificăm adresa ascunsă din spatele butonului.
            </Text>
          </View>
          
          <View style={styles.noticeContainer}>
            <Text style={styles.noticeText}>
              🛡️ <Text style={{fontWeight: 'bold'}}>Promisiune:</Text> NuDaClick nu va deschide niciodată paginile suspecte în browserul tău și nu îți va accesa datele personale.
            </Text>
          </View>
        </View>
      )}

      <QRScannerModal
        visible={isQrScannerVisible}
        onClose={() => setIsQrScannerVisible(false)}
        onScan={handleQrScanResult}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#0B0F19',
    minHeight: '100%',
  },
  header: {
    alignItems: 'center',
    marginVertical: 20,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  logoText: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#FFF',
    marginLeft: 8,
  },
  tagline: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 16,
    color: '#FFF',
    fontWeight: '600',
    marginTop: 20,
  },
  loadingSubtext: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 6,
  },
  card: {
    backgroundColor: 'rgba(22, 30, 49, 0.7)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 6,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#9CA3AF',
    marginBottom: 16,
    lineHeight: 18,
  },
  inputWrapper: {
    position: 'relative',
    marginBottom: 16,
  },
  input: {
    backgroundColor: 'rgba(11, 15, 25, 0.8)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    color: '#FFF',
    padding: 12,
    fontSize: 14,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  pasteButton: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  pasteText: {
    color: '#9CA3AF',
    fontSize: 12,
    marginLeft: 4,
  },
  scanButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  buttonIcon: {
    marginRight: 8,
  },
  scanButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 6,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  dividerText: {
    color: '#6B7280',
    fontSize: 12,
    marginHorizontal: 10,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    rowGap: 12,
    marginBottom: 16,
  },
  gridButton: {
    width: '48%',
    backgroundColor: 'rgba(11, 15, 25, 0.5)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  gridButtonTitle: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: 'bold',
    marginTop: 8,
  },
  gridButtonDesc: {
    color: '#6B7280',
    fontSize: 10,
    marginTop: 2,
  },
  emailHintCard: {
    backgroundColor: 'rgba(245, 158, 11, 0.06)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.16)',
    padding: 12,
    marginBottom: 12,
  },
  emailHintTitle: {
    color: '#F9FAFB',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  emailHintText: {
    color: '#D1D5DB',
    fontSize: 12,
    lineHeight: 18,
  },
  shareHintCard: {
    backgroundColor: 'rgba(16, 185, 129, 0.06)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.18)',
    padding: 12,
    marginBottom: 12,
  },
  shareHintTitle: {
    color: '#F9FAFB',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  shareHintText: {
    color: '#D1D5DB',
    fontSize: 12,
    lineHeight: 18,
  },
  noticeContainer: {
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.15)',
    padding: 10,
    marginTop: 10,
  },
  noticeText: {
    color: '#9CA3AF',
    fontSize: 11,
    lineHeight: 16,
  },
});
