/**
 * Example Swagger Annotations
 * 
 * Copy these patterns to your service files
 */

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: User login
 *     tags: [Authentication]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 example: john_doe
 *               password:
 *                 type: string
 *                 format: password
 *                 example: SecurePass123!
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 */

/**
 * @swagger
 * /api/jobs:
 *   get:
 *     summary: List job postings
 *     tags: [Jobs]
 *     security: []
 *     parameters:
 *       - $ref: '#/components/parameters/pageParam'
 *       - $ref: '#/components/parameters/limitParam'
 *       - name: location
 *         in: query
 *         schema:
 *           type: string
 *           example: San Francisco
 *       - name: type
 *         in: query
 *         schema:
 *           type: string
 *           enum: [Full-time, Part-time, Contract, Internship]
 *       - name: minSalary
 *         in: query
 *         schema:
 *           type: number
 *           example: 80000
 *       - name: maxSalary
 *         in: query
 *         schema:
 *           type: number
 *           example: 150000
 *     responses:
 *       200:
 *         description: List of jobs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 jobs:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/JobPosting'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */

/**
 * @swagger
 * /api/jobs:
 *   post:
 *     summary: Create job posting
 *     tags: [Jobs]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - company
 *               - location
 *               - type
 *             properties:
 *               title:
 *                 type: string
 *                 example: Senior Software Engineer
 *               company:
 *                 type: string
 *                 example: Tech Corp
 *               location:
 *                 type: string
 *                 example: San Francisco, CA
 *               type:
 *                 type: string
 *                 enum: [Full-time, Part-time, Contract, Internship]
 *               description:
 *                 type: string
 *               skillsRequired:
 *                 type: array
 *                 items:
 *                   type: string
 *               minAnnualSalary:
 *                 type: number
 *               maxAnnualSalary:
 *                 type: number
 *     responses:
 *       201:
 *         description: Job created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/JobPosting'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 */

/**
 * @swagger
 * /api/jobs/{id}:
 *   get:
 *     summary: Get job by ID
 *     tags: [Jobs]
 *     security: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           example: 507f1f77bcf86cd799439011
 *     responses:
 *       200:
 *         description: Job details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/JobPosting'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */

/**
 * @swagger
 * /api/applications:
 *   post:
 *     summary: Submit job application
 *     tags: [Applications]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - jobId
 *             properties:
 *               jobId:
 *                 type: string
 *                 example: 507f1f77bcf86cd799439011
 *               coverLetter:
 *                 type: string
 *               customQuestions:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     question:
 *                       type: string
 *                     answer:
 *                       type: string
 *     responses:
 *       201:
 *         description: Application submitted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/JobApplication'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       409:
 *         description: Already applied
 */

/**
 * @swagger
 * /api/payments/initiate:
 *   post:
 *     summary: Initiate payment
 *     tags: [Payments]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - name: Idempotency-Key
 *         in: header
 *         required: false
 *         schema:
 *           type: string
 *           example: pay_1234567890abc
 *         description: Idempotency key to prevent duplicate charges
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - planId
 *               - amount
 *               - paymentMethod
 *             properties:
 *               planId:
 *                 type: string
 *                 example: plan_premium
 *               amount:
 *                 type: number
 *                 example: 9999
 *               paymentMethod:
 *                 type: string
 *                 enum: [upi, card, netbanking]
 *               upiId:
 *                 type: string
 *                 example: user@upi
 *     responses:
 *       200:
 *         description: Payment initiated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 txnId:
 *                   type: string
 *                   example: TXN1234567890
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: List all users (admin only)
 *     tags: [Admin]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/pageParam'
 *       - $ref: '#/components/parameters/limitParam'
 *       - name: role
 *         in: query
 *         schema:
 *           type: string
 *           enum: [jobseeker, recruiter, admin]
 *       - name: status
 *         in: query
 *         schema:
 *           type: string
 *           enum: [verified, pending]
 *     responses:
 *       200:
 *         description: List of users
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */

