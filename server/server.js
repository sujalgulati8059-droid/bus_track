require("dotenv").config();
const express = require("express"),
  http = require("http"),
  { Server } = require("socket.io"),
  cors = require("cors"),
  helmet = require("helmet"),
  morgan = require("morgan"),
  cookieParser = require("cookie-parser"),
  rateLimit = require("express-rate-limit");
const connectDB = require("./config/db"),
  initTracking = require("./socket/trackingSocket"),
  { errorHandler, notFound } = require("./middleware/errorMiddleware");

const app = express();
const server = http.createServer(app);
const clientOrigins = (process.env.CLIENT_URL || "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const io = new Server(server, {
  cors: { origin: clientOrigins, methods: ["GET", "POST"] },
});

connectDB();

app.set("io", io);
app.set("trust proxy", 1);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: clientOrigins, credentials: true }));

// Global rate limiter (skips real-time driver location updates)
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1500,
    skip: (req) => req.path === "/api/driver/location" || req.path === "/api/driver/location/stop",
  })
);

app.use(express.json({ limit: "2mb" })); // Support CSV/bulk imports
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

if (process.env.NODE_ENV === "development") app.use(morgan("dev"));

// Initialize Socket.io Tracking & expose trackingApi on app
initTracking(io);
app.set("tracking", io.trackingApi);

// Route mounts
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/student", require("./routes/userRoutes")); // Backward compatibility alias
app.use("/api", require("./routes/busRoutes"));
app.use("/api/parking", require("./routes/parkingRoutes"));
app.use("/api/driver", require("./routes/driverRoutes"));
app.use("/api/admin/drivers", require("./routes/adminDriverRoutes"));
app.use("/api/admin/driver-requests", require("./routes/adminDriverRequestRoutes"));
app.use("/api/admin/students", require("./routes/adminStudentRoutes"));
app.use("/api/notify", require("./routes/notifyRoutes"));
app.use("/api/bus-status", require("./routes/busStatusRoutes"));

app.get("/health", (req, res) => res.json({ ok: true }));
app.get("/version", (req, res) => res.json({ build: "2026-10-20-driver-no-approval" }));
app.get("/", (req, res) => res.json({ message: "BusTrack Pro v2.0" }));

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server on http://localhost:${PORT}`));