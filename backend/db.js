const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    let mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/worshipflow';
    
    // Clean the URI from any outer quotes or spaces that might have been pasted in Render environment variables
    mongoURI = mongoURI.trim();
    if ((mongoURI.startsWith('"') && mongoURI.endsWith('"')) || (mongoURI.startsWith("'") && mongoURI.endsWith("'"))) {
      mongoURI = mongoURI.slice(1, -1);
    }
    mongoURI = mongoURI.trim();

    const conn = await mongoose.connect(mongoURI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
