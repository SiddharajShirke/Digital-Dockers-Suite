import React, { useState, useRef } from 'react';
import { Button, Space } from 'antd';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import MonthColumn from '../components/roadmap/MonthColumn';
import { getRoadmapData } from '../utils/roadmapData';
import '../styles/RoadmapPage.css';

/**
 * RoadmapPage Component
 * 
 * Displays a month-by-month horizontal timeline showing:
 * - Planned tasks (blue)
 * - Completed tasks (green)
 * - Carried over tasks (amber)
 * - Monthly AI insights
 */
const RoadmapPage = () => {
  const scrollContainerRef = useRef(null);
  const [roadmapData, setRoadmapData] = useState(null);

  useEffect(() => {
    setRoadmapData(getRoadmapData());
  }, []);

  if (!roadmapData) return null;

  /**
   * Scroll the timeline horizontally
   * @param {number} direction - 1 for right, -1 for left
   */
  const handleScroll = (direction) => {
    if (scrollContainerRef.current) {
      const scrollAmount = 400;
      scrollContainerRef.current.scrollBy({
        left: direction * scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="roadmap-page">
      {/* Header Section */}
      <div className="roadmap-header">
        <div className="header-content">
          <h1>Project Roadmap</h1>
          <p className="subtitle">Month-by-month execution progress and planning</p>
        </div>

        {/* Legend */}
        <div className="legend">
          <div className="legend-item">
            <span className="legend-color" style={{ backgroundColor: '#1890ff' }}></span>
            <span>Planned</span>
          </div>
          <div className="legend-item">
            <span className="legend-color" style={{ backgroundColor: '#52c41a' }}></span>
            <span>Completed</span>
          </div>
          <div className="legend-item">
            <span className="legend-color" style={{ backgroundColor: '#faad14' }}></span>
            <span>Carried Over</span>
          </div>
          <div className="legend-item">
            <span className="legend-color" style={{ backgroundColor: '#d9d9d9' }}></span>
            <span>Future</span>
          </div>
        </div>
      </div>

      {/* Navigation Controls */}
      <div className="roadmap-nav">
        <Button 
          icon={<LeftOutlined />} 
          onClick={() => handleScroll(-1)}
          className="scroll-btn"
        >
          Previous
        </Button>
        <Button 
          icon={<RightOutlined />} 
          onClick={() => handleScroll(1)}
          className="scroll-btn"
        >
          Next
        </Button>
      </div>

      {/* Timeline Container */}
      <div className="roadmap-timeline-wrapper">
        <div 
          className="roadmap-timeline" 
          ref={scrollContainerRef}
        >
          {roadmapData.months.map((month) => (
            <MonthColumn 
              key={month.id} 
              month={month}
              isCurrentMonth={month.isCurrent}
            />
          ))}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="roadmap-summary">
        <div className="summary-stat">
          <div className="stat-value">
            {roadmapData.months.reduce((sum, m) => sum + m.completed.length, 0)}
          </div>
          <div className="stat-label">Total Completed</div>
        </div>
        <div className="summary-stat">
          <div className="stat-value">
            {roadmapData.months.reduce((sum, m) => sum + m.planned.length, 0)}
          </div>
          <div className="stat-label">Total Planned</div>
        </div>
        <div className="summary-stat">
          <div className="stat-value">
            {roadmapData.months.reduce((sum, m) => sum + m.carriedOver.length, 0)}
          </div>
          <div className="stat-label">Total Carried Over</div>
        </div>
        <div className="summary-stat">
          <div className="stat-value">
            {Math.round(
              (roadmapData.months.reduce((sum, m) => sum + m.completed.length, 0) /
                roadmapData.months.reduce((sum, m) => sum + m.planned.length, 0)) * 100
            )}%
          </div>
          <div className="stat-label">Overall Completion</div>
        </div>
      </div>
    </div>
  );
};

export default RoadmapPage;
