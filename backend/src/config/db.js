import mongoose from 'mongoose';
import dns from 'dns';

dns.setDefaultResultOrder('ipv4first');
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch (err) {}

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.DATABASE_URL || 'mongodb+srv://shabeeba:9995982324@cluster0.i23tzbf.mongodb.net/crm?appName=Cluster0';
    const conn = await mongoose.connect(mongoUri);
    console.log(`MongoDB Connected Safely: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Database Connection Error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;