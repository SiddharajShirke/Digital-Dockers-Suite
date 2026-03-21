import React, { useState, useEffect } from 'react';
import { Modal, Button, Select, Space, Popconfirm, Spin, message, Avatar, Tag } from 'antd';
import { UserAddOutlined, DeleteOutlined, LockOutlined } from '@ant-design/icons';
import axios from 'axios';

/**
 * SpaceMembers Component
 * Manage access control and member roles
 */
const SpaceMembers = ({ space, visible, onClose }) => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [addingMember, setAddingMember] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [selectedRole, setSelectedRole] = useState('EDITOR');
  const [users, setUsers] = useState([]);

  const loadMembers = React.useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        `/api/spaces/${space._id}/members`,
        { withCredentials: true }
      );
      setMembers(response.data.data || []);
    } catch {
      message.error('Failed to load members');
    } finally {
      setLoading(false);
    }
  }, [space._id]);

  const loadUsers = React.useCallback(async () => {
    try {
      const response = await axios.get(
        '/api/users',
        { withCredentials: true }
      );
      setUsers(response.data.data || []);
    } catch {
      console.error('Failed to load users');
    }
  }, []);

  useEffect(() => {
    if (visible && space?._id) {
      loadMembers();
      loadUsers();
    }
  }, [visible, space?._id, loadMembers, loadUsers]);

  const handleAddMember = React.useCallback(async () => {
    if (!selectedUserId) {
      message.warning('Please select a user');
      return;
    }

    setAddingMember(true);
    try {
      await axios.post(
        `/api/spaces/${space._id}/members`,
        { userId: selectedUserId, role: selectedRole },
        { withCredentials: true }
      );

      loadMembers();
      setSelectedUserId(null);
      setSelectedRole('EDITOR');
      message.success('Member added');
    } catch (error) {
      message.error(error.response?.data?.message || 'Failed to add member');
    } finally {
      setAddingMember(false);
    }
  }, [selectedUserId, selectedRole, space._id, loadMembers]);

  const handleUpdateRole = React.useCallback(async (memberId, newRole) => {
    try {
      await axios.patch(
        `/api/spaces/${space._id}/members/${memberId}`,
        { role: newRole },
        { withCredentials: true }
      );

      loadMembers();
      message.success('Role updated');
    } catch {
      message.error('Failed to update role');
    }
  }, [space._id, loadMembers]);

  const handleRemoveMember = React.useCallback(async (memberId) => {
    try {
      await axios.delete(
        `/api/spaces/${space._id}/members/${memberId}`,
        { withCredentials: true }
      );

      loadMembers();
      message.success('Member removed');
    } catch {
      message.error('Failed to remove member');
    }
  }, [space._id, loadMembers]);

  const roleColors = { OWNER: 'red', EDITOR: 'blue', COMMENTER: 'gold', VIEWER: 'default' };

  return (
    <Modal
      title={`👥 Space Members - ${space.title}`}
      open={visible}
      onCancel={onClose}
      width={500}
      footer={null}
    >
      <Spin spinning={loading}>
        {/* Add member */}
        <div style={{ marginBottom: 24, padding: '16px', backgroundColor: '#fafafa', borderRadius: '4px' }}>
          <h4>Add Member</h4>
          <Space style={{ width: '100%' }}>
            <Select
              placeholder="Select user"
              value={selectedUserId}
              onChange={setSelectedUserId}
              style={{ flex: 1 }}
              options={users
                .filter(u => !members.some(m => m.user.id === u._id))
                .map(u => ({
                  label: u.name,
                  value: u._id
                }))}
            />
            <Select
              value={selectedRole}
              onChange={setSelectedRole}
              options={[
                { label: 'Owner', value: 'OWNER' },
                { label: 'Editor', value: 'EDITOR' },
                { label: 'Commenter', value: 'COMMENTER' },
                { label: 'Viewer', value: 'VIEWER' }
              ]}
            />
            <Button
              type="primary"
              icon={<UserAddOutlined />}
              onClick={handleAddMember}
              loading={addingMember}
            >
              Add
            </Button>
          </Space>
        </div>

        {/* Members list */}
        <div className="members-list">
          {members.map((member) => (
            <div
              key={member.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 0',
                borderBottom: '1px solid #f0f0f0'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Avatar src={member.user.avatar} icon="👤" />
                <div>
                  <div style={{ fontWeight: 500 }}>{member.user.name}</div>
                  <Space size="small">
                    <Tag color={roleColors[member.role]}>
                      {member.role === 'OWNER' && <LockOutlined />}
                      {member.role}
                    </Tag>
                    <span style={{ fontSize: 12, color: '#999' }}>{member.contributionCount} edits</span>
                  </Space>
                </div>
              </div>
              <Space>
                <Select
                  value={member.role}
                  onChange={(value) => handleUpdateRole(member.id, value)}
                  options={[
                    { label: 'Owner', value: 'OWNER' },
                    { label: 'Editor', value: 'EDITOR' },
                    { label: 'Commenter', value: 'COMMENTER' },
                    { label: 'Viewer', value: 'VIEWER' }
                  ]}
                  style={{ width: '100px' }}
                  size="small"
                />
                {member.role !== 'OWNER' && (
                  <Popconfirm
                    title="Remove member?"
                    onConfirm={() => handleRemoveMember(member.id)}
                  >
                    <Button danger icon={<DeleteOutlined />} type="text" size="small" aria-label="Remove member" />
                  </Popconfirm>
                )}
              </Space>
            </div>
          ))}
        </div>
      </Spin>
    </Modal>
  );
};

export default SpaceMembers;
