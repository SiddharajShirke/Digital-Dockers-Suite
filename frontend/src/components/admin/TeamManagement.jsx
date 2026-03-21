import { useState, useEffect, useCallback } from 'react';
import {
    Card, Table, Button, Modal, Form, Input, Select, Space, Tag, Avatar,
    Typography, message, Popconfirm, Tooltip, Empty, Spin, Badge, Drawer,
    Checkbox, Divider, Row, Col, Statistic
} from 'antd';
import {
    PlusOutlined, EditOutlined, DeleteOutlined, TeamOutlined,
    UserOutlined, ProjectOutlined, CheckCircleOutlined, UserAddOutlined,
    UserDeleteOutlined, SearchOutlined
} from '@ant-design/icons';
import teamService from '../../services/teamService';
import { useAuth } from '../../context/AuthContext';

const { Title, Text } = Typography;
const { TextArea } = Input;

const TeamManagement = () => {
    const { user } = useAuth();
    const [teams, setTeams] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    const [membersDrawerVisible, setMembersDrawerVisible] = useState(false);
    const [editingTeam, setEditingTeam] = useState(null);
    const [selectedTeam, setSelectedTeam] = useState(null);
    const [saving, setSaving] = useState(false);
    const [form] = Form.useForm();
    const [searchTerm, setSearchTerm] = useState('');

    // Check if user is admin
    const isAdmin = user?.role === 'admin';

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [teamsData, usersData] = await Promise.all([
                teamService.getTeams(),
                teamService.getAvailableUsers()
            ]);
            setTeams(teamsData);
            setUsers(usersData);
        } catch (error) {
            console.error('Failed to fetch data:', error);
            message.error('Failed to load teams');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Open create/edit modal
    const openModal = (team = null) => {
        setEditingTeam(team);
        if (team) {
            form.setFieldsValue({
                name: team.name,
                description: team.description,
                lead: team.lead?._id,
                color: team.color || '#0052CC'
            });
        } else {
            form.resetFields();
        }
        setModalVisible(true);
    };

    // Handle form submit
    const handleSubmit = async (values) => {
        setSaving(true);
        try {
            if (editingTeam) {
                await teamService.updateTeam(editingTeam._id, values);
                message.success('Team updated successfully');
            } else {
                // For new teams, add lead to members automatically
                const newTeamData = {
                    ...values,
                    members: values.lead ? [values.lead] : []
                };
                await teamService.createTeam(newTeamData);
                message.success('Team created successfully');
            }
            setModalVisible(false);
            fetchData();
        } catch (error) {
            console.error('Failed to save team:', error);
            message.error(error.response?.data?.message || 'Failed to save team');
        } finally {
            setSaving(false);
        }
    };

    // Handle delete team
    const handleDelete = async (teamId) => {
        try {
            await teamService.deleteTeam(teamId);
            message.success('Team deleted successfully');
            fetchData();
        } catch (error) {
            console.error('Failed to delete team:', error);
            message.error('Failed to delete team');
        }
    };

    // Open members drawer
    const openMembersDrawer = (team) => {
        setSelectedTeam(team);
        setMembersDrawerVisible(true);
    };

    // Handle add member
    const handleAddMember = async (userId) => {
        if (!selectedTeam) return;
        try {
            const updated = await teamService.addMembers(selectedTeam._id, [userId]);
            setSelectedTeam(updated);
            setTeams(teams.map(t => t._id === updated._id ? updated : t));
            message.success('Member added');
        } catch (error) {
            console.error('Add member error:', error);
            message.error('Failed to add member');
        }
    };

    // Handle remove member
    const handleRemoveMember = async (userId) => {
        if (!selectedTeam) return;
        // Don't allow removing the lead
        if (selectedTeam.lead?._id === userId) {
            message.warning('Cannot remove team lead');
            return;
        }
        try {
            const updated = await teamService.removeMembers(selectedTeam._id, [userId]);
            setSelectedTeam(updated);
            setTeams(teams.map(t => t._id === updated._id ? updated : t));
            message.success('Member removed');
        } catch (error) {
            console.error('Remove member error:', error);
            message.error('Failed to remove member');
        }
    };

    // Filter users not in selected team
    const availableUsers = users.filter(u =>
        !selectedTeam?.members?.some(m => m._id === u._id) &&
        u.fullName?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Table columns
    const columns = [
        {
            title: 'Team',
            dataIndex: 'name',
            key: 'name',
            render: (name, record) => (
                <Space>
                    <Avatar
                        style={{ backgroundColor: record.color || '#0052CC' }}
                        icon={<TeamOutlined />}
                    />
                    <div>
                        <Text strong>{name}</Text>
                        {record.description && (
                            <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
                                {record.description}
                            </Text>
                        )}
                    </div>
                </Space>
            )
        },
        {
            title: 'Team Lead',
            dataIndex: 'lead',
            key: 'lead',
            render: (lead) => lead ? (
                <Space>
                    <Avatar src={lead.profileInfo?.avatar} size="small">
                        {lead.fullName?.[0]}
                    </Avatar>
                    <Text>{lead.fullName}</Text>
                </Space>
            ) : <Text type="secondary">Unassigned</Text>
        },
        {
            title: 'Members',
            key: 'members',
            render: (_, record) => (
                <Badge count={record.members?.length || 0} showZero>
                    <Avatar.Group max={{ count: 3 }} size="small">
                        {record.members?.slice(0, 3).map(m => (
                            <Tooltip key={m._id} title={m.fullName}>
                                <Avatar src={m.profileInfo?.avatar} size="small">
                                    {m.fullName?.[0]}
                                </Avatar>
                            </Tooltip>
                        ))}
                    </Avatar.Group>
                </Badge>
            )
        },
        {
            title: 'Projects',
            key: 'projects',
            render: (_, record) => (
                <Tag icon={<ProjectOutlined />} color="purple">
                    {record.stats?.activeProjects || record.projects?.length || 0}
                </Tag>
            )
        },
        {
            title: 'Completion',
            key: 'completion',
            render: (_, record) => {
                const rate = record.stats?.completionRate || 0;
                return (
                    <Tag
                        icon={<CheckCircleOutlined />}
                        color={rate >= 50 ? 'green' : 'orange'}
                    >
                        {rate}%
                    </Tag>
                );
            }
        },
        {
            title: 'Status',
            key: 'status',
            render: (_, record) => (
                <Tag color={record.isActive !== false ? 'success' : 'default'}>
                    {record.isActive !== false ? 'Active' : 'Inactive'}
                </Tag>
            )
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
                <Space>
                    <Tooltip title="Manage Members">
                        <Button
                            type="text"
                            icon={<UserAddOutlined />}
                            onClick={() => openMembersDrawer(record)}
                        />
                    </Tooltip>
                    <Tooltip title="Edit Team">
                        <Button
                            type="text"
                            icon={<EditOutlined />}
                            onClick={() => openModal(record)}
                        />
                    </Tooltip>
                    <Popconfirm
                        title="Delete this team?"
                        description="This action cannot be undone."
                        onConfirm={() => handleDelete(record._id)}
                        okText="Delete"
                        okButtonProps={{ danger: true }}
                    >
                        <Button type="text" danger icon={<DeleteOutlined />} aria-label="Remove team member" />
                    </Popconfirm>
                </Space>
            )
        }
    ];

    if (!isAdmin) {
        return (
            <Card>
                <Empty
                    description="You don't have permission to manage teams. Only admins can access this page."
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
            </Card>
        );
    }

    return (
        <div style={{ padding: 24 }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                    <Title level={2} style={{
                        margin: 0,
                        background: 'linear-gradient(135deg, #0052CC, #6554C0)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent'
                    }}>
                        Team Management
                    </Title>
                    <Text type="secondary">Create, edit, and manage team members</Text>
                </div>
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => openModal()}
                    size="large"
                    style={{
                        background: 'linear-gradient(135deg, #0052CC, #6554C0)',
                        border: 'none'
                    }}
                >
                    Create Team
                </Button>
            </div>

            {/* Stats Row */}
            <Row gutter={16} style={{ marginBottom: 24 }}>
                <Col xs={24} sm={8}>
                    <Card>
                        <Statistic
                            title="Total Teams"
                            value={teams.length}
                            prefix={<TeamOutlined />}
                            styles={{ content: { color: '#0052CC' } }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={8}>
                    <Card>
                        <Statistic
                            title="Total Members"
                            value={teams.reduce((sum, t) => sum + (t.members?.length || 0), 0)}
                            prefix={<UserOutlined />}
                            styles={{ content: { color: '#6554C0' } }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={8}>
                    <Card>
                        <Statistic
                            title="Active Projects"
                            value={teams.reduce((sum, t) => sum + (t.stats?.activeProjects || t.projects?.length || 0), 0)}
                            prefix={<ProjectOutlined />}
                            styles={{ content: { color: '#00875a' } }}
                        />
                    </Card>
                </Col>
            </Row>

            {/* Teams Table */}
            <Card>
                <Table
                    columns={columns}
                    dataSource={teams}
                    rowKey="_id"
                    loading={loading}
                    pagination={{ pageSize: 10 }}
                    locale={{ emptyText: <Empty description="No teams created yet" /> }}
                />
            </Card>

            {/* Create/Edit Modal */}
            <Modal
                title={editingTeam ? 'Edit Team' : 'Create New Team'}
                open={modalVisible}
                onCancel={() => setModalVisible(false)}
                footer={null}
                width={500}
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleSubmit}
                >
                    <Form.Item
                        name="name"
                        label="Team Name"
                        rules={[{ required: true, message: 'Please enter team name' }]}
                    >
                        <Input placeholder="e.g., Engineering, Marketing" />
                    </Form.Item>

                    <Form.Item
                        name="description"
                        label="Description"
                    >
                        <TextArea rows={3} placeholder="Brief description of the team" />
                    </Form.Item>

                    <Form.Item
                        name="lead"
                        label="Team Lead"
                    >
                        <Select
                            placeholder="Select team lead"
                            showSearch
                            allowClear
                            optionFilterProp="children"
                            filterOption={(input, option) =>
                                option.children.toLowerCase().includes(input.toLowerCase())
                            }
                        >
                            {users.map(u => (
                                <Select.Option key={u._id} value={u._id}>
                                    {u.fullName} ({u.role?.replace('_', ' ')})
                                </Select.Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Form.Item
                        name="color"
                        label="Team Color"
                    >
                        <Input type="color" style={{ width: 100, height: 40 }} />
                    </Form.Item>

                    <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                        <Space>
                            <Button onClick={() => setModalVisible(false)}>Cancel</Button>
                            <Button type="primary" htmlType="submit" loading={saving}>
                                {editingTeam ? 'Update Team' : 'Create Team'}
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>

            {/* Members Drawer */}
            <Drawer
                title={
                    <Space>
                        <TeamOutlined />
                        <span>{selectedTeam?.name} - Manage Members</span>
                    </Space>
                }
                open={membersDrawerVisible}
                onClose={() => setMembersDrawerVisible(false)}
                size="large"
            >
                {selectedTeam && (
                    <>
                        {/* Current Members */}
                        <div style={{ marginBottom: 24 }}>
                            <Title level={5}>
                                <UserOutlined /> Current Members ({selectedTeam.members?.length || 0})
                            </Title>
                            <div className="members-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {(selectedTeam.members || []).map((member) => (
                                    <div 
                                        key={member._id} 
                                        style={{ 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            justifyContent: 'space-between',
                                            padding: '12px',
                                            borderBottom: '1px solid #f0f0f0'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <Avatar src={member.profileInfo?.avatar}>
                                                {member.fullName?.[0]}
                                            </Avatar>
                                            <div>
                                                <div style={{ fontWeight: 500 }}>{member.fullName}</div>
                                                <div style={{ fontSize: '12px', color: '#8c8c8c' }}>{member.role?.replace('_', ' ')}</div>
                                            </div>
                                        </div>
                                        <div>
                                            {member._id === selectedTeam.lead?._id ? (
                                                <Tag color="blue">Lead</Tag>
                                            ) : (
                                                <Button
                                                    type="text"
                                                    danger
                                                    icon={<UserDeleteOutlined />}
                                                    onClick={() => handleRemoveMember(member._id)}
                                                >
                                                    Remove
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {(!selectedTeam.members || selectedTeam.members.length === 0) && (
                                    <div style={{ textAlign: 'center', padding: '16px', color: 'rgba(0, 0, 0, 0.25)' }}>No members yet</div>
                                )}
                            </div>
                        </div>

                        <Divider />

                        {/* Add Members */}
                        <div>
                            <Title level={5}>
                                <UserAddOutlined /> Add Members
                            </Title>
                            <Input
                                placeholder="Search users..."
                                prefix={<SearchOutlined />}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{ marginBottom: 16 }}
                            />
                            <div className="available-users-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {availableUsers.slice(0, 10).map((user) => (
                                    <div 
                                        key={user._id} 
                                        style={{ 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            justifyContent: 'space-between',
                                            padding: '12px',
                                            borderBottom: '1px solid #f0f0f0'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <Avatar src={user.profileInfo?.avatar}>
                                                {user.fullName?.[0]}
                                            </Avatar>
                                            <div>
                                                <div style={{ fontWeight: 500 }}>{user.fullName}</div>
                                                <div style={{ fontSize: '12px', color: '#8c8c8c' }}>{user.role?.replace('_', ' ')}</div>
                                            </div>
                                        </div>
                                        <Button
                                            type="primary"
                                            size="small"
                                            icon={<PlusOutlined />}
                                            onClick={() => handleAddMember(user._id)}
                                        >
                                            Add
                                        </Button>
                                    </div>
                                ))}
                                {availableUsers.length === 0 && (
                                    <div style={{ textAlign: 'center', padding: '16px', color: 'rgba(0, 0, 0, 0.25)' }}>No available users</div>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </Drawer>
        </div>
    );
};

export default TeamManagement;
