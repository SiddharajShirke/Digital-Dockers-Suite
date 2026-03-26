import { useState } from 'react';
import { Typography, Row, Col, Card, Form, Input, Button, Space, message, Spin, Result, Progress } from 'antd';
import { FilePptOutlined, DownloadOutlined, ReloadOutlined, CheckCircleOutlined } from '@ant-design/icons';
import axios from 'axios';

const { Title, Text } = Typography;
const { TextArea } = Input;

// Backend API URL for PPT generation
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5002';

const PPTGeneratorPage = () => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [progressText, setProgressText] = useState('');
    const [downloadSuccess, setDownloadSuccess] = useState(false);
    const [lastDownloadedFile, setLastDownloadedFile] = useState('');

    const handleGenerate = async (values) => {
        setLoading(true);
        setProgress(0);
        setProgressText('Sending request...');
        setDownloadSuccess(false);

        try {
            // Progress simulation (since we can't track actual progress)
            const progressInterval = setInterval(() => {
                setProgress(prev => {
                    if (prev < 20) {
                        setProgressText('Generating HTML with AI...');
                        return prev + 2;
                    } else if (prev < 50) {
                        setProgressText('Rendering slides...');
                        return prev + 1;
                    } else if (prev < 80) {
                        setProgressText('Creating PowerPoint file...');
                        return prev + 0.5;
                    } else if (prev < 95) {
                        setProgressText('Finalizing...');
                        return prev + 0.2;
                    }
                    return prev;
                });
            }, 500);

            // Call backend API with blob response type
            const response = await axios.post(
                `${API_BASE_URL}/api/ppt/generate`,
                {
                    topic: values.topic,
                    targetAudience: values.targetAudience,
                    keyPoints: values.keyPoints,
                    colorScheme: values.colorScheme
                },
                {
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    withCredentials: true,
                    responseType: 'blob',
                    timeout: 180000 // 3 minute timeout
                }
            );

            clearInterval(progressInterval);
            setProgress(100);
            setProgressText('Download complete!');

            // Create download link from blob
            const filename = `${values.topic.replace(/[^a-zA-Z0-9]/g, '_')}_presentation.pptx`;
            const url = window.URL.createObjectURL(new Blob([response.data], {
                type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
            }));

            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();

            // Cleanup
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            setDownloadSuccess(true);
            setLastDownloadedFile(filename);
            message.success('Presentation downloaded successfully!');

        } catch (error) {
            console.error('Error generating PPT:', error);

            let errorMessage = 'Failed to generate presentation. Please try again.';

            if (error.response) {
                // Try to parse error from blob response
                if (error.response.data instanceof Blob) {
                    try {
                        const text = await error.response.data.text();
                        const errorData = JSON.parse(text);
                        errorMessage = errorData.message || errorMessage;
                    } catch {
                        // Ignore parsing errors
                    }
                } else if (error.response.data?.message) {
                    errorMessage = error.response.data.message;
                }
            } else if (error.code === 'ECONNABORTED') {
                errorMessage = 'Request timed out. The presentation may be too complex.';
            }

            message.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        setDownloadSuccess(false);
        setProgress(0);
        setProgressText('');
        setLastDownloadedFile('');
        form.resetFields();
    };

    return (
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            {/* Header */}
            <div style={{ marginBottom: 32 }}>
                <Title level={2} style={{
                    margin: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12
                }}>
                    <span style={{
                        display: 'flex',
                        padding: 8,
                        background: 'rgba(255, 122, 0, 0.1)',
                        borderRadius: 8,
                        color: '#FF7A00'
                    }}>
                        <FilePptOutlined />
                    </span>
                    AI PowerPoint Generator
                </Title>
                <Text type="secondary" style={{ fontSize: 16, marginTop: 8, display: 'block' }}>
                    Generate professional PowerPoint presentations instantly using AI.
                    Your presentation will download as an editable .pptx file.
                </Text>
            </div>

            <Row gutter={[24, 24]}>
                {/* Left Column - Form */}
                <Col xs={24} lg={12}>
                    <Card
                        style={{
                            borderRadius: 12,
                            boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
                        }}
                    >
                        <Space orientation="vertical" style={{ width: '100%' }} size="large">
                            <div>
                                <Title level={4} style={{
                                    margin: 0,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    background: 'linear-gradient(135deg, #FF7A00, #FF4D4F)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent'
                                }}>
                                    <FilePptOutlined style={{ color: '#FF7A00' }} />
                                    Presentation Details
                                </Title>
                                <Text type="secondary">
                                    Fill in the details to generate your PowerPoint presentation
                                </Text>
                            </div>

                            <Form
                                form={form}
                                layout="vertical"
                                onFinish={handleGenerate}
                                requiredMark={false}
                                disabled={loading}
                            >
                                <Form.Item
                                    name="topic"
                                    label="Topic"
                                    rules={[{ required: true, message: 'Please enter the presentation topic' }]}
                                >
                                    <Input
                                        placeholder="e.g., AI in Healthcare"
                                        size="large"
                                    />
                                </Form.Item>

                                <Form.Item
                                    name="targetAudience"
                                    label="Target Audience"
                                    rules={[{ required: true, message: 'Please enter the target audience' }]}
                                >
                                    <Input
                                        placeholder="e.g., Doctors, Engineers, Students"
                                        size="large"
                                    />
                                </Form.Item>

                                <Form.Item
                                    name="keyPoints"
                                    label="Key Points to Cover"
                                    rules={[{ required: true, message: 'Please enter key points to cover' }]}
                                >
                                    <TextArea
                                        rows={4}
                                        placeholder="Enter the main points you want to cover in your presentation..."
                                        style={{ resize: 'vertical' }}
                                    />
                                </Form.Item>

                                <Form.Item
                                    name="colorScheme"
                                    label="Preferred Color Scheme"
                                    rules={[{ required: true, message: 'Please enter preferred color scheme' }]}
                                >
                                    <Input
                                        placeholder="e.g., Black and Blue, Professional Dark, Warm Orange"
                                        size="large"
                                    />
                                </Form.Item>

                                <Form.Item style={{ marginBottom: 0 }}>
                                    <Button
                                        type="primary"
                                        htmlType="submit"
                                        loading={loading}
                                        icon={<DownloadOutlined />}
                                        size="large"
                                        block
                                        style={{
                                            background: 'linear-gradient(135deg, #FF7A00, #FF4D4F)',
                                            border: 'none',
                                            height: 48
                                        }}
                                    >
                                        {loading ? 'Generating...' : 'Generate & Download PPTX'}
                                    </Button>
                                </Form.Item>
                            </Form>
                        </Space>
                    </Card>
                </Col>

                {/* Right Column - Progress / Success */}
                <Col xs={24} lg={12}>
                    <Card
                        style={{
                            borderRadius: 12,
                            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                            minHeight: 400,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                        styles={{
                            body: {
                                width: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: 40
                            }
                        }}
                    >
                        {loading ? (
                            <div style={{ textAlign: 'center', width: '100%' }}>
                                <Spin size="large" />
                                <div style={{ marginTop: 24 }}>
                                    <Progress
                                        percent={Math.round(progress)}
                                        status="active"
                                        strokeColor={{
                                            '0%': '#FF7A00',
                                            '100%': '#FF4D4F',
                                        }}
                                    />
                                    <Text style={{ display: 'block', marginTop: 12 }}>
                                        {progressText}
                                    </Text>
                                    <Text type="secondary" style={{ display: 'block', marginTop: 8, fontSize: 12 }}>
                                        This may take 30-60 seconds depending on complexity
                                    </Text>
                                </div>
                            </div>
                        ) : downloadSuccess ? (
                            <Result
                                icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                                title="Presentation Downloaded!"
                                subTitle={
                                    <div>
                                        <p>Your file <strong>{lastDownloadedFile}</strong> has been downloaded.</p>
                                        <p style={{ fontSize: 12, color: '#888' }}>
                                            Open it in Microsoft PowerPoint or Google Slides to edit.
                                        </p>
                                    </div>
                                }
                                extra={[
                                    <Button
                                        key="new"
                                        type="primary"
                                        icon={<ReloadOutlined />}
                                        onClick={handleReset}
                                        style={{
                                            background: 'linear-gradient(135deg, #FF7A00, #FF4D4F)',
                                            border: 'none'
                                        }}
                                    >
                                        Create Another
                                    </Button>
                                ]}
                            />
                        ) : (
                            <div style={{
                                textAlign: 'center',
                                color: '#666'
                            }}>
                                <FilePptOutlined style={{ fontSize: 64, opacity: 0.3, marginBottom: 16 }} />
                                <Title level={4} style={{ margin: 0, color: '#888' }}>
                                    Ready to Generate
                                </Title>
                                <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
                                    Fill in the form and click "Generate & Download PPTX"
                                </Text>
                                <div style={{
                                    marginTop: 24,
                                    padding: 16,
                                    background: 'rgba(255, 122, 0, 0.05)',
                                    borderRadius: 8,
                                    textAlign: 'left'
                                }}>
                                    <Text strong style={{ color: '#FF7A00' }}>How it works:</Text>
                                    <ol style={{ marginTop: 8, paddingLeft: 20, color: '#666' }}>
                                        <li>AI generates professional slide content</li>
                                        <li>Each slide is rendered with custom styling</li>
                                        <li>Slides are compiled into a .pptx file</li>
                                        <li>File downloads automatically to your device</li>
                                    </ol>
                                </div>
                            </div>
                        )}
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default PPTGeneratorPage;
