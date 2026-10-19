import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import { io } from 'socket.io-client';
import * as Notifications from 'expo-notifications';
import { SOCKET_BASE_URL } from '../../config';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const SocketContext = createContext({
  connected: false,
  busPositions: [],
  lastBusNear: null,
});

export function SocketProvider({ children }) {
  const [connected, setConnected] = useState(false);
  const [busPositions, setBusPositions] = useState([]);
  const [lastBusNear, setLastBusNear] = useState(null);
  const socketRef = useRef(null);

  // Request notifications permissions on mount
  useEffect(() => {
    (async () => {
      try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus === 'granted' && Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('bus-alerts', {
            name: 'Bus Arrival Alerts',
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#facc15',
          });
        }
      } catch (e) {
        // Notification permission optional or running on simulator
      }
    })();
  }, []);

  useEffect(() => {
    const socket = io(SOCKET_BASE_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 8000,
      autoConnect: true,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    socket.on('bus-positions', (data) => {
      setBusPositions(Array.isArray(data) ? data : []);
    });

    // Real-time bus status change (e.g. driver disconnected or stopped trip)
    socket.on('bus-status', ({ routeNo, live }) => {
      setBusPositions((prev) =>
        prev.map((b) => (b.routeNo === routeNo ? { ...b, live } : b))
      );
    });

    // Proximity alert: bus within ~500m of a stop
    socket.on('bus-near', async (payload) => {
      setLastBusNear(payload);
      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: `Bus ${payload.routeNo} is arriving!`,
            body: `Bus is within ${payload.distanceMeters}m of stop: ${payload.stop} (~${payload.etaMinutes || 1} min away).`,
            sound: true,
            channelId: 'bus-alerts',
          },
          trigger: null, // deliver immediately
        });
      } catch (e) {}
    });

    // Reconnect socket when app returns to foreground
    const sub = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        if (!socket.connected) {
          socket.connect();
        }
      }
    });

    return () => {
      sub.remove();
      socket.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ connected, busPositions, lastBusNear }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);
