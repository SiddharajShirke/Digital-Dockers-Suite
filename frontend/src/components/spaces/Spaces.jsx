import React, { useState, useEffect } from 'react';
import { Tabs, Button, Card, Row, Col, Space, Modal, Form, Input, Select, Popconfirm, Tooltip, Empty, Spin, message } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, TeamOutlined, HistoryOutlined } from '@ant-design/icons';
import axios from 'axios';
import { useProject } from '../../context/ProjectContext';
import { useAuth } from '../../context/AuthContext';
import './Spaces.css';
import SpaceEditor from './SpaceEditor';
import SpaceMembers from './SpaceMembers';

/**
 * Spaces Component
 * Main hub for collaborative note-taking, drawing, and mind mapping
 */
const Spaces = () => {
  const { currentProject } = useProject();
  const { user } = useAuth();
  const projectId = currentProject?._id;
  const currentUser = user;
  
  const [spaces, setSpaces] = useState([]);
  const [selectedSpace, setSelectedSpace] = useState(null);
  const [activeTab, setActiveTab] = useState('list');
  const [loading, setLoading] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [membersModalVisible, setMembersModalVisible] = useState(false);
  const [form] = Form.useForm();

  // Load spaces on mount
  useEffect(() => {
    loadSpaces();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const loadSpaces = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        `/api/spaces/project/${projectId}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      setSpaces(response.data.data || []);
    } catch (error) {
      message.error('Failed to load spaces');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSpace = async (values) => {
    if (!projectId) {
      message.error('Please select a project first');
      return;
    }
    
    if (!currentUser) {
      message.error('Please log in first');
      return;
    }

    try {
      const response = await axios.post(
        '/api/spaces',
        {
          projectId,
          ...values
        },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      
      setSpaces([response.data.data, ...spaces]);
      setCreateModalVisible(false);
      form.resetFields();
      message.success('Space created successfully');
    } catch (error) {
      console.error('Create space error:', error);
      message.error(error.response?.data?.message || 'Failed to create space');
    }
  };

  const handleDeleteSpace = async (spaceId) => {
    try {
      await axios.delete(
        `/api/spaces/${spaceId}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      
      setSpaces(spaces.filter(s => s._id !== spaceId));
      if (selectedSpace?._id === spaceId) {
        setSelectedSpace(null);
        setActiveTab('list');
      }
      message.success('Space archived successfully');
    } catch (error) {
      message.error(error.response?.data?.message || 'Failed to archive space');
    }
  };

  // Render list view
  const renderListView = () => {
    if (loading) return <Spin />;
    if (spaces.length === 0) {
      return (
        <Empty
          description="No spaces yet"
          style={{ marginTop: 48 }}
          extra={
            <Button type="primary" onClick={() => setCreateModalVisible(true)}>
              Create First Space
            </Button>
          }
        />
      );
    }

    return (
      <Row gutter={[16, 16]}>
        {spaces.map(space => (
          <Col xs={24} sm={12} lg={8} key={space._id}>
            <Card
              hoverable
              className="space-card"
              onClick={() => {
                setSelectedSpace(space);
                setActiveTab('editor');
              }}
            >
              <div className="space-card-header">
                <h3>{space.title}</h3>
                <Space size="small">
                  <Tooltip title="Members">
                    <Button
                      type="text"
                      size="small"
                      icon={<TeamOutlined />}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedSpace(space);
                        setMembersModalVisible(true);
                      }}
                    >
                      {space.contributorCount || 0}
                    </Button>
                  </Tooltip>
                  <Popconfirm
                    title="Archive Space?"
                    description="This space will be archived but can be recovered"
                    onConfirm={(e) => {
                      e.stopPropagation();
                      handleDeleteSpace(space._id);
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button type="text" danger size="small" icon={<DeleteOutlined />} />
                  </Popconfirm>
                </Space>
              </div>
              
              {space.description && (
                <p className="space-description">{space.description}</p>
              )}
              
              <div className="space-meta">
                <span>📝 {space.defaultContentType}</span>
                <span>✏️ v{space.versionCount || 1}</span>
                <span>👥 {space.members?.length || 1}</span>
              </div>
            </Card>
          </Col>
        ))}
      </Row>
    );
  };

  return (
    <div className="spaces-container">
      <div className="spaces-header">
        <h2>📝 Shared Spaces</h2>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setCreateModalVisible(true)}
        >
          New Space
        </Button>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'list',
            label: 'All Spaces',
            children: renderListView()
          },
          ...(selectedSpace ? [
            {
              key: 'editor',
              label: `✏️ ${selectedSpace.title}`,
              children: (
                <SpaceEditor
                  space={selectedSpace}
                  currentUser={currentUser}
                  onUpdate={(updated) => {
                    setSelectedSpace(updated);
                    setSpaces(spaces.map(s => s._id === updated._id ? updated : s));
                  }}
                />
              )
            }
          ] : [])
        ]}
      />

      {/* Create Space Modal */}
      <Modal
        title="Create New Space"
        open={createModalVisible}
        onOk={() => form.submit()}
        onCancel={() => {
          setCreateModalVisible(false);
          form.resetFields();
        }}
      >
        {!projectId && (
          <div style={{ color: 'red', marginBottom: 16 }}>
            ⚠️ No project selected. Please select a project from the dashboard first.
          </div>
        )}
        <Form form={form} layout="vertical" onFinish={handleCreateSpace}>
          <Form.Item
            name="title"
            label="Space Title"
            rules={[{ required: true, message: 'Please enter space title' }]}
          >
            <Input placeholder="e.g., Project Sprint Notes" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Description (Optional)"
          >
            <Input.TextArea rows={3} placeholder="What is this space for?" />
          </Form.Item>

          <Form.Item
            name="defaultContentType"
            label="Default Content Type"
            initialValue="TEXT"
          >
            <Select>
              <Select.Option value="TEXT">📝 Notes (Rich Text)</Select.Option>
              <Select.Option value="WHITEBOARD">✏️ Whiteboard (Drawing)</Select.Option>
              <Select.Option value="MINDMAP">🧠 Mind Map (Nodes & Connections)</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* Members Modal */}
      {selectedSpace && (
        <SpaceMembers
          space={selectedSpace}
          visible={membersModalVisible}
          onClose={() => setMembersModalVisible(false)}
          onUpdate={(updated) => {
            setSelectedSpace(updated);
            setSpaces(spaces.map(s => s._id === updated._id ? updated : s));
          }}
        />
      )}
    </div>
  );
};

export default Spaces;
