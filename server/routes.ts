import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcryptjs";
import { 
  insertUserSchema, insertHelpRequestSchema, insertProjectPostSchema, 
  insertProjectApplicationSchema, insertMessageSchema, updateProfileSchema, 
  changePasswordSchema
} from "@shared/schema";
import { db } from "./db";

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  app.use(session({
    secret: process.env.SESSION_SECRET || "skillshare-secret",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: process.env.NODE_ENV === "production" },
  }));

  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(new LocalStrategy(async (usernameOrEmailRaw, password, done) => {
    try {
      const usernameOrEmail = usernameOrEmailRaw.toLowerCase();
      // Try lookup by username first
      let user = await storage.getUserByUsername(usernameOrEmail);
      
      // If not found, try lookup by email
      if (!user) {
        user = await storage.getUserByEmail(usernameOrEmail);
      }

      if (!user) return done(null, false, { message: "Incorrect username or email." });
      
      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) return done(null, false, { message: "Incorrect password." });
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }));

  passport.serializeUser((user: any, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) { done(err); }
  });

  const requireAuth = (req: any, res: any, next: any) => {
    if (!req.isAuthenticated()) {
      console.log(`[Auth Check] Unauthorized: No session found for ${req.method} ${req.path}`);
      return res.status(401).json({ message: "Unauthorized" });
    }
    next();
  };

  const currentUser = (req: any) => req.user as any;

  // ─── AUTH ─────────────────────────────────────────────────────────────────
  app.post("/api/auth/register", async (req, res) => {
    try {
      const input = insertUserSchema.parse(req.body);
      const username = input.username.toLowerCase();
      const email = input.email.toLowerCase();
      
      const existingUsername = await storage.getUserByUsername(username);
      if (existingUsername) return res.status(400).json({ message: "Username already taken" });

      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) return res.status(400).json({ message: "Email already registered" });

      const hashedPassword = await bcrypt.hash(input.password, 10);
      const user = await storage.createUser({
        ...input,
        username,
        email,
        password: hashedPassword,
        credits: 10,
        isVerified: true,
        isAdmin: false,
        avatarInitials: input.name?.slice(0, 2).toUpperCase() || "??"
      });

      await storage.createTransaction({
        userId: user.id,
        type: "earned",
        amount: 10,
        description: "Welcome bonus — starting Credits",
      });

      req.login(user, (err) => {
        if (err) return res.status(500).json({ message: "Login failed after registration" });
        const { password: _, ...safeUser } = user;
        return res.status(201).json({ ...safeUser, password: "" });
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Internal server error" });
    }
  });

  app.post("/api/auth/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: info?.message || "Login failed" });
      req.login(user, (err) => {
        if (err) return next(err);
        const { password: _, ...safeUser } = user;
        return res.status(200).json({ ...safeUser, password: "" });
      });
    })(req, res, next);
  });

  app.get("/api/auth/check-availability", async (req, res) => {
    const { type, value } = req.query;
    if (type !== "username" && type !== "email") {
      return res.status(400).json({ message: "Invalid check type" });
    }

    const valueStr = String(value).toLowerCase();
    const existing = type === "username" 
      ? await storage.getUserByUsername(valueStr)
      : await storage.getUserByEmail(valueStr);

    res.json({ available: !existing });
  });

  app.post("/api/auth/logout", (req, res) => {
    req.logout((err) => {
      if (err) return res.status(500).json({ message: "Logout failed" });
      res.status(200).json({ message: "Logged out" });
    });
  });

  app.get("/api/auth/me", (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    const { password: _, ...safeUser } = currentUser(req);
    res.json({ ...safeUser, password: "" });
  });

  // ─── USERS ────────────────────────────────────────────────────────────────
  app.get("/api/users/by-username/:username", requireAuth, async (req, res) => {
    const user = await storage.getUserByUsername(req.params.username.toLowerCase());
    if (!user || !user.hasCompletedOnboarding) return res.status(404).json({ message: "User not found" });
    const { password: _, ...safeUser } = user;
    res.json(safeUser);
  });

  app.get("/api/users", async (_req, res) => {
    const allUsers = await storage.getAllUsers();
    // Only return users who have completed onboarding
    res.json(allUsers.filter(u => u.hasCompletedOnboarding).map(({ password: _, ...u }) => u));
  });

  app.get("/api/users/:id", async (req, res) => {
    const user = await storage.getUser(Number(req.params.id));
    if (!user) return res.status(404).send("User not found");
    // Removed badges logic
    const { password: _password, ...safeUser } = user;
    res.json({ ...safeUser });
  });

  app.patch("/api/users/:id", requireAuth, async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (currentUser(req).id !== id && !currentUser(req).isAdmin) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const input = updateProfileSchema.parse(req.body);
      const updates: any = { ...input };

      // If they are changing username, make sure it's not taken
      if (input.username) {
        const username = input.username.toLowerCase();
        updates.username = username;
        if (username !== currentUser(req).username) {
          const existing = await storage.getUserByUsername(username);
          if (existing) {
            return res.status(400).json({ message: "Username already taken" });
          }
        }
      }

      // If they are changing email, make sure it's not taken
      if (input.email) {
        const email = input.email.toLowerCase();
        updates.email = email;
        if (email !== currentUser(req).email) {
          const existing = await storage.getUserByEmail(email);
          if (existing) {
            return res.status(400).json({ message: "Email already registered" });
          }
        }
      }

      const updated = await storage.updateUser(id, updates);
      const { password: _, ...safeUser } = updated;
      res.json(safeUser);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Invalid update data" });
    }
  });

  app.post("/api/users/touch", requireAuth, async (req, res) => {
    await storage.touchUser(currentUser(req).id);
    res.sendStatus(200);
  });

  app.post("/api/users/:id/delete", requireAuth, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const authUser = currentUser(req);
      
      if (authUser.id !== id && !authUser.isAdmin) {
        console.log(`[Account Deletion] Forbidden: User ${authUser.id} attempted to delete User ${id}`);
        return res.status(403).json({ message: "Forbidden" });
      }

      // Check for active help requests or project posts
      const activeHelp = await db.query.helpRequests.findFirst({
        where: (hr, { and, eq, or }) => and(
          eq(hr.authorId, id),
          or(eq(hr.status, "open"), eq(hr.status, "in_progress"))
        )
      });

      const activeProjects = await db.query.projectPosts.findFirst({
        where: (pp, { and, eq }) => and(
          eq(pp.authorId, id),
          eq(pp.status, "open")
        )
      });

      if (activeHelp || activeProjects) {
        return res.status(400).json({ 
          message: "Please resolve or delete all your active help requests and project posts before deleting your account." 
        });
      }

      // Password Verification
      const { password } = req.body;
      if (!password) {
        console.log(`[Account Deletion] Error: Missing password in request body for User ${id}`);
        return res.status(400).json({ message: "Password is required to delete account" });
      }

      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
         console.log(`[Account Deletion] Error: Incorrect password provided for User ${id}`);
         return res.status(400).json({ message: "Incorrect password" });
      }
      
      console.log(`[Account Deletion] Success: Deleting User ${id} (@${user.username})`);
      await storage.deleteUser(id);
      
      // If deleting oneself, logout
      if (authUser.id === id) {
        req.logout((err) => {
          if (err) console.error("Error logging out deleted user:", err);
          return res.status(200).json({ message: "Account deleted" });
        });
      } else {
         return res.status(200).json({ message: "Account deleted" });
      }
    } catch (err: any) {
      console.error(`[Account Deletion] Critical Error:`, err);
      res.status(500).json({ message: err.message });
    }
  });

  // Keep old path for backward compatibility but mark as deprecated if needed
  app.delete("/api/users/:id", requireAuth, (req, res) => {
    res.status(405).json({ message: "Method Not Allowed. Please use POST /api/users/:id/delete" });
  });
  // Removed badges endpoints

  // ─── WALLET ───────────────────────────────────────────────────────────────
  app.post("/api/auth/change-password", requireAuth, async (req, res) => {
    try {
      const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
      const user = await storage.getUser(currentUser(req).id);
      
      if (!user) return res.status(404).json({ message: "User not found" });

      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: "Incorrect current password" });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await storage.updateUser(user.id, { password: hashedPassword });
      
      res.json({ message: "Password updated successfully" });
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Invalid password update data" });
    }
  });

  app.get("/api/credits/transactions", requireAuth, async (req, res) => {
    const txs = await storage.getUserTransactions(currentUser(req).id);
    res.json(txs);
  });



  // ─── HELP BOARD ───────────────────────────────────────────────────────────
  app.get("/api/help-requests", async (req, res) => {
    const { category } = req.query as { category?: string };
    const reqs = await storage.getHelpRequests(category);
    res.json(reqs);
  });

  app.post("/api/help-requests", requireAuth, async (req, res) => {
    try {
      const input = insertHelpRequestSchema.parse(req.body);
      const helpReq = await storage.createHelpRequest({ ...input, authorId: currentUser(req).id });
      res.status(201).json(helpReq);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.post("/api/help-requests/:id/accept", requireAuth, async (req, res) => {
    try {
      const helperId = currentUser(req).id;
      const requestId = Number(req.params.id);
      
      const helpReq = await storage.getHelpRequest(requestId);
      if (!helpReq) return res.status(404).json({ message: "Request not found" });
      if (helpReq.status !== "open") return res.status(400).json({ message: "Request is no longer open" });
      if (helpReq.authorId === helperId) return res.status(400).json({ message: "You cannot accept your own request" });
      
      // Ensure author has enough credits to pay
      const author = await storage.getUser(helpReq.authorId);
      if (!author || author.credits == null || author.credits < (helpReq.reward || 0)) {
        return res.status(400).json({ message: "The author does not have enough credits to pay the reward." });
      }

      const updated = await storage.acceptHelpRequest(requestId, helperId);
      
      // Send automated introductory message
      await storage.sendMessage({
        senderId: helperId,
        receiverId: helpReq.authorId,
        content: `Hi! I'm here to help you with: "${helpReq.title}"`
      });
      
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.post("/api/help-requests/:id/resolve", requireAuth, async (req, res) => {
    try {
      const requestId = Number(req.params.id);
      const userId = currentUser(req).id;
      
      const helpReq = await storage.getHelpRequest(requestId);
      if (!helpReq) return res.status(404).json({ message: "Request not found" });
      if (helpReq.authorId !== userId) return res.status(403).json({ message: "Only the author can resolve this request" });
      
      const updated = await storage.resolveHelpRequest(requestId);
      res.json(updated);
    } catch (err: any) {
      console.error("Resolve error:", err);
      res.status(400).json({ message: err.message || "Failed to resolve request" });
    }
  });

  app.post("/api/help-requests/:id/cancel", requireAuth, async (req, res) => {
    try {
      const requestId = Number(req.params.id);
      const userId = currentUser(req).id;
      
      const helpReq = await storage.getHelpRequest(requestId);
      if (!helpReq) return res.status(404).json({ message: "Request not found" });
      
      // Only the author or the assigned helper can cancel an in-progress request
      if (helpReq.authorId !== userId && helpReq.helperId !== userId) {
        return res.status(403).json({ message: "You are not authorized to cancel this request" });
      }
      
      if (helpReq.status !== "in_progress") {
        return res.status(400).json({ message: "Only in-progress requests can be canceled" });
      }

      const updated = await storage.cancelHelpRequest(requestId);

      // Notify the other party
      const otherUserId = helpReq.authorId === userId ? helpReq.helperId : helpReq.authorId;
      if (otherUserId) {
        await storage.sendMessage({
          senderId: userId,
          receiverId: otherUserId,
          content: `The help request "${helpReq.title}" has been canceled and is now back on the board.`
        });
      }

      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.delete("/api/help-requests/:id", requireAuth, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const helpReq = await storage.getHelpRequest(id);
      
      if (!helpReq) return res.status(404).json({ message: "Request not found" });
      if (helpReq.authorId !== currentUser(req).id && !currentUser(req).isAdmin) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      await storage.deleteHelpRequest(id);
      res.json({ message: "Help request deleted" });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.patch("/api/help-requests/:id", requireAuth, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const helpReq = await storage.getHelpRequest(id);
      
      if (!helpReq) return res.status(404).json({ message: "Request not found" });
      if (helpReq.authorId !== currentUser(req).id) {
        return res.status(403).json({ message: "Only the author can edit this request" });
      }

      const input = insertHelpRequestSchema.partial().parse(req.body);
      const updated = await storage.updateHelpRequest(id, input);
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  // ─── MATCHMAKING ──────────────────────────────────────────────────────────
  app.get("/api/projects", async (req, res) => {
    const { type } = req.query as { type?: string };
    const posts = await storage.getProjectPosts(type);
    res.json(posts);
  });

  app.post("/api/projects", requireAuth, async (req, res) => {
    try {
      const input = insertProjectPostSchema.parse(req.body);
      const post = await storage.createProjectPost({ ...input, authorId: currentUser(req).id });
      res.status(201).json(post);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.get("/api/projects/:id", async (req, res) => {
    const post = await storage.getProjectPost(Number(req.params.id));
    if (!post) return res.status(404).json({ message: "Project not found" });
    res.json(post);
  });

  app.post("/api/projects/:id/apply", requireAuth, async (req, res) => {
    try {
      const postId = Number(req.params.id);
      const userId = currentUser(req).id;
      
      const post = await storage.getProjectPost(postId);
      if (!post) return res.status(404).json({ message: "Project not found" });
      
      if (post.applications.some(a => a.applicantId === userId)) {
        return res.status(400).json({ message: "You have already applied to this project" });
      }

      const maxApps = post.maxApplications ?? 10;
      if (post.applications.length >= maxApps) {
        return res.status(400).json({ message: `This project has reached its maximum application limit (${maxApps})` });
      }

      const input = insertProjectApplicationSchema.parse({ ...req.body, postId });
      const app2 = await storage.applyToProject({ ...input, applicantId: userId });
      res.status(201).json(app2);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.delete("/api/projects/:id", requireAuth, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const post = await storage.getProjectPost(id);
      
      if (!post) return res.status(404).json({ message: "Project not found" });
      if (post.authorId !== currentUser(req).id && !currentUser(req).isAdmin) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      await storage.deleteProjectPost(id);
      res.json({ message: "Project post deleted" });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.patch("/api/projects/:id", requireAuth, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const post = await storage.getProjectPost(id);
      
      if (!post) return res.status(404).json({ message: "Project not found" });
      if (post.authorId !== currentUser(req).id) {
        return res.status(403).json({ message: "Only the author can edit this project" });
      }

      const input = insertProjectPostSchema.partial().parse(req.body);
      const updated = await storage.updateProjectPost(id, input);
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.patch("/api/applications/:id", requireAuth, async (req, res) => {
    try {
      const appId = Number(req.params.id);
      const { status } = req.body;
      const userId = currentUser(req).id;

      // 1. Fetch application and verify the current user is the project owner
      const appRecord = await storage.getApplication(appId);
      if (!appRecord) return res.status(404).json({ message: "Application not found" });

      const post = await storage.getProjectPost(appRecord.postId);
      if (!post) return res.status(404).json({ message: "Project not found" });
      if (post.authorId !== userId) return res.status(403).json({ message: "Only the project owner can manage applications" });
      if (post.status === "closed") return res.status(400).json({ message: "This project is closed" });

      // 2. Update the status
      const updated = await storage.updateApplicationStatus(appId, status);

      // 3. Handle 'accepted' logic
      if (status === "accepted") {
        // Send automatic welcome message
        await storage.sendMessage({
          senderId: userId,
          receiverId: appRecord.applicantId,
          content: `Welcome to the team for "${post.title}"! Let's get started.`
        });

        // Check if team is now full
        // We subtract 1 from teamSize because the owner counts as 1 team member
        const acceptedCount = post.applications.filter(a => 
          a.id === appId ? true : a.status === "accepted"
        ).length;

        if (acceptedCount >= (post.teamSize || 3) - 1) {
          await storage.updateProjectStatus(post.id, "closed");
        }
      }

      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.delete("/api/applications/:id", requireAuth, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const app = await storage.getApplication(id);
      if (!app) return res.status(404).json({ message: "Application not found" });
      
      // Only the applicant can withdraw the application
      if (app.applicantId !== currentUser(req).id) {
        return res.status(403).json({ message: "Forbidden" });
      }

      // Only pending applications can be withdrawn
      if (app.status !== "pending") {
        return res.status(400).json({ message: "Only pending applications can be withdrawn" });
      }

      await storage.deleteApplication(id);
      res.json({ message: "Application withdrawn" });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });
  // ─── NOTIFICATIONS ────────────────────────────────────────────────────────
  app.get("/api/notifications/unread-counts", requireAuth, async (req, res) => {
    try {
      const counts = await storage.getUnreadCounts(currentUser(req).id);
      res.json(counts);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/notifications/mark-viewed", requireAuth, async (req, res) => {
    try {
      const { section } = req.body;
      if (section !== "helpBoard" && section !== "matchmaking") {
        return res.status(400).json({ message: "Invalid section" });
      }
      await storage.markViewed(currentUser(req).id, section);
      res.sendStatus(200);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });


  // ─── CHAT ─────────────────────────────────────────────────────────────────
  app.get("/api/chat/conversations", requireAuth, async (req, res) => {
    const convos = await storage.getConversationList(currentUser(req).id);
    res.json(convos);
  });

  app.get("/api/chat/:userId", requireAuth, async (req, res) => {
    const me = currentUser(req).id;
    const other = Number(req.params.userId);
    await storage.markMessagesRead(other, me);
    const msgs = await storage.getConversation(me, other);
    res.json(msgs);
  });

  app.post("/api/chat/:userId", requireAuth, async (req, res) => {
    try {
      const msg = await storage.sendMessage({
        content: req.body.content,
        receiverId: Number(req.params.userId),
        senderId: currentUser(req).id,
      });
      res.status(201).json(msg);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.delete("/api/chat/messages/:id", requireAuth, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const msg = await storage.getMessage(id);
      if (!msg) return res.status(404).json({ message: "Message not found" });
      
      // Only the sender can delete the message
      if (msg.senderId !== currentUser(req).id) {
        return res.status(403).json({ message: "Forbidden" });
      }

      await storage.deleteMessage(id);
      res.json({ message: "Message deleted" });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ─── SEED ─────────────────────────────────────────────────────────────────
  await seedDatabase();

  return httpServer;
}

// No seed data — database starts empty. Users register normally.
async function seedDatabase() {}

