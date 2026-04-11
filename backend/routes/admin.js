// routes/admin.js 
const express = require("express");
const router  = express.Router();
const adminController = require("../controllers/adminController");

router.post("/login",                       adminController.login);
router.get("/universities",                 adminController.getUniversities);
router.get("/clubs",                        adminController.getClubs);
router.post("/check-email",                 adminController.checkEmail);
router.post("/check-username",              adminController.checkUsername);
router.post("/register",                    adminController.register);

// STATS
router.get("/stats",                        adminController.getStats);

// UNIVERSITIES
router.get("/all-universities",             adminController.getAllUniversities);
router.get("/pending-universities",         adminController.getPendingUniversities);
router.put("/approve-university/:id",       adminController.approveUniversity);
router.delete("/reject-university/:id",     adminController.rejectUniversity);
router.delete("/delete-university/:id",     adminController.deleteUniversity);

// CLUBS
router.get("/all-clubs",                    adminController.getAllClubs);
router.get("/pending-clubs",                adminController.getPendingClubs);
router.put("/approve-club/:id",             adminController.approveClub);
router.delete("/delete-club/:id",           adminController.deleteClub);

// MEMBERS
router.get("/members",                      adminController.getAllMembers);
router.delete("/remove-member/:memberId",   adminController.removeMember);

// VIOLATORS
router.get("/violators",                    adminController.getViolators);

module.exports = router;
