/**
 * Swagger/OpenAPI Configuration
 * 
 * Generates interactive API documentation
 */

const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const { getConfig } = require('./index');

const config = getConfig();

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Job Portal API',
      version: '1.0.0',
      description: 'Comprehensive API documentation for the Job Portal application',
      contact: {
        name: 'API Support',
        email: 'support@jobportal.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: config.hostname || 'https://hiyrnow-backend-786443796056.europe-west1.run.app',
        description: 'Development server',
      },
      {
        url: 'https://api.yourdomain.com',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'sessionId',
          description: 'Session cookie authentication',
        },
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT Bearer token (for future use)',
        },
      },
      schemas: {
        // User schemas
        User: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '507f1f77bcf86cd799439011' },
            username: { type: 'string', example: 'john_doe' },
            email: { type: 'string', format: 'email', example: 'john@example.com' },
            firstName: { type: 'string', example: 'John' },
            lastName: { type: 'string', example: 'Doe' },
            role: {
              type: 'string',
              enum: ['jobseeker', 'recruiter', 'admin'],
              example: 'jobseeker',
            },
            phone: { type: 'string', example: '+1234567890' },
            profilePicture: { type: 'string', example: 'https://...' },
            isVerified: { type: 'boolean', example: false },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },

        // Job Posting schemas
        JobPosting: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '507f1f77bcf86cd799439011' },
            title: { type: 'string', example: 'Senior Software Engineer' },
            company: { type: 'string', example: 'Tech Corp' },
            location: { type: 'string', example: 'San Francisco, CA' },
            type: {
              type: 'string',
              enum: ['Full-time', 'Part-time', 'Contract', 'Internship'],
              example: 'Full-time',
            },
            status: {
              type: 'string',
              enum: ['active', 'closed', 'draft'],
              example: 'active',
            },
            description: { type: 'string', example: 'We are looking for...' },
            skillsRequired: {
              type: 'array',
              items: { type: 'string' },
              example: ['JavaScript', 'Node.js', 'React'],
            },
            minAnnualSalary: { type: 'number', example: 100000 },
            maxAnnualSalary: { type: 'number', example: 150000 },
            minWorkExperience: { type: 'number', example: 3 },
            maxWorkExperience: { type: 'number', example: 7 },
            datePosted: { type: 'string', format: 'date-time' },
            user: { $ref: '#/components/schemas/User' },
          },
        },

        // Job Application schemas
        JobApplication: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '507f1f77bcf86cd799439011' },
            user: { $ref: '#/components/schemas/User' },
            jobPosting: { $ref: '#/components/schemas/JobPosting' },
            status: {
              type: 'string',
              enum: ['applied', 'reviewed', 'interview', 'offer', 'rejected', 'accepted'],
              example: 'applied',
            },
            coverLetter: { type: 'string', example: 'I am interested in...' },
            dateApplied: { type: 'string', format: 'date-time' },
            customQuestions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  question: { type: 'string' },
                  answer: { type: 'string' },
                },
              },
            },
          },
        },

        // Payment schemas
        Payment: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '507f1f77bcf86cd799439011' },
            txnId: { type: 'string', example: 'TXN1234567890' },
            user: { type: 'string', example: '507f1f77bcf86cd799439011' },
            plan: { type: 'string', example: 'premium' },
            amount: { type: 'number', example: 9999 },
            status: {
              type: 'string',
              enum: ['pending', 'success', 'failed'],
              example: 'success',
            },
            paymentMethod: { type: 'string', example: 'upi' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },

        // Error response
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                code: { type: 'string', example: 'VALIDATION_ERROR' },
                message: { type: 'string', example: 'Invalid request data' },
                requestId: { type: 'string', example: 'req_abc123' },
                details: { type: 'object' },
              },
            },
          },
        },

        // Pagination
        Pagination: {
          type: 'object',
          properties: {
            page: { type: 'integer', example: 1 },
            limit: { type: 'integer', example: 20 },
            total: { type: 'integer', example: 100 },
            totalPages: { type: 'integer', example: 5 },
            hasNext: { type: 'boolean', example: true },
            hasPrev: { type: 'boolean', example: false },
          },
        },
      },

      // Common parameters
      parameters: {
        pageParam: {
          name: 'page',
          in: 'query',
          description: 'Page number',
          schema: {
            type: 'integer',
            minimum: 1,
            default: 1,
          },
        },
        limitParam: {
          name: 'limit',
          in: 'query',
          description: 'Number of items per page',
          schema: {
            type: 'integer',
            minimum: 1,
            maximum: 100,
            default: 20,
          },
        },
        sortParam: {
          name: 'sort',
          in: 'query',
          description: 'Sort field and order',
          schema: {
            type: 'string',
            example: '-datePosted',
          },
        },
      },

      // Common responses
      responses: {
        Unauthorized: {
          description: 'Unauthorized - Authentication required',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: {
                error: {
                  code: 'UNAUTHORIZED',
                  message: 'Authentication required',
                  requestId: 'req_abc123',
                },
              },
            },
          },
        },
        Forbidden: {
          description: 'Forbidden - Insufficient permissions',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: {
                error: {
                  code: 'FORBIDDEN',
                  message: 'Insufficient permissions',
                  requestId: 'req_abc123',
                },
              },
            },
          },
        },
        NotFound: {
          description: 'Not Found',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: {
                error: {
                  code: 'NOT_FOUND',
                  message: 'Resource not found',
                  requestId: 'req_abc123',
                },
              },
            },
          },
        },
        ValidationError: {
          description: 'Validation Error',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: {
                error: {
                  code: 'VALIDATION_ERROR',
                  message: 'Invalid request data',
                  requestId: 'req_abc123',
                  details: {
                    email: 'Invalid email format',
                  },
                },
              },
            },
          },
        },
        ServerError: {
          description: 'Internal Server Error',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
            },
          },
        },
      },
    },

    // Global security (can be overridden per endpoint)
    security: [
      {
        cookieAuth: [],
      },
    ],

    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and registration',
      },
      {
        name: 'Users',
        description: 'User profile management',
      },
      {
        name: 'Jobs',
        description: 'Job posting operations',
      },
      {
        name: 'Applications',
        description: 'Job application management',
      },
      {
        name: 'Payments',
        description: 'Payment and subscription',
      },
      {
        name: 'Admin',
        description: 'Administrative operations',
      },
      {
        name: 'Health',
        description: 'Health check endpoints',
      },
    ],
  },

  // Path to API docs (JSDoc comments)
  apis: [
    './services/*.server.js',
    './server.js',
    './docs/swagger/*.yaml', // Optional: YAML definitions
  ],
};

const swaggerSpec = swaggerJsdoc(options);

// Swagger UI options
const swaggerUiOptions = {
  explorer: true,
  swaggerOptions: {
    persistAuthorization: true, // Remember auth across refreshes
    filter: true, // Enable search
    displayRequestDuration: true,
  },
  customCss: '.swagger-ui .topbar { display: none }', // Hide top bar
  customSiteTitle: 'Job Portal API Documentation',
};

module.exports = {
  swaggerSpec,
  swaggerUi,
  swaggerUiOptions,
};

