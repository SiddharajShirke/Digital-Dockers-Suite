require('dotenv').config({ path: __dirname + '/.env' });
const mongoose = require('mongoose');
const fs = require('fs');

async function test() {
    await mongoose.connect(process.env.MONGO_URI);
    let log = 'Connected to DB\n';

    const Project = require('./models/Project');
    const Sprint = require('./models/Sprint');
    const Task = require('./models/Task');

    const sprintCount = await Sprint.countDocuments();
    const taskCount = await Task.countDocuments();
    log += `\n--- COUNTS ---\nTotal Sprints: ${sprintCount}\nTotal Tasks: ${taskCount}\n`;

    const sprints = await Sprint.find().lean();
    log += `\n--- ALL SPRINTS ---\n`;
    for (const s of sprints) {
        log += `Sprint: ${s.name} | Status: ${s.status} | Start: ${s.startDate} | End: ${s.endDate}\n`;
    }

    const tasks = await Task.find().limit(20).lean();
    log += `\n--- SAMPLE TASKS ---\n`;
    for (const t of tasks) {
        log += `Task: ${t.title} | Status: ${t.status} | StoryPts: ${t.storyPoints} | SprintId: ${t.sprint}\n`;
    }

    fs.writeFileSync('diag.log', log);
    process.exit(0);
}

test().catch(console.error);
