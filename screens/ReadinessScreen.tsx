import React, { useCallback, useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { RefreshCw, ShieldAlert, BarChart3, CloudDownload } from 'lucide-react-native';

interface ReadinessScreenProps {
  backendUrl: string;
}

interface ApiCallState {
  status?: string;
  readiness_score?: number;
  readiness_components?: {
    quality_score?: number;
    coverage_score?: number;
    reputation_score?: number;
  };
  feedback?: {
    items?: number;
    items_labeled?: number;
    precision?: number;
    recall?: number;
    f1?: number;
    accuracy?: number;
    confusion_matrix?: {
      tp?: number;
      fp?: number;
      fn?: number;
      tn?: number;
    };
    top_degraded_signals_by_feedback_error?: Array<Record<string, any>>;
  };
  trend?: {
    bucket_count?: number;
    overall?: {
      precision?: number;
      recall?: number;
      f1?: number;
      accuracy?: number;
    };
    critical_signal_drifts?: Array<Record<string, any>>;
  };
  reputation?: ReputationPayload;
}

interface ReputationPayload {
  enabled?: boolean;
  cache_items?: number;
  cache_valid_items?: number;
  provider_error_rate?: number;
  source_stats?: Record<string, any>;
  provider_errors?: Record<string, number>;
  items?: number;
  valid_items?: number;
  ttl_seconds?: number;
  cache_ttl_seconds?: number;
}

interface QualityResponse {
  items_evaluated?: number;
  summary?: {
    precision?: number;
    recall?: number;
    f1?: number;
    accuracy?: number;
    confusion_matrix?: {
      tp?: number;
      fp?: number;
      fn?: number;
      tn?: number;
    };
    false_positive_by_signal?: Array<{
      signal: string;
      false_positive_count: number;
      false_positive_rate?: number;
      feedback_count?: number;
    }>;
    false_negative_by_signal?: Array<{
      signal: string;
      false_negative_count: number;
      false_negative_rate?: number;
      feedback_count?: number;
    }>;
    by_error_category?: Record<string, number>;
  };
}

interface SamplesResponse {
  items_evaluated?: number;
  category_counts?: Record<string, number>;
  samples?: Record<string, Array<Record<string, any>>>;
}

interface ReputationResponse {
  cache?: ReputationPayload;
}

const fmtPercent = (value: number | undefined, fixed = 1): string => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 'N/A';
  }
  return `${(value * 100).toFixed(fixed)}%`;
};

const fmtNumber = (value: number | undefined): string => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '0';
  }
  return String(Math.round(value));
};

const formatStatus = (status?: string) => {
  if (!status) {
    return 'Incert';
  }
  const normalized = status.toLowerCase();
  if (normalized === 'healthy') {
    return 'Sănătos';
  }
  if (normalized === 'watch') {
    return 'Atenție';
  }
  if (normalized === 'degraded') {
    return 'Degradat';
  }
  if (normalized === 'no_feedback') {
    return 'Fără feedback';
  }
  return normalized;
};

const statusColor = (status?: string): string => {
  if (!status) {
    return '#6B7280';
  }
  switch (status.toLowerCase()) {
    case 'healthy':
      return '#10B981';
    case 'watch':
      return '#F59E0B';
    case 'degraded':
      return '#EF4444';
    default:
      return '#6B7280';
  }
};

const fetchJson = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(text || `Request failed: ${response.status}`);
  }
  return response.json();
};

