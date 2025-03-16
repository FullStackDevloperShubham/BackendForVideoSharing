import mongoose from 'mongoose'
import { DB_NAME } from '../constants.js'
const connectToDatabase = async () => {
  try {
    await mongoose.connect("mongodb+srv://user:tLWURlYF2zVQiGZl@cluster0.qwqgf.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0");
    console.log(`Database connection is done`);
  } catch (error) {
    console.log('Error while connecting to database', { error });
    process.exit(1);
  }
};

export default connectToDatabase