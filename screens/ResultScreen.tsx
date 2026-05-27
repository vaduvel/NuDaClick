import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Share,
  Platform,
  Alert,
  TextInput,
  ActivityIndicator,
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
import { getDisplayRiskBadgeLabel, getDisplayRiskToken, normalizeRiskLevelForDisplay } from '../theme';

interface ResultScreenProps {
  result: any;
  onBack: () => void;
  onNavigateToTriage: (preselectCategory?: string) => void;
  backendUrl: string;
}

export default function ResultScreen({
  result,
  onBack,
  onNavigateToTriage,
  backendUrl,
}: ResultScreenProps) {
  const {
    scan_id,
    risk_score = 0,
    risk_level = 'low',
    user_risk_level,
    user_risk_label,
    user_risk_text,
    user_recommended_action,
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
    warning = '',
    signal_ids = [],
    buttons = [],
    resolved_urls = [],
    subject = '',
    from = '',
    reply_to = '',
    is_forwarded_warning = false,
  } = result;

  const riskDisplayLevel = normalizeRiskLevelForDisplay(user_risk_level || risk_level);
  const riskDisplayToken = getDisplayRiskToken(riskDisplayLevel);
  const feedbackStorageKey = `scamshield_feedback_${scan_id}`;
  const predictedIsScam = riskDisplayLevel === 'dangerous' || riskDisplayLevel === 'suspect';
  const parsedSignalIds = Array.isArray(signal_ids)
    ? signal_ids.filter((value) => typeof value === 'string')
    : [];
  const parsedRiskScore = Number.isFinite(Number(risk_score)) ? Number(risk_score) : 0;
  const emailAuth = (evidence as { email_auth?: any } | null | undefined)?.email_auth;
  const authStatus = emailAuth?.auth_status || {};
  const dnsChecks = emailAuth?.dns_checks || {};
  const authActionPlan = emailAuth?.auth_action_plan;
  const authFailReasons = Array.isArray(emailAuth?.auth_fail_reasons)
    ? emailAuth.auth_fail_reasons
    : [];
  const hasEmailAuthContext = Boolean(emailAuth);
  const parsedButtons = Array.isArray(buttons) ? buttons : [];
  const linkEvidence =
    Array.isArray((evidence as { extracted_urls?: any[] } | null | undefined)?.extracted_urls) &&
    (evidence as { extracted_urls?: any[] }).extracted_urls!.length > 0
      ? (evidence as { extracted_urls?: any[] }).extracted_urls!
      : Array.isArray(resolved_urls)
      ? resolved_urls
      : [];

  const formatRedirectHop = (hop: any) => {
    if (typeof hop === 'string') {
      return hop;
    }
    if (hop && typeof hop === 'object') {
      return hop.url || hop.final_url || hop.hostname || hop.registered_domain || JSON.stringify(hop);
    }
    return String(hop || '');
  };

  type FeedbackChoice = 'correct' | 'false_positive' | 'false_negative';

  const [submittedFeedback, setSubmittedFeedback] = useState<FeedbackChoice | null>(null);
  const [feedbackNotes, setFeedbackNotes] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');

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
            user_risk_level: user_risk_level || riskDisplayLevel,
            user_risk_label: user_risk_label || getDisplayRiskBadgeLabel(riskDisplayLevel),
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

  const feedbackOptions: Array<{ value: FeedbackChoice; label: string; description: string; color: string }> = [
    {
      value: 'correct',
      label: 'Corect',
      description: 'Verdictul este corect',
      color: '#10B981',
    },
    {
      value: 'false_positive',
      label: 'Fals Pozitiv',
      description: 'A fost semnalat ca scam, dar era sigur',
      color: '#F59E0B',
    },
    {
      value: 'false_negative',
      label: 'Fals Negativ',
      description: 'Ar fi trebuit să fie semnalat ca scam',
      color: '#EF4444',
    },
  ];

  useEffect(() => {
    const loadStoredFeedback = async () => {
      try {
        const raw = await AsyncStorage.getItem(feedbackStorageKey);
        if (!raw) {
          return;
        }

        const parsed = JSON.parse(raw) as { feedback?: FeedbackChoice; notes?: string };
        if (parsed.feedback) {
          setSubmittedFeedback(parsed.feedback);
        }
        if (typeof parsed.notes === 'string') {
          setFeedbackNotes(parsed.notes);
        }
      } catch (err) {
        console.error('Error loading stored feedback', err);
      }
    };
    loadStoredFeedback();
  }, [feedbackStorageKey]);

  const submitFeedback = async (feedbackValue: FeedbackChoice) => {
    setIsSubmittingFeedback(true);
    setFeedbackMessage('');

    try {
      const response = await fetch(`${backendUrl}/v1/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scan_id,
          feedback: feedbackValue,
          actual_is_scam:
            feedbackValue === 'false_positive'
              ? false
              : feedbackValue === 'false_negative'
              ? true
              : predictedIsScam,
          predicted_is_scam: predictedIsScam,
          predicted_risk_score: parsedRiskScore,
          risk_level: user_risk_level || risk_level,
          signal_ids: parsedSignalIds,
          notes: feedbackNotes.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const responseText = await response.text().catch(() => '');
        throw new Error(responseText || 'Nu s-a putut trimite feedback-ul');
      }

      const savedPayload = {
        feedback: feedbackValue,
        notes: feedbackNotes.trim(),
        submitted_at: new Date().toISOString(),
      };
      await AsyncStorage.setItem(feedbackStorageKey, JSON.stringify(savedPayload));
      setSubmittedFeedback(feedbackValue);
      setFeedbackMessage('Mulțumim! Feedback-ul a fost trimis și ajută recalibrarea modelului anti-fraudă.');
    } catch (err: any) {
      setFeedbackMessage(
        `Nu s-a putut trimite feedback-ul automat. Încearcă din nou. (${String(err?.message || 'Eroare')})`
      );
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  // Determine colors based on user-facing risk model (SIGUR, SUSPECT, PERICULOS, NECUNOSCUT)
  const getRiskDetails = () => {
    switch (riskDisplayLevel) {
      case 'dangerous':
        return {
          color: riskDisplayToken.main,
          bgGradient: ['#3A1313', '#1F0B0B'],
          borderColor: `${riskDisplayToken.border}`,
          badgeText: user_risk_label || getDisplayRiskBadgeLabel(riskDisplayLevel),
          description: 'Acesta este cu siguranță un atac cibernetic activ. Nu introduceți date, coduri sau carduri!',
          icon: <ShieldAlert size={48} color="#EF4444" />
        };
      case 'suspect':
        return {
          color: riskDisplayToken.main,
          bgGradient: ['#312E0D', '#1F1E07'],
          borderColor: `${riskDisplayToken.border}`,
          badgeText: user_risk_label || getDisplayRiskBadgeLabel(riskDisplayLevel),
          description: 'Atenție! Unele elemente nu pot fi verificate complet sau par suspicioase.',
          icon: <AlertTriangle size={48} color="#EAB308" />
        };
      case 'safe':
        return {
          color: riskDisplayToken.main,
          bgGradient: ['#0C291E', '#061711'],
          borderColor: `${riskDisplayToken.border}`,
          badgeText: user_risk_label || getDisplayRiskBadgeLabel(riskDisplayLevel),
          description: 'Nu au fost identificate elemente cunoscute de fraudă. Totuși, rămâneți mereu vigilent.',
          icon: <CheckCircle2 size={48} color="#10B981" />
        };
      default:
        return {
          color: riskDisplayToken.main,
          bgGradient: ['#111E36', '#0B111E'],
          borderColor: `${riskDisplayToken.border}`,
          badgeText: user_risk_label || getDisplayRiskBadgeLabel(riskDisplayLevel),
          description: 'Nu s-a putut stabili o conexiune clară cu un scam cunoscut.',
          icon: <HelpCircle size={48} color="#3B82F6" />
        };
    }
  };

  const risk = getRiskDetails();

  const handleShare = async () => {
    try {
  const shareMessage = `ScamShield RO / NuDaClick Raport:
Status: ${risk.badgeText}
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
          <View style={styles.statusBanner}>
            <Text style={[styles.statusBannerLabel, { color: risk.color }]}>STATUS</Text>
            <Text style={[styles.statusBannerValue, { color: risk.color }]}>{risk.badgeText}</Text>
          </View>
        </View>

        <View style={styles.badgeRow}>
          <View style={[styles.badge, { backgroundColor: `${risk.color}15`, borderColor: risk.color }]}>
            <Text style={[styles.badgeLabel, { color: risk.color }]}>{risk.badgeText}</Text>
          </View>
        </View>

        {user_risk_text ? <Text style={styles.riskText}>{user_risk_text}</Text> : null}
        {user_recommended_action ? (
          <Text style={styles.riskRecommendation}>{user_recommended_action}</Text>
        ) : null}

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

      {(subject || from || reply_to || is_forwarded_warning) && (
        <View style={styles.glassCard}>
          <Text style={styles.sectionTitle}>📧 Email analizat</Text>
          {subject ? (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Subiect</Text>
              <Text style={styles.metaValue}>{subject}</Text>
            </View>
          ) : null}
          {from ? (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>De la</Text>
              <Text style={styles.metaValue}>{from}</Text>
            </View>
          ) : null}
          {reply_to ? (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Reply-To</Text>
              <Text style={styles.metaValue}>{reply_to}</Text>
            </View>
          ) : null}
          {is_forwarded_warning ? (
            <Text style={styles.metaWarning}>
              Emailul pare forwardat sau copiat fără toate antetele originale. Linkurile pot fi verificate,
              dar autentificarea SPF/DKIM/DMARC poate fi doar parțială.
            </Text>
          ) : null}
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

      {/* SPF/DKIM/DMARC advanced checks */}
      {hasEmailAuthContext && (
        <View style={styles.glassCard}>
          <Text style={styles.sectionTitle}>📨 Verificare SPF / DKIM / DMARC</Text>

          <View style={styles.authRow}>
            <Text style={styles.authLabel}>Status autentificare</Text>
            <Text style={[styles.authValue, { color: risk.color }]}>
              {(emailAuth?.auth_strength || 'unknown').toString().toUpperCase()}
            </Text>
          </View>

          <View style={styles.authRow}>
            <Text style={styles.authLabel}>SPF</Text>
            <Text style={[styles.authValue, { color: authStatus?.spf === 'pass' ? '#10B981' : '#EF4444' }]}>
              {String(authStatus?.spf || 'missing').toUpperCase()}
            </Text>
          </View>
          <View style={styles.authRow}>
            <Text style={styles.authLabel}>DKIM</Text>
            <Text
              style={[styles.authValue, { color: authStatus?.dkim === 'pass' ? '#10B981' : '#EF4444' }]}
            >
              {String(authStatus?.dkim || 'missing').toUpperCase()}
            </Text>
          </View>
          <View style={styles.authRow}>
            <Text style={styles.authLabel}>DMARC</Text>
            <Text
              style={[styles.authValue, { color: authStatus?.dmarc === 'pass' ? '#10B981' : '#EF4444' }]}
            >
              {String(authStatus?.dmarc || 'missing').toUpperCase()}
            </Text>
          </View>

          <Text style={styles.authSubTitle}>Politici DNS</Text>
          <View style={styles.authRow}>
            <Text style={styles.authLabel}>SPF DNS</Text>
            <Text style={styles.authValue}>{dnsChecks?.spf_record ? 'Disponibil' : 'Nedetectat'}</Text>
          </View>
          <View style={styles.authRow}>
            <Text style={styles.authLabel}>DKIM DNS</Text>
            <Text style={styles.authValue}>{dnsChecks?.dkim_dns ? 'Disponibil' : 'Nedetectat'}</Text>
          </View>
          <View style={styles.authRow}>
            <Text style={styles.authLabel}>DMARC DNS</Text>
            <Text style={styles.authValue}>{dnsChecks?.dmarc_policy ? 'Disponibil' : 'Nedetectat'}</Text>
          </View>

          <Text style={styles.authSubTitle}>Plan de acțiune generat</Text>
          <Text style={styles.actionText}>
            {authActionPlan?.action ? `Acțiune: ${String(authActionPlan.action).toUpperCase()}` : 'Acțiune: monitor'}
          </Text>

          <View style={styles.authReasonList}>
            {(authFailReasons.length > 0 ? authFailReasons : authActionPlan?.reasons || []).map(
              (reason: string, index: number) => (
                <Text key={index} style={styles.bulletItem}>
                  • {reason}
                </Text>
              )
            )}
          </View>
        </View>
      )}

      {/* Reasons detected */}
      {reasons.length > 0 && (
        <View style={styles.glassCard}>
          <Text style={styles.sectionTitle}>🔍 Semnale detectate</Text>
          {reasons.map((reason: string, index: number) => (
            <View key={index} style={styles.reasonRow}>
              <View style={[styles.dot, { backgroundColor: risk.color }]} />
              <Text style={styles.reasonText}>{reason}</Text>
            </View>
          ))}
        </View>
      )}

      {parsedButtons.length > 0 && (
        <View style={styles.glassCard}>
          <Text style={styles.sectionTitle}>🔘 Butoane și linkuri ascunse</Text>
          <Text style={styles.subtitleText}>
            Am extras din email adresa reală din spatele butoanelor pe care utilizatorul le-ar apăsa.
          </Text>

          {parsedButtons.map((button: any, index: number) => {
            const resolvedButtonUrl = button.final_url || button.original_url || 'Necunoscut';
            return (
              <View key={index} style={styles.buttonEvidenceCard}>
                <View style={styles.buttonEvidenceHeader}>
                  <Text style={styles.buttonEvidenceTitle}>
                    Buton #{index + 1}: {button.button_text || '[Fără text]'}
                  </Text>
                  {button.is_sensitive_cta ? (
                    <View style={styles.buttonRiskBadge}>
                      <Text style={styles.buttonRiskBadgeText}>CTA sensibil</Text>
                    </View>
                  ) : null}
                </View>

                <Text style={styles.buttonEvidenceLabel}>Link real</Text>
                <Text style={styles.buttonEvidenceValue}>{resolvedButtonUrl}</Text>

                {button.registered_domain ? (
                  <>
                    <Text style={styles.buttonEvidenceLabel}>Domeniu</Text>
                    <Text style={styles.buttonEvidenceValue}>{button.registered_domain}</Text>
                  </>
                ) : null}
              </View>
            );
          })}
        </View>
      )}

      {/* Feedback Loop */}
      <View style={styles.feedbackCard}>
        <Text style={styles.sectionTitle}>🧪 Verificare Feedback (Învățare continuă)</Text>
        <Text style={styles.feedbackDescription}>Confirmă dacă verdictul e corect pentru a ne ajuta să reducem erorile.</Text>

        <View style={styles.feedbackOptions}>
          {feedbackOptions.map((option) => {
            const selected = submittedFeedback === option.value;
            return (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.feedbackOption,
                  { borderColor: selected ? option.color : '#374151', backgroundColor: selected ? `${option.color}20` : '#0F172A' },
                ]}
                onPress={() => submitFeedback(option.value)}
                disabled={isSubmittingFeedback}
              >
                <Text style={[styles.feedbackOptionLabel, { color: option.color }]}>{option.label}</Text>
                <Text style={styles.feedbackOptionDescription}>{option.description}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TextInput
          style={styles.feedbackNotes}
          placeholder="Opțional: adaugă detalii (ex: link, context)"
          placeholderTextColor="#6B7280"
          value={feedbackNotes}
          onChangeText={setFeedbackNotes}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />

        {isSubmittingFeedback ? (
          <ActivityIndicator size="small" color="#3B82F6" />
        ) : submittedFeedback && feedbackMessage ? (
          <Text style={styles.feedbackSuccessMessage}>{feedbackMessage}</Text>
        ) : submittedFeedback ? (
          <Text style={styles.feedbackSuccessMessage}>Feedback trimis. Mulțumim.</Text>
        ) : null}
      </View>

      {/* Redirect Chain / Domain Evidence */}
      {linkEvidence.length > 0 && (
        <View style={styles.glassCard}>
          <Text style={styles.sectionTitle}>🔗 Analiză Link-uri & Redirecționări</Text>
          <Text style={styles.subtitleText}>Urmărirea redirecționărilor a arătat următoarele destinații:</Text>
          
          {linkEvidence.map((urlInfo: any, idx: number) => {
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
                    {urlInfo.redirect_chain.map((hop: any, hopIdx: number) => (
                      <View key={hopIdx} style={styles.chainHop}>
                        <Text style={styles.hopText}>{formatRedirectHop(hop)}</Text>
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
      {riskDisplayLevel !== 'safe' && (
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
  statusBanner: {
    alignItems: 'flex-end',
  },
  statusBannerLabel: {
    color: '#9CA3AF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.7,
    marginBottom: 2,
  },
  statusBannerValue: {
    fontSize: 48,
    fontWeight: '900',
    letterSpacing: -1,
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
  riskText: {
    color: '#F9FAFB',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  riskRecommendation: {
    color: '#D1D5DB',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
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
  metaRow: {
    marginBottom: 10,
  },
  metaLabel: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  metaValue: {
    color: '#F9FAFB',
    fontSize: 14,
    lineHeight: 20,
  },
  metaWarning: {
    color: '#FBBF24',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  glassCard: {
    backgroundColor: 'rgba(22, 30, 49, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  authSubTitle: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 6,
  },
  authRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  authLabel: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '600',
  },
  authValue: {
    color: '#F9FAFB',
    fontSize: 12,
    fontWeight: '700',
  },
  authReasonList: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: 10,
    marginTop: 10,
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
  buttonEvidenceCard: {
    backgroundColor: 'rgba(11, 15, 25, 0.5)',
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  buttonEvidenceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
    gap: 8,
  },
  buttonEvidenceTitle: {
    color: '#F9FAFB',
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  buttonRiskBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: 'rgba(239, 68, 68, 0.24)',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  buttonRiskBadgeText: {
    color: '#FCA5A5',
    fontSize: 10,
    fontWeight: '700',
  },
  buttonEvidenceLabel: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  buttonEvidenceValue: {
    color: '#D1D5DB',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  feedbackCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  feedbackDescription: {
    color: '#9CA3AF',
    fontSize: 13,
    marginBottom: 12,
  },
  feedbackOptions: {
    marginBottom: 12,
  },
  feedbackOption: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
  },
  feedbackOptionLabel: {
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 2,
  },
  feedbackOptionDescription: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  feedbackNotes: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 12,
    minHeight: 72,
    padding: 10,
    color: '#F9FAFB',
    fontSize: 13,
    marginBottom: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  feedbackSuccessMessage: {
    color: '#34D399',
    marginTop: 6,
    fontSize: 12,
    fontWeight: '600',
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
