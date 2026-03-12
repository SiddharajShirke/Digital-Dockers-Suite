import React, { useState, useEffect } from 'react';
import { Tabs, Spin, message } from 'antd';
import axios from 'axios';
import './SpaceEditor.css';
import NotesEditor from './editors/NotesEditor';
import WhiteboardEditor from './editors/WhiteboardEditor';
import MindMapEditor from './editors/MindMapEditor';
import SpaceComments from './SpaceComments';
import useSpaceWebSocket from '../../hooks/useSpaceWebSocket';

/**
 * SpaceEditor Component
 * Main editor with tabs for Notes, Whiteboard, and Mind Map
 */
const SpaceEditor = ({ space, currentUser }) => {
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('notes');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);

  // Initialize WebSocket connection
  const {
    isConnected,
    activeUsers,
    cursors,
    typingUsers,
    sendUpdate
  } = useSpaceWebSocket(space._id, currentUser._id);

  useEffect(() => {
    loadContent();
  }, [space._id]);

  // Autosave every 30 seconds
  useEffect(() => {
    if (!content) return;

    const autoSaveInterval = setInterval(() => {
      handleAutosave();
    }, 30000);

    return () => clearInterval(autoSaveInterval);
  }, [content, space._id]);

  const loadContent = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        `/api/spaces/${space._id}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );

      setContent(response.data.data.content);
    } catch (error) {
      message.error('Failed to load space content');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAutosave = async () => {
    if (!content) return;

    try {
      await axios.post(
        `/api/spaces/${space._id}/autosave`,
        {
          contentJson: content.contentJson,
          textContent: content.textContent,
          drawingData: content.drawingData,
          mindmapData: content.mindmapData
        },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );

      setLastSaved(new Date());

      // Broadcast update to other users
      sendUpdate({
        contentType: content.contentType,
        contentJson: content.contentJson,
        textContent: content.textContent,
        drawingData: content.drawingData,
        mindmapData: content.mindmapData,
        isAutoSave: true
      });
    } catch (error) {
      console.error('Autosave failed:', error);
    }
  };

  const handleSaveExplicitly = async (updatedContent, editSummary) => {
    setIsSaving(true);
    try {
      const response = await axios.patch(
        `/api/spaces/${space._id}/content`,
        {
          contentType: updatedContent.contentType,
          contentJson: updatedContent.contentJson,
          textContent: updatedContent.textContent,
          drawingData: updatedContent.drawingData,
          mindmapData: updatedContent.mindmapData,
          editSummary,
          isMajorVersion: true
        },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );

      setContent(response.data.data);
      setLastSaved(new Date());
      message.success('Changes saved');

      // Broadcast to other users
      sendUpdate({
        ...updatedContent,
        isMajorVersion: true,
        editSummary
      });
    } catch (error) {
      message.error('Failed to save changes');
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return <Spin size="large" style={{ display: 'flex', justifyContent: 'center', marginTop: 100 }} />;

  const editorProps = {
    content,
    setContent,
    onSave: handleSaveExplicitly,
    isConnected,
    activeUsers,
    cursors,
    typingUsers,
    currentUser,
    isSaving
  };

  return (
    <div className="space-editor">
      <div className="editor-toolbar">
        <div className="toolbar-left">
          <h3>{space.title}</h3>
          {isConnected && (
            <span className="connection-status">🟢 Live ({activeUsers.length} user{activeUsers.length !== 1 ? 's' : ''})</span>
          )}
          {!isConnected && (
            <span className="connection-status">⚪ Offline</span>
          )}
        </div>
        <div className="toolbar-right">
          {lastSaved && (
            <span className="last-saved">Last saved: {lastSaved.toLocaleTimeString()}</span>
          )}
        </div>
      </div>

      <div className="editor-main">
        <div className="editor-content">
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={[
              {
                key: 'notes',
                label: '📝 Notes',
                children: <NotesEditor {...editorProps} />
              },
              {
                key: 'whiteboard',
                label: '✏️ Whiteboard',
                children: <WhiteboardEditor {...editorProps} />
              },
              {
                key: 'mindmap',
                label: '🧠 Mind Map',
                children: <MindMapEditor {...editorProps} />
              }
            ]}
          />
        </div>

        {/* Comments sidebar */}
        <div className="editor-sidebar">
          <SpaceComments
            spaceId={space._id}
            currentUser={currentUser}
          />
        </div>
      </div>
    </div>
  );
};

export default SpaceEditor;
