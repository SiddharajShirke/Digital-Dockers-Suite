import React, { useState } from "react";
import axios from "axios";
import { FaTimes, FaSave } from "react-icons/fa";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5001";

const CreateRefactorTaskModal = ({ file, onClose, onTaskCreated }) => {
  const [formData, setFormData] = useState({
    digitalDockersTaskId: '',
    priority: "MEDIUM",
    sla: "",
    assignee: "",
    riskScoreAtCreation: file?.risk || 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  React.useEffect(() => {
    if (!formData.digitalDockersTaskId) {
      setFormData(prev => ({
        ...prev,
        digitalDockersTaskId: `REFACTOR-${Date.now()}`
      }));
    }
  }, [formData.digitalDockersTaskId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data } = await axios.post(`${API_BASE_URL}/api/tech-debt/tasks`, {
        ...formData,
        fileId: file?._id,
      });

      onTaskCreated && onTaskCreated(data);
      onClose();
    } catch (err) {
      console.error("Error creating task:", err);
      setError(err.response?.data?.error || "Failed to create task");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-md w-full">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 rounded-t-lg">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Create Refactor Task</h2>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition"
            >
              <FaTimes size={20} />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* File Info */}
          {file && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold mb-2">File Details</h3>
              <p className="text-sm font-mono text-gray-700 mb-2">
                {file.path}
              </p>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <span className="text-gray-600">Risk:</span>
                  <span className="font-bold ml-1">{file.risk}</span>
                </div>
                <div>
                  <span className="text-gray-600">Complexity:</span>
                  <span className="font-bold ml-1">{file.complexity}</span>
                </div>
                <div>
                  <span className="text-gray-600">Churn:</span>
                  <span className="font-bold ml-1">{file.churnRate}</span>
                </div>
              </div>
            </div>
          )}

          {/* Task ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Task ID
            </label>
            <input
              type="text"
              value={formData.digitalDockersTaskId}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  digitalDockersTaskId: e.target.value,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Priority
            </label>
            <select
              value={formData.priority}
              onChange={(e) =>
                setFormData({ ...formData, priority: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </select>
          </div>

          {/* SLA Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              SLA Date
            </label>
            <input
              type="date"
              value={formData.sla}
              onChange={(e) =>
                setFormData({ ...formData, sla: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Assignee */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Assignee
            </label>
            <input
              type="text"
              value={formData.assignee}
              onChange={(e) =>
                setFormData({ ...formData, assignee: e.target.value })
              }
              placeholder="Enter username"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Creating...
                </>
              ) : (
                <>
                  <FaSave />
                  Create Task
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateRefactorTaskModal;
