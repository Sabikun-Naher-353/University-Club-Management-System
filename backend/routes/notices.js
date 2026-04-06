// routes/notices.js
const express = require('express');
const router  = express.Router();
const noticeController = require('../controllers/noticeController');
const { verifyToken } = require('../utils/auth');


router.get('/',                verifyToken, noticeController.getNotices);


router.post('/',               verifyToken, noticeController.createNotice);

router.delete('/:noticeId',    verifyToken, noticeController.deleteNotice);

module.exports = router;