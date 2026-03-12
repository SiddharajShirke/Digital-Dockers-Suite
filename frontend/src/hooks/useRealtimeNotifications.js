import { useEffect, useRef, useState, useCallback } from 'react';
import io from 'socket.io-client';
import axios from 'axios';

/**
 * useRealtimeNotifications Hook
 * 
 * Manages real-time notification connection and updates
 * Handles WebSocket connection, authentication, and notification state
 * 
 * Usage:
 * const { notifications, unreadCount, isConnected } = useRealtimeNotifications(token);
 */
export const useRealtimeNotifications = (token) => {
  const socketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const [lastNotificationId, setLastNotificationId] = useState(null);

  /**
   * Initialize WebSocket connection
   */
  const connect = useCallback(() => {
    if (socketRef.current?.connected) {
      return;
    }

    try {
      const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5001', {
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 10,
        transports: ['websocket', 'polling'],
        withCredentials: true
      });

      // Connection events
      socket.on('connect', () => {
        console.log('[Notification] WebSocket connected');
        setIsConnected(true);
        setError(null);

        // Authenticate
        socket.emit('notification:authenticate', { token }, (response) => {
          if (response.success) {
            console.log('[Notification] Authenticated successfully');
            setUnreadCount(response.unreadCount);

            // Set initial notifications
            if (response.feed && response.feed.length > 0) {
              setNotifications(response.feed);
              setLastNotificationId(response.feed[0]._id);
            }

            // Handle reconnect - fetch missed notifications
            if (lastNotificationId) {
              socket.emit('notification:reconnect',
                { lastNotificationId },
                (reconnectResponse) => {
                  if (reconnectResponse.success && reconnectResponse.newNotifications?.length > 0) {
                    setNotifications(prev => [
                      ...reconnectResponse.newNotifications,
                      ...prev
                    ]);
                  }
                }
              );
            }
          } else {
            setError(response.error);
          }
        });
      });

      socket.on('disconnect', () => {
        console.log('[Notification] WebSocket disconnected');
        setIsConnected(false);
      });

      socket.on('connect_error', (error) => {
        console.error('[Notification] Connection error:', error);
        setError(error.message);
      });

      // Notification events
      socket.on('notification:new', (notification) => {
        console.log('[Notification] New notification received:', notification);
        setNotifications(prev => [notification, ...prev]);
        setLastNotificationId(notification.id);
        setUnreadCount(prev => prev + 1);
      });

      socket.on('notification:unreadCount', (data) => {
        console.log('[Notification] Unread count updated:', data.unreadCount);
        setUnreadCount(data.unreadCount);
      });

      socket.on('notification:marked-read', (data) => {
        setNotifications(prev =>
          prev.map(notif =>
            notif.id === data.notificationId
              ? { ...notif, isRead: true }
              : notif
          )
        );
      });

      socket.on('notification:all-marked-read', () => {
        setNotifications(prev =>
          prev.map(notif => ({ ...notif, isRead: true }))
        );
        setUnreadCount(0);
      });

      socket.on('notification:archived', (data) => {
        setNotifications(prev =>
          prev.filter(notif => notif.id !== data.notificationId)
        );
      });

      // Heartbeat to keep connection alive
      const heartbeatInterval = setInterval(() => {
        if (socket.connected) {
          socket.emit('notification:ping', () => {
            // Pong received
          });
        }
      }, 30000); // Every 30 seconds

      socket.on('disconnect', () => {
        clearInterval(heartbeatInterval);
      });

      socketRef.current = socket;
    } catch (err) {
      console.error('[Notification] Failed to connect:', err);
      setError(err.message);

      // Retry connection after delay
      reconnectTimeoutRef.current = setTimeout(() => connect(), 5000);
    }
  }, [token, lastNotificationId]);

  /**
   * Mark notification as read
   */
  const markAsRead = useCallback((notificationId) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('notification:read', { notificationId });
    }

    // Also make API call for persistence
    axios.put(
      `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/notifications/${notificationId}/read`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    ).catch(err => console.error('[Notification] Error marking as read:', err));
  }, [token]);

  /**
   * Mark all notifications as read
   */
  const markAllAsRead = useCallback(() => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('notification:readAll');
    }

    axios.put(
      `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/notifications/read/all`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    ).catch(err => console.error('[Notification] Error marking all as read:', err));
  }, [token]);

  /**
   * Archive notification
   */
  const archiveNotification = useCallback((notificationId) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('notification:archive', { notificationId });
    }

    axios.put(
      `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/notifications/${notificationId}/archive`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    ).catch(err => console.error('[Notification] Error archiving:', err));
  }, [token]);

  /**
   * Fetch notifications from API (fallback/initial load)
   */
  const fetchNotifications = useCallback(async (page = 1, limit = 10) => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/notifications`,
        {
          params: { page, limit },
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      return response.data.data;
    } catch (err) {
      console.error('[Notification] Error fetching notifications:', err);
      throw err;
    }
  }, [token]);

  /**
   * Request notification feed
   */
  const requestFeed = useCallback((limit = 5) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('notification:fetch', { limit }, (feed) => {
        if (feed && feed.notifications) {
          setNotifications(feed.notifications);
          setUnreadCount(feed.unreadCount);
        }
      });
    }
  }, []);

  /**
   * Disconnect WebSocket
   */
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
  }, []);

  // Connect on mount
  useEffect(() => {
    if (token) {
      connect();
    }

    return () => {
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return {
    notifications,
    unreadCount,
    isConnected,
    error,
    markAsRead,
    markAllAsRead,
    archiveNotification,
    fetchNotifications,
    requestFeed,
    disconnect,
    reconnect: connect
  };
};

export default useRealtimeNotifications;
