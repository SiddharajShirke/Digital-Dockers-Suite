import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import axios from 'axios';

/**
 * Timer Context
 * Manages global running timer state across application
 * Ensures only one timer runs at a time
 */
const TimerContext = createContext();

export const TimerProvider = ({ children }) => {
  const [runningTimer, setRunningTimer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const timerRef = React.useRef(runningTimer);
  useEffect(() => {
    timerRef.current = runningTimer;
  }, [runningTimer]);

  // Load running timer on mount
  useEffect(() => {
    const loadRunningTimer = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/users/me/timer');
        if (response.data.data) {
          setRunningTimer(response.data.data);
        }
      } catch (err) {
        console.error('Failed to load running timer:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadRunningTimer();

    // Stop timers when user logs out (before unload)
    const handleBeforeUnload = async () => {
      if (timerRef.current) {
        try {
          await axios.post('/api/users/me/timers/stop');
        } catch (err) {
          console.error('Failed to stop timers:', err);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Start timer
  const startTimer = useCallback(async (workItemId, description = '') => {
    try {
      const response = await axios.post(`/api/work-items/${workItemId}/work-logs/start`, {
        description
      });

      if (response.data.success) {
        setRunningTimer(response.data.data);
        setError(null);
        return response.data.data;
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      throw err;
    }
  }, []);

  // Stop timer
  const stopTimer = useCallback(async (workItemId) => {
    try {
      const response = await axios.post(`/api/work-items/${workItemId}/work-logs/stop`);

      if (response.data.success) {
        setRunningTimer(null);
        setError(null);
        return response.data.data;
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      throw err;
    }
  }, []);

  // Pause timer (switch to different task)
  const pauseTimer = useCallback(async () => {
    if (!runningTimer) {
      throw new Error('No running timer');
    }

    try {
      const response = await axios.post(`/api/work-items/${runningTimer.workItemId}/work-logs/stop`);

      if (response.data.success) {
        setRunningTimer(null);
        setError(null);
        return response.data.data;
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      throw err;
    }
  }, [runningTimer]);

  // Stop all timers
  const stopAllTimers = useCallback(async () => {
    try {
      const response = await axios.post('/api/users/me/timers/stop');

      if (response.data.success) {
        setRunningTimer(null);
        setError(null);
        return response.data.data;
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      throw err;
    }
  }, []);

  // Check if timer is running
  const isTimerRunning = !!runningTimer;
  const currentWorkItemId = runningTimer?.workItemId;

  // Warn before closing tab if timer is running
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isTimerRunning) {
        e.preventDefault();
        e.returnValue = 'You have an active timer. Are you sure you want to leave?';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isTimerRunning]);

  const value = {
    runningTimer,
    loading,
    error,
    startTimer,
    stopTimer,
    pauseTimer,
    stopAllTimers,
    isTimerRunning,
    currentWorkItemId,
    setRunningTimer // For manual updates if needed
  };

  return (
    <TimerContext.Provider value={value}>
      {children}
    </TimerContext.Provider>
  );
};

/**
 * Hook to use timer context
 */
// eslint-disable-next-line react-refresh/only-export-components
export const useTimerContext = () => {
  const context = useContext(TimerContext);
  if (!context) {
    throw new Error('useTimerContext must be used within TimerProvider');
  }
  return context;
};

export default TimerContext;
