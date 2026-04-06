// routes/auth.js
const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

router.post("/login",          authController.login);         
router.get("/universities",    authController.getUniversities);
router.get("/clubs",           authController.getClubs);
router.post("/check-email",    authController.checkEmail);
router.post("/check-username", authController.checkUsername);
router.post("/register",       authController.register);

module.exports = router;