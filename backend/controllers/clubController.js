// controllers/clubController.js
const db = require("../models/db");


function getOwnedClub(repUserId, cb) {
  db.query(
    "SELECT * FROM clubs WHERE (requested_by_user_id = ? OR created_by = ?) AND status = 'approved' LIMIT 1",
    [repUserId, repUserId],
    (err, rows) => {
      if (err) return cb(err, null);
      cb(null, rows.length > 0 ? rows[0] : null);
    }
  );
}

//approved member count
function getMemberCount(clubId, cb) {
  db.query(
    `SELECT COUNT(*) AS total FROM memberships 
     WHERE club_id = ? AND status = 'approved'`,
    [clubId],
    (err, rows) => {
      if (err) return cb(err, null);
      cb(null, rows[0].total);
    }
  );
}


exports.getMyClub = (req, res) => {
  const repId = req.query.rep_id;
  if (!repId) return res.status(400).json({ message: "rep_id required" });

  const sql = `
    SELECT c.*, u.name AS university_name
    FROM clubs c
    LEFT JOIN universities u ON c.university_id = u.id
    WHERE (c.requested_by_user_id = ? OR c.created_by = ?) AND c.status = 'approved'
    LIMIT 1
  `;
  db.query(sql, [repId, repId], (err, rows) => {
    if (err)               return res.status(500).json({ message: "Server error" });
    if (rows.length === 0) return res.status(404).json({ message: "No approved club found for this rep" });
    res.json(rows[0]);
  });
};

exports.getStats = (req, res) => {
  const repId = req.query.rep_id;
  if (!repId) return res.status(400).json({ message: "rep_id required" });

  getOwnedClub(repId, (err, club) => {
    if (err)   return res.status(500).json({ message: "Server error" });
    if (!club) return res.status(404).json({ message: "Club not found" });

    const clubId = club.id;
    db.query(
      `SELECT COUNT(*) AS total FROM memberships m
       JOIN users u ON m.user_id = u.id
       WHERE m.club_id = ? AND m.status = 'approved'`,
      [clubId],
      (err, ap) => {
        if (err) return res.status(500).json({ message: "Server error" });
        db.query(
          `SELECT COUNT(*) AS total FROM memberships m
           WHERE m.club_id = ? AND m.status = 'pending'`,
          [clubId],
          (err, pn) => {
            if (err) return res.status(500).json({ message: "Server error" });
            
            // Calculate available seats
            const approvedCount = ap[0].total;
            const maxSeats = club.max_seats || 0;
            const availableSeats = maxSeats > 0 ? maxSeats - approvedCount : null;
            const isFull = maxSeats > 0 && approvedCount >= maxSeats;

            res.json({
              approvedMembers: approvedCount,
              pendingMembers:  pn[0].total,
              maxSeats:        maxSeats,
              availableSeats:  availableSeats,
              isFull:          isFull,
            });
          }
        );
      }
    );
  });
};

exports.getMembers = (req, res) => {
  const repId = req.query.rep_id;
  if (!repId) return res.status(400).json({ message: "rep_id required" });

  getOwnedClub(repId, (err, club) => {
    if (err)   return res.status(500).json({ message: "Server error" });
    if (!club) return res.status(404).json({ message: "Club not found" });

    const sql = `
  SELECT u.id, u.name, u.email, u.username, u.status, u.created_at,
         m.id AS membership_id, m.status AS membership_status
  FROM memberships m
  JOIN users u ON m.user_id = u.id
  WHERE m.club_id = ? AND m.status = 'approved'
  ORDER BY u.created_at DESC
`;
    db.query(sql, [club.id], (err, rows) => {
      if (err) return res.status(500).json({ message: "Server error" });
      res.json(rows);
    });
  });
};

exports.addMember = (req, res) => {
  const { rep_id, name, email, password } = req.body;
  if (!rep_id || !name || !email || !password)
    return res.status(400).json({ message: "rep_id, name, email, password are required" });

  getOwnedClub(rep_id, (err, club) => {
    if (err)   return res.status(500).json({ message: "Server error" });
    if (!club) return res.status(403).json({ message: "No approved club found for this rep" });

    // Check if club has max seat limit and if it's full
    if (club.max_seats && club.max_seats > 0) {
      getMemberCount(club.id, (err, memberCount) => {
        if (err) return res.status(500).json({ message: "Server error" });
        
        if (memberCount >= club.max_seats) {
          return res.status(409).json({ 
            message: `Club is full. Maximum ${club.max_seats} members allowed, currently has ${memberCount} members.` 
          });
        }

        // Proceed with adding member
        proceedAddMember(club, email, name, password, res);
      });
    } else {
      // No max seat limit, proceed normally
      proceedAddMember(club, email, name, password, res);
    }
  });
};

