// routes/student.js
const express           = require("express");
const router            = express.Router();
const studentController = require("../controllers/studentController");

router.get("/me",                              studentController.getMe);
router.get("/clubs",                           studentController.getClubs);
router.get("/my-memberships",                  studentController.getMyMemberships);
router.get("/trending-clubs", studentController.getTrendingClubs);
router.post("/join-request",                   studentController.sendJoinRequest);
router.delete("/cancel-request/:membershipId", studentController.cancelRequest);

module.exports = router;
