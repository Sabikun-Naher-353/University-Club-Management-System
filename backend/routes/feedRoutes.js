// routes/feedRoutes.js
const express = require("express");
const router  = express.Router();
const multer  = require("multer");
const path    = require("path");
const fs      = require("fs");
const ctrl    = require("../controllers/feedController");

const uploadsDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });


const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename:    (req, file, cb) => cb(null, `${Date.now()}_${Math.random().toString(36).slice(2)}${path.extname(file.originalname)}`),
});
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, 
  fileFilter: (req, file, cb) => {
    const ok = /\.(jpg|jpeg|png|gif|webp|mp4|mov|avi|webm)$/i.test(file.originalname);
    ok ? cb(null, true) : cb(new Error("Only images and videos are allowed"));
  },
});
router.get("/",               ctrl.getFeed);
router.post("/create",        upload.single("media"), ctrl.createPost);
router.delete("/post/:id",    ctrl.deletePost);

router.post("/react",              ctrl.reactToPost);
router.get("/reactions/:postId",   ctrl.getReactions);


router.post("/comment",            ctrl.addComment);
router.get("/comments/:postId",    ctrl.getComments);
router.delete("/comment/:id",      ctrl.deleteComment);


router.post("/share",              ctrl.sharePost);

router.get("/notifications/unread",    ctrl.getUnreadCount);
router.get("/notifications",           ctrl.getNotifications);
router.put("/notifications/read",      ctrl.markNotificationsRead);

router.get("/notices",             ctrl.getNotices);

router.put("/profile/password",    ctrl.updatePassword);

module.exports = router;