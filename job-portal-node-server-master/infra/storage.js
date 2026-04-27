/**
 * Unified file storage abstraction for S3/GCS
 * Supports both AWS S3 and Google Cloud Storage with signed URLs
 */

const config = require('../config').getConfig();
const logger = require('./logger').logger;

// Determine storage backend from config
const STORAGE_BACKEND = process.env.STORAGE_BACKEND || 's3'; // 's3' or 'gcs'

let storageClient;
let bucketName;

/**
 * Initialize storage client based on backend
 */
function initializeStorage() {
  if (STORAGE_BACKEND === 's3') {
    return initializeS3();
  } else if (STORAGE_BACKEND === 'gcs') {
    return initializeGCS();
  } else {
    throw new Error(`Unknown storage backend: ${STORAGE_BACKEND}`);
  }
}

/**
 * Initialize AWS S3 client
 */
function initializeS3() {
  const { S3Client } = require('@aws-sdk/client-s3');
  
  bucketName = process.env.S3_BUCKET_NAME;
  
  if (!bucketName) {
    throw new Error('S3_BUCKET_NAME environment variable is required for S3 storage');
  }

  const s3Config = {
    region: process.env.AWS_REGION || 'us-east-1',
  };

  // Support both IAM roles and explicit credentials
  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    s3Config.credentials = {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    };
  }

  storageClient = new S3Client(s3Config);
  logger.info(`S3 storage initialized with bucket: ${bucketName}`);
  
  return {
    client: storageClient,
    bucketName,
    backend: 's3',
  };
}

/**
 * Initialize Google Cloud Storage client
 */
function initializeGCS() {
  const { Storage } = require('@google-cloud/storage');
  
  bucketName = process.env.GCS_BUCKET_NAME;
  
  if (!bucketName) {
    throw new Error('GCS_BUCKET_NAME environment variable is required for GCS storage');
  }

  const gcsConfig = {};

  // Support both Application Default Credentials and explicit key file
  if (process.env.GCS_KEY_FILE) {
    gcsConfig.keyFilename = process.env.GCS_KEY_FILE;
  }

  if (process.env.GCS_PROJECT_ID) {
    gcsConfig.projectId = process.env.GCS_PROJECT_ID;
  }

  storageClient = new Storage(gcsConfig);
  logger.info(`GCS storage initialized with bucket: ${bucketName}`);
  
  return {
    client: storageClient,
    bucketName,
    backend: 'gcs',
  };
}

/**
 * Upload a file to storage
 * @param {Buffer} fileBuffer - File content as buffer
 * @param {string} key - Object key/path in bucket
 * @param {Object} options - Additional options
 * @returns {Promise<{key: string, url: string}>}
 */
async function uploadFile(fileBuffer, key, options = {}) {
  const { contentType, metadata = {} } = options;

  try {
    if (STORAGE_BACKEND === 's3') {
      return await uploadToS3(fileBuffer, key, contentType, metadata);
    } else if (STORAGE_BACKEND === 'gcs') {
      return await uploadToGCS(fileBuffer, key, contentType, metadata);
    }
  } catch (error) {
    logger.error('File upload failed', { key, error: error.message });
    throw error;
  }
}

/**
 * Upload to S3
 */
async function uploadToS3(fileBuffer, key, contentType, metadata) {
  const { PutObjectCommand } = require('@aws-sdk/client-s3');
  
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: fileBuffer,
    ContentType: contentType,
    Metadata: metadata,
    ServerSideEncryption: 'AES256', // Enable encryption at rest
  });

  await storageClient.send(command);
  
  logger.info('File uploaded to S3', { key, size: fileBuffer.length });
  
  return {
    key,
    backend: 's3',
    bucket: bucketName,
  };
}

/**
 * Upload to GCS
 */
async function uploadToGCS(fileBuffer, key, contentType, metadata) {
  const bucket = storageClient.bucket(bucketName);
  const file = bucket.file(key);
  
  await file.save(fileBuffer, {
    contentType,
    metadata: {
      metadata, // Custom metadata
    },
    resumable: false,
  });
  
  logger.info('File uploaded to GCS', { key, size: fileBuffer.length });
  
  return {
    key,
    backend: 'gcs',
    bucket: bucketName,
  };
}

/**
 * Generate a signed URL for downloading a file
 * @param {string} key - Object key in bucket
 * @param {number} expiresIn - Expiration time in seconds (default: 1 hour)
 * @returns {Promise<string>}
 */
async function getSignedDownloadUrl(key, expiresIn = 3600) {
  try {
    if (STORAGE_BACKEND === 's3') {
      return await getS3SignedUrl(key, 'getObject', expiresIn);
    } else if (STORAGE_BACKEND === 'gcs') {
      return await getGCSSignedUrl(key, 'read', expiresIn);
    }
  } catch (error) {
    logger.error('Failed to generate signed download URL', { key, error: error.message });
    throw error;
  }
}

/**
 * Generate a signed URL for uploading a file (direct upload from client)
 * @param {string} key - Object key in bucket
 * @param {string} contentType - MIME type
 * @param {number} expiresIn - Expiration time in seconds (default: 15 minutes)
 * @returns {Promise<{url: string, key: string}>}
 */
