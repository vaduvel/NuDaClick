import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  CameraView,
  useCameraPermissions,
  type BarcodeScanningResult,
} from 'expo-camera';
import { ScanQrCode, ShieldAlert, X, Zap, ZapOff } from 'lucide-react-native';

interface QRScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onScan: (payload: { data: string; type: string }) => void;
}

export default function QRScannerModal({
  visible,
  onClose,
  onScan,
}: QRScannerModalProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [hasScanned, setHasScanned] = useState(false);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);

  useEffect(() => {
    if (!visible) {
      setHasScanned(false);
      setTorchEnabled(false);
      setIsRequestingPermission(false);
      return;
    }

    if (permission?.granted || permission?.canAskAgain === false || isRequestingPermission) {
      return;
    }

    let active = true;

    const requestAccess = async () => {
      try {
        setIsRequestingPermission(true);
        await requestPermission();
      } finally {
        if (active) {
          setIsRequestingPermission(false);
        }
      }
    };

    requestAccess();

    return () => {
      active = false;
    };
  }, [
    isRequestingPermission,
    permission?.canAskAgain,
    permission?.granted,
    requestPermission,
    visible,
  ]);

  const handleRequestPermission = async () => {
    try {
      setIsRequestingPermission(true);
      await requestPermission();
    } finally {
      setIsRequestingPermission(false);
    }
  };

  const handleBarcodeScanned = ({ data, type }: BarcodeScanningResult) => {
    const normalizedData = String(data || '').trim();
    if (!normalizedData || hasScanned) {
      return;
    }

    setHasScanned(true);
    onScan({ data: normalizedData, type });
  };

  const shouldShowCamera = Boolean(permission?.granted);
  const permissionBlocked = permission?.canAskAgain === false && !permission?.granted;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.topBar}>
          <View style={styles.topBarTitle}>
            <ScanQrCode size={18} color="#E5EEF8" />
            <Text style={styles.topBarText}>Scanner QR securizat</Text>
          </View>

          <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.8}>
            <X size={20} color="#E5EEF8" />
          </TouchableOpacity>
        </View>

        {shouldShowCamera ? (
          <View style={styles.cameraShell}>
            <CameraView
              style={styles.camera}
              facing="back"
              active={visible}
              enableTorch={torchEnabled}
              barcodeScannerSettings={{
                barcodeTypes: ['qr'],
              }}
              onBarcodeScanned={hasScanned ? undefined : handleBarcodeScanned}
            />

            <View pointerEvents="none" style={styles.overlay}>
              <View style={styles.targetBox} />
              <Text style={styles.overlayText}>
                Ține codul QR în interiorul ramei. Nu deschidem automat nimic.
              </Text>
            </View>

            <View style={styles.bottomBar}>
              <TouchableOpacity
                style={styles.torchButton}
                onPress={() => setTorchEnabled((current) => !current)}
                activeOpacity={0.85}
              >
                {torchEnabled ? <Zap size={18} color="#08111F" /> : <ZapOff size={18} color="#08111F" />}
                <Text style={styles.torchButtonText}>
                  {torchEnabled ? 'Lanternă pornită' : 'Pornește lanterna'}
                </Text>
              </TouchableOpacity>

              <Text style={styles.bottomHint}>
                Scanăm doar conținutul QR și îl trimitem la analiza anti-scam.
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.permissionCard}>
            <ShieldAlert size={26} color="#F59E0B" />
            <Text style={styles.permissionTitle}>Avem nevoie de cameră pentru QR</Text>
            <Text style={styles.permissionText}>
              Scannerul QR citește codul local și apoi verifică linkul sau textul fără să îl deschidă automat.
            </Text>

            {isRequestingPermission ? (
              <View style={styles.permissionLoading}>
                <ActivityIndicator size="small" color="#3B82F6" />
                <Text style={styles.permissionLoadingText}>Cerem acces la cameră...</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleRequestPermission}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryButtonText}>
                {permissionBlocked ? 'Încearcă din nou permisiunea' : 'Permite camera'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryButton} onPress={onClose} activeOpacity={0.85}>
              <Text style={styles.secondaryButtonText}>Înapoi</Text>
            </TouchableOpacity>

            {permissionBlocked ? (
              <Text style={styles.permissionBlockedText}>
                Accesul a fost blocat. Poți reactiva camera din setările aplicației dacă sistemul nu mai întreabă.
              </Text>
            ) : null}
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#040811',
  },
  topBar: {
    paddingTop: 64,
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(4, 8, 17, 0.94)',
  },
  topBarTitle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  topBarText: {
    color: '#E5EEF8',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 10,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  cameraShell: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  targetBox: {
    width: 240,
    height: 240,
    borderRadius: 26,
    borderWidth: 3,
    borderColor: 'rgba(59,130,246,0.95)',
    backgroundColor: 'rgba(59,130,246,0.06)',
    shadowColor: '#3B82F6',
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
  },
  overlayText: {
    marginTop: 20,
    color: '#F8FBFF',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 280,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 34,
    backgroundColor: 'rgba(4, 8, 17, 0.78)',
  },
  torchButton: {
    alignSelf: 'center',
    minWidth: 180,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F8FAFC',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  torchButtonText: {
    marginLeft: 8,
    color: '#08111F',
    fontSize: 13,
    fontWeight: '700',
  },
  bottomHint: {
    marginTop: 12,
    color: '#CBD5E1',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  permissionCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  permissionTitle: {
    marginTop: 16,
    color: '#F8FAFC',
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  permissionText: {
    marginTop: 10,
    color: '#CBD5E1',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    maxWidth: 340,
  },
  permissionLoading: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
  },
  permissionLoadingText: {
    marginLeft: 10,
    color: '#93C5FD',
    fontSize: 13,
    fontWeight: '600',
  },
  primaryButton: {
    marginTop: 24,
    width: '100%',
    maxWidth: 320,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#3B82F6',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  secondaryButton: {
    marginTop: 12,
    width: '100%',
    maxWidth: 320,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
  },
  secondaryButtonText: {
    color: '#E2E8F0',
    fontSize: 15,
    fontWeight: '700',
  },
  permissionBlockedText: {
    marginTop: 16,
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    maxWidth: 320,
  },
});
