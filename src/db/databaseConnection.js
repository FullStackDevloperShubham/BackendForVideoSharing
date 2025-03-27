import mongoose from 'mongoose'
import { DB_NAME } from '../constants.js'
const connectToDatabase = async () => {
  try {
   let connection=  await mongoose.connect("mongodb+srv://user:tLWURlYF2zVQiGZl@cluster0.qwqgf.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0");
    console.log(`✅ Connected to Database:`, connection.connection.db.databaseName);
    console.log(`✅ Cluster Name:`, connection.connection.host);
  } catch (error) {
    console.log('Error while connecting to database', { error });
    process.exit(1);
  }
};

export default connectToDatabase