async function getSignedUploadUrl(key, contentType, expiresIn = 900) {
  try {
    if (STORAGE_BACKEND === 's3') {
      const url = await getS3SignedUrl(key, 'putObject', expiresIn, contentType);
      return { url, key };
    } else if (STORAGE_BACKEND === 'gcs') {
      const url = await getGCSSignedUrl(key, 'write', expiresIn, contentType);
      return { url, key };
    }
  } catch (error) {
    logger.error('Failed to generate signed upload URL', { key, error: error.message });
    throw error;
  }
}

/**
 * Generate S3 signed URL
 */
async function getS3SignedUrl(key, operation, expiresIn, contentType) {
  const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
  const { GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
  
  let command;
  if (operation === 'getObject') {
    command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    });
  } else if (operation === 'putObject') {
    command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      ContentType: contentType,
      ServerSideEncryption: 'AES256',
    });
  }
  
  const signedUrl = await getSignedUrl(storageClient, command, { expiresIn });
  
  logger.info('Generated S3 signed URL', { key, operation, expiresIn });
  
  return signedUrl;
}

/**
 * Generate GCS signed URL
 */
async function getGCSSignedUrl(key, action, expiresIn, contentType) {
  const bucket = storageClient.bucket(bucketName);
  const file = bucket.file(key);
  
  const options = {
    version: 'v4',
    action,
    expires: Date.now() + expiresIn * 1000,
  };
  
  if (contentType && action === 'write') {
    options.contentType = contentType;
  }
  
  const [signedUrl] = await file.getSignedUrl(options);
  
  logger.info('Generated GCS signed URL', { key, action, expiresIn });
  
  return signedUrl;
}

/**
 * Delete a file from storage
 * @param {string} key - Object key in bucket
 * @returns {Promise<void>}
 */
async function deleteFile(key) {
  try {
    if (STORAGE_BACKEND === 's3') {
      return await deleteFromS3(key);
    } else if (STORAGE_BACKEND === 'gcs') {
      return await deleteFromGCS(key);
    }
  } catch (error) {
    logger.error('File deletion failed', { key, error: error.message });
    throw error;
  }
}

/**
 * Delete from S3
 */
async function deleteFromS3(key) {
  const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
  
  const command = new DeleteObjectCommand({
    Bucket: bucketName,
    Key: key,
  });
  
  await storageClient.send(command);
  logger.info('File deleted from S3', { key });
}

/**
 * Delete from GCS
 */
async function deleteFromGCS(key) {
  const bucket = storageClient.bucket(bucketName);
  const file = bucket.file(key);
  
  await file.delete();
  logger.info('File deleted from GCS', { key });
}

/**
 * Check if a file exists
 * @param {string} key - Object key in bucket
 * @returns {Promise<boolean>}
 */
async function fileExists(key) {
  try {
    if (STORAGE_BACKEND === 's3') {
      return await s3FileExists(key);
    } else if (STORAGE_BACKEND === 'gcs') {
      return await gcsFileExists(key);
    }
  } catch (error) {
    logger.error('File existence check failed', { key, error: error.message });
    return false;
  }
}

/**
 * Check S3 file existence
 */
async function s3FileExists(key) {
  const { HeadObjectCommand } = require('@aws-sdk/client-s3');
  
  try {
    const command = new HeadObjectCommand({
      Bucket: bucketName,
      Key: key,
    });
    
    await storageClient.send(command);
    return true;
  } catch (error) {
    if (error.name === 'NotFound') {
      return false;
    }
    throw error;
  }
}

/**
 * Check GCS file existence
 */
async function gcsFileExists(key) {
  const bucket = storageClient.bucket(bucketName);
  const file = bucket.file(key);
  
  const [exists] = await file.exists();
  return exists;
}

/**
 * Generate a unique file key with user context
 * @param {string} userId - User ID
 * @param {string} fileType - Type of file (profile-pic, resume, etc.)
 * @param {string} originalName - Original filename
 * @returns {string}
 */
function generateFileKey(userId, fileType, originalName) {
  const timestamp = Date.now();
  const ext = originalName.split('.').pop();
  const sanitizedName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_');
  
  return `${fileType}/${userId}/${timestamp}-${sanitizedName}`;
}

/**
 * Get CDN URL if configured, otherwise return signed URL
 * @param {string} key - Object key
 * @param {number} expiresIn - Expiration for signed URL fallback
 * @returns {Promise<string>}
 */
async function getCdnOrSignedUrl(key, expiresIn = 3600) {
  const cdnDomain = process.env.CDN_DOMAIN;
  
  if (cdnDomain) {
    // If CDN is configured, return CDN URL
    // For public files or CDN with signed URL support
    return `https://${cdnDomain}/${key}`;
  }
  
  // Fallback to signed URL
  return await getSignedDownloadUrl(key, expiresIn);
}

// Initialize storage on module load
let storageInitialized = false;

function ensureInitialized() {
  if (!storageInitialized) {
    initializeStorage();
    storageInitialized = true;
  }
}

module.exports = {
  initializeStorage,
  ensureInitialized,
  uploadFile,
  getSignedDownloadUrl,
  getSignedUploadUrl,
  deleteFile,
  fileExists,
  generateFileKey,
  getCdnOrSignedUrl,
  get backend() {
    return STORAGE_BACKEND;
  },
  get bucketName() {
    return bucketName;
  },
};

