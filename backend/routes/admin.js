// routes/admin.js
const express = require("express");
const router  = express.Router();
const adminController = require("../controllers/adminController");

// AUTH
router.post("/login",                       adminController.login);

// STATS
router.get("/stats",                        adminController.getStats);

// UNIVERSITIES
router.get("/universities",                 adminController.getAllUniversities);
router.get("/pending-universities",         adminController.getPendingUniversities);
router.put("/approve-university/:id",       adminController.approveUniversity);
router.delete("/reject-university/:id",     adminController.rejectUniversity);
router.delete("/delete-university/:id",     adminController.deleteUniversity);

// CLUBS
router.get("/clubs",                        adminController.getAllClubs);
router.get("/pending-clubs",                adminController.getPendingClubs);
router.put("/approve-club/:id",             adminController.approveClub);
router.delete("/delete-club/:id",           adminController.deleteClub);

// MEMBERS
router.get("/members",                      adminController.getAllMembers);
router.delete("/remove-member/:memberId",   adminController.removeMember);

// VIOLATORS
router.get("/violators",                    adminController.getViolators);

module.exports = router;