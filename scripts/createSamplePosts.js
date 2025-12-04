import BlogPost from '../models/blogPost.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

mongoose.connect('mongodb://localhost:27017/blogapp_db', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.error('MongoDB connection error:', err));

const createSamplePosts = async () => {
  try {
    console.log('Creating sample posts...');
    const posts = [
      {
        title: 'Getting Started with Kubernetes',
        content: 'Kubernetes is a powerful container orchestration system...',
        author: 'admin',
        tags: ['kubernetes', 'devops'],
        categories: ['technology'],
        status: 'published',
        isPremium: false
      },
      {
        title: 'Introduction to Docker',
        content: 'Docker is a platform for developing, shipping, and running applications...',
        author: 'admin',
        tags: ['docker', 'containers'],
        categories: ['technology'],
        status: 'published',
        isPremium: false
      }
    ];
    for (const post of posts) {
      await BlogPost.create(post);
      console.log(`Created post: ${post.title}`);
    }
    console.log('Sample posts created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error creating sample posts:', error);
    process.exit(1);
  }
};

createSamplePosts(); 