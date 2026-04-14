import { z } from 'zod';
import {
  insertUserSchema, insertHelpRequestSchema, insertProjectPostSchema, insertProjectApplicationSchema,
  insertMessageSchema,
  type User, type Transaction,
  type HelpRequest, type ProjectPost, type ProjectApplication,
  type Message,
} from './schema';

export {
  insertUserSchema, insertHelpRequestSchema, insertProjectPostSchema, insertProjectApplicationSchema,
  insertMessageSchema,
};

const userSchema = z.object({
  id: z.number(),
  username: z.string(),
  name: z.string(),
  email: z.string(),
  collegeId: z.string(),
  isVerified: z.boolean().nullable(),
  credits: z.number().nullable(),
  isAdmin: z.boolean().nullable(),
  bio: z.string().nullable(),
  avatarInitials: z.string().nullable(),
  profileImageUrl: z.string().nullable(),
  collegeName: z.string().nullable().optional(),
  branch: z.string().nullable().optional(),
  hasCompletedOnboarding: z.boolean().nullable().optional(),
  skillsArray: z.array(z.string()).nullable().optional(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;

export const api = {
  auth: {
    register: {
      method: "POST" as const,
      path: "/api/auth/register",
      input: insertUserSchema,
      responses: { 201: userSchema, 400: z.object({ message: z.string(), field: z.string().optional() }) },
    },
    login: {
      method: "POST" as const,
      path: "/api/auth/login",
      input: z.object({ username: z.string(), password: z.string() }),
      responses: { 200: userSchema },
    },
    logout: {
      method: "POST" as const,
      path: "/api/auth/logout",
      input: z.object({}),
      responses: { 200: z.object({ message: z.string() }) },
    },
    me: {
      method: "GET" as const,
      path: "/api/auth/me",
      responses: { 200: userSchema.nullable() },
    },
  },
  users: {
    get: { method: "GET" as const, path: "/api/users/:id", responses: { 200: userSchema } },
    list: { method: "GET" as const, path: "/api/users", responses: { 200: z.array(userSchema) } },
  },
  credits: {
    transactions: { method: "GET" as const, path: "/api/credits/transactions" },
  },
  helpBoard: {
    list: { method: "GET" as const, path: "/api/help-requests" },
    create: { method: "POST" as const, path: "/api/help-requests", input: insertHelpRequestSchema },
    accept: { method: "POST" as const, path: "/api/help-requests/:id/accept" },
    resolve: { method: "POST" as const, path: "/api/help-requests/:id/resolve" },
  },
  matchmaking: {
    list: { method: "GET" as const, path: "/api/projects" },
    create: { method: "POST" as const, path: "/api/projects", input: insertProjectPostSchema },
    get: { method: "GET" as const, path: "/api/projects/:id" },
    apply: { method: "POST" as const, path: "/api/projects/:id/apply", input: insertProjectApplicationSchema },
    updateApp: { method: "PATCH" as const, path: "/api/applications/:id" },
  },
  chat: {
    conversations: { method: "GET" as const, path: "/api/chat/conversations" },
    messages: { method: "GET" as const, path: "/api/chat/:userId" },
    send: { method: "POST" as const, path: "/api/chat/:userId", input: z.object({ content: z.string().min(1) }) },
  },
  badges: {
    user: { method: "GET" as const, path: "/api/users/:id/badges" },
    me: { method: "GET" as const, path: "/api/badges/me" },
  },
};
