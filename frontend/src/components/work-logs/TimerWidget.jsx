import React, { useState, useEffect } from 'react';
import { Clock, Play, Pause, X } from 'lucide-react';
import { useTimerContext } from '../../context/TimerContext';
import './WorkLogs.css';

/**
 * TimerWidget
 * Floating timer widget that displays running timer across the app
 * Shows work item being timed and elapsed time
 */
const TimerWidget = () => {
  const { runningTimer, stopTimer, pauseTimer } = useTimerContext();
  const [elapsedTime, setElapsedTime] = useState('00:00:00');
  const [showWidget, setShowWidget] = useState(false);

  // Update elapsed time every second
  useEffect(() => {
    if (!runningTimer) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowWidget(false);
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShowWidget(true);

    const interval = setInterval(() => {
      const start = new Date(runningTimer.startTime);
      const now = new Date();
      const elapsed = Math.floor((now - start) / 1000);

      const hours = Math.floor(elapsed / 3600);
      const minutes = Math.floor((elapsed % 3600) / 60);
      const seconds = elapsed % 60;

      setElapsedTime(
        `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [runningTimer]);

  const handleStop = async () => {
    try {
      await stopTimer(runningTimer.workItemId);
    } catch (error) {
      console.error('Failed to stop timer:', error);
    }
  };

  const handlePause = async () => {
    try {
      await pauseTimer();
    } catch (error) {
      console.error('Failed to pause timer:', error);
    }
  };

  if (!showWidget || !runningTimer) return null;

  // Get work item title (might be in the object or need to fetch)
  const workItemTitle = runningTimer.workItemId?.title || 'Work Item';

  return (
    <div className="timer-widget">
      <div className="timer-widget-header">
        <div className="timer-widget-title">
          <Clock size={16} style={{ display: 'inline', marginRight: '6px' }} />
          {workItemTitle}
        </div>
      </div>

      <div className="timer-widget-time timer-pulse">
        {elapsedTime}
      </div>

      <div className="timer-widget-controls">
        <button
          className="timer-widget-btn primary"
          onClick={handlePause}
          title="Pause and switch task"
        >
          <Pause size={14} />
          Switch
        </button>
        <button
          className="timer-widget-btn danger"
          onClick={handleStop}
          title="Stop timer"
        >
          <X size={14} />
          Stop
        </button>
      </div>
    </div>
  );
};

export default TimerWidget;
