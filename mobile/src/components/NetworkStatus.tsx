import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { offlineService } from '../services/offline.service';

export const NetworkStatus: React.FC = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [queueSize, setQueueSize] = useState(0);
  const [slideAnim] = useState(new Animated.Value(-50));

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const online = state.isConnected ?? false;
      setIsOnline(online);
      setQueueSize(offlineService.getQueueSize());

      // Anima a entrada/saída do banner
      if (!online) {
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start();
      } else {
        // Mostra brevemente que voltou online, depois esconde
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          setTimeout(() => {
            Animated.timing(slideAnim, {
              toValue: -50,
              duration: 300,
              useNativeDriver: true,
            }).start();
          }, 2000);
        });
      }
    });

    return unsubscribe;
  }, [slideAnim]);

  const getStatusText = () => {
    if (isOnline) {
      return queueSize > 0 
        ? `Sincronizando ${queueSize} item${queueSize > 1 ? 's' : ''}...`
        : 'Conectado';
    }
    return queueSize > 0 
      ? `Offline - ${queueSize} item${queueSize > 1 ? 's' : ''} na fila`
      : 'Sem conexão';
  };

  const getStatusColor = () => {
    if (isOnline) {
      return queueSize > 0 ? '#ffc107' : '#28a745'; // Amarelo se sincronizando, verde se conectado
    }
    return '#dc3545'; // Vermelho se offline
  };

  return (
    <Animated.View 
      style={[
        styles.container, 
        { 
          backgroundColor: getStatusColor(),
          transform: [{ translateY: slideAnim }]
        }
      ]}
    >
      <Text style={styles.text}>{getStatusText()}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingVertical: 8,
    paddingHorizontal: 16,
    zIndex: 1000,
  },
  text: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});