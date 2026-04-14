import { db } from "./db";
import { eq, and, or, desc, inArray, sql } from "drizzle-orm";
import {
  users, transactions, helpRequests, projectPosts, projectApplications,
  messages, skills,
  type User, type InsertUser,
  type Transaction,
  type HelpRequest, type InsertHelpRequest,
  type ProjectPost, type InsertProjectPost,
  type ProjectApplication, type InsertProjectApplication,
  type Message, type InsertMessage,
  type Skill, type InsertSkill,
} from "@shared/schema";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: any): Promise<User>;
  updateUser(id: number, data: Partial<InsertUser>): Promise<User>;
  deleteUser(id: number): Promise<void>;
  updateUserCredits(userId: number, delta: number): Promise<User>;
  touchUser(userId: number): Promise<void>;
  getAllUsers(): Promise<User[]>;

  // Transactions
  createTransaction(tx: { userId: number; type: string; amount: number; description: string; relatedUserId?: number }): Promise<Transaction>;
  getUserTransactions(userId: number): Promise<(Transaction & { relatedUser?: User })[]>;

  // Help Requests
  createHelpRequest(req: InsertHelpRequest & { authorId: number }): Promise<HelpRequest>;
  getHelpRequests(category?: string): Promise<(HelpRequest & { author: User; helper?: User })[]>;
  getHelpRequest(id: number): Promise<(HelpRequest & { author: User; helper?: User }) | undefined>;
  acceptHelpRequest(requestId: number, helperId: number): Promise<HelpRequest>;
  resolveHelpRequest(requestId: number): Promise<HelpRequest>;
  cancelHelpRequest(requestId: number): Promise<HelpRequest>;
  updateHelpRequest(id: number, update: Partial<InsertHelpRequest>): Promise<HelpRequest>;
  deleteHelpRequest(id: number): Promise<void>;

  // Project Posts
  createProjectPost(post: InsertProjectPost & { authorId: number }): Promise<ProjectPost>;
  getProjectPosts(type?: string): Promise<(ProjectPost & { author: User; applications: (ProjectApplication & { applicant: User })[]; applicationCount: number })[]>;
  getProjectPost(id: number): Promise<(ProjectPost & { author: User; applications: (ProjectApplication & { applicant: User })[] }) | undefined>;
  updateProjectStatus(id: number, status: string): Promise<ProjectPost>;
  updateProjectPost(id: number, update: Partial<InsertProjectPost>): Promise<ProjectPost>;
  applyToProject(application: InsertProjectApplication & { applicantId: number }): Promise<ProjectApplication>;
  updateApplicationStatus(appId: number, status: string): Promise<ProjectApplication>;
  deleteProjectPost(id: number): Promise<void>;

  // Messages
  sendMessage(msg: InsertMessage & { senderId: number }): Promise<Message>;
  getConversation(userId1: number, userId2: number): Promise<(Message & { sender: User; receiver: User })[]>;
  getConversationList(userId: number): Promise<{ user: User; lastMessage: Message }[]>;
  markMessagesRead(senderId: number, receiverId: number): Promise<void>;

  // Notifications
  getUnreadCounts(userId: number): Promise<{ helpBoard: number; matchmaking: number; chat: number }>;
  markViewed(userId: number, section: "helpBoard" | "matchmaking"): Promise<void>;



  // Skills
  createSkill(skill: InsertSkill & { userId: number }): Promise<Skill>;
  getSkills(category?: string, search?: string): Promise<(Skill & { user: User })[]>;
  getSkill(id: number): Promise<(Skill & { user: User }) | undefined>;


}

