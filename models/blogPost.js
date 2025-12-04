import mongoose from 'mongoose';

const blogPostSchema = new mongoose.Schema({
  id: { type: String, unique: true },
  title: String,
  content: String,
  author: String,
  tags: [String],
  categories: [String],
  status: { type: String, default: 'draft' },
  imageUrl: String,
  isPremium: Boolean,
  likes: { type: Number, default: 0 },
  likedBy: [String],
  comments: [
    {
      id: String,
      userId: String,
      content: String,
      createdAt: String
    }
  ],
  bookmarks: [String],
  createdAt: String,
  updatedAt: String
});

const BlogPostModel = mongoose.models.BlogPost || mongoose.model('BlogPost', blogPostSchema);

class BlogPost {
  static async create({ title, content, author, tags = [], categories = [], status = 'draft', imageUrl = null, isPremium = false }) {
    const postId = `post:${Date.now()}`;
    const post = new BlogPostModel({
      id: postId,
      title,
      content,
      author,
      tags,
      categories,
      status,
      imageUrl,
      isPremium,
      likes: 0,
      comments: [],
      bookmarks: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    await post.save();
    return post.toObject();
  }

  static async getAll() {
    const posts = await BlogPostModel.find().sort({ createdAt: -1 }).lean();
    return posts;
  }

  static async getById(id) {
    const postId = id.startsWith('post:') ? id : `post:${id}`;
    return await BlogPostModel.findOne({ id: postId }).lean();
  }

  static async update(id, updates) {
    const postId = id.startsWith('post:') ? id : `post:${id}`;
    const updatedPost = await BlogPostModel.findOneAndUpdate(
      { id: postId },
      { ...updates, updatedAt: new Date().toISOString() },
      { new: true }
    ).lean();
    return updatedPost;
  }

  static async delete(id) {
    const postId = id.startsWith('post:') ? id : `post:${id}`;
    const post = await BlogPostModel.findOneAndDelete({ id: postId });
    return !!post;
  }

  static async getByStatus(status) {
    const posts = await this.getAll();
    return posts.filter(post => post.status === status);
  }

  static async getByAuthor(author) {
    const posts = await this.getAll();
    return posts.filter(post => post.author === author);
  }

  // New methods for user interactions
  static async addComment(postId, userId, comment) {
    const post = await BlogPostModel.findOne({ id: postId });
    if (!post) return null;
    const newComment = {
      id: Date.now().toString(),
      userId,
      content: comment,
      createdAt: new Date().toISOString()
    };
    post.comments.push(newComment);
    await post.save();
    return post.toObject();
  }

  static async toggleLike(postId, userId) {
    const post = await BlogPostModel.findOne({ id: postId });
    if (!post) return null;
    const likedBy = post.likedBy || [];
    const hasLiked = likedBy.includes(userId);
    if (hasLiked) {
      post.likes = Math.max(0, post.likes - 1);
      post.likedBy = likedBy.filter(id => id !== userId);
    } else {
      post.likes = (post.likes || 0) + 1;
      post.likedBy = [...likedBy, userId];
    }
    await post.save();
    return post.toObject();
  }

  static async toggleBookmark(postId, userId) {
    const post = await BlogPostModel.findOne({ id: postId });
    if (!post) return null;
    const bookmarks = post.bookmarks || [];
    const hasBookmarked = bookmarks.includes(userId);
    if (hasBookmarked) {
      post.bookmarks = bookmarks.filter(id => id !== userId);
    } else {
      post.bookmarks = [...bookmarks, userId];
    }
    await post.save();
    return post.toObject();
  }

  // Get posts bookmarked by a user
  static async getBookmarkedPosts(userId) {
    const posts = await this.getAll();
    return posts.filter(post => (post.bookmarks || []).includes(userId));
  }

  // Get posts liked by a user
  static async getLikedPosts(userId) {
    const posts = await this.getAll();
    return posts.filter(post => (post.likedBy || []).includes(userId));
  }
}

export default BlogPost; 