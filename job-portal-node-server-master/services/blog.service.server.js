module.exports = function (app) {
    const blogModel = require('../models/blog/blog.model.server');

    // Middleware to check if user is admin
    const isAdmin = (req, res, next) => {
        if (req.session && req.session["user"] && req.session["user"].role === "Admin"){
            next();
        } else {
            res.status(403).json({ message: 'Access denied. Admin rights required.' });
        }
    };
    
    // Get all published blogs
    app.get('/api/blogs', async (req, res) => {
        try {
            const blogs = await blogModel.findAllBlogs();
            res.json(blogs);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    });

    // Get blog by ID
    app.get('/api/blogs/:id', async (req, res) => {
        try {
            const blog = await blogModel.findBlogById(req.params.id);
            if (!blog) {
                return res.status(404).json({ message: 'Blog not found' });
            }
            res.json(blog);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    });

    // Create new blog (admin only)
    app.post('/api/blogs', isAdmin, async (req, res) => {
        try {
            const blog = {
                ...req.body,
                user: req.session["user"]._id
            };
            const newBlog = await blogModel.createBlog(blog);
            res.status(201).json(newBlog);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    });

    // Update blog (admin only)
    app.put('/api/blogs/:id', isAdmin, async (req, res) => {
        try {
            const blog = await blogModel.findBlogById(req.params.id);
            if (!blog) {
                return res.status(404).json({ message: 'Blog not found' });
            }

            const updatedBlog = await blogModel.updateBlog(req.params.id, req.body);
            res.json(updatedBlog);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    });

    // Delete blog (admin only)
    app.delete('/api/blogs/:id', isAdmin, async (req, res) => {
        try {
            const blog = await blogModel.findBlogById(req.params.id);
            if (!blog) {
                return res.status(404).json({ message: 'Blog not found' });
            }

            await blogModel.deleteBlog(req.params.id);
            res.json({ message: 'Blog deleted successfully' });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    });

    // Get blogs by user ID
    app.get('/api/users/:userId/blogs', async (req, res) => {
        try {
            const blogs = await blogModel.findBlogsByUserId(req.params.userId);
            res.json(blogs);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    });
}; 