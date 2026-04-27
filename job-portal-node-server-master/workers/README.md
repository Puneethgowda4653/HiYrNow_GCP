# Background Workers

This directory contains BullMQ workers that process long-running tasks in the background.

## Prerequisites

1. **Redis** must be running:
   ```bash
   # macOS
   brew install redis
   brew services start redis
   
   # Linux
   sudo apt-get install redis-server
   sudo systemctl start redis
   
   # Docker
   docker run -d -p 6379:6379 redis:alpine
   ```

2. **Environment Variables** in `.env`:
   ```env
   REDIS_HOST=localhost
   REDIS_PORT=6379
   MONGODB_URI=your-mongodb-connection-string
   GEMINI_API_KEY=your-gemini-api-key
   EMAIL_USER=your-email@example.com
   EMAIL_PASS=your-email-password
   ```

## Available Workers

### 1. Resume Parsing Worker
- **Queue**: `resume-parsing`
- **Purpose**: Extract text from resumes and parse using AI
- **Concurrency**: 2 jobs at a time
- **Rate Limit**: 5 jobs per minute

### 2. AI Analysis Worker
- **Queue**: `ai-analysis`
- **Purpose**: Match job seekers with job postings using AI
- **Concurrency**: 3 jobs at a time
- **Rate Limit**: 10 jobs per minute

### 3. Email Worker
- **Queue**: `email`
- **Purpose**: Send emails (OTP, welcome, notifications, etc.)
- **Concurrency**: 5 emails at a time
- **Rate Limit**: 20 emails per minute

## Running Workers

### Development
```bash
# Start all workers with auto-reload
npm run dev:workers
```

### Production
```bash
# Start all workers
npm run workers

# Or run individual workers
node workers/resume-parsing.worker.js
node workers/ai-analysis.worker.js
node workers/email.worker.js
```

### Using PM2 (Recommended for Production)
```bash
# Install PM2
npm install -g pm2

# Start workers with PM2
pm2 start workers/start-workers.js --name job-portal-workers

# View logs
pm2 logs job-portal-workers

# Restart workers
pm2 restart job-portal-workers

# Stop workers
pm2 stop job-portal-workers
```

## Queue Management API

### Get All Queue Stats (Admin Only)
```bash
GET /api/queues/stats
```

Response:
```json
{
  "success": true,
  "stats": [
    {
      "queueName": "resume-parsing",
      "waiting": 5,
      "active": 2,
      "completed": 120,
      "failed": 3,
      "delayed": 0,
      "total": 130
    },
    ...
  ],
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

### Get Specific Queue Stats
```bash
GET /api/queues/stats/resume-parsing
```

## Using Queues in Services

### Example: Add Resume Parsing Job
```javascript
const { addResumeParsingJob } = require('../queues');

// In your service
app.post('/api/resume/upload', async (req, res) => {
  // ... upload file to GridFS ...
  
  // Add job to queue
  const job = await addResumeParsingJob({
    userId: req.user._id,
    fileId: file._id,
    filename: file.filename,
  });
  
  // Return immediately
  res.json({
    success: true,
    message: 'Resume uploaded. Parsing in progress...',
    jobId: job.id,
  });
});
```

### Example: Add AI Analysis Job
```javascript
const { addAIAnalysisJob } = require('../queues');

app.post('/api/job/analyze', async (req, res) => {
  const { jobId, userId } = req.body;
  
  // Add job to queue
  const job = await addAIAnalysisJob({
    jobId,
    userId,
    requestId: req.id,
  });
  
  res.json({
    success: true,
    message: 'Analysis in progress...',
    jobId: job.id,
  });
});
```

### Example: Send Email
```javascript
const { addEmailJob } = require('../queues');

// Send OTP email
await addEmailJob({
  type: 'otp',
  to: 'user@example.com',
  otp: '123456',
  priority: 1, // High priority
});

// Send welcome email
await addEmailJob({
  type: 'welcome',
  to: 'user@example.com',
  username: 'John Doe',
  priority: 10, // Normal priority
});

// Send custom email
await addEmailJob({
  type: 'custom',
  to: 'user@example.com',
  subject: 'Custom Subject',
  html: '<p>Custom HTML content</p>',
  priority: 5,
});
```

## Monitoring

### Redis CLI
```bash
# Connect to Redis
redis-cli

# View all keys
KEYS *

# View queue length
LLEN bull:resume-parsing:wait
LLEN bull:ai-analysis:wait
LLEN bull:email:wait

# View active jobs
LLEN bull:resume-parsing:active
```

### BullBoard (Optional Web UI)
Install and configure Bull Board for a visual dashboard:
```bash
npm install @bull-board/api @bull-board/express
```

## Error Handling

- **Automatic Retries**: Jobs are automatically retried with exponential backoff
- **Dead Letter Queue**: Failed jobs are kept for 7 days for debugging
- **Logs**: All worker activity is logged to console

### Retry Configuration
- Resume Parsing: 3 attempts, 2s backoff
- AI Analysis: 2 attempts, 5s backoff
- Email: 5 attempts, 1s backoff

## Performance Tips

1. **Scale Workers**: Run multiple worker processes for higher throughput
2. **Monitor Redis Memory**: Jobs consume Redis memory
3. **Adjust Concurrency**: Balance between throughput and resource usage
4. **Rate Limits**: Respect external API limits (Gemini, email providers)

## Troubleshooting

### Workers Not Processing Jobs
1. Check Redis connection: `redis-cli ping`
2. Verify environment variables are set
3. Check worker logs for errors
4. Ensure MongoDB is accessible from workers

### Jobs Failing
1. Check worker logs: `pm2 logs job-portal-workers`
2. View failed jobs in Redis
3. Check external API keys (Gemini, email)
4. Verify data format being passed to queues

### High Memory Usage
1. Adjust job retention settings
2. Increase `removeOnComplete` and `removeOnFail` limits
3. Monitor Redis memory: `redis-cli INFO memory`

## Architecture

```
┌─────────────┐          ┌─────────────┐          ┌─────────────┐
│   API       │          │    Redis    │          │   Workers   │
│  Server     │──add──▶  │   Queues    │──poll──▶ │  (BullMQ)   │
│             │          │             │          │             │
└─────────────┘          └─────────────┘          └─────────────┘
      │                                                   │
      │                                                   │
      └───────────────────┬───────────────────────────────┘
                          ▼
                   ┌─────────────┐
                   │   MongoDB   │
                   │  (Results)  │
                   └─────────────┘
```

1. API server adds jobs to Redis queues
2. Workers poll queues and process jobs
3. Results are stored in MongoDB
4. API server can query MongoDB for results

