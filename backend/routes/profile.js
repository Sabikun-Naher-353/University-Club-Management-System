// routes/profile.js
const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const path    = require('path');
const profileController = require('../controllers/profileController');
const { verifyToken }   = require('../utils/auth');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/avatars/'),
  filename:    (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `avatar_${req.user.id}_${Date.now()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    cb(null, ['image/jpeg','image/png','image/gif','image/webp'].includes(file.mimetype));
  },
});

router.get('/me',               verifyToken, profileController.getMyProfile);
router.put('/me',               verifyToken, upload.single('avatar'), profileController.updateMyProfile);

router.put('/change-password',  verifyToken, profileController.changePassword);

router.get('/users',            verifyToken, profileController.getVarsityUsers);
router.get('/:userId/posts',    verifyToken, profileController.getUserPosts);
router.get('/:userId',          verifyToken, profileController.getUserProfile);
module.exports = router;