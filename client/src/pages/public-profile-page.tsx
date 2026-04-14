import Layout from "@/components/layout";
import { useUser } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MessageCircle, GraduationCap, Building2, Hash, Loader2, 
  AlertCircle, Wrench, Briefcase, Clock, BookOpen,
  User as UserIcon, Trophy, Star, Users2
} from "lucide-react";
import { getUserInitials } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { Link } from "wouter";

// ─── Avatar component ─────────────────────────────────────────────────────────
function AvatarCircle({ user, size = "xl" }: { user: any; size?: "xl" | "md" }) {
  const initials = getUserInitials(user);
  const sizeClasses = size === "xl"
    ? "w-28 h-28 text-4xl border-4"
    : "w-10 h-10 text-sm border-2";
  return (
    <div
      className={`${sizeClasses} rounded-full flex items-center justify-center font-black
        bg-gradient-to-br from-primary/80 to-primary/30 text-primary-foreground
        border-background shadow-xl select-none shrink-0`}
    >
      {initials}
    </div>
  );
}


// ─── Help Request Card ────────────────────────────────────────────────────────
function HelpCard({ req }: { req: any }) {
  const statusColor =
    req.status === "open" ? "bg-emerald-500/10 text-emerald-600 border-emerald-200/50" :
    req.status === "in_progress" ? "bg-amber-500/10 text-amber-600 border-amber-200/50" :
    "bg-muted/30 text-muted-foreground border-border/30";

  return (
    <Link href={`/help-board?id=${req.id}`}>
      <div className="glass-card rounded-2xl p-5 border border-border/40 hover:border-primary/20 transition-all hover:shadow-md group cursor-pointer">
        <div className="flex items-start justify-between gap-3 mb-2">
          <h4 className="font-bold text-sm leading-snug group-hover:text-primary transition-colors line-clamp-2">
            {req.title}
          </h4>
          <Badge variant="outline" className={`shrink-0 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 border ${statusColor}`}>
            {req.status === "in_progress" ? "In Progress" : req.status}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2 mb-3 leading-relaxed">{req.description}</p>
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1 font-bold px-2 py-1 rounded-lg bg-primary/5 text-primary">
            <span>⭐</span> {(req.reward || 0.5).toFixed(1)} credits
          </span>
          <span className="flex items-center gap-1 opacity-60">
            <Clock className="w-3 h-3" />
            {formatDistanceToNow(new Date(req.createdAt), { addSuffix: true })}
          </span>
        </div>
      </div>
    </Link>
  );
}

// ─── Project Card ─────────────────────────────────────────────────────────────
function ProjectCard({ post }: { post: any }) {
  const typeColors: Record<string, string> = {
    hackathon: "text-indigo-600 bg-indigo-500/10",
    fyp: "text-emerald-600 bg-emerald-500/10",
    research: "text-amber-600 bg-amber-500/10",
    other: "text-zinc-600 bg-zinc-500/10",
  };
  const color = typeColors[post.projectType] ?? typeColors.other;
  const acceptedCount = post.applications?.filter((a: any) => a.status === "accepted").length || 0;

  return (
    <Link href={`/matchmaking?id=${post.id}`}>
      <div className="glass-card rounded-2xl p-5 border border-border/40 hover:border-primary/20 transition-all hover:shadow-md group cursor-pointer">
        <div className="flex items-start justify-between gap-3 mb-2">
          <h4 className="font-bold text-sm leading-snug group-hover:text-primary transition-colors line-clamp-2">
            {post.title}
          </h4>
          <Badge variant="outline" className={`shrink-0 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 ${color}`}>
            {post.projectType}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2 mb-3 leading-relaxed">{post.description}</p>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {post.skillsNeeded?.split(",").slice(0, 4).map((s: string) => (
            <Badge key={s} variant="secondary" className="text-[10px] rounded-lg px-2 py-0.5 font-semibold">
              #{s.trim()}
            </Badge>
          ))}
        </div>
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span className="font-semibold px-2 py-1 bg-secondary/50 rounded-lg">
            👥 {acceptedCount}/{post.teamSize} members
          </span>
          <span className="flex items-center gap-1 opacity-60">
            <Clock className="w-3 h-3" />
            {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
          </span>
        </div>
      </div>
    </Link>
  );
}



// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState({ icon: Icon, message }: { icon: any; message: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
      <Icon className="w-10 h-10 opacity-20" />
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PublicProfilePage() {
  const params = useParams<{ username: string }>();
  const username = params.username;
  const { data: currentUser } = useUser();
  const [, setLocation] = useLocation();

  // Fetch public profile by username
  const { data: profileUser, isLoading: profileLoading, error: profileError } = useQuery<any>({
    queryKey: [`/api/users/by-username/${username}`],
    queryFn: async () => {
      const res = await fetch(`/api/users/by-username/${username}`);
      if (!res.ok) throw new Error("User not found");
      return res.json();
    },
    enabled: !!username,
  });

  // Fetch all activity data (filtered client-side)
  const { data: helpRequests } = useQuery<any[]>({ queryKey: ["/api/help-requests"] });
  const { data: projects } = useQuery<any[]>({ queryKey: ["/api/projects"] });

  if (profileLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (profileError || !profileUser) {
    const isNotFound = profileError instanceof Error && profileError.message === "User not found";
    
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
          <AlertCircle className="w-12 h-12 text-muted-foreground/30" />
          <h2 className="text-2xl font-black">{isNotFound ? "User not found" : "Connection error"}</h2>
          <p className="text-muted-foreground text-sm">
            {isNotFound 
              ? `No user with the username @${username} exists.` 
              : "Unable to reach the server. Please check your connection or try again later."}
          </p>
          {!isNotFound && (
            <Button variant="outline" onClick={() => window.location.reload()} className="mt-2 rounded-xl font-bold">
              Retry
            </Button>
          )}
        </div>
      </Layout>
    );
  }

  // Filter activity
  const userHelpRequests = (helpRequests ?? []).filter(
    (r) => r.authorId === profileUser.id && r.status === "open"
  );
  const userProjects = (projects ?? []).filter(
    (p) => p.authorId === profileUser.id && p.status === "open"
  );

  const helpedCount = (helpRequests ?? []).filter(
    (r) => r.helperId === profileUser.id && r.status === "resolved"
  ).length;
  const currentHelpingCount = (helpRequests ?? []).filter(
    (r) => r.helperId === profileUser.id && r.status === "in_progress"
  ).length;


  const isOwnProfile = currentUser?.id === profileUser.id;

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6 pb-10">

        {/* ── Hero Card ─────────────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-3xl glass-card border border-border/40 shadow-xl">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent pointer-events-none" />
          


          {/* Avatar + name row */}
          <div className="px-6 pb-6 pt-6 relative z-10">
            <div className="flex items-end justify-between gap-4 mb-4">
              <AvatarCircle user={profileUser} size="xl" />
              {!isOwnProfile && currentUser && (
                <Button
                  onClick={() => setLocation(`/chat?userId=${profileUser.id}`)}
                  className="gap-2 rounded-full font-bold px-6 shadow-md hover:shadow-primary/20 hover:scale-105 transition-all"
                >
                  <MessageCircle className="w-4 h-4" />
                  Message
                </Button>
              )}
              {isOwnProfile && (
                <Button
                  variant="outline"
                  onClick={() => setLocation("/profile")}
                  className="gap-2 rounded-full font-bold px-5 border-primary/20 hover:bg-primary/5"
                >
                  Edit Profile
                </Button>
              )}
            </div>

            {/* Name + username */}
            <h1 className="text-2xl font-black tracking-tight leading-tight">{profileUser.name}</h1>
            <p className="text-primary font-bold text-sm">@{profileUser.username}</p>

            {/* Bio */}
            {profileUser.bio && (
              <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{profileUser.bio}</p>
            )}

          </div>
        </div>

        {/* ── College Info ──────────────────────────────────────────────────── */}
        {(profileUser.collegeName || profileUser.branch || profileUser.collegeId) && (
          <div className="glass-card rounded-2xl border border-border/40 shadow-sm overflow-hidden">
            <div className="px-5 py-3 bg-secondary/20 border-b border-border/30 flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-primary" />
              <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">Education</span>
            </div>
            <div className="px-5 py-4 flex flex-col gap-2.5">
              {profileUser.collegeName && (
                <div className="flex items-center gap-3">
                  <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="text-sm font-semibold">{profileUser.collegeName}</span>
                </div>
              )}
              {profileUser.branch && (
                <div className="flex items-center gap-3">
                  <BookOpen className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="text-sm text-muted-foreground">{profileUser.branch}</span>
                </div>
              )}
              {profileUser.collegeId && (
                <div className="flex items-center gap-3">
                  <Hash className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="text-sm text-muted-foreground font-mono">{profileUser.collegeId}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Community Impact & Achievements ────────────────────────────────── */}
        {(helpedCount > 0 || currentHelpingCount > 0) && (
          <div className="glass-card rounded-2xl border border-primary/20 shadow-lg overflow-hidden relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-primary/5 to-transparent pointer-events-none" />
            <div className="px-5 py-3 bg-amber-500/5 border-b border-amber-500/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">Community Impact</span>
              </div>
            </div>
            
            <div className="px-6 py-6 flex flex-col sm:flex-row items-center gap-6 relative z-10">
              {helpedCount > 0 && (
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg transform -rotate-3 group-hover:rotate-0 transition-transform duration-500">
                    <Trophy className="w-8 h-8 text-white drop-shadow-md" />
                  </div>
                  <div>
                    <div className="text-2xl font-black tracking-tighter text-amber-600 dark:text-amber-400 leading-none">
                      {helpedCount} {helpedCount === 1 ? 'Person' : 'People'}
                    </div>
                    <div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mt-1">Successfully Helped</div>
                  </div>
                </div>
              )}
              
              {helpedCount > 0 && currentHelpingCount > 0 && (
                <div className="w-px h-10 bg-border/40 hidden sm:block" />
              )}

              {currentHelpingCount > 0 && (
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg transform rotate-3 group-hover:rotate-0 transition-transform duration-500">
                    <Users2 className="w-8 h-8 text-white drop-shadow-md" />
                  </div>
                  <div>
                    <div className="text-2xl font-black tracking-tighter text-primary leading-none">
                      {currentHelpingCount} Active
                    </div>
                    <div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mt-1">Currently Helping</div>
                  </div>
                </div>
              )}
            </div>
            
          </div>
        )}

        {/* ── Skills ───────────────────────────────────────────────────────── */}
        {profileUser.skillsArray && profileUser.skillsArray.length > 0 && (
          <div className="glass-card rounded-2xl border border-border/40 shadow-sm overflow-hidden">
            <div className="px-5 py-3 bg-secondary/20 border-b border-border/30 flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-primary" />
              <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">Skills</span>
            </div>
            <div className="px-5 py-4 flex flex-wrap gap-2">
              {profileUser.skillsArray.map((skill: string) => (
                <Badge
                  key={skill}
                  variant="secondary"
                  className="px-3 py-1.5 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-bold text-xs shadow-sm"
                >
                  {skill}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* ── Activity Tabs ─────────────────────────────────────────────────── */}
        <Tabs defaultValue="requests" className="w-full">
          <TabsList className="w-full h-12 rounded-2xl bg-secondary/30 border border-border/30 p-1 gap-1">
            <TabsTrigger
              value="requests"
              className="flex-1 rounded-xl font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-primary transition-all flex flex-col items-center py-1.5 h-auto gap-0"
            >
              <span className="text-sm font-black leading-tight">{userHelpRequests.length}</span>
              <span className="text-[10px] uppercase opacity-60 font-black tracking-tighter">Requests</span>
            </TabsTrigger>
            <TabsTrigger
              value="projects"
              className="flex-1 rounded-xl font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-primary transition-all flex flex-col items-center py-1.5 h-auto gap-0"
            >
              <span className="text-sm font-black leading-tight">{userProjects.length}</span>
              <span className="text-[10px] uppercase opacity-60 font-black tracking-tighter">Projects</span>
            </TabsTrigger>
          </TabsList>

          {/* Active Requests Tab */}
          <TabsContent value="requests" className="mt-4 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {userHelpRequests.length === 0 ? (
              <EmptyState icon={Wrench} message="No active help requests" />
            ) : (
              userHelpRequests.map((req) => <HelpCard key={req.id} req={req} />)
            )}
          </TabsContent>

          {/* Active Projects Tab */}
          <TabsContent value="projects" className="mt-4 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {userProjects.length === 0 ? (
              <EmptyState icon={Briefcase} message="No active project posts" />
            ) : (
              userProjects.map((post) => <ProjectCard key={post.id} post={post} />)
            )}
          </TabsContent>


        </Tabs>

      </div>
    </Layout>
  );
}
