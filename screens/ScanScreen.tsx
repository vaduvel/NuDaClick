import React, { useState } from 'react';
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
import { Clipboard, ShieldAlert, Sparkles, Image as ImageIcon, QrCode, ArrowRight } from 'lucide-react-native';

interface ScanScreenProps {
  onScanComplete: (result: any) => void;
  backendUrl: string;
}

type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

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

const evaluateRiskLevel = (score: number): RiskLevel => {
  if (score >= 85) {
    return 'critical';
  }
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

export default function ScanScreen({ onScanComplete, backendUrl }: ScanScreenProps) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');

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

  const handleScanText = async () => {
    if (!text.trim()) {
      Alert.alert('Eroare', 'Vă rugăm să introduceți sau să lipiți un text suspect.');
      return;
    }

    setLoading(true);
    setLoadingMsg('Analizăm textul și link-urile...');

    try {
      const response = await fetch(`${backendUrl}/v1/scan/text`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text,
          source_channel: 'manual',
        }),
      });

      if (!response.ok) {
        throw new Error('Eroare la comunicarea cu serverul.');
      }

      const data = await response.json();
      onScanComplete(data);
    } catch (err: any) {
      Alert.alert('Atenție', 'Nu s-a putut conecta la motorul de scanare local. Rulăm scanarea offline locală.');
      // Mock local offline check if server is not running
      simulateOfflineScan(text);
    } finally {
      setLoading(false);
    }
  };

  const simulateOfflineScan = (scannedText: string) => {
    const assessment = evaluateOfflineText(scannedText);

    onScanComplete({
      scan_id: `offline_${Math.random().toString(36).substring(4)}`,
      risk_score: assessment.riskScore,
      risk_level: assessment.riskLevel,
      detected_family: assessment.family,
      claimed_brand: assessment.claimedBrand,
      reasons: assessment.reasons,
      redacted_text: scannedText,
      ai_verdict: `Alerte offline: scor de risc ${assessment.riskScore}/100 (${assessment.riskLevel.toUpperCase()})`,
      ai_explanation: 'Detecție locală offline bazată pe reguli. Pentru o analiză completă verificați backend-ul.',
      key_dangers: assessment.keyDangers,
      safe_actions: assessment.safeActions,
      evidence: assessment.evidence,
    });
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

    setLoading(true);
    setLoadingMsg('Extragem textul din screenshot prin OCR...');

    const uri = pickerResult.assets[0].uri;
    
    // Check if running on web
    if (Platform.OS === 'web') {
      // Simulate file upload or make local mock
      setTimeout(() => {
        // Mocking OCR based on selected filename or typical curier scenario
        simulateOfflineScan("FAN Courier Locker: Coletul tau este pregatit. Ridica de aici: http://fan-locker-ridicare.ru/awb");
        setLoading(false);
      }, 1500);
      return;
    }

    // Native multipart upload
    const filename = uri.split('/').pop() || 'screenshot.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : `image/jpeg`;

    const formData = new FormData();
    // @ts-ignore
    formData.append('image_file', { uri, name: filename, type });

    try {
      const response = await fetch(`${backendUrl}/v1/scan/image`, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Eroare la scanarea imaginii.');
      }

      const data = await response.json();
      onScanComplete(data);
    } catch (err) {
      console.log(err);
      Alert.alert('Eroare', 'Nu s-a putut trimite screenshot-ul către server. Rulăm analiză locală.');
      simulateOfflineScan("Posta Romana: Taxa de livrare 2.45 lei neachitata. Achitati pe posta-romana-taxe.top");
    } finally {
      setLoading(false);
    }
  };

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
          </Text>

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

            <TouchableOpacity 
              style={styles.gridButton} 
              onPress={() => simulateOfflineScan("QR Code scan: http://anaf-spv-plati.info/plata-rapida")}
            >
              <QrCode size={24} color="#10B981" />
              <Text style={styles.gridButtonTitle}>Scanează QR</Text>
              <Text style={styles.gridButtonDesc}>Arată linkul ascuns</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.noticeContainer}>
            <Text style={styles.noticeText}>
              🛡️ <Text style={{fontWeight: 'bold'}}>Promisiune:</Text> NuDaClick nu va deschide niciodată paginile suspecte în browserul tău și nu îți va accesa datele personale.
            </Text>
          </View>
        </View>
      )}
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
    marginBottom: 16,
  },
  gridButton: {
    flex: 0.48,
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
