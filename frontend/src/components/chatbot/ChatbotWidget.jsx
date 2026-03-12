import { useState, useEffect, useRef } from 'react';
import { Button, Input, Avatar, Spin, Space, Typography, Badge, Tooltip } from 'antd';
import {
    MessageOutlined,
    CloseOutlined,
    SendOutlined,
    RobotOutlined,
    UserOutlined,
    QuestionCircleOutlined
} from '@ant-design/icons';
import chatbotService from '../../services/chatbotService';
import { useAuth } from '../../context/AuthContext';

const { Text } = Typography;
const { TextArea } = Input;

const ChatbotWidget = () => {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [suggestions, setSuggestions] = useState([]);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Load welcome message when opened for the first time
    useEffect(() => {
        if (isOpen && messages.length === 0) {
            loadWelcome();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    const loadWelcome = async () => {
        try {
            const data = await chatbotService.getWelcome();
            setMessages([{
                type: 'bot',
                text: data.message,
                timestamp: new Date()
            }]);
            setSuggestions(data.suggestions || []);
        } catch {
            setMessages([{
                type: 'bot',
                text: "Hi! I'm DockerBot, your AI assistant. How can I help you today?",
                timestamp: new Date()
            }]);
        }
    };

    const handleSend = async (text = inputValue) => {
        if (!text.trim() || isLoading) return;

        const userMessage = {
            type: 'user',
            text: text.trim(),
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInputValue('');
        setSuggestions([]);
        setIsLoading(true);

        try {
            const response = await chatbotService.sendMessage(text.trim());
            setMessages(prev => [...prev, {
                type: 'bot',
                text: response.message,
                timestamp: new Date()
            }]);
        } catch {
            setMessages(prev => [...prev, {
                type: 'bot',
                text: "Sorry, I'm having trouble responding right now. Please try again later.",
                timestamp: new Date()
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const formatTime = (date) => {
        return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <>
            {/* Floating Button */}
            <Tooltip title="Chat with DockerBot" placement="left">
                <Button
                    type="primary"
                    shape="circle"
                    size="large"
                    icon={isOpen ? <CloseOutlined /> : <MessageOutlined />}
                    onClick={() => setIsOpen(!isOpen)}
                    style={{
                        position: 'fixed',
                        bottom: 24,
                        right: 24,
                        width: 56,
                        height: 56,
                        boxShadow: '0 4px 20px rgba(0, 82, 204, 0.4)',
                        zIndex: 1000,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'linear-gradient(135deg, #0052CC 0%, #0747A6 100%)',
                        border: 'none',
                        transition: 'transform 0.2s ease',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                />
            </Tooltip>

            {/* Chat Window */}
            {isOpen && (
                <div
                    style={{
                        position: 'fixed',
                        bottom: 96,
                        right: 24,
                        width: 380,
                        maxWidth: 'calc(100vw - 48px)',
                        height: 520,
                        maxHeight: 'calc(100vh - 140px)',
                        backgroundColor: '#fff',
                        borderRadius: 16,
                        boxShadow: '0 8px 40px rgba(0, 0, 0, 0.15)',
                        display: 'flex',
                        flexDirection: 'column',
                        zIndex: 999,
                        overflow: 'hidden',
                        animation: 'slideUp 0.3s ease-out',
                    }}
                >
                    {/* Header */}
                    <div
                        style={{
                            background: 'linear-gradient(135deg, #0052CC 0%, #0747A6 100%)',
                            padding: '16px 20px',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                        }}
                    >
                        <Avatar
                            icon={<RobotOutlined />}
                            style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
                        />
                        <div style={{ flex: 1 }}>
                            <Text strong style={{ color: '#fff', display: 'block' }}>DockerBot</Text>
                            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>
                                AI Assistant
                            </Text>
                        </div>
                        <Button
                            type="text"
                            icon={<CloseOutlined style={{ color: '#fff' }} />}
                            onClick={() => setIsOpen(false)}
                        />
                    </div>

                    {/* Messages */}
                    <div
                        style={{
                            flex: 1,
                            overflowY: 'auto',
                            padding: 16,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 12,
                            backgroundColor: '#f5f7fa',
                        }}
                    >
                        {messages.map((msg, idx) => (
                            <div
                                key={idx}
                                style={{
                                    display: 'flex',
                                    justifyContent: msg.type === 'user' ? 'flex-end' : 'flex-start',
                                    gap: 8,
                                }}
                            >
                                {msg.type === 'bot' && (
                                    <Avatar
                                        size="small"
                                        icon={<RobotOutlined />}
                                        style={{ backgroundColor: '#0052CC', flexShrink: 0 }}
                                    />
                                )}
                                <div
                                    style={{
                                        maxWidth: '80%',
                                        padding: '10px 14px',
                                        borderRadius: msg.type === 'user'
                                            ? '16px 16px 4px 16px'
                                            : '16px 16px 16px 4px',
                                        backgroundColor: msg.type === 'user' ? '#0052CC' : '#fff',
                                        color: msg.type === 'user' ? '#fff' : '#172B4D',
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                                        whiteSpace: 'pre-wrap',
                                        wordBreak: 'break-word',
                                        fontSize: 14,
                                        lineHeight: 1.5,
                                    }}
                                >
                                    {msg.text}
                                    <div style={{
                                        fontSize: 10,
                                        opacity: 0.7,
                                        marginTop: 4,
                                        textAlign: msg.type === 'user' ? 'right' : 'left'
                                    }}>
                                        {formatTime(msg.timestamp)}
                                    </div>
                                </div>
                                {msg.type === 'user' && (
                                    <Avatar
                                        size="small"
                                        style={{ backgroundColor: '#5E6C84', flexShrink: 0 }}
                                    >
                                        {user?.fullName?.[0] || <UserOutlined />}
                                    </Avatar>
                                )}
                            </div>
                        ))}

                        {isLoading && (
                            <div style={{ display: 'flex', gap: 8 }}>
                                <Avatar
                                    size="small"
                                    icon={<RobotOutlined />}
                                    style={{ backgroundColor: '#0052CC' }}
                                />
                                <div
                                    style={{
                                        padding: '12px 16px',
                                        borderRadius: '16px 16px 16px 4px',
                                        backgroundColor: '#fff',
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                                    }}
                                >
                                    <Spin size="small" />
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Suggestions */}
                    {suggestions.length > 0 && (
                        <div style={{
                            padding: '8px 16px',
                            backgroundColor: '#fff',
                            borderTop: '1px solid #f0f0f0',
                            display: 'flex',
                            gap: 8,
                            flexWrap: 'wrap'
                        }}>
                            {suggestions.map((suggestion, idx) => (
                                <Button
                                    key={idx}
                                    size="small"
                                    type="dashed"
                                    onClick={() => handleSend(suggestion)}
                                    style={{ fontSize: 12 }}
                                >
                                    {suggestion}
                                </Button>
                            ))}
                        </div>
                    )}

                    {/* Input */}
                    <div
                        style={{
                            padding: 12,
                            backgroundColor: '#fff',
                            borderTop: '1px solid #f0f0f0',
                            display: 'flex',
                            gap: 8,
                        }}
                    >
                        <TextArea
                            placeholder="Type a message..."
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyPress={handleKeyPress}
                            autoSize={{ minRows: 1, maxRows: 3 }}
                            style={{
                                resize: 'none',
                                borderRadius: 20,
                                padding: '8px 16px',
                            }}
                        />
                        <Button
                            type="primary"
                            shape="circle"
                            icon={<SendOutlined />}
                            onClick={() => handleSend()}
                            disabled={!inputValue.trim() || isLoading}
                            style={{ flexShrink: 0 }}
                        />
                    </div>
                </div>
            )}

            {/* Animations */}
            <style>{`
                @keyframes slideUp {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
            `}</style>
        </>
    );
};

export default ChatbotWidget;
