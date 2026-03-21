import { useState, useEffect, useCallback } from 'react';
import io from 'socket.io-client';

/**
 * WebSocket Hook for Space Real-Time Collaboration
 * Manages connection, presence, and real-time updates
 */
const useSpaceWebSocket = (spaceId, userId) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [activeUsers, setActiveUsers] = useState([]);
  const [cursors, setCursors] = useState(new Map());
  const [typingUsers, setTypingUsers] = useState(new Set());

  // Initialize WebSocket connection
  useEffect(() => {
    const wsUrl = import.meta.env.VITE_WS_URL || 'https://localhost:5001';

    const newSocket = io(wsUrl, {
      withCredentials: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      secure: true,
      rejectUnauthorized: false
    });

    // Connection handlers
    newSocket.on('connect', () => {
      console.log('✅ WebSocket connected');
      setIsConnected(true);

      // Join space
      newSocket.emit('space:join', { spaceId, userId });
    });

    newSocket.on('disconnect', () => {
      console.log('❌ WebSocket disconnected');
      setIsConnected(false);
    });

    // Space event handlers
    newSocket.on('space:joined', (data) => {
      console.log('🟢 Joined space, active users:', data.activeUsers);
      setActiveUsers(data.activeUsers);
    });

    newSocket.on('user:joined', (data) => {
      console.log(`👤 User ${data.userId} joined (${data.activeCount} active)`);
      setActiveUsers(prev => [...prev, data.userId]);
    });

    newSocket.on('user:left', (data) => {
      console.log(`👋 User ${data.userId} left (${data.activeCount} active)`);
      setActiveUsers(prev => prev.filter(u => u !== data.userId));
      setCursors(prev => {
        const next = new Map(prev);
        next.delete(data.userId);
        return next;
      });
    });

    // Cursor movement
    newSocket.on('cursor:moved', (data) => {
      setCursors(prev => {
        const next = new Map(prev);
        next.set(data.userId, {
          x: data.x,
          y: data.y,
          elementId: data.elementId,
          mode: data.mode
        });
        return next;
      });
    });

    // Typing indicator
    newSocket.on('user:typing', (data) => {
      setTypingUsers(prev => {
        const next = new Set(prev);
        if (data.isTyping) {
          next.add(data.userId);
        } else {
          next.delete(data.userId);
        }
        return next;
      });
    });

    // Content update
    newSocket.on('content:updated', (data) => {
      // Handle remote content updates
      // This will be handled by parent component
      console.log('📝 Remote content updated:', data);
    });

    // Error handler
    newSocket.on('error', (error) => {
      console.error('❌ WebSocket error:', error);
    });

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSocket(newSocket);

    // Cleanup on unmount
    return () => {
      if (newSocket) {
        newSocket.emit('space:leave', { spaceId, userId });
        newSocket.disconnect();
      }
    };
  }, [spaceId, userId]);

  // Send content update
  const sendUpdate = useCallback((payload) => {
    if (socket && isConnected) {
      socket.emit('content:update', {
        spaceId,
        userId,
        ...payload
      });
    }
  }, [socket, isConnected, spaceId, userId]);

  // Send cursor movement
  const sendCursorMove = useCallback((x, y, elementId, mode = 'draw') => {
    if (socket && isConnected) {
      socket.emit('cursor:move', {
        spaceId,
        userId,
        x,
        y,
        elementId,
        mode
      });
    }
  }, [socket, isConnected, spaceId, userId]);

  // Send typing indicator
  const sendTyping = useCallback((isTyping) => {
    if (socket && isConnected) {
      socket.emit('user:typing', {
        spaceId,
        userId,
        isTyping
      });
    }
  }, [socket, isConnected, spaceId, userId]);

  // Request full sync
  const requestSync = useCallback(() => {
    if (socket && isConnected) {
      socket.emit('sync:request', { spaceId, userId });
    }
  }, [socket, isConnected, spaceId, userId]);

  // Listen for sync
  useEffect(() => {
    if (!socket) return;

    socket.on('sync:full', () => {
      console.log('🔄 Full sync received');
      // Handle full sync in parent component
    });
  }, [socket]);

  return {
    isConnected,
    activeUsers,
    cursors,
    typingUsers,
    sendUpdate,
    sendCursorMove,
    sendTyping,
    requestSync,
    socket
  };
};

export default useSpaceWebSocket;
