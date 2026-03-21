import React, { useState, useEffect } from 'react';
import { Button, Input, Space, Popconfirm, Avatar, Tooltip, message, Spin, Empty } from 'antd';
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

  const loadComments = React.useCallback(async () => {
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
  }, [spaceId]);

  useEffect(() => {
    loadComments();
    const interval = setInterval(loadComments, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, [loadComments]);

  const handleAddComment = React.useCallback(async () => {
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
  }, [newComment, spaceId, loadComments]);

  const handleDeleteComment = React.useCallback(async (commentId) => {
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
  }, [spaceId, loadComments]);

  return (
    <div className="space-comments">
      <h4>💬 Comments</h4>

      <Spin spinning={loading}>
        {comments.length === 0 ? (
          <Empty description="No comments yet" />
        ) : (
          <div className="comments-list">
            {comments.map((comment) => (
              <div
                key={comment._id}
                style={{
                  display: 'flex',
                  gap: 12,
                  marginBottom: 16,
                  padding: '8px 0',
                  borderBottom: '1px solid #f5f5f5'
                }}
              >
                <Avatar src={comment.author.avatar} style={{ flexShrink: 0 }}>👤</Avatar>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <Space size="small">
                        <span style={{ fontWeight: 500 }}>{comment.author.name}</span>
                        <Tooltip title={moment(comment.createdAt).format('YYYY-MM-DD HH:mm:ss')}>
                          <span style={{ color: '#999', fontSize: '11px' }}>
                            {moment(comment.createdAt).fromNow()}
                          </span>
                        </Tooltip>
                      </Space>
                      <div style={{ marginTop: 4, color: '#262626', fontSize: 13, whiteSpace: 'pre-wrap' }}>
                        {comment.text}
                      </div>
                    </div>
                    {comment.author._id === currentUser._id && (
                      <Popconfirm
                        title="Delete comment?"
                        onConfirm={() => handleDeleteComment(comment._id)}
                      >
                        <Button type="text" size="small" danger icon={<DeleteOutlined />} aria-label="Delete comment" />
                      </Popconfirm>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Spin>

      {/* Add comment */}
      <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #f0f0f0' }}>
        <Space orientation="vertical" style={{ width: '100%' }}>
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
