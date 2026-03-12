import React, { useState, useEffect } from 'react';
import { Button, Space, Divider, Tooltip } from 'antd';
import { SaveOutlined, BoldOutlined, ItalicOutlined, UnorderedListOutlined, OrderedListOutlined, StrikethroughOutlined, FileMarkdownOutlined } from '@ant-design/icons';
import { Heading2, Quote, Code } from 'lucide-react';
import './NotesEditor.css';

/**
 * Notes Editor Component
 * Rich text editor for collaborative note-taking
 */
const NotesEditor = ({
  content,
  onSave,
  isConnected,
  activeUsers,
  typingUsers,
  isSaving
}) => {
  const [text, setText] = useState(content?.textContent || '');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setText(content?.textContent || '');
  }, [content]);

  const handleChange = (e) => {
    setText(e.target.value);
    setIsEditing(true);
  };

  const handleSave = async () => {
    const updated = {
      ...content,
      textContent: text,
      contentType: 'TEXT'
    };

    await onSave(updated, `Updated notes`);
    setIsEditing(false);
  };

  const insertMarkdown = (before, after = '') => {
    const textarea = document.querySelector('.notes-editor textarea');
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = text.substring(start, end);
    const newText = text.substring(0, start) + before + selectedText + after + text.substring(end);

    setText(newText);
    setIsEditing(true);

    // Move cursor
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = start + before.length;
      textarea.selectionEnd = start + before.length + selectedText.length;
    }, 0);
  };

  const formatters = [
    {
      icon: <BoldOutlined />,
      title: 'Bold',
      action: () => insertMarkdown('**', '**'),
      shortcut: 'Ctrl+B'
    },
    {
      icon: <ItalicOutlined />,
      title: 'Italic',
      action: () => insertMarkdown('_', '_'),
      shortcut: 'Ctrl+I'
    },
    {
      icon: <StrikethroughOutlined />,
      title: 'Strikethrough',
      action: () => insertMarkdown('~~', '~~'),
      shortcut: 'Ctrl+Shift+X'
    },
    {
      icon: <Heading2 size={16} />,
      title: 'Heading',
      action: () => insertMarkdown('\n## ', '\n'),
      shortcut: 'Ctrl+Alt+1'
    },
    {
      icon: <UnorderedListOutlined />,
      title: 'Bullet List',
      action: () => insertMarkdown('\n- ', ''),
      shortcut: 'Ctrl+Shift+9'
    },
    {
      icon: <OrderedListOutlined />,
      title: 'Numbered List',
      action: () => insertMarkdown('\n1. ', ''),
      shortcut: 'Ctrl+Shift+0'
    },
    {
      icon: <Quote size={16} />,
      title: 'Quote',
      action: () => insertMarkdown('\n> ', '\n'),
      shortcut: 'Ctrl+Shift+B'
    },
    {
      icon: <Code size={16} />,
      title: 'Code Block',
      action: () => insertMarkdown('```\n', '\n```'),
      shortcut: 'Ctrl+Alt+C'
    }
  ];

  return (
    <div className="notes-editor-container">
      {/* Header with title */}
      <div className="notes-header">
        <div className="notes-header-left">
          <FileMarkdownOutlined className="notes-header-icon" />
          <h2 className="notes-title">Notes</h2>
        </div>
        <div className="notes-header-right">
          {isConnected && activeUsers && (
            <div className="active-users">
              <span className="user-dot"></span>
              <span className="user-count">{activeUsers.length} editing</span>
            </div>
          )}
        </div>
      </div>

      {/* Formatting toolbar - Notion style */}
      <div className="notes-toolbar">
        <div className="toolbar-group">
          {formatters.map((formatter, idx) => (
            <Tooltip key={idx} title={`${formatter.title} (${formatter.shortcut})`} placement="bottom">
              <button
                className="toolbar-btn"
                onClick={formatter.action}
                title={formatter.title}
              >
                {formatter.icon}
              </button>
            </Tooltip>
          ))}
        </div>

        <div className="toolbar-divider"></div>

        <Button
          type="primary"
          icon={<SaveOutlined />}
          loading={isSaving}
          disabled={!isEditing || !isConnected}
          onClick={handleSave}
          className="save-btn"
        >
          {isSaving ? 'Saving...' : 'Save'}
        </Button>
      </div>

      {/* Main editor textarea */}
      <textarea
        className="notes-editor"
        value={text}
        onChange={handleChange}
        placeholder="# Start typing...\n\nUse markdown formatting to style your notes. Type / for more options."
        spellCheck="true"
      />

      {/* Footer with stats */}
      <div className="notes-footer">
        <div className="notes-stats">
          <span className="stat-item">
            <span className="stat-label">Characters:</span>
            <span className="stat-value">{text.length.toLocaleString()}</span>
          </span>
          <span className="stat-divider">•</span>
          <span className="stat-item">
            <span className="stat-label">Words:</span>
            <span className="stat-value">{text.trim().split(/\s+/).filter(w => w).length}</span>
          </span>
          <span className="stat-divider">•</span>
          <span className="stat-item">
            <span className="stat-label">Lines:</span>
            <span className="stat-value">{text.split('\n').length}</span>
          </span>
        </div>

        <div className="notes-status">
          {isEditing && <span className="unsaved-indicator">● Unsaved changes</span>}
          {!isConnected && <span className="offline-indicator">🔌 Offline</span>}
        </div>
      </div>

      {/* Typing indicators */}
      {typingUsers && typingUsers.size > 0 && (
        <div className="typing-indicator">
          <span className="typing-user">
            {Array.from(typingUsers).slice(0, 2).join(', ')} {typingUsers.size > 1 ? 'are' : 'is'} typing...
          </span>
          <span className="typing-dots">
            <span></span>
            <span></span>
            <span></span>
          </span>
        </div>
      )}
    </div>
  );
};

export default NotesEditor;