export default function ReadinessScreen({ backendUrl }: ReadinessScreenProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [readiness, setReadiness] = useState<ApiCallState | null>(null);
  const [quality, setQuality] = useState<QualityResponse | null>(null);
  const [samples, setSamples] = useState<SamplesResponse | null>(null);
  const [reputationCache, setReputationCache] = useState<ReputationResponse | null>(null);

  const loadData = useCallback(async () => {
    setError('');
    try {
      const [readinessPayload, qualityPayload, samplesPayload, reputationPayload] = await Promise.all([
        fetchJson(`${backendUrl}/v1/evaluation/readiness?bucket_size_days=1&trend_top_signals=6&trend_min_bucket_support=1&trend_min_signal_support=1`),
        fetchJson(`${backendUrl}/v1/feedback/quality?include_uncertain=false&include_examples=false&run_sweep=false`),
        fetchJson(`${backendUrl}/v1/feedback/samples?include_uncertain=false&include_examples=true&max_examples_per_type=3`),
        fetchJson(`${backendUrl}/v1/reputation/cache/stats`),
      ]);

      setReadiness(readinessPayload);
      setQuality(qualityPayload);
      setSamples(samplesPayload);
      setReputationCache(reputationPayload);
    } catch (err) {
      setError(`Nu am putut încărca datele din telemetrie: ${String((err as Error).message || 'eroare')}`);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [backendUrl]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loaderText}>Încarcă semnale din telemetrie...</Text>
      </View>
    );
  }

  const qualitySummary = quality?.summary || {};
  const readinessStatus = readiness?.status;
  const cache: ReputationPayload = (reputationCache?.cache ? reputationCache.cache : readiness?.reputation) || {};
  const cacheItems = cache.cache_items ?? cache.items ?? 0;
  const cacheValidItems = cache.cache_valid_items ?? cache.valid_items ?? 0;
  const cacheTtlSeconds = cache.cache_ttl_seconds ?? cache.ttl_seconds;
  const falsePositiveSignals = qualitySummary.false_positive_by_signal || [];
  const falseNegativeSignals = qualitySummary.false_negative_by_signal || [];
  const categoryCounts = samples?.category_counts || {};
  const trend = readiness?.trend;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <BarChart3 size={20} color="#3B82F6" />
          <Text style={styles.headerTitle}>Rapoarte Detective</Text>
        </View>

        <TouchableOpacity style={styles.refreshButton} onPress={onRefresh} disabled={isRefreshing}>
          <RefreshCw size={16} color="#0F172A" />
          <Text style={styles.refreshText}>{isRefreshing ? 'Actualizare...' : 'Actualizează'}</Text>
        </TouchableOpacity>
      </View>

      {error ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>Nu s-a putut încărca datele</Text>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.card}>
        <View style={styles.statusRow}>
          <Text style={styles.cardTitle}>Maturitate Detectiv</Text>
          <View style={[styles.statusBadge, { backgroundColor: `${statusColor(readinessStatus)}2E` }]}>
            <ShieldAlert size={14} color={statusColor(readinessStatus)} />
            <Text style={[styles.statusText, { color: statusColor(readinessStatus) }]}> {formatStatus(readinessStatus)}</Text>
          </View>
        </View>
        <Text style={[styles.bigScore, { color: statusColor(readinessStatus) }]}> 
          {(readiness?.readiness_score ?? 0).toFixed(2)}
        </Text>
        <Text style={styles.scoreLabel}>readiness_score (0..1)</Text>
        <View style={styles.metricRow}>
          <Text style={styles.metricText}>Calitate: {fmtPercent(readiness?.readiness_components?.quality_score)}</Text>
          <Text style={styles.metricText}>Acoperire etichete: {fmtPercent(readiness?.readiness_components?.coverage_score)}</Text>
        </View>
        <View style={styles.metricRow}>
          <Text style={styles.metricText}>Reputație URL: {fmtPercent(readiness?.readiness_components?.reputation_score)}</Text>
          <Text style={styles.metricText}>Bucăți analizate: {fmtNumber(quality?.items_evaluated)}</Text>
        </View>
      </View>

      <View style={styles.gridCard}>
        <View style={styles.cardHalf}>
          <Text style={styles.miniTitle}>Precision</Text>
          <Text style={styles.miniValue}>{fmtPercent(qualitySummary.precision)}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.cardHalf}>
          <Text style={styles.miniTitle}>Recall</Text>
          <Text style={styles.miniValue}>{fmtPercent(qualitySummary.recall)}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.cardHalf}>
          <Text style={styles.miniTitle}>F1</Text>
          <Text style={styles.miniValue}>{fmtPercent(qualitySummary.f1)}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.cardHalf}>
          <Text style={styles.miniTitle}>Accuracy</Text>
          <Text style={styles.miniValue}>{fmtPercent(qualitySummary.accuracy)}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Track feedback (false positives / false negatives)</Text>
        <View style={styles.matrixRow}>
          <Text style={styles.matrixCell}>TP: {fmtNumber(qualitySummary.confusion_matrix?.tp)}</Text>
          <Text style={styles.matrixCell}>FP: {fmtNumber(qualitySummary.confusion_matrix?.fp)}</Text>
          <Text style={styles.matrixCell}>FN: {fmtNumber(qualitySummary.confusion_matrix?.fn)}</Text>
          <Text style={styles.matrixCell}>TN: {fmtNumber(qualitySummary.confusion_matrix?.tn)}</Text>
        </View>

        <View style={styles.feedbackSectionRow}>
          <View style={styles.feedbackColumn}>
            <Text style={styles.smallTitle}>Semnale cu false positives</Text>
            {(falsePositiveSignals || []).slice(0, 4).map((item) => (
              <View key={`${item.signal}-fp`} style={styles.signalRow}>
                <Text style={styles.signalName}>{item.signal}</Text>
                <Text style={styles.signalValue}>
                  {item.false_positive_count} / {fmtPercent(item.false_positive_rate)}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.feedbackColumn}>
            <Text style={styles.smallTitle}>Semnale cu false negatives</Text>
            {(falseNegativeSignals || []).slice(0, 4).map((item) => (
              <View key={`${item.signal}-fn`} style={styles.signalRow}>
                <Text style={styles.signalName}>{item.signal}</Text>
                <Text style={styles.signalValue}>
                  {item.false_negative_count} / {fmtPercent(item.false_negative_rate)}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.byCategoryRow}>
          <Text style={styles.smallTitle}>Categorii (din feedback)</Text>
          {Object.entries(categoryCounts).map(([category, count]) => (
            <View key={category} style={styles.signalRow}>
              <Text style={styles.signalName}>{category}</Text>
              <Text style={styles.signalValue}>{fmtNumber(count)}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Reputație URL + cache</Text>
        <View style={styles.authRow}>
          <Text style={styles.authLabel}>Cache activ</Text>
          <Text style={styles.authValue}>{cache.enabled ? 'Da' : 'Nu'}</Text>
        </View>
        <View style={styles.authRow}>
          <Text style={styles.authLabel}>URL-uri cache-uite</Text>
          <Text style={styles.authValue}>{fmtNumber(cacheItems)}</Text>
        </View>
        <View style={styles.authRow}>
          <Text style={styles.authLabel}>URL-uri valide</Text>
          <Text style={styles.authValue}>{fmtNumber(cacheValidItems)}</Text>
        </View>
        <View style={styles.authRow}>
          <Text style={styles.authLabel}>Rata erori prov./cache</Text>
          <Text style={styles.authValue}>{fmtPercent(cache.provider_error_rate)}</Text>
        </View>

        <View style={styles.authRow}>
          <Text style={styles.authLabel}>TTL cache</Text>
          <Text style={styles.authValue}>{fmtNumber(cacheTtlSeconds)} sec</Text>
        </View>

        <View style={styles.separator} />
        <Text style={styles.smallTitle}>Erori raportate pe surse reputație</Text>
        {cache.provider_errors && Object.keys(cache.provider_errors).length > 0 ? (
          Object.entries(cache.provider_errors).map(([provider, errorCount]) => (
            <View key={provider} style={styles.signalRow}>
              <Text style={styles.signalName}>{provider}</Text>
              <Text style={styles.signalValue}>{fmtNumber(errorCount as number)}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.mutedText}>Nu există erori semnificative pe surse.</Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Trend semnale (ultimele perioade)</Text>
        <View style={styles.authRow}>
          <Text style={styles.authLabel}>Bucăți evaluate</Text>
          <Text style={styles.authValue}>{fmtNumber(trend?.bucket_count)}</Text>
        </View>
        <Text style={styles.miniMetric}>
          Precision trend: {fmtPercent(trend?.overall?.precision)} · Recall trend: {fmtPercent(trend?.overall?.recall)}
        </Text>

        {(trend?.critical_signal_drifts || []).slice(0, 5).map((signalTrend, index) => (
          <View key={`${signalTrend.signal}-${index}`} style={styles.signalRow}>
            <Text style={styles.signalName}>⚠ {signalTrend.signal}</Text>
            <Text style={styles.signalValue}>
              FP {fmtPercent(signalTrend?.latest_fp_rate)} / FN {fmtPercent(signalTrend?.latest_fn_rate)}
            </Text>
          </View>
        ))}

        {(trend?.critical_signal_drifts || []).length === 0 ? (
          <Text style={styles.mutedText}>Nu avem semnale critice de degradare în fereastra curentă.</Text>
        ) : null}
      </View>

      <View style={[styles.card, styles.footerCard]}>
        <CloudDownload size={16} color="#F59E0B" />
        <Text style={styles.footerText}>
          Pentru o versiune productivă completă, aceste metrici se pot exporta într-un endpoint de auditură internă
          (CSV/JSON) la fiecare 24h.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#0B0F19',
    minHeight: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#F9FAFB',
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 8,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  refreshText: {
    color: '#0B1120',
    fontWeight: '700',
    marginLeft: 6,
    fontSize: 12,
  },
  card: {
    backgroundColor: 'rgba(22, 30, 49, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  cardTitle: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 15,
    marginBottom: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    marginLeft: 6,
    fontWeight: '700',
    fontSize: 12,
  },
  bigScore: {
    fontSize: 40,
    fontWeight: '900',
    marginTop: 8,
  },
  scoreLabel: {
    color: '#9CA3AF',
    marginBottom: 8,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  metricText: {
    color: '#E5E7EB',
    fontSize: 12,
  },
  gridCard: {
    backgroundColor: 'rgba(22, 30, 49, 0.45)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: 12,
    marginBottom: 14,
  },
  cardHalf: {
    paddingVertical: 8,
    alignItems: 'center',
    width: '25%',
  },
  divider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginVertical: 4,
  },
  miniTitle: {
    color: '#9CA3AF',
    fontSize: 11,
    marginBottom: 4,
    fontWeight: '600',
  },
  miniValue: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
  },
  feedbackSectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  feedbackColumn: {
    width: '48%',
  },
  smallTitle: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  signalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  signalName: {
    color: '#E5E7EB',
    fontSize: 12,
    flex: 1,
    marginRight: 8,
  },
  signalValue: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  byCategoryRow: {
    marginTop: 10,
  },
  matrixRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  matrixCell: {
    color: '#F3F4F6',
    fontSize: 12,
    width: '24%',
  },
  authRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  authLabel: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  authValue: {
    color: '#F3F4F6',
    fontSize: 12,
    fontWeight: '700',
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginTop: 8,
    marginBottom: 8,
  },
  miniMetric: {
    color: '#E5E7EB',
    marginTop: 4,
    marginBottom: 4,
    fontSize: 12,
  },
  mutedText: {
    color: '#6B7280',
    fontSize: 12,
  },
  footerCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerText: {
    color: '#F9FAFB',
    fontSize: 12,
    lineHeight: 16,
    flex: 1,
  },
  errorCard: {
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.25)',
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  errorTitle: {
    color: '#FCA5A5',
    fontWeight: '700',
    marginBottom: 4,
  },
  errorText: {
    color: '#F9FAFB',
    fontSize: 12,
    lineHeight: 16,
  },
  loaderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0B0F19',
  },
  loaderText: {
    marginTop: 10,
    color: '#9CA3AF',
    fontSize: 12,
  },
});
