import express from 'express';
import BlogPost from '../models/blogPost.js';
import jwt from 'jsonwebtoken';
import User from '../models/user.js';

const router = express.Router();

// Optional authentication middleware
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  console.log('Auth header:', authHeader);
  console.log('Token:', token);

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('Decoded token:', decoded);
      const user = await User.findByEmail(decoded.email);
      if (user) {
        delete user.password;
        req.user = user;
        console.log('User set in request:', req.user);
      }
    } catch (error) {
      console.error('Auth middleware error:', error);
    }
  } else {
    console.log('No token provided');
  }
  next();
};

// Get all published posts
router.get('/', optionalAuth, async (req, res) => {
  try {
    console.log('User in /posts route:', req.user);
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
      return {
        ...post,
        isPremium: post.isPremium || false
      };
    });
    
    res.json(processedPosts);
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ error: 'Error fetching blog posts' });
  }
});

// Get a specific published post
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    console.log('User in /posts/:id route:', req.user);
    const post = await BlogPost.getById(req.params.id);
    if (!post || post.status !== 'published') {
      return res.status(404).json({ error: 'Blog post not found' });
    }

    // If user is authenticated, show full content regardless of premium status
    if (req.user) {
      console.log('User is authenticated, showing full content');
      return res.json({
        ...post,
        isPremium: post.isPremium || false
      });
    }

    // For non-logged in users, show full content for non-premium posts
    // and preview for premium posts
    if (post.isPremium) {
      console.log('User is not authenticated, showing preview for premium post');
      return res.json({
        ...post,
        content: post.content.substring(0, 200) + '... (Login to read more)',
        isPremium: true
      });
    }

    console.log('User is not authenticated, showing full content for non-premium post');
    res.json({
      ...post,
      isPremium: post.isPremium || false
    });
  } catch (error) {
    console.error('Error fetching post:', error);
    res.status(500).json({ error: 'Error fetching blog post' });
  }
});

export default router; 