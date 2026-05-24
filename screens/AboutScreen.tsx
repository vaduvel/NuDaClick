import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Linking,
  Alert,
} from 'react-native';
import {
  ShieldAlert,
  BookOpen,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Mail,
  Smartphone,
  Phone,
  Globe,
  QrCode,
  MessageSquare,
  Calendar,
  Users,
  Download,
  CreditCard,
  Briefcase,
  TrendingUp,
  FileText,
  Wifi,
  AlertTriangle,
} from 'lucide-react-native';

interface AboutScreenProps {
  onBack?: () => void;
}

interface ScamFamily {
  id: string;
  priority: number;
  family: string;
  channels: string[];
  hook: string;
  red_flags: string[];
  safe_actions: string[];
  icon: React.ReactNode;
  color: string;
}

const openExternalUrl = async (url: string, errorMessage: string) => {
  try {
    const canOpen = await Linking.canOpenURL(url);
    if (!canOpen) {
      Alert.alert('Eroare', errorMessage);
      return;
    }
    await Linking.openURL(url);
  } catch (err) {
    Alert.alert('Eroare', errorMessage);
  }
};

const SCAM_FAMILIES: ScamFamily[] = [
  {
    id: 'ro-2026-curier-fan-locker',
    priority: 1,
    family: 'Curier fals / FAN Courier',
    channels: ['SMS', 'WhatsApp', 'Notificări'],
    hook: 'Colet asociat cu numărul tău, alege locker, actualizează datele.',
    red_flags: ['Link extern/scurtat', 'Domeniu ușor diferit', 'Cerere cod verificare', 'Taxă mică pentru redirecționare'],
    safe_actions: ['Nu deschide linkul', 'Verifică AWB doar pe fancourier.ro', 'Nu introduce coduri WhatsApp'],
    icon: <Mail size={18} color="#EF4444" />,
    color: '#EF4444',
  },
  {
    id: 'ro-2025-posta-romana-sms',
    priority: 2,
    family: 'Poșta Română falsă',
    channels: ['SMS', 'Email'],
    hook: 'Taxă colet, adresă incompletă, confirmă livrarea.',
    red_flags: ['Link scurtat', 'Pagină care imită Poșta Română', 'Cerere card pentru taxă de livrare'],
    safe_actions: ['Nu plăti din link', 'Verifică pe posta-romana.ro', 'Nu trimite PIN/CVC'],
    icon: <Mail size={18} color="#F59E0B" />,
    color: '#F59E0B',
  },
  {
    id: 'ro-2026-revolut-call-email',
    priority: 3,
    family: 'Revolut fals / cont suspect',
    channels: ['Telefon', 'Email', 'SMS', 'WhatsApp'],
    hook: 'Apel Revolut, cont/transfer suspect, verifică activitatea.',
    red_flags: ['Apel nesolicitat', 'Link extern', 'Cerere cod', 'Cont menționat nu aparține persoanei'],
    safe_actions: ['Deschide manual aplicația Revolut', 'Verifică suportul in-app', 'Nu comunica coduri/parole'],
    icon: <Smartphone size={18} color="#8B5CF6" />,
    color: '#8B5CF6',
  },
  {
    id: 'ro-2026-anaf-spv-fals',
    priority: 4,
    family: 'ANAF / SPV fals',
    channels: ['Email', 'SMS', 'Telefon'],
    hook: 'Actualizare date, datorie, rambursare, notificare fiscală.',
    red_flags: ['Link către domeniu neoficial', 'Atașament suspect', 'Apel fals ANAF', 'Limbaj urgent'],
    safe_actions: ['Intră manual în SPV/anaf.ro', 'Verifică în contul oficial', 'Nu introduce date card'],
    icon: <FileText size={18} color="#EF4444" />,
    color: '#EF4444',
  },
  {
    id: 'ro-2025-olx-marketplace-card',
    priority: 5,
    family: 'OLX / Marketplace – card ca să primești bani',
    channels: ['OLX', 'WhatsApp', 'SMS', 'Email'],
    hook: 'Sunt interesat, am plătit produsul, intră pe link ca să primești banii.',
    red_flags: ['Conversație mutată off-platform', 'Link extern', 'Card cerut pentru primire bani', 'Presiune de timp'],
    safe_actions: ['Folosește doar fluxurile oficiale', 'Nu introduce cardul ca să primești bani', 'Nu trimite OTP'],
    icon: <CreditCard size={18} color="#F59E0B" />,
    color: '#F59E0B',
  },
  {
    id: 'ro-2025-whatsapp-voteaza',
    priority: 6,
    family: 'WhatsApp takeover / votează',
    channels: ['WhatsApp', 'SMS'],
    hook: 'Votează o persoană, concurs, link de vot, apoi cereri de bani.',
    red_flags: ['Link de vot nesolicitat', 'Cerere cod', 'Mesaj identic de la contact compromis'],
    safe_actions: ['Nu introduce coduri', 'Activează 2FA WhatsApp', 'Verifică dispozitive conectate'],
    icon: <MessageSquare size={18} color="#10B981" />,
    color: '#10B981',
  },
  {
    id: 'ro-2026-banca-credit-bnr-politie',
    priority: 7,
    family: 'Apel bancă / BNR / Poliție / credit aprobat',
    channels: ['Telefon', 'WhatsApp'],
    hook: 'Credit pe numele tău, dosar penal, cont compromis, transferă banii.',
    red_flags: ['Apel lung cu presiune psihologică', 'Documente false pe WhatsApp', 'Cont sigur străin'],
    safe_actions: ['Închide apelul', 'Sună tu la numărul oficial al băncii/poliției', 'Nu muta banii'],
    icon: <Phone size={18} color="#EF4444" />,
    color: '#EF4444',
  },
  {
    id: 'ro-2025-remote-access-anydesk',
    priority: 8,
    family: 'Remote access / AnyDesk / TeamViewer',
    channels: ['Telefon', 'WhatsApp', 'Email'],
    hook: 'Suport tehnic, bancă, broker; instalează aplicația ca să te ajutăm.',
    red_flags: ['Aplicație remote access', 'Cerere ecran partajat', 'Pas cu pas spre internet banking'],
    safe_actions: ['Nu instala remote access', 'Deconectează internetul dacă ai instalat', 'Sună banca'],
    icon: <Download size={18} color="#3B82F6" />,
    color: '#3B82F6',
  },
  {
    id: 'ro-2025-business-iban-change',
    priority: 9,
    family: 'Factură / IBAN schimbat / BEC',
    channels: ['Email', 'WhatsApp'],
    hook: 'Furnizorul schimbă contul bancar, factură urgentă, plată până azi.',
    red_flags: ['Reply-to diferit', 'IBAN nou', 'Urgență', 'Nu suna'],
    safe_actions: ['Confirmare telefonică pe număr deja cunoscut', 'Verificare contract/furnizor'],
    icon: <Briefcase size={18} color="#F59E0B" />,
    color: '#F59E0B',
  },
  {
    id: 'ro-2025-investitii-deepfake',
    priority: 10,
    family: 'Investiții false / deepfake / crypto',
    channels: ['Social media', 'Telefon', 'Email'],
    hook: 'Profit garantat, platformă exclusivă, persoană publică, AI trading.',
    red_flags: ['Profit garantat', 'Urgență', 'Celebritate/deepfake', 'Broker neverificat'],
    safe_actions: ['Verifică autorizarea ASF', 'Nu instala remote access', 'Nu trimite documente'],
    icon: <TrendingUp size={18} color="#EF4444" />,
    color: '#EF4444',
  },
  {
    id: 'ro-2025-job-task-scam',
    priority: 11,
    family: 'Job / task scam / money mule',
    channels: ['WhatsApp', 'Telegram', 'Telefon', 'Social'],
    hook: 'Lucrezi de acasă, like-uri pentru bani, comision, job rapid.',
    red_flags: ['Plată pentru a fi angajat', 'Task-uri cu comision', 'Mutare pe Telegram'],
    safe_actions: ['Nu plăti pentru job', 'Verifică firma', 'Nu folosi contul pentru tranzacții ale altora'],
    icon: <Briefcase size={18} color="#8B5CF6" />,
    color: '#8B5CF6',
  },
  {
    id: 'ro-2025-qr-quishing',
    priority: 12,
    family: 'QR phishing / quishing',
    channels: ['QR', 'Afiș', 'Email', 'Factură'],
    hook: 'Scanează pentru plată, parcare, factură, reducere.',
    red_flags: ['QR peste QR', 'Domeniu neoficial', 'Pagina cere card/login'],
    safe_actions: ['Verifică domeniul înainte de plată', 'Tastează manual site-ul oficial', 'Nu scana QR necunoscut'],
    icon: <QrCode size={18} color="#10B981" />,
    color: '#10B981',
  },
  {
    id: 'ro-2025-sextortion',
    priority: 13,
    family: 'Sextortion / hacker fals',
    channels: ['Email'],
    hook: 'Am acces la camera ta, am parole, plătește crypto.',
    red_flags: ['Amenințare generică', 'Parolă veche din breach', 'Wallet crypto'],
    safe_actions: ['Nu plăti', 'Schimbă parolele', 'Activează 2FA', 'Raportează'],
    icon: <AlertTriangle size={18} color="#EF4444" />,
    color: '#EF4444',
  },
  {
    id: 'ro-2025-subscription-renewal',
    priority: 14,
    family: 'Factură/abonament fals – renewal',
    channels: ['Email', 'Telefon'],
    hook: 'Abonament antivirus/serviciu expiră, sună pentru anulare.',
    red_flags: ['Număr de telefon în factură', 'Sumă mare', 'Nu recunoști serviciul'],
    safe_actions: ['Nu suna numărul din email', 'Verifică în contul oficial', 'Nu instala remote access'],
    icon: <FileText size={18} color="#F59E0B" />,
    color: '#F59E0B',
  },
  {
    id: 'ro-2025-telecom-sim-swap',
    priority: 15,
    family: 'SIM swap / telecom impersonation',
    channels: ['Telefon', 'SMS'],
    hook: 'Actualizare date, schimbare SIM, probleme abonament.',
    red_flags: ['Pierdere semnal inexplicabilă', 'Cerere cod telefonic', 'Apel nesolicitat'],
    safe_actions: ['Contactează operatorul pe canal oficial', 'Blochează banking dacă pierzi semnalul'],
    icon: <Wifi size={18} color="#3B82F6" />,
    color: '#3B82F6',
  },
  {
    id: 'ro-2025-calendar-scam',
    priority: 16,
    family: 'Calendar scam',
    channels: ['Calendar', 'iOS', 'Email'],
    hook: 'Evenimente spam cu linkuri, premii, infectare device.',
    red_flags: ['Evenimente create fără consimțământ', 'Linkuri repetate', 'Alarme agresive'],
    safe_actions: ['Șterge calendarul abonat', 'Nu deschide linkurile', 'Verifică setările calendar'],
    icon: <Calendar size={18} color="#8B5CF6" />,
    color: '#8B5CF6',
  },
  {
    id: 'ro-2025-social-account-takeover',
    priority: 17,
    family: 'Cont social compromis / prieten cere bani',
    channels: ['Facebook', 'Instagram', 'WhatsApp'],
    hook: 'Am nevoie urgent, votează, transfer rapid, nu mă suna.',
    red_flags: ['Mesaj neobișnuit de la prieten', 'Cerere urgentă', 'Link de verificare'],
    safe_actions: ['Verifică prin apel separat', 'Nu trimite bani/coduri', 'Raportează cont compromis'],
    icon: <Users size={18} color="#10B981" />,
    color: '#10B981',
  },
  {
    id: 'ro-2025-malware-apk',
    priority: 18,
    family: 'Malware / APK fals',
    channels: ['SMS', 'WhatsApp', 'Email'],
    hook: 'Instalează aplicația de curier/bancă/ANAF din link.',
    red_flags: ['APK în afara Google Play', 'Permisiuni excesive', 'Brand bancar/curier'],
    safe_actions: ['Nu instala APK', 'Dezinstalează imediat', 'Rulează scanare securitate'],
    icon: <Download size={18} color="#EF4444" />,
    color: '#EF4444',
  },
];

