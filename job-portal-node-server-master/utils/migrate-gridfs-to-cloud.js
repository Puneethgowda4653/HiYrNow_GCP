/**
 * Migration script: GridFS to S3/GCS
 * 
 * Usage:
 *   node utils/migrate-gridfs-to-cloud.js --type=profile-pictures
 *   node utils/migrate-gridfs-to-cloud.js --type=resumes
 *   node utils/migrate-gridfs-to-cloud.js --type=all
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Grid = require('gridfs-stream');
const storage = require('../infra/storage');
const UserModel = require('../models/user/user.model.server');

// Parse command line arguments
const args = process.argv.slice(2).reduce((acc, arg) => {
  const [key, value] = arg.split('=');
  acc[key.replace('--', '')] = value;
  return acc;
}, {});

const migrationType = args.type || 'all';
const dryRun = args['dry-run'] === 'true';
const batchSize = parseInt(args['batch-size'] || '10', 10);

// Utility: Convert stream to buffer
function streamToBuffer(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

// Initialize storage
async function initializeStorage() {
  try {
    storage.ensureInitialized();
    console.log(`✓ Storage initialized (backend: ${storage.backend})`);
  } catch (error) {
    console.error('✗ Failed to initialize storage:', error.message);
    process.exit(1);
  }
}

// Connect to MongoDB
async function connectMongo() {
  try {
    const connectionString = process.env.MONGODB_URI;
    if (!connectionString) {
      throw new Error('MONGODB_URI environment variable not set');
    }
    
    await mongoose.connect(connectionString, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useFindAndModify: false,
      useCreateIndex: true,
    });
    
    console.log('✓ Connected to MongoDB');
  } catch (error) {
    console.error('✗ MongoDB connection failed:', error.message);
    process.exit(1);
  }
}

// Migrate profile pictures
async function migrateProfilePictures() {
  console.log('\n=== Migrating Profile Pictures ===\n');
  
  const conn = mongoose.connection;
  const gfs = Grid(conn.db, mongoose.mongo);
  gfs.collection('profile-pictures');
  
  return new Promise((resolve, reject) => {
    gfs.files.find({}).toArray(async (err, files) => {
      if (err) {
        return reject(err);
      }
      
      console.log(`Found ${files.length} profile pictures to migrate`);
      
      if (files.length === 0) {
        return resolve({ migrated: 0, failed: 0, skipped: 0 });
      }
      
      const stats = {
        migrated: 0,
        failed: 0,
        skipped: 0,
      };
      
      // Process in batches
      for (let i = 0; i < files.length; i += batchSize) {
        const batch = files.slice(i, i + batchSize);
        
        await Promise.all(batch.map(async (file) => {
          try {
            const userId = file.metadata?.userId;
            
            if (!userId) {
              console.log(`  ⚠ Skipping file ${file.filename} (no userId in metadata)`);
              stats.skipped++;
              return;
            }
            
            // Check if already migrated
            const user = await UserModel.findUserById(userId);
            if (user && user.profilePictureKey) {
              console.log(`  → Skipping ${file.filename} (already migrated)`);
              stats.skipped++;
              return;
            }
            
            if (dryRun) {
              console.log(`  [DRY RUN] Would migrate: ${file.filename} for user ${userId}`);
              stats.migrated++;
              return;
            }
            
            // Read file from GridFS
            const readStream = gfs.createReadStream({ filename: file.filename });
            const buffer = await streamToBuffer(readStream);
            
            // Generate new file key
            const fileKey = storage.generateFileKey(userId, 'profile-pictures', file.filename);
            
            // Upload to S3/GCS
            await storage.uploadFile(buffer, fileKey, {
              contentType: file.contentType || 'image/jpeg',
              metadata: {
                userId: userId.toString(),
                originalName: file.filename,
                migratedAt: new Date().toISOString(),
                migratedFrom: 'gridfs',
              },
            });
            
            // Update user record
            await UserModel.updateUser(userId, { profilePictureKey: fileKey });
            
            console.log(`  ✓ Migrated: ${file.filename} → ${fileKey}`);
            stats.migrated++;
          } catch (error) {
            console.error(`  ✗ Failed to migrate ${file.filename}:`, error.message);
            stats.failed++;
          }
        }));
        
        console.log(`  Progress: ${Math.min(i + batchSize, files.length)}/${files.length}`);
      }
      
      resolve(stats);
    });
  });
}

// Migrate resumes
async function migrateResumes() {
  console.log('\n=== Migrating Resumes ===\n');
  
  const conn = mongoose.connection;
  const gfs = Grid(conn.db, mongoose.mongo);
  gfs.collection('resumeFiles');
  
  return new Promise((resolve, reject) => {
    gfs.files.find({}).toArray(async (err, files) => {
      if (err) {
        return reject(err);
      }
      
      console.log(`Found ${files.length} resumes to migrate`);
      
      if (files.length === 0) {
        return resolve({ migrated: 0, failed: 0, skipped: 0 });
      }
      
      const stats = {
        migrated: 0,
        failed: 0,
        skipped: 0,
      };
      
      // Process in batches
      for (let i = 0; i < files.length; i += batchSize) {
        const batch = files.slice(i, i + batchSize);
        
        await Promise.all(batch.map(async (file) => {
          try {
            const userId = file.metadata?.userId;
            
            if (!userId) {
              console.log(`  ⚠ Skipping file ${file.filename} (no userId in metadata)`);
              stats.skipped++;
              return;
            }
            
            if (dryRun) {
              console.log(`  [DRY RUN] Would migrate: ${file.filename} for user ${userId}`);
              stats.migrated++;
              return;
            }
            
            // Read file from GridFS
            const readStream = gfs.createReadStream({ filename: file.filename });
            const buffer = await streamToBuffer(readStream);
            
            // Generate new file key
            const fileKey = storage.generateFileKey(userId, 'resumes', file.filename);
            
            // Upload to S3/GCS
            await storage.uploadFile(buffer, fileKey, {
              contentType: file.contentType || 'application/pdf',
              metadata: {
                userId: userId.toString(),
                originalName: file.filename,
                migratedAt: new Date().toISOString(),
                migratedFrom: 'gridfs',
              },
            });
            
            // Note: You should update your Resume model here
            // await ResumeModel.createOrUpdateResume(userId, { fileKey, ... });
            
            console.log(`  ✓ Migrated: ${file.filename} → ${fileKey}`);
            stats.migrated++;
          } catch (error) {
            console.error(`  ✗ Failed to migrate ${file.filename}:`, error.message);
            stats.failed++;
          }
        }));
        
        console.log(`  Progress: ${Math.min(i + batchSize, files.length)}/${files.length}`);
      }
      
      resolve(stats);
    });
  });
}

// Main execution
async function main() {
  console.log('GridFS to Cloud Storage Migration Tool\n');
  console.log(`Migration type: ${migrationType}`);
  console.log(`Dry run: ${dryRun ? 'Yes' : 'No'}`);
  console.log(`Batch size: ${batchSize}\n`);
  
  if (dryRun) {
    console.log('🔍 Running in DRY RUN mode - no files will be migrated\n');
  }
  
  await connectMongo();
  await initializeStorage();
  
  const allStats = {
    profilePictures: { migrated: 0, failed: 0, skipped: 0 },
    resumes: { migrated: 0, failed: 0, skipped: 0 },
  };
  
  try {
    if (migrationType === 'profile-pictures' || migrationType === 'all') {
      allStats.profilePictures = await migrateProfilePictures();
    }
    
    if (migrationType === 'resumes' || migrationType === 'all') {
      allStats.resumes = await migrateResumes();
    }
    
    // Print summary
    console.log('\n=== Migration Summary ===\n');
    
    if (migrationType === 'profile-pictures' || migrationType === 'all') {
      console.log('Profile Pictures:');
      console.log(`  ✓ Migrated: ${allStats.profilePictures.migrated}`);
      console.log(`  ✗ Failed: ${allStats.profilePictures.failed}`);
      console.log(`  → Skipped: ${allStats.profilePictures.skipped}`);
    }
    
    if (migrationType === 'resumes' || migrationType === 'all') {
      console.log('\nResumes:');
      console.log(`  ✓ Migrated: ${allStats.resumes.migrated}`);
      console.log(`  ✗ Failed: ${allStats.resumes.failed}`);
      console.log(`  → Skipped: ${allStats.resumes.skipped}`);
    }
    
    const totalMigrated = allStats.profilePictures.migrated + allStats.resumes.migrated;
    const totalFailed = allStats.profilePictures.failed + allStats.resumes.failed;
    
    console.log('\nTotal:');
    console.log(`  ✓ Migrated: ${totalMigrated}`);
    console.log(`  ✗ Failed: ${totalFailed}`);
    
    if (dryRun) {
      console.log('\n🔍 This was a DRY RUN. Run without --dry-run=true to perform actual migration.');
    } else {
      console.log('\n✓ Migration completed!');
    }
    
    process.exit(totalFailed > 0 ? 1 : 0);
  } catch (error) {
    console.error('\n✗ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

