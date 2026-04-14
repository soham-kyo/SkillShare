import { pgTable, text, serial, integer, boolean, timestamp, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// ─── USERS ────────────────────────────────────────────────────────────────────
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  collegeId: text("college_id").notNull(),
  isVerified: boolean("is_verified").default(false),
  credits: real("credits").default(10),
  isAdmin: boolean("is_admin").default(false),
  bio: text("bio"),
  avatarInitials: text("avatar_initials"),
  profileImageUrl: text("profile_image_url"),
  showActiveStatus: boolean("show_active_status").default(true),
  lastActiveAt: timestamp("last_active_at").defaultNow(),
  collegeName: text("college_name"),
  branch: text("branch"),
  hasCompletedOnboarding: boolean("has_completed_onboarding").default(false),
  skillsArray: text("skills_array").array().default([]),
  helpBoardLastViewedAt: timestamp("help_board_last_viewed_at").defaultNow(),
  matchmakingLastViewedAt: timestamp("matchmaking_last_viewed_at").defaultNow(),
});

// ─── TRANSACTIONS (Credit Ledger) ─────────────────────────────────────────────
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  type: text("type").notNull(), // "earned" | "spent"
  amount: real("amount").notNull(),
  description: text("description").notNull(),
  relatedUserId: integer("related_user_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── HELP REQUESTS (Help Board) ───────────────────────────────────────────────
export const helpRequests = pgTable("help_requests", {
  id: serial("id").primaryKey(),
  authorId: integer("author_id").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  reward: real("reward").default(0.5),
  status: text("status").default("open"), // "open" | "in_progress" | "resolved"
  helperId: integer("helper_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ─── PROJECT POSTS (Matchmaking) ──────────────────────────────────────────────
export const projectPosts = pgTable("project_posts", {
  id: serial("id").primaryKey(),
  authorId: integer("author_id").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  skillsNeeded: text("skills_needed").notNull(),
  projectType: text("project_type").notNull(), // "hackathon" | "fyp" | "research" | "other"
  teamSize: integer("team_size").default(3),
  maxApplications: integer("max_applications").default(10),
  status: text("status").default("open"), // "open" | "closed"
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── PROJECT APPLICATIONS ─────────────────────────────────────────────────────
export const projectApplications = pgTable("project_applications", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull(),
  applicantId: integer("applicant_id").notNull(),
  message: text("message").notNull(),
  status: text("status").default("pending"), // "pending" | "accepted" | "rejected"
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── MESSAGES (Chat) ──────────────────────────────────────────────────────────
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").notNull(),
  receiverId: integer("receiver_id").notNull(),
  content: text("content").notNull(),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});



// ─── SKILLS ───────────────────────────────────────────────────────────────────
export const skills = pgTable("skills", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});



// ─── RELATIONS ────────────────────────────────────────────────────────────────
export const usersRelations = relations(users, ({ many }) => ({
  transactions: many(transactions),
  helpRequests: many(helpRequests),
  projectPosts: many(projectPosts),
  sentMessages: many(messages, { relationName: "sentMessages" }),
  receivedMessages: many(messages, { relationName: "receivedMessages" }),
  applications: many(projectApplications),

  skills: many(skills),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(users, { fields: [transactions.userId], references: [users.id] }),
  relatedUser: one(users, { fields: [transactions.relatedUserId], references: [users.id] }),
}));

export const helpRequestsRelations = relations(helpRequests, ({ one }) => ({
  author: one(users, { fields: [helpRequests.authorId], references: [users.id] }),
  helper: one(users, { fields: [helpRequests.helperId], references: [users.id] }),
}));

export const projectPostsRelations = relations(projectPosts, ({ one, many }) => ({
  author: one(users, { fields: [projectPosts.authorId], references: [users.id] }),
  applications: many(projectApplications),
}));

export const projectApplicationsRelations = relations(projectApplications, ({ one }) => ({
  post: one(projectPosts, { fields: [projectApplications.postId], references: [projectPosts.id] }),
  applicant: one(users, { fields: [projectApplications.applicantId], references: [users.id] }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  sender: one(users, { fields: [messages.senderId], references: [users.id], relationName: "sentMessages" }),
  receiver: one(users, { fields: [messages.receiverId], references: [users.id], relationName: "receivedMessages" }),
}));



export const skillsRelations = relations(skills, ({ one }) => ({
  user: one(users, { fields: [skills.userId], references: [users.id] }),
}));



import { FORBIDDEN_WORDS, RESERVED_USERNAMES } from "./constants";

// ─── INSERT SCHEMAS ───────────────────────────────────────────────────────────
export const insertUserSchema = z.object({
  username: z.string()
    .min(3, "Username must be at least 3 characters")
    .max(20, "Username must be at most 20 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores")
    .refine(
      (val) => !RESERVED_USERNAMES.includes(val.toLowerCase()),
      { message: "This username is reserved" }
    )
    .refine(
      (val) => !FORBIDDEN_WORDS.some(word => val.toLowerCase().includes(word)),
      { message: "Username contains inappropriate language" }
    ),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^a-zA-Z0-9]/, "Password must contain at least one special character"),
  name: z.string()
    .min(1, "Name is required")
    .refine(
      (val) => !FORBIDDEN_WORDS.some(word => val.toLowerCase().includes(word)),
      { message: "Name contains inappropriate language" }
    ),
  email: z.string().email("Please enter a valid email address"),
  collegeId: z.string().optional().default(""),
  bio: z.string().optional(),
  avatarInitials: z.string().optional(),
  profileImageUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  showActiveStatus: z.boolean().optional().default(true),
});

export const updateProfileSchema = z.object({
  username: z.string()
    .min(3, "Username must be at least 3 characters")
    .max(20, "Username must be at most 20 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores")
    .refine(
      (val) => !RESERVED_USERNAMES.includes(val.toLowerCase()),
      { message: "This username is reserved" }
    )
    .refine(
      (val) => !FORBIDDEN_WORDS.some(word => val.toLowerCase().includes(word)),
      { message: "Username contains inappropriate language" }
    ).optional(),
  name: z.string()
    .min(1, "Name is required")
    .refine(
      (val) => !FORBIDDEN_WORDS.some(word => val.toLowerCase().includes(word)),
      { message: "Name contains inappropriate language" }
    ).optional(),
  email: z.string().email("Please enter a valid email address").optional(),
  collegeId: z.string().min(1, "College ID is required").optional(),
  bio: z.string().optional(),
  avatarInitials: z.string().optional(),
  profileImageUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  showActiveStatus: z.boolean().optional(),
  collegeName: z.string().min(1, "College name is required").optional(),
  branch: z.string().optional(),
  hasCompletedOnboarding: z.boolean().optional(),
  skillsArray: z.array(z.string()).min(1, "Please select at least one skill").optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^a-zA-Z0-9]/, "Password must contain at least one special character"),
  confirmPassword: z.string().min(1, "Please confirm your new password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export const insertHelpRequestSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  category: z.string(),
  reward: z.number().optional().default(0.5),
});

export const insertProjectPostSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  skillsNeeded: z.string(),
  projectType: z.string(),
  teamSize: z.number().optional().default(3),
  maxApplications: z.number().optional().default(10),
});

export const insertProjectApplicationSchema = z.object({
  postId: z.number(),
  message: z.string().min(1),
});

export const insertMessageSchema = z.object({
  receiverId: z.number(),
  content: z.string().min(1),
});

export const insertSkillSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  category: z.string(),
});



// ─── TYPES ────────────────────────────────────────────────────────────────────
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Transaction = typeof transactions.$inferSelect;
export type HelpRequest = typeof helpRequests.$inferSelect;
export type InsertHelpRequest = z.infer<typeof insertHelpRequestSchema>;
export type ProjectPost = typeof projectPosts.$inferSelect;
export type InsertProjectPost = z.infer<typeof insertProjectPostSchema>;
export type ProjectApplication = typeof projectApplications.$inferSelect;
export type InsertProjectApplication = z.infer<typeof insertProjectApplicationSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

export type Skill = typeof skills.$inferSelect;
export type InsertSkill = z.infer<typeof insertSkillSchema>;