export class DatabaseStorage implements IStorage {
  // ─── USERS ────────────────────────────────────────────────────────────────
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: any): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: number, data: Partial<InsertUser>): Promise<User> {
    const [updated] = await db.update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning();
    return updated;
  }

  async deleteUser(id: number): Promise<void> {
    const user = await this.getUser(id);
    const userName = user?.name || "Deleted User";

    await db.transaction(async (tx) => {
      // 1. Dissociate from transactions where this user was the partner
      await tx.update(transactions)
        .set({ 
          // @ts-expect-error - Drizzle type mismatch
          relatedUserId: null,
          description: sql`${transactions.description} || ' (with ' || ${userName} || ')'`
        })
        .where(eq(transactions.relatedUserId, id));

      // 2. Delete own transactions
      await tx.delete(transactions).where(eq(transactions.userId, id));

      // 3. Delete other dependent records
      await tx.delete(helpRequests).where(or(eq(helpRequests.authorId, id), eq(helpRequests.helperId, id)));
      
      // Cleanup for project posts - must handle applications TO these posts first
      const ownPosts = await tx.select({ id: projectPosts.id }).from(projectPosts).where(eq(projectPosts.authorId, id));
      if (ownPosts.length > 0) {
        const postIds = ownPosts.map(p => p.id);
        await tx.delete(projectApplications).where(inArray(projectApplications.postId, postIds));
      }
      
      // Deletion of applications sent BY the user
      await tx.delete(projectApplications).where(eq(projectApplications.applicantId, id));
      
      // Now safe to delete project posts
      await tx.delete(projectPosts).where(eq(projectPosts.authorId, id));
      
      await tx.delete(messages).where(or(eq(messages.senderId, id), eq(messages.receiverId, id)));
      await tx.delete(skills).where(eq(skills.userId, id));
      


      // 4. Finally delete the user
      await tx.delete(users).where(eq(users.id, id));
    });
  }

  async updateUserCredits(userId: number, delta: number, allowNegative: boolean = true): Promise<User> {
    const user = await this.getUser(userId);
    if (!user) throw new Error("User not found");
    const newCredits = (user.credits ?? 0) + delta;
    if (!allowNegative && newCredits < 0) {
      throw new Error("Insufficient credits for this operation");
    }
    const [updated] = await db.update(users).set({ credits: newCredits } as any).where(eq(users.id, userId)).returning();
    return updated;
  }

  async touchUser(userId: number): Promise<void> {
    await db.update(users)
      // @ts-expect-error - Drizzle type mismatch
      .set({ lastActiveAt: new Date() })
      .where(eq(users.id, userId));
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users);
  }

  // ─── TRANSACTIONS ─────────────────────────────────────────────────────────
  async createTransaction(tx: { userId: number; type: string; amount: number; description: string; relatedUserId?: number }): Promise<Transaction> {
    const [newTx] = await db.insert(transactions).values(tx).returning();
    return newTx;
  }

  async getUserTransactions(userId: number): Promise<(Transaction & { relatedUser?: User })[]> {
    return db.query.transactions.findMany({
      where: eq(transactions.userId, userId),
      with: { relatedUser: true },
      orderBy: desc(transactions.createdAt),
    });
  }

  // ─── HELP REQUESTS ────────────────────────────────────────────────────────
  async createHelpRequest(req: InsertHelpRequest & { authorId: number }): Promise<HelpRequest> {
    const [newReq] = await db.insert(helpRequests).values(req as any).returning();
    return newReq;
  }

  async getHelpRequests(category?: string): Promise<(HelpRequest & { author: User; helper?: User })[]> {
    return db.query.helpRequests.findMany({
      where: category ? eq(helpRequests.category, category) : undefined,
      with: { author: true, helper: true },
      orderBy: desc(helpRequests.createdAt),
    });
  }

  async getHelpRequest(id: number): Promise<(HelpRequest & { author: User; helper?: User }) | undefined> {
    return db.query.helpRequests.findFirst({
      where: eq(helpRequests.id, id),
      with: {
        author: true,
        helper: true,
      },
    });
  }

  async acceptHelpRequest(requestId: number, helperId: number): Promise<HelpRequest> {
    const [updated] = await db.update(helpRequests)
      // @ts-expect-error - Drizzle type mismatch
      .set({ status: "in_progress", helperId, updatedAt: new Date() })
      .where(eq(helpRequests.id, requestId))
      .returning();
    return updated;
  }

  async resolveHelpRequest(requestId: number): Promise<HelpRequest> {
    return await db.transaction(async (tx) => {
      const req = await tx.query.helpRequests.findFirst({
        where: eq(helpRequests.id, requestId),
        with: { author: true }
      });
      
      if (!req) throw new Error("Request not found");
      if (req.status !== "in_progress") throw new Error("Only in-progress requests can be resolved");
      if (!req.helperId) throw new Error("No helper assigned to this request");

      const reward = req.reward || 0;
      const authorId = req.authorId;
      const helperId = req.helperId;

      // 1. Check if author has enough credits
      const author = await tx.query.users.findFirst({ where: eq(users.id, authorId) });
      if (!author || (author.credits || 0) < reward) {
        throw new Error("Author has insufficient credits to pay reward");
      }

      // 2. Update author credits
      await tx.update(users)
        .set({ credits: (author.credits || 0) - reward } as any)
        .where(eq(users.id, authorId));

      // 3. Update helper credits
      const helper = await tx.query.users.findFirst({ where: eq(users.id, helperId) });
      if (!helper) throw new Error("Helper not found");
      await tx.update(users)
        .set({ credits: (helper.credits || 0) + reward } as any)
        .where(eq(users.id, helperId));

      // 4. Create transactions
      await tx.insert(transactions).values({
        userId: helperId,
        type: "earned",
        amount: reward,
        description: `Reward from help: "${req.title}"`,
        relatedUserId: authorId,
      } as any);

      await tx.insert(transactions).values({
        userId: authorId,
        type: "spent",
        amount: reward,
        description: `Paid reward for help: "${req.title}"`,
        relatedUserId: helperId,
      } as any);

      // 5. Update request status
      const [updated] = await tx.update(helpRequests)
        .set({ status: "resolved" } as any)
        .where(eq(helpRequests.id, requestId))
        .returning();

      return updated;
    });
  }

  async cancelHelpRequest(requestId: number): Promise<HelpRequest> {
    const [updated] = await db.update(helpRequests)
      .set({ status: "open", helperId: null } as any)
      .where(eq(helpRequests.id, requestId))
      .returning();
    if (!updated) throw new Error("Request not found");
    return updated;
  }

  async deleteHelpRequest(id: number): Promise<void> {
    await db.delete(helpRequests).where(eq(helpRequests.id, id));
  }

  async updateHelpRequest(id: number, update: Partial<InsertHelpRequest>): Promise<HelpRequest> {
    const [updated] = await db.update(helpRequests)
      .set(update as any)
      .where(eq(helpRequests.id, id))
      .returning();
    if (!updated) throw new Error("Request not found");
    return updated;
  }

  // ─── PROJECT POSTS ────────────────────────────────────────────────────────
  async createProjectPost(post: InsertProjectPost & { authorId: number }): Promise<ProjectPost> {
    const [newPost] = await db.insert(projectPosts).values(post as any).returning();
    return newPost;
  }

  async getProjectPosts(type?: string): Promise<(ProjectPost & { author: User; applications: (ProjectApplication & { applicant: User })[]; applicationCount: number })[]> {
    const posts = await db.query.projectPosts.findMany({
      where: type ? eq(projectPosts.projectType, type) : undefined,
      with: { 
        author: true, 
        applications: {
          with: { applicant: true }
        }
      },
      orderBy: desc(projectPosts.createdAt),
    });

    return posts.map((post) => ({
      ...post,
      applicationCount: post.applications.length,
    })) as (ProjectPost & { author: User; applications: (ProjectApplication & { applicant: User })[]; applicationCount: number })[];
  }

  async getProjectPost(id: number): Promise<(ProjectPost & { author: User; applications: (ProjectApplication & { applicant: User })[] }) | undefined> {
    return db.query.projectPosts.findFirst({
      where: eq(projectPosts.id, id),
      with: {
        author: true,
        applications: {
          with: { applicant: true },
        },
      },
    });
  }

  async updateProjectStatus(id: number, status: string): Promise<ProjectPost> {
    const [updated] = await db.update(projectPosts)
      // @ts-expect-error - Drizzle type mismatch
      .set({ status })
      .where(eq(projectPosts.id, id))
      .returning();
    return updated;
  }

  async applyToProject(application: InsertProjectApplication & { applicantId: number }): Promise<ProjectApplication> {
    const [app] = await db.insert(projectApplications).values(application as any).returning();
    return app;
  }

  async updateApplicationStatus(appId: number, status: string): Promise<ProjectApplication> {
    const [updated] = await db.update(projectApplications)
      // @ts-expect-error - Drizzle type mismatch
      .set({ status })
      .where(eq(projectApplications.id, appId))
      .returning();
    return updated;
  }

  async getApplication(id: number): Promise<ProjectApplication | undefined> {
    const [app] = await db.select().from(projectApplications).where(eq(projectApplications.id, id));
    return app;
  }

  async deleteApplication(id: number): Promise<void> {
    await db.delete(projectApplications).where(eq(projectApplications.id, id));
  }

  async deleteProjectPost(id: number): Promise<void> {
    // Delete applications first
    await db.delete(projectApplications).where(eq(projectApplications.postId, id));
    // Then delete post
    await db.delete(projectPosts).where(eq(projectPosts.id, id));
  }

  async updateProjectPost(id: number, update: Partial<InsertProjectPost>): Promise<ProjectPost> {
    const [updated] = await db.update(projectPosts)
      .set(update as any)
      .where(eq(projectPosts.id, id))
      .returning();
    if (!updated) throw new Error("Project not found");
    return updated;
  }

  // ─── MESSAGES ─────────────────────────────────────────────────────────────
  async sendMessage(msg: InsertMessage & { senderId: number }): Promise<Message> {
    const [newMsg] = await db.insert(messages).values(msg as any).returning();
    return newMsg;
  }

  async getConversation(userId1: number, userId2: number): Promise<(Message & { sender: User; receiver: User })[]> {
    const msgs = await db.select().from(messages)
      .where(or(
        and(eq(messages.senderId, userId1), eq(messages.receiverId, userId2)),
        and(eq(messages.senderId, userId2), eq(messages.receiverId, userId1))
      ))
      .orderBy(messages.createdAt);

    const allUsers = await db.select().from(users);
    const userMap = new Map(allUsers.map(u => [u.id, u]));
    return msgs.map(m => ({ ...m, sender: userMap.get(m.senderId)!, receiver: userMap.get(m.receiverId)! }));
  }

  async getConversationList(userId: number): Promise<{ user: User; lastMessage: Message }[]> {
    const allMsgs = await db.select().from(messages)
      .where(or(eq(messages.senderId, userId), eq(messages.receiverId, userId)))
      .orderBy(desc(messages.createdAt));

    const seen = new Set<number>();
    const conversations: { otherUserId: number; lastMessage: Message }[] = [];

    for (const msg of allMsgs) {
      const otherUserId = msg.senderId === userId ? msg.receiverId : msg.senderId;
      if (!seen.has(otherUserId)) {
        seen.add(otherUserId);
        conversations.push({ otherUserId, lastMessage: msg });
      }
    }

    if (conversations.length === 0) return [];

    const partnerIds = conversations.map((c) => c.otherUserId);
    const partners = await db.select().from(users).where(inArray(users.id, partnerIds));
    const userMap = new Map(partners.map((u) => [u.id, u]));

    return Promise.all(conversations
      .map(async (c) => {
        const user = userMap.get(c.otherUserId);
        if (!user) return null;

        // Count unread messages from this partner to the current user
        const [unread] = await db.select({ count: sql<number>`count(*)` })
          .from(messages)
          .where(and(
            eq(messages.senderId, c.otherUserId),
            eq(messages.receiverId, userId),
            eq(messages.isRead, false)
          ));

        return { 
          user, 
          lastMessage: c.lastMessage,
          unreadCount: Number(unread.count)
        };
      }))
      .then(results => results.filter((c): c is any => c !== null));
  }

  async markMessagesRead(senderId: number, receiverId: number): Promise<void> {
    await db.update(messages)
      // @ts-expect-error - Drizzle type mismatch
      .set({ isRead: true })
      .where(and(eq(messages.senderId, senderId), eq(messages.receiverId, receiverId)));
  }

  async getMessage(id: number): Promise<Message | undefined> {
    const [msg] = await db.select().from(messages).where(eq(messages.id, id));
    return msg;
  }

  async deleteMessage(id: number): Promise<void> {
    await db.delete(messages).where(eq(messages.id, id));
  }



  // ─── SKILLS ────────────────────────────────────────────────────────────────
  async createSkill(skill: InsertSkill & { userId: number }): Promise<Skill> {
    // @ts-expect-error - Drizzle type mismatch
    const [newSkill] = await db.insert(skills).values(skill).returning();
    return newSkill;
  }

  async getSkills(category?: string, search?: string): Promise<(Skill & { user: User })[]> {
    const conditions = [];
    if (category) conditions.push(eq(skills.category, category));
    
    if (search) {
      const searchPattern = `%${search.toLowerCase()}%`;
      conditions.push(or(
        sql`LOWER(${skills.title}) LIKE ${searchPattern}`,
        sql`LOWER(${skills.description}) LIKE ${searchPattern}`
      ));
    }
    
    return db.query.skills.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      with: { user: true },
      orderBy: desc(skills.createdAt),
    });
  }

  async getSkill(id: number): Promise<(Skill & { user: User }) | undefined> {
    return db.query.skills.findFirst({
      where: eq(skills.id, id),
      with: { user: true },
    });
  }

  // ─── NOTIFICATIONS ────────────────────────────────────────────────────────
  async getUnreadCounts(userId: number): Promise<{ helpBoard: number; matchmaking: number; chat: number }> {
    const user = await this.getUser(userId);
    if (!user) return { helpBoard: 0, matchmaking: 0, chat: 0 };

    // 1. Chat: Unread messages where user is receiver
    const [chatCount] = await db.select({ count: sql<number>`count(*)` })
      .from(messages)
      .where(and(eq(messages.receiverId, userId), eq(messages.isRead, false)));

    // 2. Help Board: in_progress requests authored by user updated after helpBoardLastViewedAt
    const [helpCount] = await db.select({ count: sql<number>`count(*)` })
      .from(helpRequests)
      .where(and(
        eq(helpRequests.authorId, userId),
        eq(helpRequests.status, "in_progress"),
        sql`${helpRequests.updatedAt} > ${user.helpBoardLastViewedAt || new Date(0)}`
      ));

    // 3. Matchmaking: pending applications for projects authored by user created after matchmakingLastViewedAt
    const matchmakingCount = await db.select({ count: sql<number>`count(*)` })
      .from(projectApplications)
      .innerJoin(projectPosts, eq(projectApplications.postId, projectPosts.id))
      .where(and(
        eq(projectPosts.authorId, userId),
        eq(projectApplications.status, "pending"),
        sql`${projectApplications.createdAt} > ${user.matchmakingLastViewedAt || new Date(0)}`
      ));

    return {
      helpBoard: Number(helpCount.count),
      matchmaking: Number(matchmakingCount[0].count),
      chat: Number(chatCount.count),
    };
  }

  async markViewed(userId: number, section: "helpBoard" | "matchmaking"): Promise<void> {
    const update = section === "helpBoard" 
      ? { helpBoardLastViewedAt: new Date() } 
      : { matchmakingLastViewedAt: new Date() };
    
    await db.update(users)
      .set(update as any)
      .where(eq(users.id, userId));
  }
}

export const storage = new DatabaseStorage();
