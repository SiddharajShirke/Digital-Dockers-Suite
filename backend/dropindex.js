require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/digital-dockers')
  .then(async () => {
    try {
      await mongoose.connection.collection('employeecvs').dropIndex('user_1');
      console.log('Index dropped');
    } catch(e) {
      console.log('Index not found or already dropped');
    }
    process.exit(0);
  });
