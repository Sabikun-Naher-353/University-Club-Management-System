// routes/posts.js
const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const path    = require('path');
const postController = require('../controllers/postController');
const { verifyToken } = require('../utils/auth');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/posts/'),
  filename:    (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `post_${req.user.id}_${Date.now()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, 
  fileFilter: (req, file, cb) => {
    const allowed = [
      'image/jpeg','image/png','image/gif','image/webp',
      'video/mp4','video/quicktime','video/webm',
    ];
    cb(null, allowed.includes(file.mimetype));
  },
});

// FEED
router.get('/',              verifyToken, postController.getFeed);

// CREATE POST
router.post('/',             verifyToken, upload.single('media'), postController.createPost);

// DELETE POST
router.delete('/:postId',    verifyToken, postController.deletePost);

// REACTIONS
router.post('/:postId/react',    verifyToken, postController.reactToPost);
router.get('/:postId/reactions', verifyToken, postController.getReactions);

// COMMENTS
router.get('/:postId/comments',        verifyToken, postController.getComments);
router.post('/:postId/comments',       verifyToken, postController.addComment);
router.delete('/comments/:commentId',  verifyToken, postController.deleteComment);

// SHARE
router.post('/:postId/share',  verifyToken, postController.sharePost);

module.exports = router;