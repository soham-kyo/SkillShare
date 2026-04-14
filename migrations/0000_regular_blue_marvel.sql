CREATE TABLE "help_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"author_id" integer NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"category" text NOT NULL,
	"reward" real DEFAULT 0.5,
	"status" text DEFAULT 'open',
	"helper_id" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"sender_id" integer NOT NULL,
	"receiver_id" integer NOT NULL,
	"content" text NOT NULL,
	"is_read" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "project_applications" (
	"id" serial PRIMARY KEY NOT NULL,
	"post_id" integer NOT NULL,
	"applicant_id" integer NOT NULL,
	"message" text NOT NULL,
	"status" text DEFAULT 'pending',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "project_posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"author_id" integer NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"skills_needed" text NOT NULL,
	"project_type" text NOT NULL,
	"team_size" integer DEFAULT 3,
	"max_applications" integer DEFAULT 10,
	"status" text DEFAULT 'open',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "skills" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"category" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"type" text NOT NULL,
	"amount" real NOT NULL,
	"description" text NOT NULL,
	"related_user_id" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"college_id" text NOT NULL,
	"is_verified" boolean DEFAULT false,
	"credits" real DEFAULT 10,
	"is_admin" boolean DEFAULT false,
	"bio" text,
	"avatar_initials" text,
	"profile_image_url" text,
	"show_active_status" boolean DEFAULT true,
	"last_active_at" timestamp DEFAULT now(),
	"college_name" text,
	"branch" text,
	"has_completed_onboarding" boolean DEFAULT false,
	"skills_array" text[] DEFAULT '{}',
	"help_board_last_viewed_at" timestamp DEFAULT now(),
	"matchmaking_last_viewed_at" timestamp DEFAULT now(),
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
