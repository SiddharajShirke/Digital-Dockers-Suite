import React, { useState, useEffect } from 'react';
import { Badge, Dropdown, Button, Empty, Spin, Divider, Tag, Space } from 'antd';
import { BellOutlined, DeleteOutlined, CheckOutlined, ClearOutlined } from '@ant-design/icons';
import useRealtimeNotifications from '../../hooks/useRealtimeNotifications';
import './NotificationPanel.css';

/**
 * NotificationPanel Component
 * 
 * Displays real-time notifications in a dropdown panel
 * Shows unread count and allows user to manage notifications
 */
const NotificationPanel = ({ token }) => {
  const {
    notifications,
    unreadCount,
    isConnected,
    markAllAsRead,
    archiveNotification,
    markAsRead
  } = useRealtimeNotifications(token);

  const [isLoading] = useState(false);
  const [visibleNotifications, setVisibleNotifications] = useState(notifications);
  const [dropdownVisible, setDropdownVisible] = useState(false);

  useEffect(() => {
    setVisibleNotifications(notifications);
  }, [notifications]);

  /**
   * Handle notification item click
   */
  const handleNotificationClick = (notification) => {
    if (!notification.isRead) {
      markAsRead(notification.id);
    }

    // Navigate to action URL if available
    if (notification.actionUrl) {
      window.location.assign(notification.actionUrl);
    }
  };

  /**
   * Get icon based on notification type
   */
  const getNotificationIcon = (notification) => {
    if (notification.icon) {
      return <span className="notification-emoji">{notification.icon}</span>;
    }

    const typeIcons = {
      issue_created: '📝',
      issue_assigned: '👤',
      issue_status_changed: '✅',
      issue_commented: '💬',
      task_completed: '✔️',
      sprint_started: '🚀',
      sprint_completed: '🎉',
      mention: '🔔',
      document_shared: '📄',
      meeting_scheduled: '📅',
      project_added: '📊',
      team_invite: '👥',
      deadline_reminder: '⏰',
      ai_insight: '💡'
    };

    return <span className="notification-emoji">{typeIcons[notification.type] || '🔔'}</span>;
  };

  /**
   * Get priority badge color
   */
  const getPriorityColor = (priority) => {
    const colors = {
      low: 'blue',
      medium: 'orange',
      high: 'red',
      urgent: 'volcano'
    };
    return colors[priority] || 'blue';
  };

  /**
   * Render notification item
   */
  const renderNotificationItem = (notification) => (
    <div
      key={notification.id}
      className={`notification-item ${!notification.isRead ? 'unread' : ''}`}
      onClick={() => handleNotificationClick(notification)}
    >
      <div className="notification-header">
        <div className="notification-title-section">
          {getNotificationIcon(notification)}
          <div className="notification-content">
            <h4 className="notification-title">{notification.title}</h4>
            <p className="notification-description">{notification.description}</p>
          </div>
        </div>

        <div className="notification-actions">
          <Button
            type="text"
            size="small"
            icon={<DeleteOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              archiveNotification(notification.id);
            }}
            title="Archive"
          />
        </div>
      </div>

      <div className="notification-meta">
        {notification.entityKey && (
          <Tag className="entity-key">{notification.entityKey}</Tag>
        )}
        {notification.priority && notification.priority !== 'medium' && (
          <Tag color={getPriorityColor(notification.priority)}>
            {notification.priority}
          </Tag>
        )}
        {notification.sender && (
          <span className="sender-name">by {notification.sender.name}</span>
        )}
        <span className="timestamp">
          {getRelativeTime(notification.createdAt)}
        </span>
      </div>
    </div>
  );

  /**
   * Render notification list
   */
  const renderNotificationList = () => {
    if (isLoading) {
      return (
        <div className="notification-loading">
          <Spin />
        </div>
      );
    }

    if (!isConnected) {
      return (
        <div className="notification-error">
          <p>⚠️ Reconnecting...</p>
          <p className="small-text">Real-time notifications temporarily unavailable</p>
        </div>
      );
    }

    if (visibleNotifications.length === 0) {
      return (
        <Empty
          description="No notifications"
          style={{ padding: '20px 0' }}
        />
      );
    }

    return (
      <div className="notification-list">
        {visibleNotifications.map(renderNotificationItem)}
      </div>
    );
  };

  /**
   * Render dropdown menu
   */
  const dropdownMenu = (
    <div className="notification-panel">
      <div className="notification-header-bar">
        <h3>Notifications</h3>
        <Space>
          {unreadCount > 0 && (
            <Button
              type="text"
              size="small"
              icon={<CheckOutlined />}
              onClick={markAllAsRead}
              title="Mark all as read"
            >
              Mark all read
            </Button>
          )}
          <Button
            type="text"
            size="small"
            icon={<ClearOutlined />}
            onClick={() => setVisibleNotifications([])}
            title="Clear view"
          >
            Clear
          </Button>
        </Space>
      </div>

      <Divider style={{ margin: '8px 0' }} />

      {renderNotificationList()}

      {visibleNotifications.length > 0 && (
        <>
          <Divider style={{ margin: '8px 0' }} />
          <div className="notification-footer">
            <Button
              type="link"
              block
              onClick={() => {
                window.location.href = '/dashboard/notifications';
                setDropdownVisible(false);
              }}
            >
              View all notifications
            </Button>
          </div>
        </>
      )}
    </div>
  );

  return (
    <Dropdown
      menu={{ content: dropdownMenu }}
      trigger={['click']}
      placement="bottomRight"
      open={dropdownVisible}
      onOpenChange={setDropdownVisible}
      overlayClassName="notification-dropdown"
    >
      <Badge
        count={unreadCount}
        style={{
          backgroundColor: unreadCount > 0 ? '#ff4d4f' : '#d9d9d9',
          color: '#fff',
          boxShadow: unreadCount > 0 ? '0 0 0 1px #fff' : 'none'
        }}
      >
        <Button
          type="text"
          size="large"
          icon={<BellOutlined />}
          className={`notification-button ${!isConnected ? 'disconnected' : ''}`}
          title={isConnected ? 'Notifications' : 'Reconnecting...'}
        />
      </Badge>
    </Dropdown>
  );
};

/**
 * Get relative time string (e.g., "5 minutes ago")
 */
function getRelativeTime(date) {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  let interval = seconds / 31536000;

  if (interval > 1) {
    return Math.floor(interval) + ' years ago';
  }
  interval = seconds / 2592000;
  if (interval > 1) {
    return Math.floor(interval) + ' months ago';
  }
  interval = seconds / 86400;
  if (interval > 1) {
    return Math.floor(interval) + ' days ago';
  }
  interval = seconds / 3600;
  if (interval > 1) {
    return Math.floor(interval) + ' hours ago';
  }
  interval = seconds / 60;
  if (interval > 1) {
    return Math.floor(interval) + ' minutes ago';
  }
  return Math.floor(seconds) + ' seconds ago';
}

export default NotificationPanel;
