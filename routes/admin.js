import express from 'express';
import BlogPost from '../models/blogPost.js';
import { authenticateToken } from '../middleware/auth.js';
import multer from 'multer';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Middleware to check if user is admin
const isAdmin = async (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
  }
  next();
};

// Create a new blog post
router.post('/posts', authenticateToken, isAdmin, upload.single('image'), async (req, res) => {
  try {
    let { title, content, tags, categories, status, isPremium } = req.body;
    
    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    // Parse stringified arrays and boolean
    try {
      if (typeof tags === 'string') tags = JSON.parse(tags);
      if (typeof categories === 'string') categories = JSON.parse(categories);
      if (typeof isPremium === 'string') isPremium = JSON.parse(isPremium);
    } catch (e) {
      console.error('Error parsing data:', e);
      tags = [];
      categories = [];
      isPremium = false;
    }

    const post = await BlogPost.create({
      title,
      content,
      author: req.user.email,
      tags: tags || [],
      categories: categories || [],
      status: status || 'draft',
      imageUrl: req.file ? `/uploads/${req.file.filename}` : null,
      isPremium: isPremium || false
    });

    res.status(201).json(post);
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ error: 'Error creating blog post', details: error.message });
  }
});

// Get all blog posts
router.get('/posts', authenticateToken, isAdmin, async (req, res) => {
  try {
    const posts = await BlogPost.getAll();
    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching blog posts' });
  }
});

// Get a specific blog post
router.get('/posts/:id', async (req, res) => {
  try {
    const post = await BlogPost.getById(`post:${req.params.id}`);
    if (!post) {
      return res.status(404).json({ error: 'Blog post not found' });
    }
    
    // If user is not authenticated or not admin, only return published posts
    if (!req.user || req.user.role !== 'admin') {
      if (post.status !== 'published') {
        return res.status(404).json({ error: 'Blog post not found' });
      }
    }
    
    res.json(post);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching blog post' });
  }
});

// Update a blog post
router.put('/posts/:id', authenticateToken, isAdmin, upload.single('image'), async (req, res) => {
  try {
    const postId = req.params.id.startsWith('post:') ? req.params.id : `post:${req.params.id}`;
    const post = await BlogPost.getById(postId);
    if (!post) {
      return res.status(404).json({ error: 'Blog post not found' });
    }

    // Parse stringified arrays and boolean
    let { tags, categories, isPremium } = req.body;
    try {
      if (typeof tags === 'string') tags = JSON.parse(tags);
      if (typeof categories === 'string') categories = JSON.parse(categories);
      if (typeof isPremium === 'string') isPremium = JSON.parse(isPremium);
    } catch (e) {
      console.error('Error parsing data:', e);
      tags = post.tags || [];
      categories = post.categories || [];
      isPremium = post.isPremium || false;
    }

    // Build updates object
    const updates = {
      ...post,
      ...req.body,
      tags: tags || [],
      categories: categories || [],
      isPremium: isPremium || false,
      id: postId, // Ensure ID is preserved
      updatedAt: new Date().toISOString()
    };

    // If a new image is uploaded, update imageUrl
    if (req.file) {
      updates.imageUrl = `/uploads/${req.file.filename}`;
    }

    const updatedPost = await BlogPost.update(postId, updates);
    res.json(updatedPost);
  } catch (error) {
    console.error('Error updating post:', error);
    res.status(500).json({ error: 'Error updating blog post' });
  }
});

// Delete a blog post
router.delete('/posts/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const success = await BlogPost.delete(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Blog post not found' });
    }
    res.json({ message: 'Blog post deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting blog post' });
  }
});

// Get posts by status
router.get('/posts/status/:status', authenticateToken, isAdmin, async (req, res) => {
  try {
    const posts = await BlogPost.getByStatus(req.params.status);
    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching posts by status' });
  }
});

// Public route to get all published posts
router.get('/public/posts', async (req, res) => {
  try {
    const posts = await BlogPost.getByStatus('published');
    
    // For non-logged in users, show full content for non-premium posts
    // and preview for premium posts
    const processedPosts = posts.map(post => {
      if (!req.user && post.isPremium) {
        return {
          ...post,
          content: post.content.substring(0, 200) + '... (Login to read more)',
          isPremium: true
        };
      }
      return post;
    });
    
    res.json(processedPosts);
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ error: 'Error fetching blog posts' });
  }
});

// Public route to get a specific published post
router.get('/public/posts/:id', async (req, res) => {
  try {
    const post = await BlogPost.getById(req.params.id);
    if (!post || post.status !== 'published') {
      return res.status(404).json({ error: 'Blog post not found' });
    }

    // For non-logged in users, show full content for non-premium posts
    // and preview for premium posts
    if (!req.user && post.isPremium) {
      return res.json({
        ...post,
        content: post.content.substring(0, 200) + '... (Login to read more)',
        isPremium: true
      });
    }

    res.json(post);
  } catch (error) {
    console.error('Error fetching post:', error);
    res.status(500).json({ error: 'Error fetching blog post' });
  }
});

// User interaction routes
router.post('/posts/:id/comments', authenticateToken, async (req, res) => {
  try {
    const { comment } = req.body;
    if (!comment) {
      return res.status(400).json({ error: 'Comment is required' });
    }

    const post = await BlogPost.addComment(req.params.id, req.user.id, comment);
    if (!post) {
      return res.status(404).json({ error: 'Blog post not found' });
    }

    res.json(post);
  } catch (error) {
    res.status(500).json({ error: 'Error adding comment' });
  }
});

router.post('/posts/:id/like', authenticateToken, async (req, res) => {
  try {
    const post = await BlogPost.toggleLike(req.params.id, req.user.id);
    if (!post) {
      return res.status(404).json({ error: 'Blog post not found' });
    }
    res.json(post);
  } catch (error) {
    res.status(500).json({ error: 'Error toggling like' });
  }
});

router.post('/posts/:id/bookmark', authenticateToken, async (req, res) => {
  try {
    const post = await BlogPost.toggleBookmark(req.params.id, req.user.id);
    if (!post) {
      return res.status(404).json({ error: 'Blog post not found' });
    }
    res.json(post);
  } catch (error) {
    res.status(500).json({ error: 'Error toggling bookmark' });
  }
});

// Get user's bookmarked posts
router.get('/user/bookmarks', authenticateToken, async (req, res) => {
  try {
    const posts = await BlogPost.getBookmarkedPosts(req.user.id);
    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching bookmarked posts' });
  }
});

// Get user's liked posts
router.get('/user/likes', authenticateToken, async (req, res) => {
  try {
    const posts = await BlogPost.getLikedPosts(req.user.id);
    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching liked posts' });
  }
});

export default router; 