export default function AboutScreen({ onBack }: AboutScreenProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoRow}>
          <ShieldAlert size={32} color="#3B82F6" />
          <View style={styles.logoTextBlock}>
            <Text style={styles.logoText}>NuDa<Text style={{ color: '#3B82F6' }}>Click</Text></Text>
            <Text style={styles.logoVersion}>ScamShield RO · v1.0 · 2025–2026</Text>
          </View>
        </View>
      </View>

      {/* About Card */}
      <View style={styles.aboutCard}>
        <Text style={styles.aboutTitle}>Despre Aplicație</Text>
        <Text style={styles.aboutText}>
          <Text style={{ fontWeight: 'bold' }}>NuDaClick</Text> (ScamShield RO) este un asistent anti-fraudă localizat pentru România.
          Scanează mesaje suspecte primite prin SMS, WhatsApp, e-mail sau social media și îți oferă un verdict clar: <Text style={{ color: '#10B981', fontWeight: 'bold' }}>Sigur</Text>, <Text style={{ color: '#F59E0B', fontWeight: 'bold' }}>Suspect</Text> sau <Text style={{ color: '#EF4444', fontWeight: 'bold' }}>Periculos</Text>.
        </Text>
        <Text style={styles.aboutText}>
          Motorul de detecție folosește un registru actualizat de domenii oficiale românești (ANAF, Revolut, BT, Poșta, FAN Courier etc.), analiză de redirecționare în siguranță și explicații AI generate de Google Gemini.
        </Text>
      </View>

      {/* Privacy Card */}
      <View style={styles.privacyCard}>
        <Text style={styles.privacyTitle}>🔒 Angajament de Confidențialitate</Text>
        <Text style={styles.privacyText}>
          • Datele personale (telefon, IBAN, email, coduri OTP) sunt <Text style={{ fontWeight: 'bold', color: '#10B981' }}>mascate automat</Text> înainte de orice procesare.{'\n'}
          • Istoricul scanărilor este salvat <Text style={{ fontWeight: 'bold' }}>exclusiv local</Text> pe dispozitivul tău.{'\n'}
          • NuDaClick nu deschide niciodată link-urile suspecte în browserul tău.{'\n'}
          • Niciun mesaj nu este transmis terților fără consimțământ explicit.
        </Text>
      </View>

      {/* Scam Atlas Section */}
      <View style={styles.atlasHeader}>
        <BookOpen size={22} color="#3B82F6" style={{ marginRight: 8 }} />
        <Text style={styles.atlasTitle}>Atlasul Scam-urilor din România</Text>
      </View>
      <Text style={styles.atlasSubtitle}>
        {SCAM_FAMILIES.length} familii active de fraudă identificate în 2025–2026, cu surse oficiale (DNSC, FAN Courier, ING, BT, Revolut, Bitdefender, OLX).
      </Text>

      {/* Scam Families List */}
      {SCAM_FAMILIES.map((family) => {
        const isExpanded = expandedId === family.id;
        return (
          <TouchableOpacity
            key={family.id}
            style={[styles.familyCard, isExpanded && { borderColor: `${family.color}30` }]}
            onPress={() => toggleExpand(family.id)}
            activeOpacity={0.7}
          >
            <View style={styles.familyHeader}>
              <View style={[styles.priorityBadge, { backgroundColor: `${family.color}15`, borderColor: family.color }]}>
                <Text style={[styles.priorityText, { color: family.color }]}>#{family.priority}</Text>
              </View>
              <View style={styles.familyTitleBlock}>
                <Text style={styles.familyName}>{family.family}</Text>
                <View style={styles.channelsRow}>
                  {family.channels.map((ch, idx) => (
                    <View key={idx} style={styles.channelTag}>
                      <Text style={styles.channelTagText}>{ch}</Text>
                    </View>
                  ))}
                </View>
              </View>
              {isExpanded ? (
                <ChevronUp size={18} color="#6B7280" />
              ) : (
                <ChevronDown size={18} color="#6B7280" />
              )}
            </View>

            {isExpanded && (
              <View style={styles.familyDetails}>
                <Text style={styles.detailLabel}>🎣 Momeală tipică:</Text>
                <Text style={styles.detailText}>{family.hook}</Text>

                <Text style={styles.detailLabel}>🚩 Semnale roșii:</Text>
                {family.red_flags.map((flag, idx) => (
                  <Text key={idx} style={styles.flagItem}>• {flag}</Text>
                ))}

                <Text style={styles.detailLabel}>🛡️ Ce să faci:</Text>
                {family.safe_actions.map((action, idx) => (
                  <Text key={idx} style={styles.actionItem}>✓ {action}</Text>
                ))}
              </View>
            )}
          </TouchableOpacity>
        );
      })}

      {/* Resources */}
      <View style={styles.resourcesCard}>
        <Text style={styles.resourcesTitle}>Resurse Oficiale</Text>
          <TouchableOpacity
            style={styles.resourceLink}
            onPress={() => openExternalUrl('https://dnsc.ro', 'Nu s-a putut deschide site-ul DNSC.')}
          >
          <Globe size={14} color="#3B82F6" />
          <Text style={styles.resourceLinkText}>DNSC – Directoratul Național de Securitate Cibernetică</Text>
          <ExternalLink size={12} color="#6B7280" />
        </TouchableOpacity>
          <TouchableOpacity
            style={styles.resourceLink}
            onPress={() =>
              openExternalUrl(
                'https://www.bitdefender.com/ro-ro/consumer/scamio',
                'Nu s-a putut deschide pagina Scamio.'
              )
            }
          >
          <Globe size={14} color="#3B82F6" />
          <Text style={styles.resourceLinkText}>Bitdefender Scamio – Verificator AI gratuit</Text>
          <ExternalLink size={12} color="#6B7280" />
        </TouchableOpacity>
          <TouchableOpacity
            style={styles.resourceLink}
            onPress={() => openExternalUrl('tel:1911', 'Nu s-a putut iniția apelul. Sunați manual 1911.')}
          >
          <Phone size={14} color="#10B981" />
          <Text style={[styles.resourceLinkText, { color: '#10B981' }]}>Sună la 1911 – Linia națională DNSC</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.footer}>
        © 2025–2026 NuDaClick / ScamShield RO{'\n'}
        Construit cu ❤️ pentru siguranța digitală a românilor.
      </Text>
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
    marginBottom: 20,
    marginTop: 10,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoTextBlock: {
    marginLeft: 10,
  },
  logoText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
  },
  logoVersion: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  aboutCard: {
    backgroundColor: 'rgba(22, 30, 49, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  aboutTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  aboutText: {
    color: '#D1D5DB',
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 8,
  },
  privacyCard: {
    backgroundColor: 'rgba(16, 185, 129, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.12)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  privacyTitle: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  privacyText: {
    color: '#D1D5DB',
    fontSize: 12,
    lineHeight: 18,
  },
  atlasHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  atlasTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  atlasSubtitle: {
    color: '#9CA3AF',
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 16,
  },
  familyCard: {
    backgroundColor: 'rgba(22, 30, 49, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  familyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priorityBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  familyTitleBlock: {
    flex: 1,
  },
  familyName: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  channelsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  channelTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  channelTagText: {
    color: '#6B7280',
    fontSize: 9,
    fontWeight: '600',
  },
  familyDetails: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  detailLabel: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
    marginTop: 8,
  },
  detailText: {
    color: '#9CA3AF',
    fontSize: 12,
    lineHeight: 16,
  },
  flagItem: {
    color: '#D1D5DB',
    fontSize: 12,
    lineHeight: 16,
    paddingLeft: 6,
  },
  actionItem: {
    color: '#10B981',
    fontSize: 12,
    lineHeight: 16,
    paddingLeft: 6,
  },
  resourcesCard: {
    backgroundColor: 'rgba(22, 30, 49, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 16,
    padding: 20,
    marginTop: 12,
    marginBottom: 16,
  },
  resourcesTitle: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  resourceLink: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  resourceLinkText: {
    color: '#3B82F6',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
  footer: {
    color: '#4B5563',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 17,
    marginVertical: 20,
  },
});
