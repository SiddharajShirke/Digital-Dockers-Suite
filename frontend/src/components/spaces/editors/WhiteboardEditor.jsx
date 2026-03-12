import React, { useState, useRef, useEffect } from 'react';
import { Button, Space, Popover } from 'antd';
import { SaveOutlined, ClearOutlined, BgColorsOutlined, UndoOutlined, RedoOutlined } from '@ant-design/icons';
import './WhiteboardEditor.css';

/**
 * Whiteboard Editor Component
 * Free-form drawing canvas for collaborative sketching
 */
const WhiteboardEditor = ({
  content,
  onSave,
  isConnected,
  activeUsers,
  sendCursorMove,
  isSaving
}) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#0052cc');
  const [brushSize, setBrushSize] = useState(3);
  const [history, setHistory] = useState([]);
  const [historyStep, setHistoryStep] = useState(-1);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    // Load drawing data
    if (content?.drawingData?.imageData) {
      const imageData = new ImageData(
        new Uint8ClampedArray(content.drawingData.imageData),
        canvas.width,
        canvas.height
      );
      context.putImageData(imageData, 0, 0);
    }

    // Initialize history
    setHistory([canvas.toDataURL()]);
    setHistoryStep(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getCanvasContext = () => {
    return canvasRef.current?.getContext('2d');
  };

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawing(true);
    sendCursorMove(x, y, `drawing-${Date.now()}`, 'draw');

    const context = getCanvasContext();
    context.beginPath();
    context.moveTo(x, y);
    context.strokeStyle = color;
    context.lineWidth = brushSize;
    context.lineCap = 'round';
    context.lineJoin = 'round';
  };

  const draw = (e) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    sendCursorMove(x, y, `drawing-${Date.now()}`, 'draw');

    const context = getCanvasContext();
    context.lineTo(x, y);
    context.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    const canvas = canvasRef.current;
    const context = getCanvasContext();
    context.closePath();

    // Save to history
    const newHistory = history.slice(0, historyStep + 1);
    newHistory.push(canvas.toDataURL());
    setHistory(newHistory);
    setHistoryStep(newHistory.length - 1);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    const context = getCanvasContext();
    context.clearRect(0, 0, canvas.width, canvas.height);

    const newHistory = history.slice(0, historyStep + 1);
    newHistory.push('');
    setHistory(newHistory);
    setHistoryStep(newHistory.length - 1);
  };

  const handleUndo = () => {
    if (historyStep > 0) {
      const newStep = historyStep - 1;
      setHistoryStep(newStep);
      redrawFromHistory(newStep);
    }
  };

  const handleRedo = () => {
    if (historyStep < history.length - 1) {
      const newStep = historyStep + 1;
      setHistoryStep(newStep);
      redrawFromHistory(newStep);
    }
  };

  const redrawFromHistory = (step) => {
    const canvas = canvasRef.current;
    const context = getCanvasContext();
    const img = new Image();

    img.onload = () => {
      context.clearRect(0, 0, canvas.width, canvas.height);
      if (img.src) {
        context.drawImage(img, 0, 0);
      }
    };

    img.src = history[step];
  };

  const handleSave = async () => {
    const canvas = canvasRef.current;
    const context = getCanvasContext();
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

    const updated = {
      ...content,
      drawingData: {
        imageData: Array.from(imageData.data),
        width: canvas.width,
        height: canvas.height
      },
      contentType: 'WHITEBOARD'
    };

    await onSave(updated, 'Updated whiteboard drawing');
  };

  const colorOptions = ['#0052cc', '#ff5630', '#00875a', '#974f0c', '#5e4db2', '#ae2a19'];

  return (
    <div className="whiteboard-container">
      <div className="whiteboard-toolbar">
        <Space size="small">
          <Popover
            content={
              <div className="color-picker">
                {colorOptions.map(c => (
                  <button
                    key={c}
                    className={`color-option ${color === c ? 'active' : ''}`}
                    style={{ backgroundColor: c }}
                    onClick={() => setColor(c)}
                  />
                ))}
              </div>
            }
            trigger="click"
            placement="bottom"
          >
            <Button
              icon={<BgColorsOutlined />}
              style={{ backgroundColor: color, color: '#fff' }}
              size="small"
            >
              Color
            </Button>
          </Popover>

          <select
            value={brushSize}
            onChange={(e) => setBrushSize(parseInt(e.target.value))}
            className="brush-size-select"
          >
            <option value="1">1px</option>
            <option value="2">2px</option>
            <option value="3">3px (Normal)</option>
            <option value="5">5px</option>
            <option value="8">8px</option>
            <option value="12">12px</option>
          </select>
        </Space>

        <Space size="small">
          <Button
            size="small"
            icon={<UndoOutlined />}
            onClick={handleUndo}
            disabled={historyStep <= 0}
          />
          <Button
            size="small"
            icon={<RedoOutlined />}
            onClick={handleRedo}
            disabled={historyStep >= history.length - 1}
          />
          <Button
            size="small"
            danger
            icon={<ClearOutlined />}
            onClick={handleClear}
          >
            Clear
          </Button>
        </Space>

        <Space size="small">
          <Button
            type="primary"
            size="small"
            icon={<SaveOutlined />}
            loading={isSaving}
            disabled={!isConnected}
            onClick={handleSave}
          >
            Save
          </Button>
          {isConnected && (
            <span className="collaborators">👥 {activeUsers?.length || 0} drawing</span>
          )}
        </Space>
      </div>

      <canvas
        ref={canvasRef}
        className="whiteboard-canvas"
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
      />
    </div>
  );
};

export default WhiteboardEditor;
