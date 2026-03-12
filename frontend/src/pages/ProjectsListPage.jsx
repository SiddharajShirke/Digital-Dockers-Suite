
import { Row, Col, Card, Typography, Button, Empty, Spin, Tag, Avatar, Space, Skeleton, Grid } from 'antd';
import { PlusOutlined, TeamOutlined, SettingOutlined, ProjectOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useProject } from '../context/ProjectContext';

const { Title, Text, Paragraph } = Typography;
const { useBreakpoint } = Grid;

const ProjectsListPage = () => {
    const navigate = useNavigate();
    const { projects, isLoading, switchProject } = useProject();
    const screens = useBreakpoint();

    const isMobile = !screens.md;


    const handleProjectClick = (project) => {
        switchProject(project._id);
        navigate('/dashboard');
    };

    const getProjectTypeColor = (type) => {
        switch (type) {
            case 'scrum': return 'blue';
            case 'kanban': return 'green';
            default: return 'default';
        }
    };

    const getProjectGradient = (index) => {
        const gradients = [
            'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
            'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
            'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
            'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
        ];
        return gradients[index % gradients.length];
    };

    if (isLoading) {
        return (
            <div style={{ maxWidth: 1200, margin: '0 auto', padding: isMobile ? '16px' : '24px' }}>
                <div style={{ marginBottom: 24 }}>
                    <Skeleton.Input active size="large" style={{ width: 200, marginBottom: 8 }} />
                    <Skeleton.Input active size="small" style={{ width: 300 }} />
                </div>
                <Row gutter={[24, 24]}>
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <Col xs={24} sm={12} lg={8} key={i}>
                            <Card style={{ height: 180 }}>
                                <Skeleton avatar active paragraph={{ rows: 2 }} />
                            </Card>
                        </Col>
                    ))}
                </Row>
            </div>
        );
    }

    return (
        <div style={{
            maxWidth: 1200,
            margin: '0 auto',
            padding: isMobile ? '16px' : '24px',
            animation: 'fadeIn 0.3s ease-out',
        }}>
            <div style={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                justifyContent: 'space-between',
                alignItems: isMobile ? 'stretch' : 'center',
                marginBottom: 24,
                gap: isMobile ? 16 : 0,
            }}>
                <div>
                    <Title level={2} style={{ margin: 0, fontSize: isMobile ? '24px' : '28px' }}>
                        Projects
                    </Title>
                    <Text type="secondary" style={{ fontSize: isMobile ? '13px' : '14px' }}>
                        View and manage all your projects
                    </Text>
                </div>
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    size={isMobile ? 'large' : 'middle'}
                    onClick={() => navigate('/dashboard')}
                    style={{
                        borderRadius: 8,
                        fontWeight: 500,
                        boxShadow: '0 2px 8px rgba(0, 82, 204, 0.25)',
                    }}
                >
                    Create Project
                </Button>
            </div>

            {projects.length === 0 ? (
                <Card style={{
                    textAlign: 'center',
                    padding: isMobile ? '32px 16px' : '48px 24px',
                    borderRadius: 12,
                    border: '2px dashed #e1e4e8',
                    background: 'linear-gradient(135deg, #f8f9fa 0%, #f0f2f5 100%)',
                }}>
                    <ProjectOutlined style={{ fontSize: 48, color: '#bfbfbf', marginBottom: 16 }} />
                    <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description={
                            <span style={{ color: '#626f86', fontSize: '14px' }}>
                                No projects yet. <br />
                                Create your first project to get started!
                            </span>
                        }
                    >
                        <Button type="primary" icon={<PlusOutlined />} size="large" style={{ marginTop: 8 }}>
                            Create Project
                        </Button>
                    </Empty>
                </Card>
            ) : (
                <Row gutter={[isMobile ? 16 : 24, isMobile ? 16 : 24]}>
                    {projects.map((project, index) => (
                        <Col xs={24} sm={12} lg={8} xl={8} key={project._id}>
                            <Card
                                hoverable
                                onClick={() => handleProjectClick(project)}
                                style={{
                                    height: '100%',
                                    borderRadius: 12,
                                    overflow: 'hidden',
                                    border: '1px solid #e1e4e8',
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                }}
                                styles={{
                                    body: { padding: isMobile ? 16 : 20 },
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-6px)';
                                    e.currentTarget.style.boxShadow = '0 12px 24px rgba(0, 0, 0, 0.12)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = 'none';
                                }}
                                actions={[
                                    <Space key="members">
                                        <TeamOutlined />
                                        <span>{project.members?.length || 0}</span>
                                    </Space>,
                                    <SettingOutlined key="settings" onClick={(e) => {
                                        e.stopPropagation();
                                        switchProject(project._id);
                                        navigate('/dashboard/settings');
                                    }} />
                                ]}
                            >
                                <Card.Meta
                                    avatar={
                                        <Avatar
                                            style={{
                                                background: getProjectGradient(index),
                                                fontSize: isMobile ? 16 : 18,
                                                width: isMobile ? 44 : 48,
                                                height: isMobile ? 44 : 48,
                                                lineHeight: isMobile ? '44px' : '48px',
                                                fontWeight: 700,
                                                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                                            }}
                                        >
                                            {project.key?.[0] || project.name?.[0]}
                                        </Avatar>
                                    }
                                    title={
                                        <div style={{
                                            display: 'flex',
                                            flexDirection: isMobile ? 'column' : 'row',
                                            alignItems: isMobile ? 'flex-start' : 'center',
                                            gap: 8,
                                        }}>
                                            <span style={{
                                                fontSize: isMobile ? '15px' : '16px',
                                                fontWeight: 600,
                                            }}>
                                                {project.name}
                                            </span>
                                            <Tag
                                                color={getProjectTypeColor(project.projectType)}
                                                style={{
                                                    margin: 0,
                                                    borderRadius: 4,
                                                    fontSize: '11px',
                                                    textTransform: 'uppercase',
                                                    fontWeight: 600,
                                                }}
                                            >
                                                {project.projectType || 'scrum'}
                                            </Tag>
                                        </div>
                                    }
                                    description={
                                        <>
                                            <Text
                                                type="secondary"
                                                strong
                                                style={{
                                                    fontSize: '12px',
                                                    color: '#0052CC',
                                                    background: 'rgba(0, 82, 204, 0.08)',
                                                    padding: '2px 6px',
                                                    borderRadius: 4,
                                                }}
                                            >
                                                {project.key}
                                            </Text>
                                            <Paragraph
                                                type="secondary"
                                                ellipsis={{ rows: 2 }}
                                                style={{ marginTop: 8, marginBottom: 0, fontSize: '13px' }}
                                            >
                                                {project.description || 'No description'}
                                            </Paragraph>
                                        </>
                                    }
                                />
                            </Card>
                        </Col>
                    ))}
                </Row>
            )}
        </div>
    );
};

export default ProjectsListPage;

