import React, { useState, useEffect, useRef } from 'react';
import {
    Box, Typography, Avatar, IconButton, TextField, Button,
    Dialog, DialogTitle, DialogContent, DialogActions,
    MenuItem, Select, FormControl, InputLabel, CircularProgress,
    Tooltip, Chip
} from '@mui/material';
import {
    Add, Tag, Lock, Person, Edit, Delete, Check, Close,
    Send, MoreVert
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import api from '../../services/api';
import { toast } from 'react-toastify';
import './ChatPage.css';
import dayjs from 'dayjs';

const ChatPage = () => {
    const { user } = useAuth();
    const { socket, channels, joinRoom } = useChat();

    // State
    const [activeChannel, setActiveChannel] = useState(null);
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [messageInput, setMessageInput] = useState('');

    // Edit state
    const [editingMessageId, setEditingMessageId] = useState(null);
    const [editContent, setEditContent] = useState('');

    // Users (for DMs and member addition)
    const [users, setUsers] = useState([]);

    // Create Channel Modal State
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newChannel, setNewChannel] = useState({ name: '', description: '', type: 'public', members: [] });

    const messagesEndRef = useRef(null);

    // Fetch initial data
    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const usersRes = await api.get('/users');
                setUsers(usersRes.data.filter(u => u._id !== user?._id));
            } catch (err) {
                console.error("Failed to fetch users", err);
            }
        };
        fetchInitialData();
    }, [user]);

    // Select general channel by default if none active
    useEffect(() => {
        if (!activeChannel && channels && channels.length > 0) {
            const general = channels.find(c => c.name === 'general') || channels[0];
            setActiveChannel(general);
        }
    }, [channels, activeChannel]);

    // Fetch messages when channel changes
    useEffect(() => {
        if (!activeChannel) return;

        const loadMessages = async () => {
            setLoading(true);
            try {
                // Join socket room
                joinRoom(`channel_${activeChannel._id}`);

                // Fetch history
                const res = await api.get(`/chat/channel/${activeChannel._id}`);
                setMessages(res.data || []);
                scrollToBottom();
            } catch (err) {
                console.error("Failed to load messages", err);
            } finally {
                setLoading(false);
            }
        };

        loadMessages();
    }, [activeChannel, joinRoom]);

    // Socket listeners for messages
    useEffect(() => {
        if (!socket) return;

        const handleReceive = (data) => {
            if (activeChannel && data.channel === activeChannel._id) {
                setMessages(prev => [...prev, data]);
                scrollToBottom();
            }
        };

        const handleEdit = (editedMsg) => {
            setMessages(prev => prev.map(m => m._id === editedMsg._id ? editedMsg : m));
        };

        const handleDelete = ({ messageId }) => {
            setMessages(prev => prev.filter(m => m._id !== messageId));
        };

        socket.on('receive_message', handleReceive);
        socket.on('message_edited', handleEdit);
        socket.on('message_deleted', handleDelete);

        return () => {
            socket.off('receive_message', handleReceive);
            socket.off('message_edited', handleEdit);
            socket.off('message_deleted', handleDelete);
        };
    }, [socket, activeChannel]);

    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
    };

    // Actions
    const handleSendMessage = async (e) => {
        if (e) e.preventDefault();
        if (!messageInput.trim() || !activeChannel) return;

        const msgData = {
            message: messageInput.trim(),
            channel: activeChannel._id,
            room: `channel_${activeChannel._id}` // For backward compat
        };

        setMessageInput('');

        try {
            const res = await api.post('/chat', msgData);

            // Optimistic or rely on res: we will rely on res here to ensure full populate
            setMessages(prev => [...prev, res.data]);
            scrollToBottom();

            // Emit to others
            socket.emit('send_message', { ...res.data, room: `channel_${activeChannel._id}` });
        } catch (err) {
            console.error("Failed to send", err);
            toast.error("Failed to send message");
        }
    };

    const handleEditSave = async (msgId) => {
        if (!editContent.trim()) {
            setEditingMessageId(null);
            return;
        }

        try {
            const res = await api.put(`/chat/${msgId}`, { message: editContent.trim() });
            setMessages(prev => prev.map(m => m._id === msgId ? res.data : m));
            setEditingMessageId(null);
            setEditContent('');
        } catch (err) {
            console.error("Failed to edit", err);
            toast.error("Failed to edit message");
        }
    };

    const handleDeleteMessage = async (msgId) => {
        if (!window.confirm("Are you sure you want to delete this message?")) return;

        try {
            await api.delete(`/chat/${msgId}`);
            setMessages(prev => prev.filter(m => m._id !== msgId));
        } catch (err) {
            console.error("Failed to delete", err);
            toast.error("Failed to delete message");
        }
    };

    const handleCreateChannel = async () => {
        try {
            const res = await api.post('/channels', newChannel);
            toast.success("Channel created!");
            setIsCreateOpen(false);
            setNewChannel({ name: '', description: '', type: 'public', members: [] });
            setActiveChannel(res.data);
            // Context will auto-update via socket
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to create channel");
        }
    };

    const handleStartDirectMessage = async (targetUserId) => {
        try {
            const res = await api.post(`/channels/direct/${targetUserId}`);
            setActiveChannel(res.data);
        } catch (err) {
            console.error("Failed to start DM", err);
            toast.error("Failed to start direct message");
        }
    };

    // Grouping channels
    const publicChannels = channels.filter(c => c.type === 'public');
    const privateChannels = channels.filter(c => c.type === 'private');
    const directChannels = channels.filter(c => c.type === 'direct');

    return (
        <div className="chat-container">
            {/* Sidebar */}
            <div className="chat-sidebar">
                <div className="sidebar-header">
                    Workspace Chat
                </div>

                <div className="sidebar-content">
                    {/* Public Channels */}
                    <div className="sidebar-section">
                        <div className="section-header">
                            <span>Channels</span>
                            <Add className="add-btn" onClick={() => setIsCreateOpen(true)} />
                        </div>
                        {publicChannels.map(c => (
                            <div
                                key={c._id}
                                className={`sidebar-item ${activeChannel?._id === c._id ? 'active' : ''}`}
                                onClick={() => setActiveChannel(c)}
                            >
                                <Tag className="item-icon" />
                                <span className="item-name">{c.name}</span>
                            </div>
                        ))}
                    </div>

                    {/* Private Channels */}
                    {privateChannels.length > 0 && (
                        <div className="sidebar-section">
                            <div className="section-header">
                                <span>Private Channels</span>
                            </div>
                            {privateChannels.map(c => (
                                <div
                                    key={c._id}
                                    className={`sidebar-item ${activeChannel?._id === c._id ? 'active' : ''}`}
                                    onClick={() => setActiveChannel(c)}
                                >
                                    <Lock className="item-icon" fontSize="small" />
                                    <span className="item-name">{c.name}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Direct Messages */}
                    <div className="sidebar-section">
                        <div className="section-header">
                            <span>Direct Messages</span>
                        </div>

                        {/* List existing DMs */}
                        {directChannels.map(c => {
                            // Find the other member in the DM

                            // It's populated so members are objects
                            const otherMember = c.members.find(m => m._id !== user?._id) || c.members[0];
                            const name = otherMember?.fullName || "Unknown User";

                            return (
                                <div
                                    key={c._id}
                                    className={`sidebar-item ${activeChannel?._id === c._id ? 'active' : ''}`}
                                    onClick={() => setActiveChannel(c)}
                                >
                                    <Avatar src={otherMember?.profileInfo?.avatar} sx={{ width: 20, height: 20, mr: 1 }}>
                                        {name[0]?.toUpperCase()}
                                    </Avatar>
                                    <span className="item-name">{name}</span>
                                </div>
                            )
                        })}

                        {/* List users to start new DMs with (only if no existing DM channel exists) */}
                        <div className="section-header section-subheader">
                            <span>Start new conversation</span>
                        </div>
                        {users.filter(u => !directChannels.some(c => c.members.some(m => m._id === u._id))).map(u => (
                            <div
                                key={u._id}
                                className="sidebar-item"
                                onClick={() => handleStartDirectMessage(u._id)}
                            >
                                <Avatar src={u.profileInfo?.avatar} sx={{ width: 20, height: 20, mr: 1 }}>
                                    {u.fullName[0]?.toUpperCase()}
                                </Avatar>
                                <span className="item-name">{u.fullName}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Main Area */}
            <div className="chat-main">
                {activeChannel ? (
                    <>
                        <div className="chat-header">
                            <div className="chat-header-info">
                                <span className="chat-title">
                                    {activeChannel.type === 'private' ? <Lock fontSize="small" /> :
                                        activeChannel.type === 'direct' ? <Person fontSize="small" /> : <Tag fontSize="small" />}
                                    {activeChannel.type === 'direct' ?
                                        (activeChannel.members.find(m => m._id !== user?._id)?.fullName || "Direct Message") :
                                        activeChannel.name}
                                </span>
                                {activeChannel.description && (
                                    <span className="chat-subtitle">{activeChannel.description}</span>
                                )}
                            </div>
                            <div className="chat-header-actions">
                                <Chip
                                    icon={<Person />}
                                    label={`${activeChannel.members?.length || 1} members`}
                                    size="small"
                                    variant="outlined"
                                />
                            </div>
                        </div>

                        <div className="message-list">
                            {loading ? (
                                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                                    <CircularProgress size={30} />
                                </Box>
                            ) : messages.length === 0 ? (
                                <Box sx={{ textAlign: 'center', color: 'text.secondary', mt: 10 }}>
                                    <Typography variant="h6">Welcome to #{activeChannel.name}!</Typography>
                                    <Typography variant="body2">This is the beginning of the channel history.</Typography>
                                </Box>
                            ) : (
                                messages.map(msg => {
                                    const isMe = msg.sender._id === user._id;
                                    const isEditing = editingMessageId === msg._id;

                                    return (
                                        <div key={msg._id} className="message-item">
                                            <div className="message-avatar">
                                                {msg.sender.fullName ? msg.sender.fullName[0].toUpperCase() : '?'}
                                            </div>

                                            <div className="message-content">
                                                <div className="message-meta">
                                                    <span className="message-author">{msg.sender.fullName}</span>
                                                    <span className="message-time">
                                                        {dayjs(msg.createdAt).format('h:mm A')}
                                                    </span>
                                                    {msg.isEdited && (
                                                        <span className="message-edited">(edited)</span>
                                                    )}
                                                </div>

                                                {isEditing ? (
                                                    <div className="edit-input-wrapper">
                                                        <TextField
                                                            fullWidth
                                                            multiline
                                                            size="small"
                                                            value={editContent}
                                                            onChange={(e) => setEditContent(e.target.value)}
                                                            variant="standard"
                                                            InputProps={{ disableUnderline: true }}
                                                            autoFocus
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                                    e.preventDefault();
                                                                    handleEditSave(msg._id);
                                                                } else if (e.key === 'Escape') {
                                                                    setEditingMessageId(null);
                                                                }
                                                            }}
                                                        />
                                                        <div className="edit-actions">
                                                            <Button size="small" onClick={() => setEditingMessageId(null)}>Cancel</Button>
                                                            <Button size="small" variant="contained" onClick={() => handleEditSave(msg._id)}>Save</Button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="message-text">
                                                        {msg.message}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Hover Actions */}
                                            {isMe && !isEditing && (
                                                <div className="message-actions">
                                                    <Tooltip title="Edit Message" placement="top">
                                                        <div className="action-btn" onClick={() => {
                                                            setEditingMessageId(msg._id);
                                                            setEditContent(msg.message);
                                                        }}>
                                                            <Edit fontSize="small" />
                                                        </div>
                                                    </Tooltip>
                                                    <Tooltip title="Delete Message" placement="top">
                                                        <div className="action-btn delete" onClick={() => handleDeleteMessage(msg._id)}>
                                                            <Delete fontSize="small" />
                                                        </div>
                                                    </Tooltip>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        <div className="chat-input-container">
                            <form className="chat-input-wrapper" onSubmit={handleSendMessage}>
                                <div className="chat-input-toolbar">
                                    {/* Formatting tools could go here */}
                                </div>
                                <textarea
                                    className="chat-input-field"
                                    placeholder={`Message #${activeChannel.name}`}
                                    value={messageInput}
                                    onChange={(e) => setMessageInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSendMessage(e);
                                        }
                                    }}
                                />
                                <div className="chat-input-footer">
                                    <span className="text-xs text-slate-400">
                                        <strong>Return</strong> to send, <strong>Shift + Return</strong> for new line
                                    </span>
                                    <button
                                        type="submit"
                                        className="send-btn"
                                        disabled={!messageInput.trim()}
                                    >
                                        <Send fontSize="small" /> Send
                                    </button>
                                </div>
                            </form>
                        </div>
                    </>
                ) : (
                    <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'gray' }}>
                        Select a channel to start messaging
                    </div>
                )}
            </div>

            {/* Create Channel Modal */}
            <Dialog open={isCreateOpen} onClose={() => setIsCreateOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Create a Channel</DialogTitle>
                <DialogContent dividers>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                        <TextField
                            label="Channel Name"
                            fullWidth
                            value={newChannel.name}
                            onChange={(e) => setNewChannel({ ...newChannel, name: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                            helperText="Lowercase, no spaces"
                        />
                        <TextField
                            label="Description (Optional)"
                            fullWidth
                            value={newChannel.description}
                            onChange={(e) => setNewChannel({ ...newChannel, description: e.target.value })}
                        />
                        <FormControl fullWidth>
                            <InputLabel>Channel Type</InputLabel>
                            <Select
                                value={newChannel.type}
                                label="Channel Type"
                                onChange={(e) => setNewChannel({ ...newChannel, type: e.target.value })}
                            >
                                <MenuItem value="public">Public - Anyone can join</MenuItem>
                                <MenuItem value="private">Private - Invite only</MenuItem>
                            </Select>
                        </FormControl>
                        {newChannel.type === 'private' && (
                            <FormControl fullWidth>
                                <InputLabel>Add Members</InputLabel>
                                <Select
                                    multiple
                                    value={newChannel.members}
                                    onChange={(e) => setNewChannel({ ...newChannel, members: e.target.value })}
                                    renderValue={(selected) => (
                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                            {selected.map((value) => {
                                                const user = users.find(u => u._id === value);
                                                return <Chip key={value} label={user?.fullName || value} size="small" />;
                                            })}
                                        </Box>
                                    )}
                                >
                                    {users.map((u) => (
                                        <MenuItem key={u._id} value={u._id}>
                                            {u.fullName}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        )}
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                    <Button onClick={handleCreateChannel} variant="contained" disabled={!newChannel.name}>
                        Create
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
};

export default ChatPage;
