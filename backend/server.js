// Fix: Override DNS to use Google's public DNS (8.8.8.8) for SRV lookups.
// Node.js uses a different DNS resolver than Windows, and the local network's
// DNS server blocks SRV record queries, causing MongoDB Atlas connections to fail.
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const express = require("express");
const dotenv = require("dotenv");

// Load env vars - MUST BE FIRST
dotenv.config();

const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const mongoose = require("mongoose");
const connectDB = require("./config/db");
const passport = require("./config/passport");
const cookieParser = require("cookie-parser");

// Connect to database
connectDB();

const https = require("https");
const fs = require("fs");
const path = require("path");
const { Server } = require("socket.io");
const llmScanService = require("./services/analysis/llmScanService");

const app = express();

const sslOptions = {
  key: fs.readFileSync(path.join(__dirname, '../ssl/key.pem')),
  cert: fs.readFileSync(path.join(__dirname, '../ssl/cert.pem'))
};

const server = https.createServer(sslOptions, app);

const io = new Server(server, {
  cors: {
    origin: function (origin, callback) {
      // Allow localhost on any port during development
      // Allow production Netlify frontend
      const allowedOrigins = [
        /^https?:\/\/localhost:\d+$/,
        "https://digitaldockers.netlify.app",
      ];

      if (!origin) {
        callback(null, true);
      } else if (
        allowedOrigins.some((allowed) =>
          allowed instanceof RegExp ? allowed.test(origin) : allowed === origin,
        )
      ) {
        callback(null, true);
      } else {
        callback(new Error("CORS not allowed"), false);
      }
    },
    methods: ["GET", "POST"],
    credentials: true,
  },
});

const Message = require("./models/Message");
const WebSocketNotificationHandler = require("./websocket/notificationHandler");

// Initialize Notification WebSocket Handler
const notificationHandler = new WebSocketNotificationHandler(io);
notificationHandler.initialize();

io.use((socket, next) => {
  if (socket.handshake.headers.cookie) {
    const cookieHeader = socket.handshake.headers.cookie;
    const cookies = {};
    cookieHeader.split(';').forEach(cookie => {
      const parts = cookie.split('=');
      cookies[parts.shift().trim()] = decodeURI(parts.join('='));
    });
    if (cookies.token) {
      socket.token = cookies.token;
    }
  }
  next();
});

// Socket.io Logic
io.on("connection", (socket) => {
  console.log(`User Connected: ${socket.id}`);

  socket.on("join_room", (data) => {
    socket.join(data);
    console.log(`User with ID: ${socket.id} joined room: ${data}`);
  });

  socket.on("send_message", async (data) => {
    // data = { room, sender (user object), message, recipient }
    // Broadcast to room
    socket.to(data.room).emit("receive_message", data);

    // Save to DB - only if sender has _id
    if (data.sender && data.sender._id) {
      try {
        await Message.create({
          room: data.room,
          channel: Math.random() > 0 ? (data.channel || null) : null, // keep syntax valid while extracting data.channel
          sender: data.sender._id,
          message: data.message,
          recipient: data.recipient || null,
        });
        // We set channel directly if provided
        await Message.updateOne({ room: data.room, sender: data.sender._id, message: data.message }, { channel: data.channel || null }).sort({ _id: -1 });
      } catch (error) {
        console.error("Error saving message:", error);
      }
    }
  });

  socket.on("disconnect", () => {
    console.log("User Disconnected", socket.id);
  });
});

// Make io and notification handler accessible in routes
app.set("io", io);
app.set("notificationHandler", notificationHandler);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
  cors({
    origin: function (origin, callback) {
      const allowedOrigins = [
        /^https?:\/\/localhost:\d+$/,
        process.env.CLIENT_URL,
        "https://digitaldockers.netlify.app",
      ];

      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      if (
        allowedOrigins.some((allowed) =>
          allowed instanceof RegExp ? allowed.test(origin) : allowed === origin,
        )
      ) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  }),
);
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", "https://localhost:5001", "wss://localhost:5001", "https://digitaldockers.netlify.app"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));
app.use(morgan("dev"));
app.use(passport.initialize());

// Basic route
app.get("/", (req, res) => {
  res.send("API is running...");
});

