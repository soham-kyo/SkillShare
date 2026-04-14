import Layout from "@/components/layout";
import { useUser } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef, useEffect } from "react";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "wouter";
import { Users, Plus, Search, UserCheck, Clock, Code2, FlaskConical, Briefcase, MessageCircle, CheckCircle2, XCircle, Settings2, User, Trash2, Pencil, Undo2, Ban, Rocket, FolderLock, Zap } from "lucide-react";
import { ToastAction } from "@/components/ui/toast";
import { formatDistanceToNow } from "date-fns";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const PROJECT_TYPES = [
  { value: "hackathon", label: "Hackathon", icon: Code2, color: "text-indigo-500 bg-indigo-500/10" },
  { value: "fyp", label: "Final Year Project", icon: FlaskConical, color: "text-emerald-500 bg-emerald-500/10" },
  { value: "research", label: "Research", icon: Briefcase, color: "text-amber-500 bg-amber-500/10" },
  { value: "other", label: "Other", icon: Briefcase, color: "text-zinc-500 bg-zinc-500/10" },
];

function ApplyDialog({ postId, onSuccess }: { postId: number; onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const qc = useQueryClient();
  const form = useForm({ defaultValues: { message: "", postId } });

  const apply = useMutation({
    mutationFn: (data: any) => apiRequest("POST", `/api/projects/${postId}/apply`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({ title: "Application sent!" });
      setOpen(false);
      form.reset();
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Error", description: e.message }),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5"><UserCheck className="w-3.5 h-3.5" />Apply</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Apply to Join Project</DialogTitle></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(d => apply.mutate(d))} className="space-y-4">
            <FormField control={form.control} name="message" rules={{ required: "Tell them about yourself" }} render={({ field }) => (
              <FormItem>
                <FormLabel>Why should they pick you?</FormLabel>
                <FormControl><Textarea placeholder="Introduce yourself, relevant skills, past projects..." rows={4} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <Button type="submit" className="w-full" disabled={apply.isPending}>
              {apply.isPending ? "Sending..." : "Send Application"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function ManageApplicationsDialog({ post }: { post: any }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const qc = useQueryClient();
  const [, setLocation] = useLocation();

  const updateStatus = useMutation({
    mutationFn: ({ appId, status }: { appId: number; status: string }) => 
      apiRequest("PATCH", `/api/applications/${appId}`, { status }),
    onSuccess: (_, { appId, status }) => {
      qc.setQueryData(["/api/projects"], (old: any[] | undefined) => {
        return old?.map(post => ({
          ...post,
          applications: post.applications?.map((a: any) => 
            a.id === appId ? { ...a, status } : a
          )
        }));
      });
      qc.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({ title: "Status updated" });
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Error", description: e.message }),
  });

  const acceptedCount = post.applications?.filter((a: any) => a.status === "accepted").length || 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5 border-primary/20 hover:bg-primary/5 h-8">
          <Settings2 className="w-3.5 h-3.5" /> Manage
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            Manage Applications
            <Badge variant="secondary" className="ml-2">
              {acceptedCount} / {post.teamSize - 1} slots filled
            </Badge>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 mt-6">
          {(!post.applications || post.applications.length === 0) ? (
            <div className="text-center py-12 text-muted-foreground italic bg-secondary/20 rounded-2xl border border-dashed border-border">
              No applications yet. When students apply, they will appear here.
            </div>
          ) : (
            post.applications.map((app: any) => (
              <div key={app.id} className="p-5 rounded-2xl border border-border bg-card shadow-sm hover:shadow-md transition-shadow space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shadow-inner">
                      {app.applicant?.name?.slice(0, 2).toUpperCase() || "??"}
                    </div>
                    <div>
                      <div className="font-bold text-base">{app.applicant?.name || "Deleted User"}</div>
                      <div className="text-xs text-muted-foreground font-medium">{app.applicant?.collegeId || "N/A"}</div>
                    </div>
                  </div>
                  <Badge variant={app.status === "accepted" ? "outline" : app.status === "rejected" ? "destructive" : "secondary"} className="uppercase font-bold tracking-tighter text-[10px] px-2 py-0.5">
                    {app.status || "pending"}
                  </Badge>
                </div>
                
                <div className="text-sm bg-secondary/30 p-4 rounded-xl italic text-muted-foreground border border-border/50">
                   "{app.message}"
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                   <Button 
                    size="sm" 
                    variant="ghost" 
                    className="gap-1.5 font-bold h-9"
                    onClick={() => { setOpen(false); setLocation(`/chat?userId=${app.applicantId}`); }}
                   >
                    <MessageCircle className="w-4 h-4" /> Chat
                  </Button>
                  
                  {app.status === "pending" && post.status === "open" && (
                    <>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5 font-bold h-9"
                        onClick={() => updateStatus.mutate({ appId: app.id, status: "rejected" })}
                        disabled={updateStatus.isPending}
                      >
                        <XCircle className="w-4 h-4" /> Reject
                      </Button>
                      <Button 
                        size="sm" 
                        className="bg-emerald-600 hover:bg-emerald-700 gap-1.5 font-bold h-9 shadow-sm"
                        onClick={() => updateStatus.mutate({ appId: app.id, status: "accepted" })}
                        disabled={updateStatus.isPending}
                      >
                        <CheckCircle2 className="w-4 h-4" /> Accept
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PostDialog() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const qc = useQueryClient();
  const form = useForm({
    defaultValues: { 
      title: "", 
      description: "", 
      skillsNeeded: "", 
      projectType: "hackathon", 
      customProjectType: "",
      teamSize: 3, 
      maxApplications: 10 
    }
  });

  const selectedType = form.watch("projectType");

  const create = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/projects", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({ title: "Project posted!" });
      setOpen(false);
      form.reset();
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Error", description: e.message }),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2"><Plus className="w-4 h-4" />Post a Project</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Post a Project</DialogTitle></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(d => {
            const finalProjectType = d.projectType === "other" ? (d.customProjectType || "Other") : d.projectType;
            create.mutate({ 
              ...d, 
              projectType: finalProjectType,
              teamSize: Number(d.teamSize),
              maxApplications: Number(d.maxApplications)
            });
          })} className="space-y-4">
            <FormField control={form.control} name="title" rules={{ required: true }} render={({ field }) => (
              <FormItem>
                <FormLabel>Project Name</FormLabel>
                <FormControl><Input placeholder="e.g. StuFind — Campus Event App" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="description" rules={{ required: true }} render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl><Textarea placeholder="What are you building? What's the goal?" rows={3} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="skillsNeeded" rules={{ required: true }} render={({ field }) => (
              <FormItem>
                <FormLabel>Skills Needed</FormLabel>
                <FormControl><Input placeholder="e.g. React Native, Node.js, UI/UX" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="projectType" render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {PROJECT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
              {selectedType === "other" && (
                <FormField control={form.control} name="customProjectType" rules={{ required: true }} render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Custom Project Type Name</FormLabel>
                    <FormControl><Input placeholder="e.g. Social Media App, IoT Project..." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              )}
              <FormField control={form.control} name="teamSize" render={({ field }) => (
                <FormItem>
                  <FormLabel>Team Size</FormLabel>
                  <FormControl><Input type="number" min="2" max="20" {...field} /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="maxApplications" render={({ field }) => (
                <FormItem>
                  <FormLabel>Max Applications</FormLabel>
                  <FormControl><Input type="number" min="1" max="100" {...field} /></FormControl>
                </FormItem>
              )} />
            </div>
            <Button type="submit" className="w-full" disabled={create.isPending}>
              {create.isPending ? "Posting..." : "Post Project"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function ProjectEditDialog({ post }: { post: any }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const qc = useQueryClient();
  const isPredefined = PROJECT_TYPES.some(t => t.value === post.projectType);
  const form = useForm({
    defaultValues: { 
      title: post.title, 
      description: post.description, 
      skillsNeeded: post.skillsNeeded, 
      projectType: isPredefined ? post.projectType : "other", 
      customProjectType: isPredefined ? "" : post.projectType,
      teamSize: post.teamSize,
      maxApplications: post.maxApplications || 10
    }
  });

  const selectedType = form.watch("projectType");

  const edit = useMutation({
    mutationFn: (data: any) => apiRequest("PATCH", `/api/projects/${post.id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({ title: "Project updated!" });
      setOpen(false);
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Error", description: e.message }),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" title="Edit Project" className="h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary">
          <Pencil className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Edit Project</DialogTitle></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(d => {
            const finalProjectType = d.projectType === "other" ? (d.customProjectType || "Other") : d.projectType;
            edit.mutate({ 
              ...d, 
              projectType: finalProjectType,
              teamSize: Number(d.teamSize),
              maxApplications: Number(d.maxApplications)
            });
          })} className="space-y-4">
            <FormField control={form.control} name="title" rules={{ required: true }} render={({ field }) => (
              <FormItem>
                <FormLabel>Project Name</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="description" rules={{ required: true }} render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl><Textarea rows={3} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="skillsNeeded" rules={{ required: true }} render={({ field }) => (
              <FormItem>
                <FormLabel>Skills Needed</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="projectType" render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {PROJECT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
              {selectedType === "other" && (
                <FormField control={form.control} name="customProjectType" rules={{ required: true }} render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Custom Project Type Name</FormLabel>
                    <FormControl><Input placeholder="e.g. Social App" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              )}
              <FormField control={form.control} name="teamSize" render={({ field }) => (
                <FormItem>
                  <FormLabel>Team Size</FormLabel>
                  <FormControl><Input type="number" min="2" max="20" {...field} /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="maxApplications" render={({ field }) => (
                <FormItem>
                  <FormLabel>Max Applications</FormLabel>
                  <FormControl><Input type="number" min="1" max="100" {...field} /></FormControl>
                </FormItem>
              )} />
            </div>
            <Button type="submit" className="w-full" disabled={edit.isPending}>
              {edit.isPending ? "Updating..." : "Update Project"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function MatchmakingPage() {
  const { data: user, isLoading: userLoading } = useUser();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [location, setLocation] = useLocation();

  const [searchQuery, setSearchQuery] = useState("");
  const [searchInputValue, setSearchInputValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filterType, setFilterType] = useState("all");
  const [pendingPostIds, setPendingPostIds] = useState<Set<number>>(new Set());
  const [pendingAppIds, setPendingAppIds] = useState<Set<number>>(new Set());
  const [expandedAccordion, setExpandedAccordion] = useState<string>("");
  const [expandedMyOpenProjects, setExpandedMyOpenProjects] = useState<string>("");
  const [expandedMyClosedProjects, setExpandedMyClosedProjects] = useState<string>("");
  const [expandedJoinedOpenProjects, setExpandedJoinedOpenProjects] = useState<string>("");
  const [expandedJoinedClosedProjects, setExpandedJoinedClosedProjects] = useState<string>("");
  const postTimeouts = useRef<Map<number, NodeJS.Timeout>>(new Map());
  const appTimeouts = useRef<Map<number, NodeJS.Timeout>>(new Map());


  // Mark matchmaking as viewed on mount
  useEffect(() => {
    apiRequest("POST", "/api/notifications/mark-viewed", { section: "matchmaking" })
      .then(() => qc.invalidateQueries({ queryKey: ["/api/notifications/unread-counts"] }))
      .catch(console.error);
  }, [qc]);

  const { data: posts, isLoading } = useQuery<any[]>({ 
    queryKey: ["/api/projects"],
    refetchInterval: 5000,
  });


  // Commit pending deletions on unmount
  useEffect(() => {
    return () => {
      postTimeouts.current.forEach((interval, id) => {
        clearInterval(interval);
        deletePost.mutate(id);
      });
      appTimeouts.current.forEach((interval, id) => {
        clearInterval(interval);
        withdrawApplication.mutate(id);
      });
    };
  }, []);



  // Deep linking logic
  useEffect(() => {
    if (isLoading || !posts) return;
    
    const params = new URLSearchParams(window.location.search);
    const targetId = params.get("id");
    
    if (targetId) {
      const idNum = Number(targetId);
      const post = posts.find(p => p.id === idNum);
      
      if (post) {
        // 1. Expand accordions if needed
        const isOwner = post.authorId === user?.id;
        const isParticipant = post.applications?.some((app: any) => app.applicantId === user?.id && app.status === "accepted");
        
        if (isOwner) {
          setExpandedAccordion("my-projects");
          if (post.status === "closed") {
            setExpandedMyClosedProjects("my-closed-projects");
          } else {
            setExpandedMyOpenProjects("my-open-projects");
          }
        } else if (isParticipant) {
          setExpandedAccordion("joined-projects");
          if (post.status === "closed") {
            setExpandedJoinedClosedProjects("joined-closed-projects");
          } else {
            setExpandedJoinedOpenProjects("joined-open-projects");
          }
        }
        
        // 2. Scroll and highlight
        setTimeout(() => {
          const el = document.getElementById(`project-post-${targetId}`);
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
            el.classList.add("ring-4", "ring-primary/40", "ring-offset-4", "ring-offset-background", "shadow-2xl", "scale-[1.01]");
            setTimeout(() => {
              el.classList.remove("ring-4", "ring-primary/40", "ring-offset-4", "ring-offset-background", "shadow-2xl", "scale-[1.01]");
            }, 3000);
          }
        }, 300);
      }
    }
  }, [isLoading, posts, user?.id]);

  const deletePost = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/projects/${id}`),
    onSuccess: (_, id) => {
      qc.setQueryData(["/api/projects"], (old: any[] | undefined) => {
        return old?.filter(p => p.id !== id);
      });
      qc.invalidateQueries({ queryKey: ["/api/projects"] });
      setPendingPostIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Error", description: e.message })
  });

  const withdrawApplication = useMutation({
    mutationFn: (appId: number) => apiRequest("DELETE", `/api/applications/${appId}`),
    onSuccess: (_, appId) => {
      qc.invalidateQueries({ queryKey: ["/api/projects"] });
      setPendingAppIds(prev => {
        const next = new Set(prev);
        next.delete(appId);
        return next;
      });
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Error", description: e.message })
  });
  const filtered = (posts ?? []).filter(p => {
    if (pendingPostIds.has(p.id)) return false;

    // Visibility check for closed projects
    if (p.status === "closed") {
      const isOwner = p.authorId === user?.id;
      const isParticipant = p.applications?.some((app: any) => app.applicantId === user?.id && app.status === "accepted");
      if (!isOwner && !isParticipant) return false;
    }

    const matchType = filterType === "all" || p.projectType === filterType;
    const matchSearch = !searchQuery || 
      (p.title?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.skillsNeeded?.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchType && matchSearch;
  });
  const authoredProjects = filtered.filter(p => p.authorId === user?.id);
  const joinedProjects = filtered.filter(p => 
    p.authorId !== user?.id && 
    p.applications?.some((app: any) => app.applicantId === user?.id && app.status === "accepted")
  );
  const otherActiveProjects = filtered
    .filter(p => !authoredProjects.includes(p) && !joinedProjects.includes(p) && p.status !== "closed")
    .map(p => {
      // Calculate match score
      const projectSkills = p.skillsNeeded?.toLowerCase().split(",").map((s: string) => s.trim()) || [];
      const userSkills = user?.skillsArray?.map((s: string) => s.toLowerCase()) || [];
      const matches = projectSkills.filter((s: string) => userSkills.includes(s));
      return { ...p, matchScore: matches.length };
    })
    .sort((a, b) => {
      if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });

  const renderProjectCard = (post: any) => {
    const info = typeInfo(post.projectType);
    const TypeIcon = info.icon;
    const acceptedApps = post.applications?.filter((a: any) => a.status === "accepted") || [];
    const acceptedCount = acceptedApps.length;
    const capacity = post.teamSize || 3;
    const fillPercentage = (acceptedCount / capacity) * 100;

    return (
      <Card id={`project-post-${post.id}`} key={post.id} className="glass-card hover:shadow-xl transition-all duration-500 border-primary/5 hover:border-primary/20 group relative overflow-hidden rounded-3xl shadow-lg">
        {/* Accent Bar - Vertical for horizontal layout */}
        <div className={`absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b ${info.color.includes('indigo') ? 'from-indigo-500 to-purple-500' : info.color.includes('emerald') ? 'from-emerald-500 to-teal-500' : info.color.includes('amber') ? 'from-amber-500 to-orange-500' : 'from-zinc-500 to-slate-500'} opacity-80`} />
        
        <CardContent className="p-0">
          <div className="flex flex-col md:flex-row min-h-[220px]">
            {/* Left Column: Visual & Type */}
            <div className={`w-full md:w-56 p-7 flex flex-col items-center justify-center gap-4 relative overflow-hidden border-b md:border-b-0 md:border-r border-border/10 ${info.color.replace('text-', 'bg-').replace('500', '500/5')}`}>
              <div className={`p-4 rounded-2xl transition-custom group-hover:scale-110 group-hover:shadow-lg ${info.color} relative z-10`}>
                <TypeIcon className="w-8 h-8" />
              </div>
              <div className="text-center relative z-10">
                <Badge variant="secondary" className="text-[10px] font-black uppercase tracking-widest bg-primary/10 text-primary border-none px-3 py-1 mb-2">{info.label}</Badge>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold text-muted-foreground/60 uppercase tracking-tighter">
                    <Clock className="w-3 h-3" />
                    {post.createdAt ? formatDistanceToNow(new Date(post.createdAt), { addSuffix: true }) : "recently"}
                  </div>
                  <Link
                    href={`/users/${post.author?.username}`}
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center justify-center gap-1.5 px-3 py-1 rounded-lg bg-primary/5 border border-primary/10 hover:bg-primary/10 transition-colors"
                  >
                    <User className="w-3 h-3 text-primary/50" />
                    <span className="text-[10px] font-black text-primary/80 uppercase tracking-widest truncate max-w-[120px]">
                      @{post.author?.username || "Unknown"}
                    </span>
                  </Link>
                </div>
              </div>
              {/* Background Icon Decoration */}
              <TypeIcon className="absolute -bottom-6 -left-6 w-32 h-32 opacity-[0.03] rotate-12 pointer-events-none" />
            </div>

            {/* Middle Column: Content */}
            <div className="flex-1 p-7 flex flex-col gap-3 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex flex-col gap-1 min-w-0">
                    <h3 className="font-extrabold text-2xl tracking-tight group-hover:text-primary transition-colors leading-tight truncate">{post.title}</h3>
                    {post.matchScore > 0 && (
                      <div className="flex items-center gap-1 text-[10px] font-black text-amber-500 uppercase tracking-tighter animate-pulse">
                        <Zap className="w-3 h-3 fill-amber-500" /> Highly Recommended for You
                      </div>
                    )}
                  </div>
                  <Badge variant={post.status === "open" ? "secondary" : "outline"} className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg shrink-0 ${post.status === "open" ? "bg-emerald-500/10 text-emerald-600 border border-emerald-200/50" : "opacity-40"}`}>
                    {post.status === "open" ? "Recruiting" : "Closed"}
                  </Badge>
                </div>
              <p className="text-sm text-muted-foreground/80 leading-relaxed line-clamp-2 mb-2">{post.description}</p>
              
              <div className="flex flex-wrap gap-2 mt-auto">
                {post.skillsNeeded?.split(",").map((s: string) => (
                  <Badge key={s} variant="secondary" className="text-[10px] font-bold bg-secondary/40 text-foreground/80 border-none px-2.5 py-1 rounded-lg hover:bg-primary/10 hover:text-primary transition-all duration-300">
                    #{s?.trim().toLowerCase() || "skill"}
                  </Badge>
                )) || <span className="text-xs text-muted-foreground">No specific skills listed</span>}
              </div>
            </div>

            {/* Right Column: Team & Actions */}
            <div className="w-full md:w-72 p-7 flex flex-col justify-between gap-6 bg-secondary/5 border-t md:border-t-0 md:border-l border-border/10">
              {/* Visual Capacity */}
              <div className="space-y-3">
                <div className="flex justify-between items-end">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Team Status</span>
                  <span className="text-xs font-bold text-primary">
                    {acceptedCount} <span className="text-muted-foreground/40 font-medium">/</span> {capacity}
                  </span>
                </div>
                <div className="h-2 w-full bg-secondary rounded-full overflow-hidden p-0.5 border border-border/5">
                  <div 
                    className={`h-full rounded-full transition-all duration-1000 ease-out ${fillPercentage >= 100 ? 'bg-emerald-500' : 'bg-primary shadow-[0_0_8px_rgba(var(--primary),0.4)]'}`}
                    style={{ width: `${Math.min(fillPercentage, 100)}%` }}
                  />
                </div>
                <div className="flex items-center gap-1.5 pt-1">
                   <div className="flex -space-x-2">
                      {acceptedApps.slice(0, 4).map((app: any, i: number) => (
                        <div key={i} className="w-7 h-7 rounded-full border-2 border-background bg-secondary flex items-center justify-center text-[8px] font-bold text-primary shadow-sm hover:z-10 transition-transform hover:scale-110 cursor-default">
                          {app.applicant?.name?.slice(0, 2).toUpperCase() || "?"}
                        </div>
                      ))}
                      {acceptedCount > 4 && (
                        <div className="w-7 h-7 rounded-full border-2 border-background bg-secondary/80 flex items-center justify-center text-[8px] font-bold text-muted-foreground shadow-sm">
                          +{acceptedCount - 4}
                        </div>
                      )}
                      {acceptedCount === 0 && (
                        <div className="w-7 h-7 rounded-full border-2 border-dashed border-border flex items-center justify-center text-[10px] text-muted-foreground/30">
                          <Users className="w-3.5 h-3.5" />
                        </div>
                      )}
                   </div>
                   <span className="text-[10px] font-bold text-muted-foreground/50 ml-1">
                     {post.applications?.length || 0} applied
                   </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 mt-auto">
                <div className="flex-1">
                  {user && post.status === "open" && post.authorId !== user.id && (() => {
                    const application = post.applications?.find((a: any) => a.applicantId === user.id);
                    if (application) {
                      return (
                        <div className="flex items-center gap-2">
                          {application.status === "pending" && !pendingAppIds.has(application.id) && (
                            <div className="space-y-2 w-full">
                              <div className="flex items-center justify-center gap-2 py-2 px-3 bg-amber-500/5 text-amber-600 rounded-xl border border-amber-500/10">
                                <Clock className="w-3.5 h-3.5 animate-pulse" />
                                <span className="text-[10px] font-black uppercase tracking-wider">Application Pending</span>
                              </div>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="w-full h-10 rounded-xl border-destructive/20 text-destructive hover:bg-destructive/10 hover:text-destructive hover:border-destructive/40 gap-2 font-extrabold text-[11px] transition-all shadow-sm"
                                onClick={() => handleWithdrawApplication(application.id)}
                              >
                                <XCircle className="w-4 h-4" /> Withdraw Application
                              </Button>
                            </div>
                          )}
                          {application.status === "accepted" && (
                            <div className="flex items-center gap-2 w-full">
                              <Badge className="flex-1 justify-center text-emerald-600 bg-emerald-500/10 border-none py-2 rounded-xl font-bold text-[10px]">
                                Accepted
                              </Badge>
                              <Button size="sm" variant="ghost" title="Chat with Author" className="h-9 w-9 rounded-xl p-0 text-primary hover:bg-primary/5 shadow-none" onClick={() => setLocation(`/chat?userId=${post.authorId}`)}>
                                <MessageCircle className="w-4.5 h-4.5" />
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    }
                    const isFull = (post.applications?.length || 0) >= (post.maxApplications || 10);
                    return isFull ? (
                      <Badge variant="outline" className="w-full justify-center py-2 rounded-xl opacity-40 font-bold border-dashed text-[10px]">Full</Badge>
                    ) : (
                      <div className="w-full">
                         <ApplyDialog postId={post.id} onSuccess={() => qc.invalidateQueries({ queryKey: ["/api/projects"] })} />
                      </div>
                    );
                  })()}

                  {post.authorId === user?.id && (
                    <div className="flex items-center justify-between w-full p-1 bg-background/50 rounded-xl border border-border/5 shadow-inner">
                      <div className="flex items-center gap-1">
                        <ManageApplicationsDialog post={post} />
                        <ProjectEditDialog post={post} />
                      </div>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        title="Delete Project"
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 w-8 rounded-lg p-0"
                        onClick={() => handleDeletePost(post.id)}
                        disabled={deletePost.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const suggestions = (posts ?? []).filter(p =>
    searchInputValue &&
    !pendingPostIds.has(p.id) &&
    (p.title?.toLowerCase().includes(searchInputValue.toLowerCase()) || p.skillsNeeded?.toLowerCase().includes(searchInputValue.toLowerCase()))
  ).slice(0, 5);

  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    setSearchQuery(searchInputValue);
    setShowSuggestions(false);
  };

  const handleDeletePost = (id: number) => {
    setPendingPostIds(prev => new Set(prev).add(id));
    let remaining = 5;
    
    const { update, dismiss } = toast({
      title: "Project deleted",
      description: `You have ${remaining} seconds to undo this action.`,
      action: (
        <ToastAction altText="Undo" onClick={() => {
          clearInterval(interval);
          postTimeouts.current.delete(id);
          setPendingPostIds(prev => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
          dismiss();
        }}>
          Undo
        </ToastAction>
      ),
    });

    const interval = setInterval(() => {
      remaining -= 1;
      if (remaining > 0) {
        update({
          description: `You have ${remaining} seconds to undo this action.`,
        } as any);
      } else {
        clearInterval(interval);
        postTimeouts.current.delete(id);
        deletePost.mutate(id);
        dismiss();
      }
    }, 1000);

    postTimeouts.current.set(id, interval);
  };

  const handleWithdrawApplication = (appId: number) => {
    setPendingAppIds(prev => new Set(prev).add(appId));
    let remaining = 5;
    
    const { update, dismiss } = toast({
      title: "Application withdrawn",
      description: `You have ${remaining} seconds to undo this action.`,
      action: (
        <ToastAction altText="Undo" onClick={() => {
          clearInterval(interval);
          appTimeouts.current.delete(appId);
          setPendingAppIds(prev => {
            const next = new Set(prev);
            next.delete(appId);
            return next;
          });
          dismiss();
        }}>
          Undo
        </ToastAction>
      ),
    });

    const interval = setInterval(() => {
      remaining -= 1;
      if (remaining > 0) {
        update({
          description: `You have ${remaining} seconds to undo this action.`,
        } as any);
      } else {
        clearInterval(interval);
        appTimeouts.current.delete(appId);
        withdrawApplication.mutate(appId);
        dismiss();
      }
    }, 1000);

    appTimeouts.current.set(appId, interval);
  };

  const typeInfo = (type: string) => {
    const predefined = PROJECT_TYPES.find(t => t.value === type);
    if (predefined) return predefined;
    return { ...PROJECT_TYPES[3], label: type.charAt(0).toUpperCase() + type.slice(1) };
  };

  return (
    <Layout>
      <div className="container mx-auto px-0 py-6 min-h-screen">
        <div className="max-w-7xl mx-auto space-y-12">
          <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 animate-in fade-in slide-in-from-top-4 duration-700">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 rounded-2xl shadow-inner group">
                  <Rocket className="w-7 h-7 text-primary animate-pulse group-hover:scale-125 transition-transform" />
                </div>
                <h1 className="text-5xl font-black tracking-tight text-foreground/90 leading-tight">Matchmaking <span className="text-primary italic">Hub</span></h1>
              </div>
              <p className="text-muted-foreground text-lg font-medium max-w-xl leading-relaxed">Find your dream project or build your squad. Filter by interest and launch something epic.</p>
            </div>
            <PostDialog />
          </header>

          <div className="flex flex-col md:flex-row gap-4 items-center animate-in fade-in slide-in-from-left-4 duration-1000 delay-200">
            <div className="relative flex-1 group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-4.5 w-4.5 text-muted-foreground opacity-50 group-focus-within:text-primary transition-colors" />
              </div>
              <Input 
                placeholder="Search by title or required skills..." 
                value={searchInputValue}
                onChange={(e) => {
                  setSearchInputValue(e.target.value);
                  setShowSuggestions(true);
                }}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pl-11 h-11 rounded-2xl border-primary/10 transition-custom shadow-sm group-hover:shadow-md focus:ring-primary/20 bg-background/50 backdrop-blur-sm"
                onFocus={() => setShowSuggestions(true)}
              />
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-2 bg-background/95 backdrop-blur-md border border-primary/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                  {suggestions.map((p: any) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setSearchInputValue(p.title);
                        setSearchQuery(p.title);
                        setShowSuggestions(false);
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-primary/5 flex items-center justify-between transition-colors group/item border-b border-border/10 last:border-0"
                    >
                      <div className="flex-1 min-w-0 pr-4">
                        <div className="text-sm font-bold tracking-tight truncate">{p.title}</div>
                        <div className="text-[10px] text-muted-foreground truncate opacity-70">Requires: {p.skillsNeeded}</div>
                      </div>
                      <Badge variant="outline" className="text-[9px] h-5 rounded-lg border-primary/20 text-primary shrink-0">Match</Badge>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Button onClick={() => handleSearch()} className="h-11 px-5 rounded-2xl shadow-md hover:shadow-lg transition-all shrink-0">
              <Search className="w-4 h-4 mr-2" /> Search
            </Button>
          </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-52 h-11 rounded-2xl border-primary/10 transition-custom shadow-sm hover:shadow-md focus:ring-primary/20"><SelectValue placeholder="Project Type" /></SelectTrigger>
          <SelectContent className="rounded-2xl shadow-xl border-primary/10">
            <SelectItem value="all">All Types</SelectItem>
            {PROJECT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>

          {isLoading ? (
            <div className="flex flex-col gap-4">
              {[1, 2, 3, 4].map(i => <div key={i} className="h-44 bg-secondary/30 rounded-3xl animate-pulse" />)}
            </div>
          ) : (
            <div className="space-y-8">
              {/* Example Template */}
              <Accordion type="single" collapsible className="mb-6">
                <AccordionItem value="template" className="border-none">
                  <AccordionTrigger className="glass-card h-14 px-8 rounded-3xl border border-dashed border-primary/20 hover:bg-primary/5 transition-custom text-muted-foreground hover:no-underline shadow-sm">
                     <div className="flex items-center gap-3 text-sm font-bold uppercase tracking-widest">
                       <Rocket className="w-5 h-5" /> View Template Project
                     </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-4 pb-0 opacity-70 hover:opacity-100 transition-opacity">
                    <div className="pointer-events-none">
                      {renderProjectCard({
                        id: -1,
                        title: "[Template] AI Document Analyzer",
                        description: "This is a sample project to show how the interface looks. Need developers to build an AI powered PDF analyzer for hackathon.",
                        skillsNeeded: "Python, React, Tailwind",
                        projectType: "hackathon",
                        teamSize: 4,
                        status: "open",
                        createdAt: new Date().toISOString(),
                        authorId: -1,
                        author: { username: "student_dev", name: "Student Dev" },
                        applications: [
                          { status: "accepted", applicant: { name: "Alice" } },
                          { status: "pending", applicant: { name: "Bob" } }
                        ],
                        maxApplications: 10
                      })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              {authoredProjects.length > 0 && (
                <Accordion type="single" collapsible className="w-full" value={expandedAccordion} onValueChange={setExpandedAccordion}>
                  <AccordionItem value="my-projects" className="border-none">
                    <AccordionTrigger className="glass-card h-16 px-8 rounded-3xl border border-primary/30 hover:bg-primary/5 transition-custom text-primary hover:no-underline group shadow-sm">
                      <div className="flex items-center gap-3 text-sm font-black uppercase tracking-[0.2em]">
                        <span className="p-1.5 rounded-lg bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                          <User className="w-4 h-4" />
                        </span>
                        My Projects
                        <Badge variant="secondary" className="ml-2 text-[10px] bg-primary/10 text-primary font-black border-none">{authoredProjects.length}</Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-4 pb-2">
                      <div className="flex flex-col gap-4">
                        {/* Open Projects nested accordion */}
                        {authoredProjects.filter(p => p.status !== "closed").length > 0 && (
                          <Accordion type="single" collapsible className="w-full" value={expandedMyOpenProjects} onValueChange={setExpandedMyOpenProjects}>
                            <AccordionItem value="my-open-projects" className="border-none">
                              <AccordionTrigger className="glass-card h-12 px-6 rounded-2xl border border-emerald-500/20 hover:bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 hover:no-underline transition-custom">
                                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest">
                                  <CheckCircle2 className="w-4 h-4" />
                                  Open ({authoredProjects.filter(p => p.status !== "closed").length})
                                </div>
                              </AccordionTrigger>
                              <AccordionContent className="pt-4 pb-0">
                                <div className="flex flex-col gap-6">
                                  {authoredProjects.filter(p => p.status !== "closed").map(post => renderProjectCard(post))}
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          </Accordion>
                        )}

                        {/* Closed Projects nested accordion */}
                        {authoredProjects.filter(p => p.status === "closed").length > 0 && (
                          <Accordion type="single" collapsible className="w-full" value={expandedMyClosedProjects} onValueChange={setExpandedMyClosedProjects}>
                            <AccordionItem value="my-closed-projects" className="border-none">
                              <AccordionTrigger className="glass-card h-12 px-6 rounded-2xl border border-zinc-500/20 hover:bg-zinc-500/5 text-zinc-500 hover:no-underline transition-custom">
                                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest">
                                  <FolderLock className="w-4 h-4" />
                                  Closed ({authoredProjects.filter(p => p.status === "closed").length})
                                </div>
                              </AccordionTrigger>
                              <AccordionContent className="pt-4 pb-0">
                                <div className="flex flex-col gap-6 opacity-80">
                                  {authoredProjects.filter(p => p.status === "closed").map(post => renderProjectCard(post))}
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          </Accordion>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              )}

              {joinedProjects.length > 0 && (
                <Accordion type="single" collapsible className="w-full" value={expandedAccordion} onValueChange={setExpandedAccordion}>
                  <AccordionItem value="joined-projects" className="border-none">
                    <AccordionTrigger className="glass-card h-16 px-8 rounded-3xl border border-blue-500/30 hover:bg-blue-500/5 transition-custom text-blue-600 dark:text-blue-400 hover:no-underline group shadow-sm">
                      <div className="flex items-center gap-3 text-sm font-black uppercase tracking-[0.2em]">
                        <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 group-hover:scale-110 transition-transform">
                          <Users className="w-4 h-4" />
                        </span>
                        Joined projects
                        <Badge variant="secondary" className="ml-2 text-[10px] bg-blue-500/10 text-blue-600 font-black border-none">{joinedProjects.length}</Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-4 pb-2">
                      <div className="flex flex-col gap-4">
                        {/* Joined Open Projects nested accordion */}
                        {joinedProjects.filter(p => p.status !== "closed").length > 0 && (
                          <Accordion type="single" collapsible className="w-full" value={expandedJoinedOpenProjects} onValueChange={setExpandedJoinedOpenProjects}>
                            <AccordionItem value="joined-open-projects" className="border-none">
                              <AccordionTrigger className="glass-card h-12 px-6 rounded-2xl border border-emerald-500/20 hover:bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 hover:no-underline transition-custom">
                                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest">
                                  <CheckCircle2 className="w-4 h-4" />
                                  Active ({joinedProjects.filter(p => p.status !== "closed").length})
                                </div>
                              </AccordionTrigger>
                              <AccordionContent className="pt-4 pb-0">
                                <div className="flex flex-col gap-6">
                                  {joinedProjects.filter(p => p.status !== "closed").map(post => renderProjectCard(post))}
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          </Accordion>
                        )}

                        {/* Joined Closed Projects nested accordion */}
                        {joinedProjects.filter(p => p.status === "closed").length > 0 && (
                          <Accordion type="single" collapsible className="w-full" value={expandedJoinedClosedProjects} onValueChange={setExpandedJoinedClosedProjects}>
                            <AccordionItem value="joined-closed-projects" className="border-none">
                              <AccordionTrigger className="glass-card h-12 px-6 rounded-2xl border border-zinc-500/20 hover:bg-zinc-500/5 text-zinc-500 hover:no-underline transition-custom">
                                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest">
                                  <FolderLock className="w-4 h-4" />
                                  Ongoing ({joinedProjects.filter(p => p.status === "closed").length})
                                </div>
                              </AccordionTrigger>
                              <AccordionContent className="pt-4 pb-0">
                                <div className="flex flex-col gap-6 opacity-80">
                                  {joinedProjects.filter(p => p.status === "closed").map(post => renderProjectCard(post))}
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          </Accordion>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              )}

              {expandedAccordion !== "my-projects" && expandedAccordion !== "joined-projects" && (
                <div className="flex flex-col gap-6">
                  {otherActiveProjects.map(post => renderProjectCard(post))}
                
                {otherActiveProjects.length === 0 && authoredProjects.length === 0 && joinedProjects.length === 0 && (
                  <div className="text-center py-20 text-muted-foreground bg-secondary/10 rounded-3xl border border-dashed border-primary/10">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
                      <p className="font-bold text-lg">Looking for opportunities...</p>
                      <p className="text-sm mt-1">No active projects matching your search. Be the first to start one!</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
