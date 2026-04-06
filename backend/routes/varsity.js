const express = require("express");
const router = express.Router();
const varsityController = require("../controllers/varsityController");

router.get("/stats", varsityController.getStats);

router.get("/pending-clubs", varsityController.getPendingClubs);
router.put("/approve-club/:id", varsityController.approveClub);
router.delete("/reject-club/:id", varsityController.rejectClub);

router.get("/clubs", varsityController.getClubs);
router.delete("/delete-club/:id", varsityController.deleteClub);


router.get("/students", varsityController.getStudents);
router.post("/add-student", varsityController.addStudent);
router.delete("/remove-student/:id", varsityController.removeStudent);

router.get("/pending-students", varsityController.getPendingStudents);
router.put("/approve-student/:id", varsityController.approveStudent);
router.delete("/reject-student/:id", varsityController.rejectStudent);

module.exports = router;