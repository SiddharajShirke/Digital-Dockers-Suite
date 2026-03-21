import { useState } from 'react';
import { Card, Form, Input, Select, Button, message, Typography, Space } from 'antd';
import { MailOutlined, SendOutlined } from '@ant-design/icons';
import emailService from '../../services/emailService';
import { useThemeMode } from '../../context/ThemeContext';

const { Title, Text } = Typography;
const { TextArea } = Input;

// Configure your n8n webhook URL here or via environment variable
const N8N_WEBHOOK_URL = import.meta.env.VITE_N8N_EMAIL_WEBHOOK_URL || 'https://rohan-2409.app.n8n.cloud/webhook/auto-send-email';

const EmailGeneratorForm = ({ onEmailSent }) => {
    const { mode } = useThemeMode();
    const isDark = mode === 'dark';
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (values) => {
        setLoading(true);

        try {
            const payload = {
                ...values,
                submittedAt: new Date().toISOString(),
                formMode: 'production'
            };

            const response = await fetch(N8N_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error('Failed to submit form');
            }

            // Log successful email to backend history
            try {
                await emailService.logSentEmail({
                    receiver: values.to,
                    subject: values.subject,
                    sentAt: payload.submittedAt
                });
                if (onEmailSent) onEmailSent();
            } catch (logError) {
                console.error('Failed to log sent email:', logError);
                // Don't block the UI success if logging fails, but maybe warn? 
                // Ensuring modularity: Main action succeeded.
            }

            message.success(`Email sent successfully to ${values.to}`);
            form.resetFields();
        } catch (error) {
            console.error('Error submitting form:', error);
            message.error('Failed to send email. Please check the receiver address or try again.');
        } finally {
            setLoading(false);
        }
    };

    const toneOptions = [
        { value: 'Casual', label: 'Casual' },
        { value: 'Professional', label: 'Professional' },
        { value: 'Formal', label: 'Formal' },
        { value: 'Friendly', label: 'Friendly' },
        { value: 'Persuasive', label: 'Persuasive' },
        { value: 'Apologetic', label: 'Apologetic' },
        { value: 'Urgent', label: 'Urgent' },
    ];

    return (
        <Card
            style={{
                borderRadius: 12,
                boxShadow: isDark
                    ? '0 6px 20px rgba(0,0,0,0.45)'
                    : '0 4px 20px rgba(0,0,0,0.08)',
                borderColor: isDark ? '#30363d' : undefined,
                background: isDark ? '#161b22' : undefined,
            }}
        >
            <Space orientation="vertical" style={{ width: '100%' }} size="large">
                <div>
                    <Title level={4} style={{
                        margin: 0,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        background: isDark
                            ? 'linear-gradient(135deg, #79c0ff, #a371f7)'
                            : 'linear-gradient(135deg, #0052CC, #6554C0)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent'
                    }}>
                        <MailOutlined style={{ color: isDark ? '#79c0ff' : '#0052CC' }} />
                        AI Email Generator
                    </Title>
                    <Text type="secondary">
                        Fill in the details and let AI generate your email
                    </Text>
                </div>

                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleSubmit}
                    requiredMark={false}
                >
                    <Form.Item
                        name="to"
                        label="Whom to send the email?"
                        rules={[
                            { required: true, message: 'Please enter recipient email' },
                            { type: 'email', message: 'Please enter a valid email' }
                        ]}
                    >
                        <Input
                            placeholder="recipient@example.com"
                            size="large"
                        />
                    </Form.Item>

                    <Form.Item
                        name="subject"
                        label="Subject of the Email?"
                        rules={[{ required: true, message: 'Please enter email subject' }]}
                    >
                        <Input
                            placeholder="e.g., Leave Request, Meeting Follow-up"
                            size="large"
                        />
                    </Form.Item>

                    <Form.Item
                        name="prompt"
                        label="Prompt to generate the email"
                        rules={[{ required: true, message: 'Please enter your prompt' }]}
                    >
                        <TextArea
                            rows={4}
                            placeholder="Describe what you want the email to say..."
                            style={{ resize: 'vertical' }}
                        />
                    </Form.Item>

                    <Form.Item
                        name="tone"
                        label="Tone of the email"
                        rules={[{ required: true, message: 'Please select email tone' }]}
                    >
                        <Select
                            placeholder="Select an option..."
                            options={toneOptions}
                            size="large"
                        />
                    </Form.Item>

                    <Form.Item style={{ marginBottom: 0 }}>
                        <Button
                            type="primary"
                            htmlType="submit"
                            loading={loading}
                            icon={<SendOutlined />}
                            size="large"
                            block
                            style={{
                                background: isDark
                                    ? 'linear-gradient(135deg, #1f6feb, #8957e5)'
                                    : 'linear-gradient(135deg, #0052CC, #6554C0)',
                                border: 'none',
                                height: 48
                            }}
                        >
                            {loading ? 'Submitting...' : 'Generate & Send Email'}
                        </Button>
                    </Form.Item>
                </Form>
            </Space>
        </Card>
    );
};

export default EmailGeneratorForm;
