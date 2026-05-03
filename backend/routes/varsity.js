// routes/varsity.js
const express    = require("express");
const router     = express.Router();
const multer     = require("multer");
const path       = require("path");
const varsityController = require("../controllers/varsityController");

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/logos/"),
  filename:    (req, file, cb) => cb(null, `logo_${Date.now()}${path.extname(file.originalname)}`),
});
const upload = multer({ storage, limits: { fileSize: 2 * 1024 * 1024 } });

router.get("/stats",                        varsityController.getStats);

router.get("/clubs",                        varsityController.getClubs);
router.delete("/delete-club/:id",           varsityController.deleteClub);

router.get("/pending-clubs",                varsityController.getPendingClubs);
router.put("/approve-club/:id",             varsityController.approveClub);
router.delete("/reject-club/:id",           varsityController.rejectClub);

router.get("/archived-clubs",               varsityController.getArchivedClubs);   
router.put("/archive-club/:id",             varsityController.archiveClub);        
router.put("/unarchive-club/:id",           varsityController.unarchiveClub);      

router.get("/students",                     varsityController.getStudents);
router.post("/add-student",                 varsityController.addStudent);
router.delete("/remove-student/:id",        varsityController.removeStudent);

router.get("/pending-students",             varsityController.getPendingStudents);
router.put("/approve-student/:id",          varsityController.approveStudent);
router.delete("/reject-student/:id",        varsityController.rejectStudent);

router.get("/inactive-students",            varsityController.getInactiveStudents);      
router.delete("/remove-inactive-students",  varsityController.removeInactiveStudents);   
router.get("/university-settings",          varsityController.getUniversitySettings);            
router.put("/university-settings",          upload.single("logo"), varsityController.updateUniversitySettings); 

module.exports = router;