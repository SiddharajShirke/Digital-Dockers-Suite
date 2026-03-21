import { useState, useEffect } from 'react';
import { Dropdown, Badge, Avatar, Typography, Button, Empty, Spin } from 'antd';
import { BellOutlined, CheckOutlined } from '@ant-design/icons';
import activityService from '../../services/activityService';
import { formatDistanceToNow } from 'date-fns';
import './NotificationsDropdown.css';

const { Text } = Typography;

const NotificationsDropdown = () => {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [open, setOpen] = useState(false);

    useEffect(() => {
        loadUnreadCount();
         
    }, []);

    const loadUnreadCount = async () => {
        try {
            const data = await activityService.getUnreadCount();
            setUnreadCount(data.count);
        } catch (error) {
            console.error('Failed to load unread count:', error);
        }
    };

    const loadNotifications = async () => {
        setLoading(true);
        try {
            const data = await activityService.getActivity({ limit: 10 });
            setNotifications(data.activities);
        } catch (error) {
            console.error('Failed to load notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenChange = (newOpen) => {
        setOpen(newOpen);
        if (newOpen) {
            loadNotifications();
        }
    };

    const handleMarkAllRead = async () => {
        try {
            await activityService.markAllAsRead();
            setUnreadCount(0);
            loadNotifications();
        } catch (error) {
            console.error('Failed to mark as read:', error);
        }
    };

    const formatTimeAgo = (date) => {
        try {
            return formatDistanceToNow(new Date(date), { addSuffix: true });
        } catch {
            return 'recently';
        }
    };

    const dropdownContent = (
        <div className="notifications-dropdown">
            <div className="notifications-dropdown-header">
                <Text strong>Notifications</Text>
                {unreadCount > 0 && (
                    <Button
                        type="text"
                        size="small"
                        icon={<CheckOutlined />}
                        onClick={handleMarkAllRead}
                        className="notifications-mark-all-btn"
                    >
                        Mark all read
                    </Button>
                )}
            </div>

            {loading ? (
                <div className="notifications-loading-state">
                    <Spin />
                </div>
            ) : notifications.length > 0 ? (
                <div className="notifications-list">
                    {notifications.map((item) => (
                        <div
                            key={item._id}
                            className={`notifications-list-item ${item.isRead ? '' : 'unread'}`}
                            onClick={() => {/* Handle click if needed */}}
                        >
                            <div className="notifications-item-content">
                                <Avatar className="notifications-avatar">
                                    {item.actor?.fullName?.[0] || '?'}
                                </Avatar>
                                <div className="notifications-item-text">
                                    <Text className="notifications-item-message">{item.message}</Text>
                                    <Text type="secondary" className="notifications-item-time">
                                        {formatTimeAgo(item.createdAt)}
                                    </Text>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <Empty
                    description="No notifications"
                    style={{ padding: 40 }}
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
            )}
        </div>
    );

    return (
        <Dropdown
            popupRender={() => dropdownContent}
            trigger={['click']}
            open={open}
            onOpenChange={handleOpenChange}
            placement="bottomRight"
        >
            <Badge count={unreadCount} size="small">
                <BellOutlined className="notifications-trigger-icon" />
            </Badge>
        </Dropdown>
    );
};

export default NotificationsDropdown;
