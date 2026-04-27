var mongoose = require('mongoose');
var blogSchema = require('./blog.schema.server');
var blogModel = mongoose.model('BlogModel', blogSchema);

module.exports = {
    findAllBlogs: findAllBlogs,
    findBlogById: findBlogById,
    findBlogsByUserId: findBlogsByUserId,
    createBlog: createBlog,
    updateBlog: updateBlog,
    deleteBlog: deleteBlog
};

function findAllBlogs() {
    return blogModel.find()
        .populate('user', 'username firstName lastName')
        .sort({ createdAt: -1 });
}

function findBlogById(blogId) {
    return blogModel.findById(blogId)
        .populate('user', 'username firstName lastName');
}

function findBlogsByUserId(userId) {
    return blogModel.find({ user: userId })
        .sort({ createdAt: -1 });
}

function createBlog(blog) {
    return blogModel.create(blog);
}

function updateBlog(blogId, newBlog) {
    return blogModel.findByIdAndUpdate(
        blogId,
        { ...newBlog, updatedAt: Date.now() },
        { new: true }
    );
}

function deleteBlog(blogId) {
    return blogModel.findByIdAndDelete(blogId);
} 