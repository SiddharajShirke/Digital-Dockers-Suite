require('dotenv').config();
const mongoose = require('mongoose');
const AISprintArchitectService = require('./services/aiSprintArchitectService');
const Sprint = require('./models/Sprint');
const User = require('./models/User');

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log("Connected to DB");
    
    // Find latest draft sprint
    const draftSprint = await Sprint.findOne({ status: 'draft' }).sort({ createdAt: -1 });
    if (!draftSprint) {
        console.log("No draft sprints found");
        process.exit(0);
    }
    
    // Find any user
    const admin = await User.findOne({ role: 'admin' });
    if (!admin) {
        console.log("No admin found");
        process.exit(0);
    }

    console.log(`Approving sprint: ${draftSprint.name} (${draftSprint._id}) by ${admin.fullName}`);
    
    try {
        const result = await AISprintArchitectService.approveSprintFromIdea(draftSprint._id, admin._id);
        console.log("Success! Project created:", result.project);
    } catch (e) {
        console.error("ERROR CAUGHT:");
        console.error(e);
    }

    process.exit(0);
  })
  .catch(err => {
      console.error(err);
      process.exit(1);
  });
