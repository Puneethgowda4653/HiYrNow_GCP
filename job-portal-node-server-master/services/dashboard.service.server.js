module.exports = function(app) {
    const dashboardModel = require('../models/dashboard/dashboard.model.server');
    const jobApplicationModel = require('../models/job-application/job-application.model.server');
    const { google } = require('googleapis');
    const outlook = require('@microsoft/microsoft-graph-client');
    const LinkedInApi = require('node-linkedin');
    const axios = require('axios');
    const crypto = require('crypto');
    require('dotenv').config();
const { v4: uuidv4 } = require('uuid');
    const multer = require('multer');
    // Session middleware is already handled in server.js with RedisStore

    // Get dashboard data
    app.get('/api/dashboard/:userId', async (req, res) => {
        try {
            const userId = req.params.userId;
            let dashboard = await dashboardModel.findDashboardByUserId(userId);
            
            if (!dashboard) {
                dashboard = await dashboardModel.createDashboard(userId);
            }

            // Get related data
            const jobApplications = await jobApplicationModel.findAllJobApplicationByUserId(userId);
            const interviews = jobApplications.reduce((acc, app) => [...acc, ...(app.interviews || [])], []);

            // Update metrics
            dashboard = await dashboardModel.calculateAndUpdateMetrics(userId, jobApplications, interviews);

            res.json(dashboard);
        } catch (error) {
            console.error('Dashboard fetch error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Update integration status
    app.put('/api/dashboard/:userId/integration/:type', async (req, res) => {
        try {
            const { userId, type } = req.params;
            const { status } = req.body;

            const dashboard = await dashboardModel.updateIntegrationStatus(
                userId,
                type,
                status
            );

            res.json(dashboard);
        } catch (error) {
            console.error('Integration update error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Manual dashboard data update
    app.put('/api/dashboard/:userId', async (req, res) => {
        try {
            const userId = req.params.userId;
            const dashboardData = req.body;

            const dashboard = await dashboardModel.updateDashboard(
                userId,
                dashboardData
            );

            res.json(dashboard);
        } catch (error) {
            console.error('Dashboard update error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Calendar Integration
    app.post('/api/dashboard/integration/calendar', async (req, res) => {
        try {
            const { userId, calendarType, authCode } = req.body;
            let calendarData;

            if (calendarType === 'google') {
                const oauth2Client = new google.auth.OAuth2(
                    process.env.GOOGLE_CLIENT_ID,
                    process.env.GOOGLE_CLIENT_SECRET,
                    process.env.GOOGLE_REDIRECT_URI
                );

                const { tokens } = await oauth2Client.getToken(authCode);
                oauth2Client.setCredentials(tokens);

                const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
                calendarData = await calendar.calendarList.list();

            } else if (calendarType === 'outlook') {
                const client = outlook.Client.init({
                    authProvider: (done) => {
                        done(null, authCode);
                    }
                });

                calendarData = await client.api('/me/calendar').get();
            }

            await dashboardModel.updateIntegrationStatus(userId, 'calendar', true);
            await dashboardModel.storeCalendarTokens(userId, calendarType, calendarData);

            res.json({ 
                success: true, 
                message: 'Calendar sync successful',
                provider: calendarType 
            });
        } catch (error) {
            console.error('Calendar integration error:', error);
            res.status(500).json({ error: 'Calendar sync failed' });
        }
    });

 

// Ensure required environment variables are set
if (!process.env.LINKEDIN_CLIENT_ID || !process.env.LINKEDIN_CLIENT_SECRET || !process.env.BASE_URL) {
    throw new Error('Missing required environment variables for LinkedIn integration.');
}

// LinkedIn API configuration
const REDIRECT_URI = `${process.env.BASE_URL}/api/dashboard/integration/linkedin/callback`;

// Auth initialization route
app.get('/api/dashboard/integration/linkedin/auth', (req, res) => {
    try {
        const state = uuidv4();
        req.session.linkedinState = state;
        const scope = ['profile', 'email','openid'];
        const authUrl = `https://www.linkedin.com/oauth/v2/authorization?` +
            `response_type=code&` +
            `client_id=${process.env.LINKEDIN_CLIENT_ID}&` +
            `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
            `state=${state}&` +
            `scope=${scope.join('%20')}`;

        res.json({ 
            success: true,
            authUrl,
            state 
        });
    } catch (error) {
        console.error('LinkedIn auth initialization error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to initialize LinkedIn authentication' 
        });
    }
});

// Exchange authorization code for access token
const getAccessToken = async (code) => {
    try {
        const params = new URLSearchParams();
        params.append('grant_type', 'authorization_code');
        params.append('code', code);
        params.append('redirect_uri', REDIRECT_URI);
        params.append('client_id', process.env.LINKEDIN_CLIENT_ID);
        params.append('client_secret', process.env.LINKEDIN_CLIENT_SECRET);

        const response = await axios.post('https://www.linkedin.com/oauth/v2/accessToken', params, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        if (!response.data || !response.data.access_token) {
            throw new Error('No access token received from LinkedIn');
        }

        return response.data.access_token;
    } catch (err) {
        console.error('Error fetching access token:', err.response?.data || err.message);
        throw new Error('Failed to obtain access token');
    }
};

// Fetch LinkedIn profile data
const getLinkedInProfile = async (accessToken) => {
    try {
        const response = await axios.get('https://api.linkedin.com/v2/userinfo', {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'cache-control': 'no-cache',
                'X-Restli-Protocol-Version': '2.0.0'
            }
        });
        return response.data;
    } catch (err) {
        console.error('Error fetching LinkedIn profile:', err.response?.data || err.message);
        throw new Error('Failed to fetch LinkedIn profile');
    }
};

// Callback route
app.all('/api/dashboard/integration/linkedin/callback', async (req, res) => {
    try {
        const code = req.method === 'GET' ? req.query.code : req.body.code;
        const state = req.method === 'GET' ? req.query.state : req.body.state;
        const storedState = req.session.linkedinState;
        const userId = req.session['user']._id;
        if (!code) throw new Error('Authorization code is required');
        if (state !== storedState) throw new Error('State parameter mismatch');

        const accessToken = await getAccessToken(code);
     
        const profile = await getLinkedInProfile(accessToken);

        // Store LinkedIn data in the database
        await dashboardModel.updateLinkedInProfile(userId, {
            linkedInId: profile.id,
            accessToken,
            profile,
            lastSync: new Date()
        });

        await dashboardModel.updateIntegrationStatus(userId, 'linkedin', true);
        // Respond to client
        if (req.method === 'GET') {

            const nonce = crypto.randomBytes(16).toString('base64');

            // Set the CSP with the nonce
            res.set({
                'Content-Security-Policy': `default-src 'self'; script-src 'self' 'nonce-${nonce}'`,
                'X-Frame-Options': 'DENY',
                'X-Content-Type-Options': 'nosniff',
            });
            
            // Use the nonce in your inline script
            res.send(`
                <html>
                <body>
                    <script nonce="${nonce}">
                        window.opener.postMessage({
                            type: 'linkedin_auth',
                            success: true,
                            code: '${code}',
                            profile: ${JSON.stringify(profile)}
                        }, '${process.env.FRONTEND_URL || '*'}');
                        window.close();
                    </script>
                </body>
                </html>
            `);
        } else {


            res.json({
                success: true,
                message: 'LinkedIn integration successful',
                profile
            });
        }
    } catch (error) {
        console.error('LinkedIn callback error:', error);

        const errorResponse = req.method === 'GET' 
            ? `
                <html>
                <body>
                    <script>
                        window.opener.postMessage({
                            type: 'linkedin_auth',
                            success: false,
                            error: '${error.message || 'LinkedIn integration failed'}'
                        }, '${process.env.FRONTEND_URL || '*'}');
                        window.close();
                    </script>
                </body>
                </html>
            `
            : {
                success: false,
                error: error.message || 'LinkedIn integration failed'
            };

        res.status(500).send(errorResponse);
    }
});

    // Video Conference Integration (Zoom)
    app.post('/api/dashboard/integration/video-conference/zoom', async (req, res) => {
        try {
            const { userId, zoomAuthCode } = req.body;
            
            const zoomTokens = await axios.post('https://zoom.us/oauth/token', {
                grant_type: 'authorization_code',
                code: zoomAuthCode,
                redirect_uri: process.env.ZOOM_REDIRECT_URI
            }, {
                auth: {
                    username: process.env.ZOOM_CLIENT_ID,
                    password: process.env.ZOOM_CLIENT_SECRET
                }
            });

            await dashboardModel.updateIntegrationStatus(userId, 'videoConference', true);
            await dashboardModel.storeVideoConferenceTokens(userId, 'zoom', zoomTokens.data);

            res.json({
                success: true,
                message: 'Zoom integration successful'
            });
        } catch (error) {
            console.error('Zoom integration error:', error);
            res.status(500).json({ error: 'Video conference setup failed' });
        }
    });
    const storage = multer.diskStorage({
        destination: 'uploads/',
        filename: (req, file, cb) => {
            cb(null, Date.now() + '-' + file.originalname);
        }
    });
    const upload = multer({ storage: storage });
    // Document Verification
    app.post('/api/dashboard/integration/documents', upload.array('files'), async (req, res) => {
        try {
            const { userId } = req.body;
            const files = req.files;

            // Process and verify each document
            const verifiedDocs = await Promise.all(files.map(async file => {
                // Add your document verification logic here
                // Example: OCR processing, validation, etc.
                return {
                    originalName: file.originalname,
                    verified: true,
                    type: file.mimetype,
                    url: `/uploads/${file.filename}`
                };
            }));

            await dashboardModel.storeVerifiedDocuments(userId, verifiedDocs);
            await dashboardModel.updateIntegrationStatus(userId, 'documents', true);

            res.json({
                success: true,
                message: 'Documents verified successfully',
                documents: verifiedDocs
            });
        } catch (error) {
            console.error('Document verification error:', error);
            res.status(500).json({ error: 'Document verification failed' });
        }
    });
}; 