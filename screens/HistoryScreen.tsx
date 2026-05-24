import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  History, 
  Trash2, 
  ChevronRight, 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle,
  ArrowRight,
  ShieldQuestion
} from 'lucide-react-native';

interface HistoryScreenProps {
  onSelectScan: (result: any) => void;
  onNavigateToScan: () => void;
}

export default function HistoryScreen({ onSelectScan, onNavigateToScan }: HistoryScreenProps) {
  const [historyItems, setHistoryItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Load history from AsyncStorage
  const loadHistory = async () => {
    setLoading(true);
    try {
      const existingHistoryStr = await AsyncStorage.getItem('scamshield_history');
      if (existingHistoryStr) {
        setHistoryItems(JSON.parse(existingHistoryStr));
      } else {
        setHistoryItems([]);
      }
    } catch (err) {
      console.error("Error reading history from storage", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleClearAll = () => {
    Alert.alert(
      'Ștergere Istoric',
      'Sunteți sigur că doriți să ștergeți toate scanările din istoric? Această acțiune este ireversibilă.',
      [
        { text: 'Anulează', style: 'cancel' },
        { 
          text: 'Șterge Tot', 
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('scamshield_history');
              setHistoryItems([]);
            } catch (err) {
              console.error("Error clearing history", err);
            }
          }
        }
      ]
    );
  };

  const handleDeleteItem = async (scanId: string) => {
    try {
      const updatedHistory = historyItems.filter(item => item.scan_id !== scanId);
      setHistoryItems(updatedHistory);
      await AsyncStorage.setItem('scamshield_history', JSON.stringify(updatedHistory));
    } catch (err) {
      console.error("Error deleting single history item", err);
    }
  };

  const getRiskColor = (level: string) => {
    switch (level?.toLowerCase()) {
      case 'critical':
        return '#EF4444';
      case 'high':
        return '#F59E0B';
      case 'medium':
        return '#EAB308';
      case 'low':
      case 'safe':
        return '#10B981';
      default:
        return '#3B82F6';
    }
  };

  const getRiskIcon = (level: string) => {
    const size = 18;
    switch (level?.toLowerCase()) {
      case 'critical':
        return <ShieldAlert size={size} color="#EF4444" />;
      case 'high':
      case 'medium':
        return <AlertTriangle size={size} color={level === 'high' ? '#F59E0B' : '#EAB308'} />;
      case 'low':
      case 'safe':
        return <ShieldCheck size={size} color="#10B981" />;
      default:
        return <ShieldQuestion size={size} color="#3B82F6" />;
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('ro-RO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return '';
    }
  };

  const getVerdictLabel = (level: string) => {
    switch (level?.toLowerCase()) {
      case 'critical':
      case 'high':
        return 'PERICULOS';
      case 'medium':
        return 'SUSPECT';
      case 'low':
      case 'safe':
        return 'SIGUR';
      default:
        return 'NECUNOSCUT';
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const riskColor = getRiskColor(item.risk_level);
    const verdictLabel = getVerdictLabel(item.risk_level);
    
    return (
      <View style={styles.cardContainer}>
        <TouchableOpacity 
          style={styles.cardMain}
          onPress={() => onSelectScan(item.full_result)}
        >
          <View style={styles.cardHeader}>
            <View style={styles.riskBadge}>
              {getRiskIcon(item.risk_level)}
              <Text style={[styles.riskText, { color: riskColor }]}>
                {verdictLabel} ({item.risk_score}/100)
              </Text>
            </View>
            <Text style={styles.dateText}>{formatDate(item.timestamp)}</Text>
          </View>

          <Text style={styles.brandText}>
            Brand: <Text style={{ color: '#FFF', fontWeight: '600' }}>{item.claimed_brand}</Text>
          </Text>

          <Text style={styles.previewText} numberOfLines={2}>
            {item.text_preview}
          </Text>
          
          <View style={styles.detailsLink}>
            <Text style={styles.detailsLinkText}>Vezi Raport Complet</Text>
            <ChevronRight size={14} color="#3B82F6" />
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.deleteButton}
          onPress={() => handleDeleteItem(item.scan_id)}
        >
          <Trash2 size={16} color="#EF4444" />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Title */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <History size={24} color="#3B82F6" style={{ marginRight: 8 }} />
          <Text style={styles.title}>Istoric Scanări</Text>
        </View>
        {historyItems.length > 0 && (
          <TouchableOpacity style={styles.clearAllButton} onPress={handleClearAll}>
            <Trash2 size={14} color="#EF4444" style={{ marginRight: 4 }} />
            <Text style={styles.clearAllText}>Șterge tot</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : historyItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <History size={64} color="#1F2937" style={{ marginBottom: 16 }} />
          <Text style={styles.emptyTitle}>Nicio scanare efectuată</Text>
          <Text style={styles.emptySubtitle}>
            Istoricul scanărilor tale va fi salvat local, în siguranță pe dispozitiv.
          </Text>
          <TouchableOpacity style={styles.scanButton} onPress={onNavigateToScan}>
            <Text style={styles.scanButtonText}>Scanează acum primul mesaj</Text>
            <ArrowRight size={16} color="#FFF" style={{ marginLeft: 6 }} />
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={historyItems}
          keyExtractor={(item) => item.scan_id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0F19',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
  },
  clearAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.15)',
  },
  clearAllText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    paddingBottom: 20,
  },
  cardContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(22, 30, 49, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 14,
    marginBottom: 12,
    overflow: 'hidden',
  },
  cardMain: {
    flex: 1,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  riskBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  riskText: {
    fontSize: 11,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  dateText: {
    color: '#6B7280',
    fontSize: 11,
  },
  brandText: {
    color: '#9CA3AF',
    fontSize: 13,
    marginBottom: 4,
  },
  previewText: {
    color: '#D1D5DB',
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 12,
  },
  detailsLink: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailsLinkText: {
    color: '#3B82F6',
    fontSize: 12,
    fontWeight: '600',
    marginRight: 4,
  },
  deleteButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255, 255, 255, 0.05)',
    width: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingBottom: 60,
  },
  emptyTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptySubtitle: {
    color: '#9CA3AF',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
  scanButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  scanButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
