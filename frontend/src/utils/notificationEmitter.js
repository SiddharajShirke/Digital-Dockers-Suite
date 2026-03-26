import axios from 'axios';

/**
 * Notification Emitter
 * Helper utilities for creating notifications from different parts of the application
 * Integrates with the backend notification service
 */

class NotificationEmitter {
  constructor(baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5002') {
    this.baseURL = baseURL;
    this.apiClient = axios.create({
      baseURL: `${baseURL}/api`,
      withCredentials: true
    });
  }

  /**
   * Backwards-compatible no-op. Auth is handled via HttpOnly cookies.
   */
  setAuthToken() {
    return;
  }

  /**
   * Create and send notification
   */
  async createNotification(notificationData) {
    try {
      const response = await this.apiClient.post('/notifications', notificationData);
      return response.data;
    } catch (error) {
      console.error('[NotificationEmitter] Error creating notification:', error);
      throw error;
    }
  }

  /**
   * Notify when issue is created
   */
  async notifyIssueCreated(senderId, issueData, recipientIds) {
    const notifications = recipientIds.map(recipientId => ({
      recipientId,
      senderId,
      type: 'issue_created',
      title: `New Issue: ${issueData.title}`,
      description: `${issueData.title} was created in ${issueData.projectName}`,
      entityType: 'issue',
      entityId: issueData.id,
      options: {
        entityKey: issueData.key,
        icon: '📝',
        actionUrl: `/dashboard/issues/${issueData.id}`,
        priority: issueData.priority || 'medium',
        metadata: {
          projectId: issueData.projectId,
          projectName: issueData.projectName,
          userName: issueData.createdBy
        }
      }
    }));

    return Promise.all(
      notifications.map(n => this.createNotification(n))
    );
  }

  /**
   * Notify when issue is assigned
   */
  async notifyIssueAssigned(senderId, issueData, assigneeIds) {
    const notifications = assigneeIds.map(assigneeId => ({
      recipientId: assigneeId,
      senderId,
      type: 'issue_assigned',
      title: `Assigned to you: ${issueData.title}`,
      description: `You were assigned to ${issueData.key}`,
      entityType: 'issue',
      entityId: issueData.id,
      options: {
        entityKey: issueData.key,
        icon: '👤',
        actionUrl: `/dashboard/issues/${issueData.id}`,
        priority: 'high',
        metadata: {
          projectId: issueData.projectId,
          projectName: issueData.projectName
        }
      }
    }));

    return Promise.all(
      notifications.map(n => this.createNotification(n))
    );
  }

  /**
   * Notify when issue status changes
   */
  async notifyIssueStatusChanged(senderId, issueData, recipientIds) {
    const notifications = recipientIds.map(recipientId => ({
      recipientId,
      senderId,
      type: 'issue_status_changed',
      title: `${issueData.key} moved to ${issueData.status}`,
      description: `${issueData.title} status changed to ${issueData.status}`,
      entityType: 'issue',
      entityId: issueData.id,
      options: {
        entityKey: issueData.key,
        icon: '✅',
        actionUrl: `/dashboard/issues/${issueData.id}`,
        priority: 'medium',
        metadata: {
          projectId: issueData.projectId,
          oldStatus: issueData.previousStatus,
          newStatus: issueData.status
        }
      }
    }));

    return Promise.all(
      notifications.map(n => this.createNotification(n))
    );
  }

  /**
   * Notify when comment is added
   */
  async notifyIssueCommented(senderId, issueData, recipientIds) {
    const notifications = recipientIds.map(recipientId => ({
      recipientId,
      senderId,
      type: 'issue_commented',
      title: `Comment on ${issueData.key}`,
      description: `${issueData.key}: ${issueData.commentPreview}`,
      entityType: 'issue',
      entityId: issueData.id,
      options: {
        entityKey: issueData.key,
        icon: '💬',
        actionUrl: `/dashboard/issues/${issueData.id}`,
        priority: 'medium',
        metadata: {
          projectId: issueData.projectId,
          commentText: issueData.commentPreview
        }
      }
    }));

    return Promise.all(
      notifications.map(n => this.createNotification(n))
    );
  }

  /**
   * Notify when sprint starts
   */
  async notifySprintStarted(senderId, sprintData, teamMemberIds) {
    const notifications = teamMemberIds.map(memberId => ({
      recipientId: memberId,
      senderId,
      type: 'sprint_started',
      title: `Sprint "${sprintData.name}" started`,
      description: `${sprintData.name} sprint has begun with ${sprintData.taskCount} tasks`,
      entityType: 'sprint',
      entityId: sprintData.id,
      options: {
        icon: '🚀',
        actionUrl: `/dashboard/sprints/${sprintData.id}`,
        priority: 'high',
        metadata: {
          projectId: sprintData.projectId,
          sprintName: sprintData.name,
          taskCount: sprintData.taskCount
        }
      }
    }));

    return Promise.all(
      notifications.map(n => this.createNotification(n))
    );
  }

