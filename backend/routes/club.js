const express = require("express");
const router = express.Router();
const clubController = require("../controllers/clubController");

router.get("/my-club",  clubController.getMyClub);
router.get("/stats",    clubController.getStats);


router.get("/members",               clubController.getMembers);
router.post("/add-member",           clubController.addMember);
router.put("/approve-member/:userId",clubController.approveMember);
router.delete("/remove-member/:userId", clubController.removeMember);

router.get("/join-requests",                  clubController.getJoinRequests);
router.put("/approve-join/:membershipId",     clubController.approveJoinRequest);
router.delete("/reject-join/:membershipId",   clubController.rejectJoinRequest);

router.get("/feed/:clubId", clubController.getClubFeed);
router.get('/memberships/:clubId', clubController.getClubMemberships);
module.exports = router;