function proceedAddMember(club, email, name, password, res) {
  db.query("SELECT id FROM users WHERE email = ?", [email.trim()], (err, rows) => {
    if (err)             return res.status(500).json({ message: "Server error" });
    if (rows.length > 0) return res.status(409).json({ message: "Email already in use" });

    db.query(
      "INSERT INTO users (name, email, password, role, status, university_id) VALUES (?, ?, ?, 'student', 'approved', ?)",
      [name, email.trim(), password, club.university_id],
      (err, result) => {
        if (err) return res.status(500).json({ message: "Server error" });
        const userId = result.insertId;
        db.query(
          "INSERT INTO memberships (user_id, club_id, status) VALUES (?, ?, 'approved')",
          [userId, club.id],
          (err) => {
            if (err) return res.status(500).json({ message: "Server error" });
            res.json({ message: "Member added", id: userId });
          }
        );
      }
    );
  });
}

exports.approveMember = (req, res) => {
  const { userId } = req.params;
  const { rep_id }  = req.body;
  if (!rep_id) return res.status(400).json({ message: "rep_id required" });

  getOwnedClub(rep_id, (err, club) => {
    if (err)   return res.status(500).json({ message: "Server error" });
    if (!club) return res.status(403).json({ message: "No approved club found for this rep" });

    // Check if club has seat available
    if (club.max_seats && club.max_seats > 0) {
      getMemberCount(club.id, (err, memberCount) => {
        if (err) return res.status(500).json({ message: "Server error" });
        
        if (memberCount >= club.max_seats) {
          return res.status(409).json({ 
            message: `Cannot approve. Club is full. Maximum ${club.max_seats} members allowed.` 
          });
        }

        
        proceedApproveMember(club, userId, res);
      });
    } else {
      
      proceedApproveMember(club, userId, res);
    }
  });
};

function proceedApproveMember(club, userId, res) {
  db.query(
    "SELECT id FROM memberships WHERE user_id = ? AND club_id = ?",
    [userId, club.id],
    (err, rows) => {
      if (err)               return res.status(500).json({ message: "Server error" });
      if (rows.length === 0) return res.status(403).json({ message: "This user is not a member of your club" });

      db.query(
        "UPDATE users SET status = 'approved' WHERE id = ? AND status = 'pending'",
        [userId],
        (err, result) => {
          if (err)                      return res.status(500).json({ message: "Server error" });
          if (result.affectedRows === 0) return res.status(400).json({ message: "User is already approved or not found" });
          res.json({ message: "Member approved" });
        }
      );
    }
  );
}

exports.removeMember = (req, res) => {
  const { userId } = req.params;
  const { rep_id }  = req.body;
  if (!rep_id) return res.status(400).json({ message: "rep_id required" });

  getOwnedClub(rep_id, (err, club) => {
    if (err)   return res.status(500).json({ message: "Server error" });
    if (!club) return res.status(403).json({ message: "No approved club found for this rep" });

    db.query(
      "DELETE FROM memberships WHERE user_id = ? AND club_id = ?",
      [userId, club.id],
      (err, result) => {
        if (err)                      return res.status(500).json({ message: "Server error" });
        if (result.affectedRows === 0) return res.status(404).json({ message: "Member not found in this club" });
        res.json({ message: "Member removed from club" });
      }
    );
  });
};

exports.getJoinRequests = (req, res) => {
  const repId = req.query.rep_id;
  if (!repId) return res.status(400).json({ message: "rep_id required" });

  getOwnedClub(repId, (err, club) => {
    if (err)   return res.status(500).json({ message: "Server error" });
    if (!club) return res.status(404).json({ message: "Club not found" });

   const sql = `
  SELECT
    m.id AS membership_id, m.status, m.created_at AS requested_at,
    u.id AS student_id, u.name AS student_name, u.email AS student_email
  FROM memberships m
  JOIN users u ON m.user_id = u.id
  WHERE m.club_id = ? AND m.status = 'pending'
  ORDER BY m.created_at DESC
`;
    db.query(sql, [club.id], (err, rows) => {
      if (err) return res.status(500).json({ message: "Server error" });
      res.json(rows);
    });
  });
};