  /**
   * Notify when sprint completes
   */
  async notifySprintCompleted(senderId, sprintData, teamMemberIds) {
    const notifications = teamMemberIds.map(memberId => ({
      recipientId: memberId,
      senderId,
      type: 'sprint_completed',
      title: `Sprint "${sprintData.name}" completed`,
      description: `${sprintData.completedTasks}/${sprintData.totalTasks} tasks completed`,
      entityType: 'sprint',
      entityId: sprintData.id,
      options: {
        icon: '🎉',
        actionUrl: `/dashboard/sprints/${sprintData.id}`,
        priority: 'medium',
        metadata: {
          projectId: sprintData.projectId,
          completedTasks: sprintData.completedTasks,
          totalTasks: sprintData.totalTasks,
          velocity: sprintData.velocity
        }
      }
    }));

    return Promise.all(
      notifications.map(n => this.createNotification(n))
    );
  }

  /**
   * Notify when user is mentioned
   */
  async notifyMention(senderId, mentionData, mentionedUserIds) {
    const notifications = mentionedUserIds.map(userId => ({
      recipientId: userId,
      senderId,
      type: 'mention',
      title: `You were mentioned in ${mentionData.context}`,
      description: `${mentionData.contextPreview}`,
      entityType: mentionData.entityType,
      entityId: mentionData.entityId,
      options: {
        icon: '🔔',
        actionUrl: mentionData.actionUrl,
        priority: 'high',
        metadata: {
          context: mentionData.context,
          contextType: mentionData.contextType
        }
      }
    }));

    return Promise.all(
      notifications.map(n => this.createNotification(n))
    );
  }

  /**
   * Notify team members of deadline reminder
   */
  async notifyDeadlineReminder(senderId, taskData, teamMemberIds) {
    const notifications = teamMemberIds.map(memberId => ({
      recipientId: memberId,
      senderId,
      type: 'deadline_reminder',
      title: `Deadline reminder: ${taskData.title}`,
      description: `Due ${taskData.daysUntilDue} day(s) from now`,
      entityType: 'issue',
      entityId: taskData.id,
      options: {
        icon: '⏰',
        actionUrl: `/dashboard/issues/${taskData.id}`,
        priority: taskData.daysUntilDue <= 1 ? 'urgent' : 'high',
        metadata: {
          projectId: taskData.projectId,
          dueDate: taskData.dueDate,
          daysUntilDue: taskData.daysUntilDue
        }
      }
    }));

    return Promise.all(
      notifications.map(n => this.createNotification(n))
    );
  }

  /**
   * Notify when AI insight is generated
   */
  async notifyAIInsight(senderId, insightData, recipientId) {
    return this.createNotification({
      recipientId,
      senderId,
      type: 'ai_insight',
      title: `New AI Insight: ${insightData.title}`,
      description: insightData.summary,
      entityType: insightData.entityType,
      entityId: insightData.entityId,
      options: {
        icon: '💡',
        actionUrl: insightData.actionUrl || `/dashboard/${insightData.entityType}s`,
        priority: 'medium',
        metadata: insightData.metadata
      }
    });
  }

  /**
   * Notify when document is shared
   */
  async notifyDocumentShared(senderId, documentData, recipientIds) {
    const notifications = recipientIds.map(recipientId => ({
      recipientId,
      senderId,
      type: 'document_shared',
      title: `Document shared: ${documentData.title}`,
      description: `${documentData.title} was shared with you`,
      entityType: 'document',
      entityId: documentData.id,
      options: {
        icon: '📄',
        actionUrl: `/dashboard/documents/${documentData.id}`,
        priority: 'medium',
        metadata: {
          documentTitle: documentData.title,
          projectId: documentData.projectId
        }
      }
    }));

    return Promise.all(
      notifications.map(n => this.createNotification(n))
    );
  }

  /**
   * Notify when meeting is scheduled
   */
  async notifyMeetingScheduled(senderId, meetingData, attendeeIds) {
    const notifications = attendeeIds.map(attendeeId => ({
      recipientId: attendeeId,
      senderId,
      type: 'meeting_scheduled',
      title: `Meeting scheduled: ${meetingData.title}`,
      description: `${meetingData.title} on ${meetingData.date} at ${meetingData.time}`,
      entityType: 'meeting',
      entityId: meetingData.id,
      options: {
        icon: '📅',
        actionUrl: `/dashboard/meetings/${meetingData.id}`,
        priority: 'medium',
        metadata: {
          meetingTitle: meetingData.title,
          date: meetingData.date,
          time: meetingData.time
        }
      }
    }));

    return Promise.all(
      notifications.map(n => this.createNotification(n))
    );
  }

  /**
   * Notify team members of new project
   */
  async notifyProjectCreated(senderId, projectData, teamMemberIds) {
    const notifications = teamMemberIds.map(memberId => ({
      recipientId: memberId,
      senderId,
      type: 'project_added',
      title: `New project: ${projectData.name}`,
      description: `${projectData.name} project was created`,
      entityType: 'project',
      entityId: projectData.id,
      options: {
        icon: '📊',
        actionUrl: `/dashboard/projects/${projectData.id}`,
        priority: 'medium',
        metadata: {
          projectName: projectData.name,
          projectKey: projectData.key
        }
      }
    }));

    return Promise.all(
      notifications.map(n => this.createNotification(n))
    );
  }
}

// Create singleton instance
const notificationEmitter = new NotificationEmitter();

export default notificationEmitter;
