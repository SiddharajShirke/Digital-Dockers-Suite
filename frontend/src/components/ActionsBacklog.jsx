import React, { useEffect, useState } from "react";
import api from "../services/api";
import {
  FaEdit,
  FaTrash,
  FaCheck,
  FaTimes,
  FaSort,
  FaFilter,
} from "react-icons/fa";

const ActionsBacklog = ({ isDarkMode, repoId }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [statusFilter, setStatusFilter] = useState("");
  const [sortBy, setSortBy] = useState("priority");
  const [selectedTasks, setSelectedTasks] = useState([]);

  useEffect(() => {
    const fetchTasks = async () => {
      if (!repoId) {
        setTasks([]);
        setLoading(false);
        return;
      }
      try {
        const paramsArray = [];
        if (statusFilter) paramsArray.push(`status=${statusFilter}`);
        if (repoId) paramsArray.push(`repoId=${repoId}`);
        const params = paramsArray.length > 0 ? `?${paramsArray.join('&')}` : "";
        const { data } = await api.get(`/tech-debt/tasks${params}`);
        setTasks(data);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching tasks", error);
        setLoading(false);
      }
    };
    fetchTasks();
  }, [statusFilter, repoId]);

  const handleEdit = (task) => {
    setEditingId(task._id);
    setEditData({
      status: task.status,
      priority: task.priority,
      assignee: task.assignee || "",
    });
  };

  const handleSave = async (taskId) => {
    try {
      await api.put(`/tech-debt/tasks/${taskId}`, editData);
      setTasks(
        tasks.map((t) => (t._id === taskId ? { ...t, ...editData } : t)),
      );
      setEditingId(null);
    } catch (error) {
      console.error("Error updating task", error);
    }
  };

  const handleDelete = async (taskId) => {
    if (!confirm("Are you sure you want to delete this task?")) return;

    try {
      await api.delete(`/tech-debt/tasks/${taskId}`);
      setTasks(tasks.filter((t) => t._id !== taskId));
    } catch (error) {
      console.error("Error deleting task", error);
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedTasks.length} selected tasks?`)) return;

    try {
      await Promise.all(
        selectedTasks.map((id) => api.delete(`/tech-debt/tasks/${id}`)),
      );
      setTasks(tasks.filter((t) => !selectedTasks.includes(t._id)));
      setSelectedTasks([]);
    } catch (error) {
      console.error("Error bulk deleting tasks", error);
    }
  };

  const toggleSelectTask = (taskId) => {
    setSelectedTasks((prev) =>
      prev.includes(taskId)
        ? prev.filter((id) => id !== taskId)
        : [...prev, taskId],
    );
  };

  const getPriorityColor = (p) => {
    if (p === "HIGH") return "text-red-600 bg-red-100";
    if (p === "MEDIUM") return "text-yellow-600 bg-yellow-100";
    return "text-green-600 bg-green-100";
  };

  const getStatusColor = (s) => {
    if (s === "DONE") return "text-green-600 bg-green-100";
    if (s === "IN_PROGRESS") return "text-blue-600 bg-blue-100";
    return "text-gray-600 bg-gray-100";
  };

  const sortedTasks = [...tasks].sort((a, b) => {
    if (sortBy === "priority") {
      const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }
    if (sortBy === "risk") {
      return (b.riskScoreAtCreation || 0) - (a.riskScoreAtCreation || 0);
    }
    if (sortBy === "sla") {
      return new Date(a.sla) - new Date(b.sla);
    }
    return 0;
  });

  if (loading)
    return (
      <div
        className={`p-6 rounded-lg shadow ${isDarkMode ? "bg-slate-800 text-white" : "bg-white"}`}
      >
        Loading Backlog...
      </div>
    );

  if (!repoId) {
    return (
      <div
        className={`shadow rounded-lg p-8 text-center transition-colors border ${isDarkMode ? "bg-slate-800 border-slate-700 text-gray-400" : "bg-white border-gray-100 text-gray-500"}`}
      >
        <FaFilter className="mx-auto mb-3 text-indigo-400 opacity-50" size={32} />
        <p className="text-sm font-medium">Connect a repository to view refactor actions</p>
      </div>
    );
  }

  return (
    <div
      className={`relative z-0 shadow rounded-lg p-6 transition-colors ${isDarkMode ? "bg-slate-800 border border-slate-700" : "bg-white"}`}
    >
      {/* Header with Filters */}
      <div className="flex justify-between items-center mb-4">
        <h2
          className={`text-xl font-bold ${isDarkMode ? "text-white" : "text-gray-800"}`}
        >
          Refactor Actions & Backlog
        </h2>

        <div className="flex items-center gap-3">
          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className={`px-3 py-1 rounded border text-sm ${isDarkMode
                ? "bg-slate-700 border-slate-600 text-white"
                : "bg-white border-gray-300"
              }`}
          >
            <option value="priority">Sort by Priority</option>
            <option value="risk">Sort by Risk</option>
            <option value="sla">Sort by SLA</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={`px-3 py-1 rounded border text-sm ${isDarkMode
                ? "bg-slate-700 border-slate-600 text-white"
                : "bg-white border-gray-300"
              }`}
          >
            <option value="">All Status</option>
            <option value="OPEN">Open</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="DONE">Done</option>
          </select>

          {/* Bulk Actions */}
          {selectedTasks.length > 0 && (
            <button
              onClick={handleBulkDelete}
              className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition"
            >
              Delete ({selectedTasks.length})
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table
          className={`min-w-full text-sm text-left ${isDarkMode ? "text-gray-300" : "text-gray-500"}`}
        >
          <thead
            className={`text-xs uppercase ${isDarkMode ? "bg-slate-700 text-gray-300" : "bg-gray-50 text-gray-700"}`}
          >
            <tr>
              <th className="px-6 py-3">
                <input
                  type="checkbox"
                  checked={
                    selectedTasks.length === tasks.length && tasks.length > 0
                  }
                  onChange={(e) =>
                    setSelectedTasks(
                      e.target.checked ? tasks.map((t) => t._id) : [],
                    )
                  }
                />
              </th>
              <th className="px-6 py-3">Task ID</th>
              <th className="px-6 py-3">Priority</th>
              <th className="px-6 py-3">Risk Score</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Assignee</th>
              <th className="px-6 py-3">SLA</th>
              <th className="px-6 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedTasks.map((task) => (
              <tr
                key={task._id}
                className={`border-b hover:${isDarkMode ? "bg-slate-700" : "bg-gray-50"} ${isDarkMode ? "border-slate-700" : "border-gray-200"}`}
              >
                <td className="px-6 py-4">
                  <input
                    type="checkbox"
                    checked={selectedTasks.includes(task._id)}
                    onChange={() => toggleSelectTask(task._id)}
                  />
                </td>
                <td
                  className={`px-6 py-4 font-medium whitespace-nowrap ${isDarkMode ? "text-white" : "text-gray-900"}`}
                >
                  {task.digitalDockersTaskId}
                </td>
                <td className="px-6 py-4">
                  {editingId === task._id ? (
                    <select
                      value={editData.priority}
                      onChange={(e) =>
                        setEditData({ ...editData, priority: e.target.value })
                      }
                      className="px-2 py-1 rounded border text-xs"
                    >
                      <option value="HIGH">High</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="LOW">Low</option>
                    </select>
                  ) : (
                    <span
                      className={`px-2 py-1 rounded text-xs font-semibold ${getPriorityColor(task.priority)}`}
                    >
                      {task.priority}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4">
                  {task.riskScoreAtCreation || "N/A"}
                </td>
                <td className="px-6 py-4">
                  {editingId === task._id ? (
                    <select
                      value={editData.status}
                      onChange={(e) =>
                        setEditData({ ...editData, status: e.target.value })
                      }
                      className="px-2 py-1 rounded border text-xs"
                    >
                      <option value="OPEN">Open</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="DONE">Done</option>
                    </select>
                  ) : (
                    <span
                      className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(task.status)}`}
                    >
                      {task.status}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4">
                  {editingId === task._id ? (
                    <input
                      type="text"
                      value={editData.assignee}
                      onChange={(e) =>
                        setEditData({ ...editData, assignee: e.target.value })
                      }
                      className="px-2 py-1 rounded border text-xs w-full"
                    />
                  ) : (
                    task.assignee || "-"
                  )}
                </td>
                <td className="px-6 py-4">
                  {task.sla ? new Date(task.sla).toLocaleDateString() : "N/A"}
                </td>
                <td className="px-6 py-4">
                  {editingId === task._id ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSave(task._id)}
                        className="text-green-600 hover:text-green-800"
                      >
                        <FaCheck />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <FaTimes />
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(task)}
                        className="text-indigo-600 hover:text-indigo-800"
                      >
                        <FaEdit />
                      </button>
                      <button
                        onClick={() => handleDelete(task._id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {tasks.length === 0 && (
          <p className="text-center py-4">No active refactor tasks.</p>
        )}
      </div>
    </div>
  );
};

export default ActionsBacklog;
