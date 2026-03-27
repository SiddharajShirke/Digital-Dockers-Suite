const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, 'backend', '.env') });

async function check() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const collections = await mongoose.connection.db.listCollections().toArray();
        const projectCollection = mongoose.connection.db.collection('projects');
        const projects = await projectCollection.find({}).sort({ createdAt: -1 }).limit(10).toArray();
        
        console.log('--- RECENT PROJECTS ---');
        projects.forEach(p => {
            console.log(`ID: ${p._id}, Name: ${p.name}, Key: ${p.key}, CreatedAt: ${p.createdAt}`);
        });
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
