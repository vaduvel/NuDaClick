import React, { useState, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  Platform,
} from 'react-native';
import {
  ScanLine,
  History,
  Flame,
  Info,
  ShieldAlert,
} from 'lucide-react-native';

import ScanScreen from './screens/ScanScreen';
import ResultScreen from './screens/ResultScreen';
import TriageScreen from './screens/TriageScreen';
import HistoryScreen from './screens/HistoryScreen';
import AboutScreen from './screens/AboutScreen';

// Simple state-based router (avoids react-navigation native peer deps for web compat)
type Screen =
  | { name: 'scan' }
  | { name: 'result'; params: { result: any } }
  | { name: 'triage'; params?: { category?: string } }
  | { name: 'history' }
  | { name: 'about' };

type TabKey = 'scan' | 'history' | 'triage' | 'about';

const resolveBackendUrl = () => {
  if (process.env.EXPO_PUBLIC_BACKEND_URL) {
    return process.env.EXPO_PUBLIC_BACKEND_URL;
  }

  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:8000';
  }

  return 'http://127.0.0.1:8000';
};

const BACKEND_URL = resolveBackendUrl();

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>({ name: 'scan' });
  const [activeTab, setActiveTab] = useState<TabKey>('scan');

  // Navigation handlers
  const navigateToResult = useCallback((result: any) => {
    setCurrentScreen({ name: 'result', params: { result } });
  }, []);

  const navigateToScan = useCallback(() => {
    setActiveTab('scan');
    setCurrentScreen({ name: 'scan' });
  }, []);

  const navigateToTriage = useCallback((category?: string) => {
    setActiveTab('triage');
    setCurrentScreen({ name: 'triage', params: { category } });
  }, []);

  const navigateToHistory = useCallback(() => {
    setActiveTab('history');
    setCurrentScreen({ name: 'history' });
  }, []);

  const navigateToAbout = useCallback(() => {
    setActiveTab('about');
    setCurrentScreen({ name: 'about' });
  }, []);

  const handleTabPress = useCallback((tab: TabKey) => {
    setActiveTab(tab);
    switch (tab) {
      case 'scan':
        setCurrentScreen({ name: 'scan' });
        break;
      case 'history':
        setCurrentScreen({ name: 'history' });
        break;
      case 'triage':
        setCurrentScreen({ name: 'triage' });
        break;
      case 'about':
        setCurrentScreen({ name: 'about' });
        break;
    }
  }, []);

  // Render current screen
  const renderScreen = () => {
    switch (currentScreen.name) {
      case 'scan':
        return (
          <ScanScreen
            onScanComplete={navigateToResult}
            backendUrl={BACKEND_URL}
          />
        );
      case 'result':
        return (
          <ResultScreen
            result={currentScreen.params.result}
            onBack={navigateToScan}
            onNavigateToTriage={navigateToTriage}
          />
        );
      case 'triage':
        return (
          <TriageScreen
            initialCategory={currentScreen.params?.category || 'card'}
            onBack={navigateToScan}
          />
        );
      case 'history':
        return (
          <HistoryScreen
            onSelectScan={navigateToResult}
            onNavigateToScan={navigateToScan}
          />
        );
      case 'about':
        return <AboutScreen />;
      default:
        return null;
    }
  };

  const tabs: { key: TabKey; label: string; icon: (active: boolean) => React.ReactNode }[] = [
    {
      key: 'scan',
      label: 'Scanează',
      icon: (active) => <ScanLine size={20} color={active ? '#3B82F6' : '#6B7280'} />,
    },
    {
      key: 'history',
      label: 'Istoric',
      icon: (active) => <History size={20} color={active ? '#3B82F6' : '#6B7280'} />,
    },
    {
      key: 'triage',
      label: 'Urgență',
      icon: (active) => <Flame size={20} color={active ? '#EF4444' : '#6B7280'} />,
    },
    {
      key: 'about',
      label: 'Info',
      icon: (active) => <Info size={20} color={active ? '#3B82F6' : '#6B7280'} />,
    },
  ];

  // Hide tabs on result screen for a cleaner experience
  const showTabs = currentScreen.name !== 'result';

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <View style={styles.screenContainer}>
        {renderScreen()}
      </View>

      {showTabs && (
        <View style={styles.tabBar}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={styles.tabItem}
                onPress={() => handleTabPress(tab.key)}
                activeOpacity={0.7}
              >
                {tab.icon(isActive)}
                <Text
                  style={[
                    styles.tabLabel,
                    isActive && {
                      color: tab.key === 'triage' ? '#EF4444' : '#3B82F6',
                      fontWeight: '700',
                    },
                  ]}
                >
                  {tab.label}
                </Text>
                {isActive && (
                  <View
                    style={[
                      styles.activeIndicator,
                      { backgroundColor: tab.key === 'triage' ? '#EF4444' : '#3B82F6' },
                    ]}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0B0F19',
  },
  screenContainer: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#0D1220',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    paddingBottom: Platform.OS === 'ios' ? 20 : 8,
    paddingTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    position: 'relative',
  },
  tabLabel: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 4,
    fontWeight: '500',
  },
  activeIndicator: {
    position: 'absolute',
    top: -8,
    width: 20,
    height: 3,
    borderRadius: 2,
  },
});
