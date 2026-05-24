import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Linking,
  Platform,
  Alert,
} from 'react-native';
import { 
  CreditCard, 
  Share2, 
  ShieldAlert, 
  Smartphone, 
  Download, 
  UserCheck, 
  Phone, 
  CheckSquare, 
  Square,
  ArrowLeft,
  ChevronRight,
  Info
} from 'lucide-react-native';

interface TriageScreenProps {
  initialCategory?: string;
  onBack: () => void;
}

interface Step {
  id: string;
  text: string;
  detail: string;
}

interface IncidentGuide {
  title: string;
  icon: React.ReactNode;
  color: string;
  description: string;
  steps: Step[];
}

export default function TriageScreen({ initialCategory = 'card', onBack }: TriageScreenProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [checkedSteps, setCheckedSteps] = useState<Record<string, boolean>>({});

  const guides: Record<string, IncidentGuide> = {
    card: {
      title: 'Compromitere date card bancar',
      icon: <CreditCard size={24} color="#EF4444" />,
      color: '#EF4444',
      description: 'Dacă ați introdus numărul de card, data de expirare sau codul CVV pe o pagină suspectă, urmați acești pași urgent:',
      steps: [
        {
          id: 'card_1',
          text: 'Blocați imediat cardul din aplicația bancară',
          detail: 'Intrați în aplicația băncii dvs. (Revolut, BT Pay, George etc.) și folosiți opțiunea de înghețare (Freeze/Block) a cardului.'
        },
        {
          id: 'card_2',
          text: 'Sunați la asistența clienți a băncii dvs.',
          detail: 'Numărul se află pe spatele cardului fizic sau pe site-ul oficial al băncii. Raportați tranzacțiile neautorizate.'
        },
        {
          id: 'card_3',
          text: 'Depuneți plângere la Poliție și DNSC (1911)',
          detail: 'Salvați screenshot-uri cu mesajul de phishing, site-ul clonat și tranzacțiile din cont. Sunați la 1911 pentru raportare la DNSC.'
        },
        {
          id: 'card_4',
          text: 'Monitorizați contul în următoarele 14 zile',
          detail: 'Verificați zilnic dacă apar tranzacții neobișnuite de valoare mică, folosite adesea de atacatori pentru a verifica cardul.'
        }
      ]
    },
    whatsapp: {
      title: 'Cod WhatsApp / Cont compromis',
      icon: <Smartphone size={24} color="#10B981" />,
      color: '#10B981',
      description: 'Dacă ați trimis cuiva un cod SMS primit pe telefon sau v-ați conectat într-o aplicație falsă:',
      steps: [
        {
          id: 'wa_1',
          text: 'Verificați dispozitivele conectate (Linked Devices)',
          detail: 'În WhatsApp: Setări -> Dispozitive asociate. Deconectați (Log out) imediat orice dispozitiv suspect sau necunoscut.'
        },
        {
          id: 'wa_2',
          text: 'Activați verificarea în doi pași (2-Step Verification)',
          detail: 'În WhatsApp: Setări -> Cont -> Verificare în doi pași. Configurați un cod PIN personal pentru a bloca accesul atacatorilor.'
        },
        {
          id: 'wa_3',
          text: 'Avertizați-vă contactele de urgență',
          detail: 'Atacatorii pot trimite mesaje prietenilor dvs. cerându-le bani împrumut sau coduri SMS în numele dvs. Anunțați-i rapid.'
        },
        {
          id: 'wa_4',
          text: 'Reinstalați aplicația dacă ați fost deconectat',
          detail: 'Dacă ați pierdut accesul, reinstalați WhatsApp și solicitați trimiterea unui cod nou de verificare prin SMS.'
        }
      ]
    },
    anydesk: {
      title: 'Aplicație de control la distanță instalată',
      icon: <Download size={24} color="#3B82F6" />,
      color: '#3B82F6',
      description: 'Dacă ați instalat AnyDesk, TeamViewer, QuickSupport sau o aplicație tip .APK trimisă de atacatori:',
      steps: [
        {
          id: 'app_1',
          text: 'Deconectați imediat telefonul de la internet',
          detail: 'Activați Modul Avion sau opriți conexiunile Wi-Fi și Date Mobile pentru a bloca accesul atacatorilor de la distanță.'
        },
        {
          id: 'app_2',
          text: 'Dezinstalați complet aplicația suspectă',
          detail: 'Mergeți în setările telefonului -> Aplicații și ștergeți AnyDesk, TeamViewer sau fișierele descărcate recent (.APK).'
        },
        {
          id: 'app_3',
          text: 'Schimbați parolele conturilor bancare și de email',
          detail: 'De pe alt dispozitiv sigur sau după eliminarea aplicației, schimbați urgent parolele la aplicațiile bancare și email.'
        },
        {
          id: 'app_4',
          text: 'Scanați dispozitivul cu un antivirus de încredere',
          detail: 'Descărcați o aplicație de securitate recunoscută din Google Play / App Store pentru a curăța telefonul de malware ascuns.'
        }
      ]
    },
    personal: {
      title: 'Date personale trimise (CNP / Buletin)',
      icon: <UserCheck size={24} color="#F59E0B" />,
      color: '#F59E0B',
      description: 'Dacă ați trimis fotografii cu buletinul, pașaportul sau ați completat date precum CNP, adresă, nume complet:',
      steps: [
        {
          id: 'pers_1',
          text: 'Alertați DNSC (Directoratul Național de Securitate Cibernetică)',
          detail: 'Sunați la 1911 sau trimiteți o alertă pe site-ul dnsc.ro pentru a raporta incidentul și a fi în baza lor de date.'
        },
        {
          id: 'pers_2',
          text: 'Monitorizați încercările de împrumut / credite online',
          detail: 'Atacatorii pot încerca să deschidă conturi la IFN-uri (credite rapide online). Verificați Biroul de Credit periodic.'
        },
        {
          id: 'pers_3',
          text: 'Schimbați parolele asociate adresei de email',
          detail: 'Dacă ați oferit și adresa de email și parole similare, schimbați-le pe toate și activați autentificarea 2FA.'
        },
        {
          id: 'pers_4',
          text: 'Înlocuiți actul de identitate compromis',
          detail: 'În cazuri grave (dacă poza buletinului a ajuns la atacatori), solicitați declararea cărții de identitate ca pierdută/furată și emiterea uneia noi.'
        }
      ]
    }
  };

  const handleToggleStep = (stepId: string) => {
    setCheckedSteps(prev => ({
      ...prev,
      [stepId]: !prev[stepId]
    }));
  };

  const handleCallDNSC = () => {
    Linking.openURL('tel:1911').catch(() => {
      Alert.alert('Eroare', 'Nu s-a putut iniția apelul. Formați manual 1911.');
    });
  };

  const activeGuide = guides[selectedCategory];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Header Navigation */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <ArrowLeft size={20} color="#9CA3AF" />
          <Text style={styles.backText}>Scanează</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Centrul de Urgență</Text>
      </View>

      {/* Main instruction */}
      <View style={styles.introCard}>
        <ShieldAlert size={28} color="#EF4444" style={{ marginBottom: 8 }} />
        <Text style={styles.introTitle}>Ghiduri Interactive Anti-Fraudă</Text>
        <Text style={styles.introDesc}>
          Alegeți mai jos scenariul potrivit pentru a genera instantaneu un plan de măsuri de urgență în limba română.
        </Text>
      </View>

      {/* Category selector */}
      <View style={styles.tabsContainer}>
        {Object.entries(guides).map(([key, guide]) => {
          const isSelected = selectedCategory === key;
          return (
            <TouchableOpacity
              key={key}
              style={[
                styles.tabButton,
                isSelected && { backgroundColor: `${guide.color}15`, borderColor: guide.color }
              ]}
              onPress={() => setSelectedCategory(key)}
            >
              {guide.icon}
              <Text 
                style={[
                  styles.tabLabel, 
                  isSelected ? { color: '#FFF', fontWeight: 'bold' } : { color: '#6B7280' }
                ]}
                numberOfLines={1}
              >
                {guide.title.split(' ')[0]} {/* Shorthand for small buttons */}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Active Guide Card */}
      {activeGuide && (
        <View style={[styles.guideCard, { borderColor: `${activeGuide.color}25` }]}>
          <View style={styles.guideHeader}>
            {activeGuide.icon}
            <Text style={styles.guideTitle}>{activeGuide.title}</Text>
          </View>
          
          <Text style={styles.guideDesc}>{activeGuide.description}</Text>

          {/* Interactive Steps Checklist */}
          <View style={styles.stepsContainer}>
            {activeGuide.steps.map((step) => {
              const isChecked = !!checkedSteps[step.id];
              return (
                <View key={step.id} style={styles.stepItem}>
                  <TouchableOpacity 
                    style={styles.checkboxWrapper} 
                    onPress={() => handleToggleStep(step.id)}
                  >
                    {isChecked ? (
                      <CheckSquare size={22} color={activeGuide.color} />
                    ) : (
                      <Square size={22} color="#4B5563" />
                    )}
                  </TouchableOpacity>
                  <View style={styles.stepContent}>
                    <Text 
                      style={[
                        styles.stepText, 
                        isChecked && { textDecorationLine: 'line-through', color: '#6B7280' }
                      ]}
                    >
                      {step.text}
                    </Text>
                    <Text style={styles.stepDetail}>{step.detail}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Emergency Call Box */}
      <View style={styles.callCard}>
        <View style={styles.callHeader}>
          <Phone size={24} color="#3B82F6" />
          <Text style={styles.callTitle}>Asistență Telefonică Națională (DNSC)</Text>
        </View>
        <Text style={styles.callDesc}>
          Dacă ați fost victima unei fraude cibernetice sau ați pierdut sume de bani, contactați imediat Directoratul Național la numărul unic gratuit:
        </Text>
        <TouchableOpacity style={styles.callButton} onPress={handleCallDNSC}>
          <Phone size={18} color="#FFF" style={{ marginRight: 8 }} />
          <Text style={styles.callButtonText}>Sunați la 1911</Text>
        </TouchableOpacity>
      </View>

      {/* Educational info */}
      <View style={styles.infoCard}>
        <Info size={18} color="#9CA3AF" style={{ marginRight: 8, marginTop: 2 }} />
        <Text style={styles.infoText}>
          <Text style={{fontWeight: 'bold'}}>Notă legală:</Text> Acest ghid oferă recomandări generale de securitate și nu înlocuiește sfaturile băncii dvs. sau ale organelor de poliție. Reacționați rapid.
        </Text>
      </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginRight: 16,
  },
  backText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  introCard: {
    backgroundColor: 'rgba(22, 30, 49, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  introTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  introDesc: {
    color: '#9CA3AF',
    fontSize: 13,
    lineHeight: 18,
  },
  tabsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    flexWrap: 'wrap',
    gap: 8,
  },
  tabButton: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(11, 15, 25, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  tabLabel: {
    fontSize: 12,
    marginLeft: 8,
  },
  guideCard: {
    backgroundColor: 'rgba(22, 30, 49, 0.7)',
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  guideHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  guideTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
    flex: 1,
  },
  guideDesc: {
    color: '#D1D5DB',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 20,
  },
  stepsContainer: {
    marginTop: 10,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 18,
  },
  checkboxWrapper: {
    marginRight: 12,
    marginTop: 2,
  },
  stepContent: {
    flex: 1,
  },
  stepText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  stepDetail: {
    color: '#9CA3AF',
    fontSize: 12,
    lineHeight: 16,
  },
  callCard: {
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.15)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  callHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  callTitle: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  callDesc: {
    color: '#9CA3AF',
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 16,
  },
  callButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  callButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 30,
  },
  infoText: {
    color: '#6B7280',
    fontSize: 11,
    lineHeight: 16,
    flex: 1,
  },
});