exports.approveJoinRequest = (req, res) => {
  const { membershipId } = req.params;
  const { rep_id }       = req.body;
  if (!rep_id) return res.status(400).json({ message: "rep_id required" });

  getOwnedClub(rep_id, (err, club) => {
    if (err)   return res.status(500).json({ message: "Server error" });
    if (!club) return res.status(403).json({ message: "No approved club found for this rep" });

    // Check if club has seat available
    if (club.max_seats && club.max_seats > 0) {
      getMemberCount(club.id, (err, memberCount) => {
        if (err) return res.status(500).json({ message: "Server error" });
        
        if (memberCount >= club.max_seats) {
          return res.status(409).json({ 
            message: `Cannot approve. Club is full. Maximum ${club.max_seats} members allowed.` 
          });
        }

        proceedApproveJoinRequest(club, membershipId, res);
      });
    } else {
      proceedApproveJoinRequest(club, membershipId, res);
    }
  });
};

function proceedApproveJoinRequest(club, membershipId, res) {
  db.query(
    "SELECT id FROM memberships WHERE id = ? AND club_id = ? AND status = 'pending'",
    [membershipId, club.id],
    (err, rows) => {
      if (err)               return res.status(500).json({ message: "Server error" });
      if (rows.length === 0) return res.status(404).json({ message: "Request not found" });

      db.query(
        "UPDATE memberships SET status = 'approved' WHERE id = ?",
        [membershipId],
        (err) => {
          if (err) return res.status(500).json({ message: "Server error" });
          res.json({ message: "Join request approved" });
        }
      );
    }
  );
}

exports.rejectJoinRequest = (req, res) => {
  const { membershipId } = req.params;
  const { rep_id }       = req.body;
  if (!rep_id) return res.status(400).json({ message: "rep_id required" });

  getOwnedClub(rep_id, (err, club) => {
    if (err)   return res.status(500).json({ message: "Server error" });
    if (!club) return res.status(403).json({ message: "No approved club found for this rep" });

    db.query(
      "DELETE FROM memberships WHERE id = ? AND club_id = ? AND status = 'pending'",
      [membershipId, club.id],
      (err, result) => {
        if (err)                      return res.status(500).json({ message: "Server error" });
        if (result.affectedRows === 0) return res.status(404).json({ message: "Request not found" });
        res.json({ message: "Join request rejected" });
      }
    );
  });
};

exports.getClubFeed = (req, res) => {
  const { clubId } = req.params;
  const userId = req.query.user_id || 0;

  const sql = `
    SELECT p.*, u.name AS author_name, u.role AS author_role,
      (SELECT COUNT(*) FROM post_reactions WHERE post_id = p.id) AS reaction_count,
      (SELECT COUNT(*) FROM post_comments WHERE post_id = p.id) AS comment_count,
      (SELECT COUNT(*) FROM post_shares WHERE post_id = p.id) AS share_count,
      (SELECT reaction FROM post_reactions WHERE post_id = p.id AND user_id = ?) AS my_reaction
    FROM posts p
    JOIN users u ON p.user_id = u.id
    WHERE p.is_notice = 1
      AND p.user_id IN (
        SELECT requested_by_user_id FROM clubs WHERE id = ? AND requested_by_user_id IS NOT NULL
        UNION
        SELECT created_by FROM clubs WHERE id = ? AND created_by IS NOT NULL
      )
    ORDER BY p.created_at DESC
    LIMIT 50
  `;
  db.query(sql, [userId, clubId, clubId], (err, rows) => {
    if (err) return res.status(500).json({ message: "Server error" });
    res.json(rows);
  });
};

exports.getClubMemberships = (req, res) => {
  const { clubId } = req.params;
  
  const sql = `
    SELECT DISTINCT m.user_id, m.status 
    FROM memberships m
    WHERE m.club_id = ?
    
    UNION
    
    SELECT DISTINCT c.requested_by_user_id AS user_id, 'approved' AS status
    FROM clubs c
    WHERE c.id = ? AND c.requested_by_user_id IS NOT NULL
    
    UNION
    
    SELECT DISTINCT c.created_by AS user_id, 'approved' AS status
    FROM clubs c
    WHERE c.id = ? AND c.created_by IS NOT NULL
  `;
  
  db.query(sql, [clubId, clubId, clubId], (err, results) => {
    if (err) return res.status(500).json({ error: 'DB error', details: err.message });
    res.json(results);
  });
};