import React, { useState, useEffect } from 'react';
import { List, Button, Input, Space, Popconfirm, Avatar, Tooltip, message, Spin, Empty } from 'antd';
import { SendOutlined, DeleteOutlined, LikeOutlined } from '@ant-design/icons';
import axios from 'axios';
import moment from 'moment';

/**
 * SpaceComments Component
 * Discussion and collaboration comments within a space
 */
const SpaceComments = ({ spaceId, currentUser }) => {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadComments();
    const interval = setInterval(loadComments, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, [spaceId]);

  const loadComments = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        `/api/spaces/${spaceId}/comments`,
        { withCredentials: true }
      );
      setComments(response.data.data || []);
    } catch {
      console.error('Failed to load comments');
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) {
      message.warning('Please enter a comment');
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(
        `/api/spaces/${spaceId}/comments`,
        { text: newComment },
        { withCredentials: true }
      );

      setNewComment('');
      loadComments();
      message.success('Comment added');
    } catch {
      message.error('Failed to add comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await axios.delete(
        `/api/spaces/${spaceId}/comments/${commentId}`,
        { withCredentials: true }
      );

      loadComments();
      message.success('Comment deleted');
    } catch {
      message.error('Failed to delete comment');
    }
  };

  return (
    <div className="space-comments">
      <h4>💬 Comments</h4>

      <Spin spinning={loading}>
        {comments.length === 0 ? (
          <Empty description="No comments yet" />
        ) : (
          <List
            dataSource={comments}
            renderItem={(comment) => (
              <List.Item key={comment._id}>
                <List.Item.Meta
                  avatar={<Avatar src={comment.author.avatar}>👤</Avatar>}
                  title={
                    <Space>
                      <span>{comment.author.name}</span>
                      <Tooltip title={moment(comment.createdAt).format('YYYY-MM-DD HH:mm:ss')}>
                        <span style={{ color: '#999', fontSize: '12px' }}>
                          {moment(comment.createdAt).fromNow()}
                        </span>
                      </Tooltip>
                    </Space>
                  }
                  description={<p>{comment.text}</p>}
                />
                <Space>
                  {comment.author._id === currentUser._id && (
                    <Popconfirm
                      title="Delete comment?"
                      onConfirm={() => handleDeleteComment(comment._id)}
                    >
                      <Button type="text" size="small" danger icon={<DeleteOutlined />} aria-label="Delete comment" />
                    </Popconfirm>
                  )}
                </Space>
              </List.Item>
            )}
          />
        )}
      </Spin>

      {/* Add comment */}
      <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #f0f0f0' }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Input.TextArea
            rows={3}
            placeholder="Add a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onPressEnter={(e) => {
              if (e.ctrlKey || e.metaKey) {
                handleAddComment();
              }
            }}
          />
          <Button
            type="primary"
            icon={<SendOutlined />}
            loading={submitting}
            onClick={handleAddComment}
          >
            Comment
          </Button>
        </Space>
      </div>
    </div>
  );
};

export default SpaceComments;