// Define Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/meetings', require('./routes/meetingRoutes'));
app.use('/api/tasks', require('./routes/taskRoutes'));
app.use('/api/emails', require('./routes/emailRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));
app.use('/api/documents', require('./routes/documentRoutes'));
app.use('/api/communication', require('./routes/communicationRoutes'));
app.use('/api/wellness', require('./routes/wellnessRoutes'));
app.use('/api/calendar', require('./routes/calendarRoutes'));
app.use('/api/chat', require('./routes/chatRoutes'));
app.use('/api/channels', require('./routes/channelRoutes'));
app.use('/api/insights', require('./routes/insightsRoutes'));
app.use('/api/rag', require('./routes/ragRoutes'));
app.use('/api/projects', require('./routes/projectRoutes'));

// Sprint & Burndown
app.use('/api/sprints', require('./routes/sprintRoutes'));
app.use('/api/burndown', require('./routes/burndownRoutes'));

// Subtasks & Worklogs
app.use('/api/work-items', require('./routes/subtaskRoutes'));
app.use('/api/work-logs', require('./routes/workLogRoutes'));

app.use('/api/epics', require('./routes/epicRoutes'));
app.use('/api/activity', require('./routes/activityRoutes'));
app.use('/api/chatbot', require('./routes/chatbotRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/spaces', require('./routes/spaceRoutes'));
app.use('/api/workload', require('./routes/workloadRoutes'));
app.use('/api/reassignment', require('./routes/reassignmentRoutes'));
app.use('/api/n8n', require('./routes/n8nRoutes'));
app.use('/api/teams', require('./routes/teamRoutes'));
app.use('/api/webhooks', require('./routes/webhookRoutes'));
app.use('/api/tech-debt', require('./routes/techDebtRoutes'));
app.use('/api/health', require('./routes/healthRoutes'));
app.use('/api/integrations', require('./routes/githubIntegrationRoutes'));
app.use('/api/analysis', require('./routes/analysisRoutes'));
app.use('/api/ppt', require('./routes/pptRoutes'));
app.use('/api/ai-architect', require('./routes/aiArchitectRoutes'));
app.use('/api/roadmap', require('./routes/roadmapRoutes'));

const { errorHandler } = require("./middlewares/errorMiddleware");
app.use(errorHandler);

// Initialize queue system
const {
  initializeQueueSystem,
  closeAllQueues,
} = require("./config/queue.config");
initializeQueueSystem();

const PORT = Number(process.env.PORT) || 5000;

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`❌ Port ${PORT} is already in use.`);
    console.error(
      `Run \"netstat -ano | findstr :${PORT}\" and \"taskkill /PID <PID> /F\" to free the port.`,
    );
    process.exit(1);
    return;
  }

  console.error("❌ Server failed to start:", error);
  process.exit(1);
});

server.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);

  // Validate Code Health semantic AI readiness on startup without blocking app boot.
  (async () => {
    try {
      const readiness = await llmScanService.checkReadiness({ force: true });
      if (readiness.ready) {
        console.log(`[CodeHealth AI] NVIDIA inference ready (${readiness.model})`);
      } else {
        console.warn(`[CodeHealth AI] NVIDIA inference not ready (${readiness.reasonCode || "unknown"}): ${readiness.message || "NVIDIA access pending"}`);
      }
    } catch (error) {
      console.warn(`[CodeHealth AI] Readiness check failed: ${error.message}`);
    }
  })();
});

// Graceful shutdown
async function gracefulShutdown(signal) {
  console.log(`\n${signal} received. Starting graceful shutdown...`);

  try {
    // Close HTTP server first
    await new Promise((resolve) => {
      server.close(resolve);
    });
    console.log("✅ HTTP server closed");

    // Close all queues
    await closeAllQueues();

    // Close database connection
    await mongoose.connection.close();
    console.log("✅ Database connection closed");

    console.log("✅ Graceful shutdown complete");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error during shutdown:", error);
    process.exit(1);
  }
}

// Handle shutdown signals
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, _promise) => {
  console.log(`Error: ${err.message}`);
  // Close server & exit process
  gracefulShutdown("unhandledRejection");
});
