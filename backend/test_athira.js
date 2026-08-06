import mongoose from 'mongoose';
import User from './src/models/user.model.js';

const run = async () => {
  try {
    await mongoose.connect('mongodb+srv://shabeeba:9995982324@cluster0.i23tzbf.mongodb.net/crm?appName=Cluster0');
    const athira = await User.findById('6a51c83ce41c02ca222bec4d');
    console.log(athira);
    process.exit(0);
  } catch(e) { console.error(e); process.exit(1); }
};
run();
