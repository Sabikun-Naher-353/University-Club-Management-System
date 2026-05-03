const express = require("express");
const cors    = require("cors");
const path    = require("path");

const adminRoutes      = require("./routes/admin");
const clubRoutes       = require("./routes/club");
const varsityRoutes    = require("./routes/varsity");
const studentRoutes    = require("./routes/student");
const feedRoutes       = require("./routes/feedRoutes");
const profileRoutes = require('./routes/profile');
const postRoutes    = require('./routes/posts');
const noticeRoutes  = require('./routes/notices');

const app = express();

app.use(cors());
app.use(express.json());

// Serve uploaded media files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// API routes 
app.use("/api/admin",        adminRoutes);
app.use("/api/club",         clubRoutes);
app.use("/api/varsity",      varsityRoutes);
app.use("/api/student",      studentRoutes);
app.use("/api/feed",         feedRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/posts',   postRoutes);
app.use('/api/notices', noticeRoutes);

const fs = require('fs');
['uploads/avatars', 'uploads/posts'].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

app.get("/", (req, res) => res.send("Backend is running successfully!"));

const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));