import React, { useState, useEffect } from 'react';
import { Clock, Plus, AlertCircle } from 'lucide-react';
import { useTimerContext } from '../../context/TimerContext';
import workLogService from '../../services/workLogService';
import WorkLogList from './WorkLogList';
import LogWorkModal from './LogWorkModal';
import './WorkLogs.css';

/**
 * WorkLogPanel
 * Main component for work logging on a ticket
 * Displays timer controls, work log list, and manual entry modal
 */
const WorkLogPanel = ({ workItemId, onTimeUpdated }) => {
  const { runningTimer, startTimer, stopTimer, isTimerRunning, currentWorkItemId } = useTimerContext();
  const [workLogs, setWorkLogs] = useState([]);
  const [timeSummary, setTimeSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showManualModal, setShowManualModal] = useState(false);
  const [isStartingTimer, setIsStartingTimer] = useState(false);

  // Load work logs and summary
  const loadWorkLogs = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [logsRes, summaryRes] = await Promise.all([
        workLogService.getWorkLogs(workItemId),
        workLogService.getTimeSummary(workItemId)
      ]);

      setWorkLogs(logsRes.data || []);
      setTimeSummary(summaryRes.data || {});

      if (onTimeUpdated) {
        onTimeUpdated(summaryRes.data);
      }
    } catch (err) {
      setError(err.message);
      console.error('Failed to load work logs:', err);
    } finally {
      setLoading(false);
    }
  }, [workItemId, onTimeUpdated]);

  useEffect(() => {
    loadWorkLogs();

    // Refresh every 10 seconds if timer is running
    if (isTimerRunning && currentWorkItemId === workItemId) {
      const interval = setInterval(loadWorkLogs, 10000);
      return () => clearInterval(interval);
    }
  }, [isTimerRunning, currentWorkItemId, workItemId, loadWorkLogs]);

  const handleStartTimer = React.useCallback(async () => {
    try {
      setIsStartingTimer(true);
      await startTimer(workItemId, `Work on ${workItemId}`);
      // Refresh logs after short delay to see the new timer
      setTimeout(loadWorkLogs, 500);
    } catch (err) {
      setError('Failed to start timer');
      console.error(err);
    } finally {
      setIsStartingTimer(false);
    }
  }, [workItemId, startTimer, loadWorkLogs]);

  const handleStopTimer = React.useCallback(async () => {
    try {
      await stopTimer(workItemId);
      // Refresh logs to see the completed timer
      setTimeout(loadWorkLogs, 500);
    } catch (err) {
      setError('Failed to stop timer');
      console.error(err);
    }
  }, [workItemId, stopTimer, loadWorkLogs]);

  const handleManualLogCreated = React.useCallback(async () => {
    setShowManualModal(false);
    await loadWorkLogs();
  }, [loadWorkLogs]);

  const handleLogDeleted = React.useCallback(async () => {
    await loadWorkLogs();
  }, [loadWorkLogs]);

  const isTimerActiveOnThisItem = runningTimer && currentWorkItemId === workItemId;

  return (
    <div className="work-log-panel">
      <h3 className="work-log-panel-title">
        <Clock size={18} />
        Time Logging
      </h3>

      {error && (
        <div className="work-log-alert work-log-alert-error">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Timer Controls */}
      <div className="work-log-actions">
        {!isTimerActiveOnThisItem ? (
          <button
            className="work-log-btn start-timer"
            onClick={handleStartTimer}
            disabled={isStartingTimer || (isTimerRunning && currentWorkItemId !== workItemId)}
          >
            {isStartingTimer ? '⏳ Starting...' : '▶ Start Timer'}
          </button>
        ) : (
          <button
            className="work-log-btn stop-timer"
            onClick={handleStopTimer}
          >
            ⏹ Stop Timer
          </button>
        )}

        <button
          className="work-log-btn manual"
          onClick={() => setShowManualModal(true)}
        >
          <Plus size={16} />
          Log Time Manually
        </button>
      </div>

      {/* Time Summary */}
      {timeSummary && timeSummary.totalHours > 0 && (
        <div className="time-summary">
          <div className="time-summary-title">Time Logged</div>
          <div className="time-summary-stats">
            <div className="time-summary-stat">
              <div className="time-summary-stat-label">Total Time</div>
              <div className="time-summary-stat-value">
                {timeSummary.totalHours}h
              </div>
            </div>
            <div className="time-summary-stat">
              <div className="time-summary-stat-label">Entries</div>
              <div className="time-summary-stat-value">
                {timeSummary.logCount}
              </div>
            </div>
            {timeSummary.billableHours !== timeSummary.totalHours && (
              <div className="time-summary-stat">
                <div className="time-summary-stat-label">Billable</div>
                <div className="time-summary-stat-value">
                  {timeSummary.billableHours}h
                </div>
              </div>
            )}
          </div>

          {/* User breakdown */}
          {timeSummary.byUser && timeSummary.byUser.length > 0 && (
            <div className="time-summary-by-user">
              <div className="time-summary-by-user-title">By User</div>
              {timeSummary.byUser.map((user) => (
                <div key={user.userId} className="time-summary-user-item">
                  <span className="time-summary-user-name">{user.userName}</span>
                  <span className="time-summary-user-time">
                    {Math.round((user.totalMinutes / 60) * 10) / 10}h
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Work Log List */}
      {!loading && workLogs.length > 0 && (
        <WorkLogList
          logs={workLogs}
          onDeleted={handleLogDeleted}
        />
      )}

      {!loading && workLogs.length === 0 && !timeSummary?.totalHours && (
        <div className="work-log-empty-state">
          No work logs yet. Start by clicking "Start Timer" or logging time manually.
        </div>
      )}

      {loading && (
        <div className="work-log-loading-state">
          ⏳ Loading work logs...
        </div>
      )}

      {/* Manual Log Modal */}
      {showManualModal && (
        <LogWorkModal
          workItemId={workItemId}
          onClose={() => setShowManualModal(false)}
          onCreated={handleManualLogCreated}
        />
      )}
    </div>
  );
};

export default WorkLogPanel;
