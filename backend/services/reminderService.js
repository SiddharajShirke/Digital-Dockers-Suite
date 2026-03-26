// reminderService.js
const cron = require('node-cron');
const Task = require('../models/Task');
const Sprint = require('../models/Sprint');
const User = require('../models/User');
const sprintMailService = require('./sprintMailService');

/**
 * ============================================================================
 * REMINDER SERVICE (PHASE 4)
 * ============================================================================
 * Runs daily via cron to check for tasks nearing their deadlines based
 * on Sprint configurations.
 */

class ReminderService {
    constructor() {
        this.job = null;
    }

    startJobs() {
        console.log('⏰ Initializing AI Architect Reminder Cron Jobs...');
        
        // Run every day at 08:00 AM server time
        this.job = cron.schedule('0 8 * * *', async () => {
            console.log('🔄 Running daily deadline reminder scan...');
            await this.processReminders();
        });
    }

    async processReminders() {
        try {
            // Find active sprints that have reminders enabled
            const activeSprints = await Sprint.find({ 
                status: 'active',
                'reminderSettings.enabled': true
            }).populate('project');

            for (const sprint of activeSprints) {
                const intervals = sprint.reminderSettings.intervalsDays || [5, 2, 1];
                
                // Fetch incomplete tasks for this sprint
                const tasks = await Task.find({
                    sprint: sprint._id,
                    status: { $ne: 'done' },
                    dueDate: { $exists: true }
                }).populate('assignedTo');

                for (const task of tasks) {
                    const now = new Date();
                    const due = new Date(task.dueDate);
                    const diffTime = due.getTime() - now.getTime();
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                    // Check if difference matches any exact interval
                    if (intervals.includes(diffDays)) {
                        for (const assignee of task.assignedTo) {
                            // Send Email
                            await sprintMailService.sendDeadlineReminder(assignee, task, diffDays);

                            // You would also trigger socket/in-app notification here if the app 
                            // has a global io instance available, similar to the existing notification logic.
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error processing reminders:', error);
        }
    }
}

module.exports = new ReminderService();
