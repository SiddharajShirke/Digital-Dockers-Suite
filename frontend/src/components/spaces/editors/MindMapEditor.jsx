import React, { useState } from 'react';
import { Button, Space, Input, Divider, message, Tooltip, Tag } from 'antd';
import { SaveOutlined, PlusOutlined, DeleteOutlined, ArrowRightOutlined, ZoomInOutlined, ZoomOutOutlined } from '@ant-design/icons';
import { Lightbulb, Zap, Sparkles } from 'lucide-react';
import './MindMapEditor.css';

/**
 * Mind Map Editor Component
 * Create and edit mind maps collaboratively
 * Uses hierarchical node structure
 */
const MindMapEditor = ({
  content,
  onSave,
  isConnected,
  activeUsers,
  isSaving
}) => {
  const [nodes, setNodes] = useState(content?.mindmapData?.nodes || [
    { id: 'root', label: 'Main Topic', x: 400, y: 200, children: [] }
  ]);
  const [edges, setEdges] = useState(content?.mindmapData?.edges || []);
  const [selectedNodeId, setSelectedNodeId] = useState('root');
  const [newNodeLabel, setNewNodeLabel] = useState('');
  const [zoom, setZoom] = useState(1);
  const [hoveredNodeId, setHoveredNodeId] = useState(null);

  const getNode = (id) => nodes.find(n => n.id === id);
  const selectedNode = getNode(selectedNodeId);

  const handleAddNode = () => {
    if (!newNodeLabel.trim()) {
      message.warning('Please enter a node label');
      return;
    }

    const parentNode = getNode(selectedNodeId);
    if (!parentNode) return;

    const newNodeId = `node-${Date.now()}`;
    const newNode = {
      id: newNodeId,
      label: newNodeLabel,
      x: parentNode.x + 150,
      y: parentNode.y + 50,
      children: []
    };

    // Update parent to include child
    const updatedParent = {
      ...parentNode,
      children: [...(parentNode.children || []), newNodeId]
    };

    // Create edge
    const newEdge = {
      id: `edge-${parentNode.id}-${newNodeId}`,
      from: parentNode.id,
      to: newNodeId
    };

    setNodes([
      ...nodes.map(n => n.id === parentNode.id ? updatedParent : n),
      newNode
    ]);
    setEdges([...edges, newEdge]);
    setNewNodeLabel('');
    setSelectedNodeId(newNodeId);
  };

  const handleDeleteNode = (nodeId) => {
    if (nodeId === 'root') {
      message.error('Cannot delete root node');
      return;
    }

    // Find parent
    const parentNode = nodes.find(n => n.children?.includes(nodeId));
    if (!parentNode) return;

    // Update parent
    const updatedParent = {
      ...parentNode,
      children: parentNode.children.filter(id => id !== nodeId)
    };

    // Remove node and its edges
    const newNodes = nodes.filter(n => n.id !== nodeId).map(n => n.id === parentNode.id ? updatedParent : n);
    const newEdges = edges.filter(e => e.from !== nodeId && e.to !== nodeId);

    setNodes(newNodes);
    setEdges(newEdges);
    setSelectedNodeId('root');
  };

  const handleUpdateNodeLabel = (label) => {
    if (!selectedNode) return;

    setNodes(nodes.map(n =>
      n.id === selectedNode.id ? { ...n, label } : n
    ));
  };

  const handleSave = async () => {
    const updated = {
      ...content,
      mindmapData: {
        nodes,
        edges
      },
      contentType: 'MINDMAP'
    };

    await onSave(updated, 'Updated mind map');
  };

  const renderMindMap = () => {
    return (
      <svg className="mindmap-canvas" width="100%" height="600" viewBox={`0 0 ${800 / zoom} ${600 / zoom}`}>
        {/* Gradient definitions */}
        <defs>
          <linearGradient id="rootGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
          <linearGradient id="nodeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#0891b2" />
          </linearGradient>
          <linearGradient id="hoverGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ec4899" />
            <stop offset="100%" stopColor="#f43f5e" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Draw edges with gradient */}
        {edges.map((edge) => {
          const fromNode = getNode(edge.from);
          const toNode = getNode(edge.to);
          if (!fromNode || !toNode) return null;

          const isActive = selectedNodeId === edge.from || selectedNodeId === edge.to;

          return (
            <g key={edge.id}>
              <line
                x1={fromNode.x}
                y1={fromNode.y}
                x2={toNode.x}
                y2={toNode.y}
                stroke={isActive ? '#8b5cf6' : '#d1d5db'}
                strokeWidth={isActive ? 3 : 2}
                strokeLinecap="round"
                className={isActive ? 'edge-active' : ''}
                opacity={isActive ? 1 : 0.5}
              />
              {/* Arrow marker */}
              <polygon
                points={`${toNode.x},${toNode.y} ${toNode.x - 8},${toNode.y - 5} ${toNode.x - 8},${toNode.y + 5}`}
                fill={isActive ? '#8b5cf6' : '#d1d5db'}
                opacity={isActive ? 1 : 0.3}
              />
            </g>
          );
        })}

        {/* Draw nodes */}
        {nodes.map(node => {
          const isRoot = node.id === 'root';
          const isSelected = selectedNodeId === node.id;
          const isHovered = hoveredNodeId === node.id;

          return (
            <g
              key={node.id}
              onClick={() => setSelectedNodeId(node.id)}
              onMouseEnter={() => setHoveredNodeId(node.id)}
              onMouseLeave={() => setHoveredNodeId(null)}
              className="mindmap-node-group"
            >
              {/* Glow background */}
              {(isSelected || isHovered) && (
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={52}
                  fill="none"
                  stroke={isRoot ? '#6366f1' : isHovered ? '#ec4899' : '#06b6d4'}
                  strokeWidth="2"
                  opacity="0.3"
                  className="glow-circle"
                />
              )}

              {/* Main node circle */}
              <circle
                cx={node.x}
                cy={node.y}
                r="40"
                fill={
                  isRoot
                    ? 'url(#rootGradient)'
                    : isHovered
                    ? 'url(#hoverGradient)'
                    : isSelected
                    ? 'url(#nodeGradient)'
                    : '#f3f4f6'
                }
                stroke={
                  isRoot
                    ? '#6366f1'
                    : isHovered
                    ? '#ec4899'
                    : isSelected
                    ? '#06b6d4'
                    : '#d1d5db'
                }
                strokeWidth={isSelected ? 2.5 : 1.5}
                style={{ cursor: 'pointer' }}
                className="mindmap-node-circle"
                filter={isSelected ? 'url(#glow)' : 'none'}
              />

              {/* Node icon/indicator */}
              {isRoot && (
                <text x={node.x - 28} y={node.y - 28} fontSize="16" fill="#fff">
                  💡
                </text>
              )}

              {/* Node text */}
              <text
                x={node.x}
                y={node.y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="mindmap-node-text"
                fill={
                  isRoot || isHovered || isSelected ? '#fff' : '#1f2937'
                }
                style={{
                  pointerEvents: 'none',
                  fontSize: '13px',
                  fontWeight: isSelected ? 600 : 500
                }}
              >
                {node.label.length > 10
                  ? node.label.slice(0, 9) + '…'
                  : node.label}
              </text>
            </g>
          );
        })}
      </svg>
    );
  };

  return (
    <div className="mindmap-container">
      <div className="mindmap-header">
        <div className="mindmap-title">
          <Lightbulb size={20} className="title-icon" />
          <h3>Mind Map Builder</h3>
          <Tag color="cyan" className="node-count">{nodes.length} ideas</Tag>
        </div>
        <div className="zoom-controls">
          <Tooltip title="Zoom Out">
            <Button
              size="small"
              icon={<ZoomOutOutlined />}
              onClick={() => setZoom(Math.max(0.5, zoom - 0.2))}
            />
          </Tooltip>
          <span className="zoom-indicator">{Math.round(zoom * 100)}%</span>
          <Tooltip title="Zoom In">
            <Button
              size="small"
              icon={<ZoomInOutlined />}
              onClick={() => setZoom(Math.min(2, zoom + 0.2))}
            />
          </Tooltip>
        </div>
      </div>

      <div className="mindmap-canvas-area">
        {renderMindMap()}
      </div>

      <div className="mindmap-editor-section">
        <div className="editor-header">
          <Zap size={16} className="editor-icon" />
          <h4>Edit & Create</h4>
          {isConnected && (
            <Tag color="green" className="live-indicator">
              🔴 Live • {activeUsers?.length || 1} editing
            </Tag>
          )}
        </div>

        {selectedNode && (
          <div className="editor-content">
            <div className="node-editor">
              <label className="editor-label">Node Label</label>
              <Input
                placeholder="Enter node label"
                value={selectedNode.label}
                onChange={(e) => handleUpdateNodeLabel(e.target.value)}
                className="node-input"
                size="large"
                prefix={<Sparkles size={16} className="input-icon" />}
              />
            </div>

            <div className="actions-grid">
              <Tooltip title="Add a new child node to expand your ideas">
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={handleAddNode}
                  className="action-btn add-btn"
                  size="large"
                  block
                >
                  Add Idea
                </Button>
              </Tooltip>
              {selectedNode.id !== 'root' && (
                <Tooltip title="Remove this node and its connections">
                  <Button
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => handleDeleteNode(selectedNode.id)}
                    className="action-btn delete-btn"
                    size="large"
                    block
                  >
                    Delete
                  </Button>
                </Tooltip>
              )}
            </div>

            <div className="new-node-section">
              <label className="editor-label">Quick Add</label>
              <Space.Compact style={{ width: '100%' }}>
                <Input
                  placeholder="New idea label..."
                  value={newNodeLabel}
                  onChange={(e) => setNewNodeLabel(e.target.value)}
                  onPressEnter={handleAddNode}
                  className="quick-add-input"
                  size="large"
                />
                <Button
                  type="primary"
                  icon={<ArrowRightOutlined />}
                  onClick={handleAddNode}
                  size="large"
                >
                  Go
                </Button>
              </Space.Compact>
            </div>

            <Button
              type="primary"
              icon={<SaveOutlined />}
              loading={isSaving}
              disabled={!isConnected}
              onClick={handleSave}
              block
              size="large"
              className="save-btn"
            >
              {isSaving ? 'Saving Mind Map...' : 'Save Mind Map'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MindMapEditor;
