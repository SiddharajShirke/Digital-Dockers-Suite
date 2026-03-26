// sprintMailService.js
const nodemailer = require('nodemailer');

/**
 * ============================================================================
 * SPRINT MAIL SERVICE (PHASE 4)
 * ============================================================================
 * Handles sending automated sprint kick-off emails and deadline reminders
 * to team members.
 */

class SprintMailService {
    constructor() {
        // Dummy transport for local test or relying on real credentials if provided
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.ethereal.email',
            port: process.env.SMTP_PORT || 587,
            auth: {
                user: process.env.SMTP_USER || 'dummy_user',
                pass: process.env.SMTP_PASS || 'dummy_pass'
            }
        });
    }

    /**
     * Send Sprint Kickoff Email
     */
    async sendSprintKickoff(user, sprint, project) {
        const mailOptions = {
            from: '"AI Project Architect" <no-reply@digitaldockers.com>',
            to: user.email,
            subject: `🚀 Sprint Kickoff: ${sprint.name}`,
            text: `Hello ${user.fullName},\n\nThe sprint "${sprint.name}" in project "${project.name}" has officially started!\n\nSprint Goal: ${sprint.goal || 'Focus on your assigned tasks.'}\n\nPlease review your assigned tasks on the project board.\n\nBest,\nYour AI Architect`
        };

        try {
            await this.transporter.sendMail(mailOptions);
            console.log(`📧 Kickoff email sent to ${user.email}`);
        } catch (error) {
            console.error(`Failed to send kickoff email to ${user.email}:`, error.message);
        }
    }

    /**
     * Send Deadline Reminder Email
     */
    async sendDeadlineReminder(user, task, daysLeft) {
        const mailOptions = {
            from: '"AI Project Architect" <no-reply@digitaldockers.com>',
            to: user.email,
            subject: `⏰ Reminder: Task Deadline in ${daysLeft} day(s)`,
            text: `Hello ${user.fullName},\n\nJust a friendly reminder that your task "${task.title}" is due in ${daysLeft} day(s).\n\nPlease ensure it is completed or reach out to your manager if you are blocked.\n\nBest,\nYour AI Architect`
        };

        try {
            await this.transporter.sendMail(mailOptions);
            console.log(`📧 Reminder email sent to ${user.email} for task ${task.title}`);
        } catch (error) {
            console.error(`Failed to send reminder email to ${user.email}:`, error.message);
        }
    }
}

module.exports = new SprintMailService();
