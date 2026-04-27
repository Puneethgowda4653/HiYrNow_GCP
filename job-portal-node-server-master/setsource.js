import mongoose from 'mongoose';
import jobPostingSchema from './models/job-posting/job-posting.schema.server.js'; // import the schema directly (not the model functions)

// Create model from the schema
const JobPostingModel = mongoose.model('JobPostingModel', jobPostingSchema);

await mongoose.connect('mongodb+srv://aditya:k353OKjCl6XfGw13@cluster0.cvuu6yu.mongodb.net/?retryWrites=true&w=majority', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  writeConcern: { w: 'majority' },
});

console.log('✅ Connected to MongoDB Atlas');

// Perform the update
const result = await JobPostingModel.updateMany({}, { $set: { jobSource: 'job-portal' } });
console.log(`✅ Updated ${result.modifiedCount} job postings with jobSource: "job-portal"`);

await mongoose.disconnect();
console.log('✅ Disconnected from MongoDB');

