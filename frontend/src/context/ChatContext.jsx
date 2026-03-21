import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';
import { toast } from 'react-toastify';
import api from '../services/api';

const ChatContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export const useChat = () => useContext(ChatContext);

export const ChatProvider = ({ children }) => {
    const { user } = useAuth();
    const [socket, setSocket] = useState(null);
    const [unreadCount, setUnreadCount] = useState(0);
    const [channels, setChannels] = useState([]);

    const fetchChannels = useCallback(async () => {
        try {
            const res = await api.get('/channels');
            setChannels(res.data);
        } catch (err) {
            console.error("Failed to fetch channels", err);
        }
    }, []);

    useEffect(() => {
        if (user) {
            // Use microtask to avoid synchronous setState in effect
            Promise.resolve().then(() => fetchChannels());
        }
    }, [user, fetchChannels]);

    useEffect(() => {
        if (user) {
            const newSocket = io(import.meta.env.VITE_API_URL || 'https://localhost:5001', { withCredentials: true, secure: true, rejectUnauthorized: false });
            // Use microtask to avoid synchronous setState in effect
            Promise.resolve().then(() => setSocket(newSocket));

            newSocket.on('connect', () => {
                // console.log('Socket Connected:', newSocket.id);
                // Join basic rooms or user-specific room
                newSocket.emit('join_room', 'general'); // Default room
                newSocket.emit('join_room', user._id); // Private room for DMs
            });

            newSocket.on('receive_message', (data) => {
                // If the message is NOT from me, notify
                if (data.sender._id !== user._id) {
                    toast.info(`New message from ${data.sender.fullName || 'someone'}: ${data.message.substring(0, 20)}...`);
                    setUnreadCount(prev => prev + 1);
                }
            });

            newSocket.on('channel_created', (newChannel) => {
                setChannels(prev => {
                    if (prev.find(c => c._id === newChannel._id)) return prev;
                    return [newChannel, ...prev];
                });
                newSocket.emit('join_room', `channel_${newChannel._id}`);
            });

            newSocket.on('channel_updated', (updatedChannel) => {
                setChannels(prev => prev.map(c => c._id === updatedChannel._id ? updatedChannel : c));
            });

            newSocket.on('channel_deleted', ({ channelId }) => {
                setChannels(prev => prev.filter(c => c._id !== channelId));
            });

            return () => newSocket.close();
        }
    }, [user]);

    const sendMessage = (room, messageData) => {
        if (socket) {
            socket.emit('send_message', { room, ...messageData });
        }
    };

    const joinRoom = (room) => {
        if (socket) {
            socket.emit('join_room', room);
        }
    };

    return (
        <ChatContext.Provider value={{
            socket,
            sendMessage,
            joinRoom,
            unreadCount,
            setUnreadCount,
            channels,
            setChannels,
            fetchChannels
        }}>
            {children}
        </ChatContext.Provider>
    );
};
