const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Task = require('./models/Task');
const User = require('./models/User');

dotenv.config();

async function checkTasks() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const tasksCount = await Task.countDocuments();
        console.log(`Total Tasks: ${tasksCount}`);

        const tasks = await Task.find({ status: { $ne: 'done' } })
            .populate('assignedTo', 'fullName')
            .limit(10);

        tasks.forEach(t => {
            console.log(`Task: ${t.title} | Key: ${t.key} | Assignee: ${t.assignedTo?.[0]?.fullName || 'Unassigned'}`);
        });

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkTasks();
