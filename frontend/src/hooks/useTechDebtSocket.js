import { useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';

/**
 * useTechDebtSocket - Real-time Socket.io hook for tech debt updates
 * Handles PR status updates, analysis progress, and completion events
 */
export const useTechDebtSocket = (options = {}) => {
    const {
        onPRUpdate,
        onAnalysisProgress,
        onAnalysisComplete,
        onAnalysisError,
        onScanStatus,
        autoConnect = true
    } = options;

    const [isConnected, setIsConnected] = useState(false);
    const [lastEvent, setLastEvent] = useState(null);
    const socketRef = useRef(null);

    const connect = useCallback(() => {
        if (socketRef.current?.connected) return;

        const serverUrl = import.meta.env.VITE_API_URL || 'https://localhost:5001';

        socketRef.current = io(serverUrl, {
            transports: ['websocket', 'polling'],
            withCredentials: true,
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            secure: true,
            rejectUnauthorized: false
        });

        socketRef.current.on('connect', () => {
            console.log('🔌 [TechDebtSocket] Connected');
            setIsConnected(true);
        });

        socketRef.current.on('disconnect', () => {
            console.log('🔌 [TechDebtSocket] Disconnected');
            setIsConnected(false);
        });

        socketRef.current.on('connect_error', (error) => {
            console.error('🔌 [TechDebtSocket] Connection error:', error.message);
        });

        // PR status updates from Gatekeeper
        socketRef.current.on('pr:status_update', (data) => {
            console.log('📦 [TechDebtSocket] PR Update:', data);
            setLastEvent({ type: 'pr:status_update', data, timestamp: new Date() });
            onPRUpdate?.(data);
        });

        // Analysis progress updates
        socketRef.current.on('analysis:progress', (data) => {
            console.log('📊 [TechDebtSocket] Analysis Progress:', data);
            setLastEvent({ type: 'analysis:progress', data, timestamp: new Date() });
            onAnalysisProgress?.(data);
        });

        // Analysis completion
        socketRef.current.on('analysis:complete', (data) => {
            console.log('✅ [TechDebtSocket] Analysis Complete:', data);
            setLastEvent({ type: 'analysis:complete', data, timestamp: new Date() });
            onAnalysisComplete?.(data);
        });

        // Analysis error
        socketRef.current.on('analysis:error', (data) => {
            console.error('❌ [TechDebtSocket] Analysis Error:', data);
            setLastEvent({ type: 'analysis:error', data, timestamp: new Date() });
            onAnalysisError?.(data);
        });

        // Legacy scan status events (for backward compatibility)
        socketRef.current.on('scan:status', (data) => {
            console.log('📡 [TechDebtSocket] Scan Status:', data);
            setLastEvent({ type: 'scan:status', data, timestamp: new Date() });
            onScanStatus?.(data);
        });

        socketRef.current.on('scan:error', (data) => {
            console.error('❌ [TechDebtSocket] Scan Error:', data);
            setLastEvent({ type: 'scan:error', data, timestamp: new Date() });
            onAnalysisError?.(data);
        });

        // Task events
        socketRef.current.on('task:created', (data) => {
            console.log('📝 [TechDebtSocket] Task Created:', data);
            setLastEvent({ type: 'task:created', data, timestamp: new Date() });
        });

        socketRef.current.on('task:status_changed', (data) => {
            console.log('🔄 [TechDebtSocket] Task Status Changed:', data);
            setLastEvent({ type: 'task:status_changed', data, timestamp: new Date() });
        });

    }, [onPRUpdate, onAnalysisProgress, onAnalysisComplete, onAnalysisError, onScanStatus]);

    const disconnect = useCallback(() => {
        if (socketRef.current) {
            socketRef.current.disconnect();
            socketRef.current = null;
            setIsConnected(false);
        }
    }, []);

    // Subscribe to specific repo updates
    const subscribeToRepo = useCallback((repoId) => {
        if (socketRef.current?.connected) {
            socketRef.current.emit('subscribe:repo', { repoId });
            console.log(`🔔 [TechDebtSocket] Subscribed to repo: ${repoId}`);
        }
    }, []);

    // Unsubscribe from repo updates
    const unsubscribeFromRepo = useCallback((repoId) => {
        if (socketRef.current?.connected) {
            socketRef.current.emit('unsubscribe:repo', { repoId });
            console.log(`🔕 [TechDebtSocket] Unsubscribed from repo: ${repoId}`);
        }
    }, []);

    useEffect(() => {
        if (autoConnect) {
            connect();
        }

        return () => {
            disconnect();
        };
    }, [autoConnect, connect, disconnect]);

    return {
        isConnected,
        lastEvent,
        connect,
        disconnect,
        subscribeToRepo,
        unsubscribeFromRepo,
        getSocket: () => socketRef.current
    };
};

export default useTechDebtSocket;
