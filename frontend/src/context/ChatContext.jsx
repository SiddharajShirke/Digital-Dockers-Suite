import { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';
import { toast } from 'react-toastify';

const ChatContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export const useChat = () => useContext(ChatContext);

export const ChatProvider = ({ children }) => {
    const { user } = useAuth();
    const [socket, setSocket] = useState(null);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        if (user) {
            const newSocket = io(import.meta.env.VITE_API_URL || 'http://localhost:5001', { withCredentials: true });
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setSocket(newSocket);

            newSocket.on('connect', () => {
                // console.log('Socket Connected:', newSocket.id);
                // Join basic rooms or user-specific room
                newSocket.emit('join_room', 'general'); // Default room
                newSocket.emit('join_room', user._id); // Private room for DMs
            });

            newSocket.on('receive_message', (data) => {
                // If the message is NOT from me, notify
                if (data.sender._id !== user._id) {
                    toast.info(`New message from ${data.sender.fullName}: ${data.message.substring(0, 20)}...`);
                    setUnreadCount(prev => prev + 1);
                }
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
        <ChatContext.Provider value={{ socket, sendMessage, joinRoom, unreadCount, setUnreadCount }}>
            {children}
        </ChatContext.Provider>
    );
};
