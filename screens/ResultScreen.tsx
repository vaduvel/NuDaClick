import React, { useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Share,
  Platform,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  ArrowLeft, 
  Share2, 
  AlertTriangle, 
  CheckCircle2, 
  HelpCircle, 
  ShieldAlert, 
  ExternalLink,
  ChevronRight,
  Flame
} from 'lucide-react-native';

interface ResultScreenProps {
  result: any;
  onBack: () => void;
  onNavigateToTriage: (preselectCategory?: string) => void;
}

export default function ResultScreen({ result, onBack, onNavigateToTriage }: ResultScreenProps) {
  const {
    scan_id,
    risk_score = 0,
    risk_level = 'low',
    detected_family = 'Nespecificat',
    claimed_brand = 'Nespecificat',
    reasons = [],
    evidence = {},
    redacted_text = '',
    ocr_extracted_text = '',
    ai_verdict = '',
    ai_explanation = '',
    key_dangers = [],
    safe_actions = [],
    warning = ''
  } = result;

  // Save the result to history when this screen mounts
  useEffect(() => {
    const saveToHistory = async () => {
      try {
        const existingHistoryStr = await AsyncStorage.getItem('scamshield_history');
        let history = existingHistoryStr ? JSON.parse(existingHistoryStr) : [];
        
        // Check if already in history to prevent duplicates
        const exists = history.some((item: any) => item.scan_id === scan_id);
        if (!exists) {
          const newHistoryItem = {
            scan_id,
            timestamp: new Date().toISOString(),
            risk_score,
            risk_level,
            detected_family,
            claimed_brand,
            text_preview: redacted_text || ocr_extracted_text || 'Scanare link direct',
            full_result: result
          };
          // Limit history to 50 items
          history = [newHistoryItem, ...history].slice(0, 50);
          await AsyncStorage.setItem('scamshield_history', JSON.stringify(history));
        }
      } catch (err) {
        console.error("Error saving scan to history", err);
      }
    };
    saveToHistory();
  }, [scan_id]);

  // Determine colors based on risk level mapping to EPIC-06 (SIGUR, SUSPECT, PERICULOS, NECUNOSCUT)
  const getRiskDetails = () => {
    switch (risk_level.toLowerCase()) {
      case 'critical':
        return {
          color: '#EF4444', // red
          bgGradient: ['#3A1313', '#1F0B0B'],
          borderColor: 'rgba(239, 68, 68, 0.4)',
          badgeText: 'PERICULOS',
          description: 'Acesta este cu siguranță un atac cibernetic activ. Nu introduceți date, coduri sau carduri!',
          icon: <ShieldAlert size={48} color="#EF4444" />
        };
      case 'high':
        return {
          color: '#F59E0B', // amber
          bgGradient: ['#38240D', '#1F1407'],
          borderColor: 'rgba(245, 158, 11, 0.4)',
          badgeText: 'PERICULOS',
          description: 'Mesajul prezintă anomalii grave și se folosește de branduri oficiale în mod nelegitim.',
          icon: <AlertTriangle size={48} color="#F59E0B" />
        };
      case 'medium':
        return {
          color: '#EAB308', // yellow
          bgGradient: ['#312E0D', '#1F1E07'],
          borderColor: 'rgba(234, 179, 8, 0.3)',
          badgeText: 'SUSPECT',
          description: 'Atenție! Unele elemente nu pot fi verificate complet sau par suspicioase.',
          icon: <AlertTriangle size={48} color="#EAB308" />
        };
      case 'low':
      case 'safe':
        return {
          color: '#10B981', // emerald
          bgGradient: ['#0C291E', '#061711'],
          borderColor: 'rgba(16, 185, 129, 0.4)',
          badgeText: 'SIGUR',
          description: 'Nu au fost identificate elemente cunoscute de fraudă. Totuși, rămâneți mereu vigilent.',
          icon: <CheckCircle2 size={48} color="#10B981" />
        };
      default:
        return {
          color: '#3B82F6', // blue
          bgGradient: ['#111E36', '#0B111E'],
          borderColor: 'rgba(59, 130, 246, 0.3)',
          badgeText: 'NECUNOSCUT',
          description: 'Nu s-a putut stabili o conexiune clară cu un scam cunoscut.',
          icon: <HelpCircle size={48} color="#3B82F6" />
        };
    }
  };

  const risk = getRiskDetails();

  const handleShare = async () => {
    try {
      const shareMessage = `ScamShield RO / NuDaClick Raport:
Scor Risc: ${risk_score}/100 [${risk.badgeText}]
Familie de Scam: ${detected_family}
Brand Mimic: ${claimed_brand}

Verdict: ${ai_verdict || risk.description}

Nu cădea în plasă! Verifică link-urile suspecte cu aplicația NuDaClick.`;

      if (Platform.OS === 'web') {
        if (navigator.share) {
          await navigator.share({
            title: 'Raport NuDaClick',
            text: shareMessage,
          });
        } else {
          await navigator.clipboard.writeText(shareMessage);
          Alert.alert('Copiat', 'Raportul a fost copiat în clipboard!');
        }
      } else {
        await Share.share({
          message: shareMessage,
        });
      }
    } catch (error) {
      console.log('Error sharing', error);
    }
  };

  // Determine fallback/preselect triage category based on detected family or dangers
  const getPreselectCategory = () => {
    const textToCheck = `${detected_family} ${reasons.join(' ')}`.toLowerCase();
    if (textToCheck.includes('card') || textToCheck.includes('banc') || textToCheck.includes('plata') || textToCheck.includes('revolut') || textToCheck.includes('olx')) {
      return 'card';
    } else if (textToCheck.includes('whatsapp') || textToCheck.includes('cod') || textToCheck.includes('sms') || textToCheck.includes('otp')) {
      return 'whatsapp';
    } else if (textToCheck.includes('anydesk') || textToCheck.includes('teamviewer') || textToCheck.includes('aplicatie') || textToCheck.includes('instal')) {
      return 'anydesk';
    }
    return 'card'; // default
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <ArrowLeft size={20} color="#9CA3AF" />
          <Text style={styles.backText}>Înapoi</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
          <Share2 size={18} color="#9CA3AF" style={{ marginRight: 6 }} />
          <Text style={styles.shareText}>Distribuiți</Text>
        </TouchableOpacity>
      </View>

      {/* Main Risk Card */}
      <View style={[styles.riskCard, { borderColor: risk.borderColor, backgroundColor: risk.bgGradient[0] }]}>
        <View style={styles.riskHeader}>
          {risk.icon}
          <View style={styles.scoreContainer}>
            <Text style={[styles.scoreNumber, { color: risk.color }]}>{risk_score}</Text>
            <Text style={styles.scoreMax}>/100</Text>
          </View>
        </View>

        <View style={styles.badgeRow}>
          <View style={[styles.badge, { backgroundColor: `${risk.color}15`, borderColor: risk.color }]}>
            <Text style={[styles.badgeLabel, { color: risk.color }]}>{risk.badgeText}</Text>
          </View>
        </View>

        <Text style={styles.familyText}>Familie scam: <Text style={{ fontWeight: 'bold', color: '#FFF' }}>{detected_family}</Text></Text>
        <Text style={styles.brandText}>Brand clonat: <Text style={[styles.brandHighlight, { color: risk.color }]}>{claimed_brand}</Text></Text>
        
        <Text style={styles.riskDescription}>{risk.description}</Text>
      </View>

      {/* Warnings & OCR warnings */}
      {(warning || result.warning) && (
        <View style={styles.warningAlert}>
          <Text style={styles.warningAlertTitle}>⚠️ Avertisment OCR / Captură ecran</Text>
          <Text style={styles.warningAlertText}>{warning || result.warning}</Text>
        </View>
      )}

      {/* AI Explanation Box */}
      {(ai_verdict || ai_explanation) && (
        <View style={styles.glassCard}>
          <Text style={styles.sectionTitle}>💡 Analiză Inteligentă AI</Text>
          
          {ai_verdict && (
            <Text style={styles.verdictSummary}>
              <Text style={{fontWeight: 'bold', color: risk.color}}>Verdict: </Text>
              {ai_verdict}
            </Text>
          )}

          {ai_explanation && (
            <Text style={styles.explanationText}>
              {ai_explanation}
            </Text>
          )}

          {key_dangers.length > 0 && (
            <View style={styles.dangerList}>
              <Text style={styles.subSectionTitle}>Pericole principale:</Text>
              {key_dangers.map((danger: string, index: number) => (
                <Text key={index} style={styles.bulletItem}>
                  🔥 {danger}
                </Text>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Reasons for risk scoring */}
      {reasons.length > 0 && (
        <View style={styles.glassCard}>
          <Text style={styles.sectionTitle}>🔍 Semnale de Alarmă Detectate</Text>
          {reasons.map((reason: string, index: number) => (
            <View key={index} style={styles.reasonRow}>
              <View style={[styles.dot, { backgroundColor: risk.color }]} />
              <Text style={styles.reasonText}>{reason}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Redirect Chain / Domain Evidence */}
      {evidence && evidence.extracted_urls && evidence.extracted_urls.length > 0 && (
        <View style={styles.glassCard}>
          <Text style={styles.sectionTitle}>🔗 Analiză Link-uri & Redirecționări</Text>
          <Text style={styles.subtitleText}>Urmărirea redirecționărilor a arătat următoarele destinații:</Text>
          
          {evidence.extracted_urls.map((urlInfo: any, idx: number) => {
            const isMatch = urlInfo.domain_legitimacy === 'official';
            const isPhish = urlInfo.domain_legitimacy === 'mismatch';
            const badgeColor = isMatch ? '#10B981' : isPhish ? '#EF4444' : '#9CA3AF';
            
            return (
              <View key={idx} style={styles.urlBlock}>
                <View style={styles.urlHeaderRow}>
                  <Text style={styles.urlIndex} numberOfLines={1}>Link #{idx + 1}: {urlInfo.original_url}</Text>
                </View>
                
                {urlInfo.redirect_chain && urlInfo.redirect_chain.length > 0 && (
                  <View style={styles.redirectChain}>
                    <Text style={styles.redirectChainTitle}>Lanț redirecționare:</Text>
                    {urlInfo.redirect_chain.map((hop: string, hopIdx: number) => (
                      <View key={hopIdx} style={styles.chainHop}>
                        <Text style={styles.hopText}>{hop}</Text>
                        {hopIdx < urlInfo.redirect_chain.length - 1 && (
                          <ChevronRight size={12} color="#6B7280" style={{ marginHorizontal: 4 }} />
                        )}
                      </View>
                    ))}
                  </View>
                )}

                <View style={styles.domainInfoRow}>
                  <View style={styles.domainInfoBlock}>
                    <Text style={styles.domainLabel}>Domeniu înregistrat:</Text>
                    <Text style={styles.domainValue}>{urlInfo.final_registered_domain || 'Nespecificat'}</Text>
                  </View>
                  <View style={[styles.domainBadge, { backgroundColor: `${badgeColor}15`, borderColor: badgeColor }]}>
                    <Text style={[styles.domainBadgeText, { color: badgeColor }]}>
                      {isMatch ? 'OFICIAL / VALID' : isPhish ? 'FALS / PHISHING' : 'NEVERIFICAT'}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Safe Action Plan */}
      {safe_actions.length > 0 && (
        <View style={styles.glassCard}>
          <Text style={styles.sectionTitle}>🛡️ Plan de Acțiune Recomandat</Text>
          {safe_actions.map((action: string, index: number) => (
            <View key={index} style={styles.actionRow}>
              <View style={styles.actionNumber}>
                <Text style={styles.actionNumberText}>{index + 1}</Text>
              </View>
              <Text style={styles.actionText}>{action}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Triage Call to Action */}
      {risk_level !== 'low' && (
        <View style={[styles.triageCard, { borderColor: 'rgba(239, 68, 68, 0.2)' }]}>
          <Flame size={28} color="#EF4444" style={{ marginBottom: 8 }} />
          <Text style={styles.triageTitle}>Ai apăsat deja pe link sau ai introdus date?</Text>
          <Text style={styles.triageDesc}>
            Nu intra în panică. Avem instrucțiuni clare pas cu pas în română pentru a-ți proteja banii și contul.
          </Text>
          <TouchableOpacity 
            style={styles.triageButton}
            onPress={() => onNavigateToTriage(getPreselectCategory())}
          >
            <Text style={styles.triageButtonText}>Ghid de Urgență „Am apăsat deja”</Text>
            <ChevronRight size={16} color="#FFF" />
          </TouchableOpacity>
        </View>
      )}

      {/* Footer scan again */}
      <TouchableOpacity style={styles.primaryButton} onPress={onBack}>
        <Text style={styles.primaryButtonText}>Scanează Altceva</Text>
      </TouchableOpacity>
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
    justifyContent: 'space-between',
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
  },
  backText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  shareText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '600',
  },
  riskCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  riskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  scoreNumber: {
    fontSize: 48,
    fontWeight: '900',
  },
  scoreMax: {
    fontSize: 18,
    color: '#6B7280',
    fontWeight: '600',
  },
  badgeRow: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 99,
    borderWidth: 1,
  },
  badgeLabel: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  familyText: {
    color: '#9CA3AF',
    fontSize: 15,
    marginBottom: 4,
  },
  brandText: {
    color: '#9CA3AF',
    fontSize: 15,
    marginBottom: 16,
  },
  brandHighlight: {
    fontWeight: 'bold',
  },
  riskDescription: {
    color: '#D1D5DB',
    fontSize: 14,
    lineHeight: 20,
  },
  warningAlert: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  warningAlertTitle: {
    color: '#EF4444',
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 4,
  },
  warningAlertText: {
    color: '#D1D5DB',
    fontSize: 13,
    lineHeight: 18,
  },
  glassCard: {
    backgroundColor: 'rgba(22, 30, 49, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  verdictSummary: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    color: '#FFF',
    marginBottom: 8,
    backgroundColor: 'rgba(0,0,0,0.2)',
    padding: 10,
    borderRadius: 8,
  },
  explanationText: {
    color: '#9CA3AF',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  dangerList: {
    backgroundColor: 'rgba(239, 68, 68, 0.03)',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.06)',
  },
  subSectionTitle: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  bulletItem: {
    color: '#E5E7EB',
    fontSize: 13,
    lineHeight: 18,
    marginVertical: 3,
    paddingLeft: 4,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 7,
    marginRight: 10,
  },
  reasonText: {
    color: '#D1D5DB',
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  subtitleText: {
    color: '#9CA3AF',
    fontSize: 13,
    marginBottom: 12,
  },
  urlBlock: {
    backgroundColor: 'rgba(11, 15, 25, 0.5)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  urlHeaderRow: {
    marginBottom: 6,
  },
  urlIndex: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '600',
  },
  redirectChain: {
    marginVertical: 8,
    padding: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    borderRadius: 6,
  },
  redirectChainTitle: {
    color: '#6B7280',
    fontSize: 11,
    marginBottom: 4,
    fontWeight: 'bold',
  },
  chainHop: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginVertical: 2,
  },
  hopText: {
    color: '#9CA3AF',
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  domainInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.04)',
    paddingTop: 8,
  },
  domainInfoBlock: {
    flex: 1,
  },
  domainLabel: {
    color: '#6B7280',
    fontSize: 10,
  },
  domainValue: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  domainBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  domainBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  actionNumber: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    borderRadius: 6,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 1,
  },
  actionNumberText: {
    color: '#3B82F6',
    fontSize: 12,
    fontWeight: 'bold',
  },
  actionText: {
    color: '#D1D5DB',
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  triageCard: {
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
    textAlign: 'center',
  },
  triageTitle: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  triageDesc: {
    color: '#9CA3AF',
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  triageButton: {
    backgroundColor: '#EF4444',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  triageButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginRight: 6,
  },
  primaryButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
  },
  primaryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
