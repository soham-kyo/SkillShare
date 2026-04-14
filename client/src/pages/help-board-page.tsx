import Layout from "@/components/layout";
import { Link, useLocation } from "wouter";
import { useUser } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef, useEffect } from "react";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { HelpCircle, Plus, Coins, Clock, CheckCircle2, Zap, User, Search, MessageCircle, Trash2, Pencil, XCircle, Undo2 } from "lucide-react";
import { ToastAction } from "@/components/ui/toast";
import { formatDistanceToNow } from "date-fns";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const CATEGORIES = ["Programming", "Math", "Science", "Writing", "Design", "Languages", "Other"];

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    open: { label: "Open", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-700/30" },
    in_progress: { label: "In Progress", className: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-700/30" },
    resolved: { label: "Resolved", className: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border border-zinc-200/50 dark:border-zinc-700/30" },
  };
  const s = map[status] ?? map.open;
  return <span className={`text-[10px] uppercase font-black px-2.5 py-1 rounded-lg tracking-wider ${s.className}`}>{s.label}</span>;
}

function PostDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const qc = useQueryClient();
  const form = useForm({ defaultValues: { title: "", description: "", category: "Programming", reward: 0.5 } });

  const create = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/help-requests", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/help-requests"] });
      qc.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({ title: "Help request posted!" });
      setOpen(false);
      form.reset();
      onSuccess();
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Error", description: e.message }),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2"><Plus className="w-4 h-4" />Post a Request</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Post a Help Request</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(d => create.mutate(d))} className="space-y-4">
            <FormField control={form.control} name="title" rules={{ required: "Title is required" }} render={({ field }) => (
              <FormItem>
                <FormLabel>What do you need help with?</FormLabel>
                <FormControl><Input placeholder="e.g. Need help debugging a React error" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="description" rules={{ required: "Description is required" }} render={({ field }) => (
              <FormItem>
                <FormLabel>Describe your problem</FormLabel>
                <FormControl><Textarea placeholder="Be specific — share error messages, what you've tried, etc." rows={3} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="category" render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </FormItem>
              )} />
              <FormField control={form.control} name="reward" render={({ field }) => (
                <FormItem>
                  <FormLabel>Reward (Credits)</FormLabel>
                  <Select onValueChange={v => field.onChange(Number(v))} defaultValue={String(field.value)}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="0.5">0.5 credits</SelectItem>
                      <SelectItem value="1">1 credit</SelectItem>
                      <SelectItem value="1.5">1.5 credits</SelectItem>
                      <SelectItem value="2">2 credits</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
            </div>
            <Button type="submit" className="w-full" disabled={create.isPending}>
              {create.isPending ? "Posting..." : "Post Request"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function HelpEditDialog({ req }: { req: any }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const qc = useQueryClient();
  const form = useForm({ 
    defaultValues: { 
      title: req.title, 
      description: req.description, 
      category: req.category, 
      reward: Number(req.reward) 
    } 
  });

  const edit = useMutation({
    mutationFn: (data: any) => apiRequest("PATCH", `/api/help-requests/${req.id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/help-requests"] });
      toast({ title: "Help request updated!" });
      setOpen(false);
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Error", description: e.message }),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" title="Edit Request" className="h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary">
          <Pencil className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Help Request</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(d => edit.mutate(d))} className="space-y-4">
            <FormField control={form.control} name="title" rules={{ required: "Title is required" }} render={({ field }) => (
              <FormItem>
                <FormLabel>What do you need help with?</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="description" rules={{ required: "Description is required" }} render={({ field }) => (
              <FormItem>
                <FormLabel>Describe your problem</FormLabel>
                <FormControl><Textarea rows={3} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="category" render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </FormItem>
              )} />
              <FormField control={form.control} name="reward" render={({ field }) => (
                <FormItem>
                  <FormLabel>Reward (Credits)</FormLabel>
                  <Select onValueChange={v => field.onChange(Number(v))} defaultValue={String(field.value)}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="0.5">0.5 credits</SelectItem>
                      <SelectItem value="1">1 credit</SelectItem>
                      <SelectItem value="1.5">1.5 credits</SelectItem>
                      <SelectItem value="2">2 credits</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
            </div>
            <Button type="submit" className="w-full" disabled={edit.isPending}>
              {edit.isPending ? "Updating..." : "Update Request"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function HelpBoardPage() {
  const { data: user, isLoading: userLoading } = useUser();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInputValue, setSearchInputValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filterCat, setFilterCat] = useState("all");
  const [pendingDeleteIds, setPendingDeleteIds] = useState<Set<number>>(new Set());
  const [pendingCancelIds, setPendingCancelIds] = useState<Set<number>>(new Set());
  const [expandedAccordion, setExpandedAccordion] = useState<string>("");
  const [expandedMyOpen, setExpandedMyOpen] = useState<string>("");
  const [expandedMyResolved, setExpandedMyResolved] = useState<string>("");
  const [expandedHelpingOpen, setExpandedHelpingOpen] = useState<string>("");
  const [expandedHelpingResolved, setExpandedHelpingResolved] = useState<string>("");
  const timeouts = useRef<Map<number, NodeJS.Timeout>>(new Map());
  const cancelTimeouts = useRef<Map<number, NodeJS.Timeout>>(new Map());

  const { data: requests, isLoading } = useQuery<any[]>({ 
    queryKey: ["/api/help-requests"],
    refetchInterval: 3000, // Keep the "Live" board fresh
  });

  const [location, setLocation] = useLocation();

  // Commit pending deletions and cancels on unmount
  useEffect(() => {
    return () => {
      timeouts.current.forEach((interval, id) => {
        clearInterval(interval);
        deleteReq.mutate(id);
      });
      cancelTimeouts.current.forEach((interval, id) => {
        clearInterval(interval);
        cancel.mutate(id);
      });
    };
  }, []);

  // Mark help board as viewed on mount
  useEffect(() => {
    apiRequest("POST", "/api/notifications/mark-viewed", { section: "helpBoard" })
      .then(() => qc.invalidateQueries({ queryKey: ["/api/notifications/unread-counts"] }))
      .catch(console.error);
  }, [qc]);

  // Deep linking logic
  useEffect(() => {
    if (isLoading || !requests) return;
    
    const params = new URLSearchParams(window.location.search);
    const targetId = params.get("id");
    
    if (targetId) {
      const idNum = Number(targetId);
      const req = requests.find(r => r.id === idNum);
      
      if (req) {
        // 1. Expand accordions if needed
        if (req.authorId === user?.id) {
          setExpandedAccordion("my-requests");
          if (req.status === "resolved") {
            setExpandedMyResolved("my-resolved-reqs");
          } else {
            setExpandedMyOpen("my-open-reqs");
          }
        } else if (req.helperId === user?.id) {
          setExpandedAccordion("helping-others");
          if (req.status === "resolved") {
            setExpandedHelpingResolved("helping-resolved-reqs");
          } else {
            setExpandedHelpingOpen("helping-open-reqs");
          }
        }
        
        // 2. Scroll and highlight
        setTimeout(() => {
          const el = document.getElementById(`help-request-${targetId}`);
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
            el.classList.add("ring-4", "ring-primary/40", "ring-offset-4", "ring-offset-background", "shadow-2xl", "scale-[1.02]");
            setTimeout(() => {
              el.classList.remove("ring-4", "ring-primary/40", "ring-offset-4", "ring-offset-background", "shadow-2xl", "scale-[1.02]");
            }, 3000);
          }
        }, 300); // Wait for accordions to potentially open
      }
    }
  }, [isLoading, requests, user?.id]);


  const accept = useMutation({
    mutationFn: ({ id }: { id: number; authorId: number }) => apiRequest("POST", `/api/help-requests/${id}/accept`),
    onSuccess: (data: any, variables) => {
      qc.setQueryData(["/api/help-requests"], (old: any[] | undefined) => {
        return old?.map(req => req.id === variables.id ? { ...req, status: "in_progress", helperId: user.id, helper: user } : req);
      });
      qc.invalidateQueries({ queryKey: ["/api/help-requests"] });
      toast({ title: "Request accepted", description: "You are now helping with this request! Redirecting to chat..." });
      // Redirect to chat with the author
      setLocation(`/chat?userId=${variables.authorId}`);
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Error", description: e.message })
  });

  const resolve = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/help-requests/${id}/resolve`),
    onSuccess: (_, variables: number) => {
      qc.setQueryData(["/api/help-requests"], (old: any[] | undefined) => {
        return old?.map(req => req.id === variables ? { ...req, status: "resolved" } : req);
      });
      qc.invalidateQueries({ queryKey: ["/api/help-requests"] });
      qc.invalidateQueries({ queryKey: ["/api/auth/me"] });
      qc.invalidateQueries({ queryKey: ["/api/credits/transactions"] });
      toast({ title: "Marked as resolved! The reward has been paid." });
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Error", description: e.message })
  });

  const cancel = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/help-requests/${id}/cancel`),
    onSuccess: (_, variables: number) => {
      qc.setQueryData(["/api/help-requests"], (old: any[] | undefined) => {
        return old?.map(req => req.id === variables ? { ...req, status: "open", helperId: null, helper: null } : req);
      });
      qc.invalidateQueries({ queryKey: ["/api/help-requests"] });
      setPendingCancelIds(prev => {
        const next = new Set(prev);
        next.delete(variables);
        return next;
      });
      setExpandedAccordion(""); // Reset accordion to show main board
      toast({ title: "Request canceled", description: "The request is now back on the board for others to help." });
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Error", description: e.message })
  });

  const deleteReq = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/help-requests/${id}`),
    onSuccess: (_, id) => {
      qc.setQueryData(["/api/help-requests"], (old: any[] | undefined) => {
        return old?.filter(r => r.id !== id);
      });
      qc.invalidateQueries({ queryKey: ["/api/help-requests"] });
      setPendingDeleteIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Error", description: e.message })
  });


  const filtered = (requests ?? []).filter(r => {
    if (pendingDeleteIds.has(r.id) || pendingCancelIds.has(r.id)) return false;
    const matchCat = filterCat === "all" || r.category === filterCat;
    const matchSearch = !searchQuery || r.title.toLowerCase().includes(searchQuery.toLowerCase()) || r.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  const suggestions = (requests ?? []).filter(r =>
    searchInputValue &&
    !pendingDeleteIds.has(r.id) &&
    (r.title.toLowerCase().includes(searchInputValue.toLowerCase()) || r.category.toLowerCase().includes(searchInputValue.toLowerCase()))
  ).slice(0, 5);

  const handleCancelRequest = (id: number) => {
    setPendingCancelIds(prev => new Set(prev).add(id));
    let remaining = 5;
    
    const { update, dismiss } = toast({
      title: "Action pending",
      description: `Cancellation scheduled. You have ${remaining} seconds to undo.`,
      action: (
        <ToastAction altText="Undo" onClick={() => {
          clearInterval(interval);
          cancelTimeouts.current.delete(id);
          setPendingCancelIds(prev => {
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
          description: `Cancellation scheduled. You have ${remaining} seconds to undo.`,
        } as any);
      } else {
        clearInterval(interval);
        cancelTimeouts.current.delete(id);
        cancel.mutate(id);
        dismiss();
      }
    }, 1000);

    cancelTimeouts.current.set(id, interval);
  };

  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    setSearchQuery(searchInputValue);
    setShowSuggestions(false);
  };

  const openCount = (requests ?? []).filter(r => r.status === "open" && !pendingDeleteIds.has(r.id)).length;
  const authoredRequests = filtered.filter(r => r.authorId === user?.id);
  const helpingRequests = filtered.filter(r => r.helperId === user?.id);
  const otherActiveRequests = filtered.filter(r => r.authorId !== user?.id && r.helperId !== user?.id && r.status !== "resolved");

  const handleDeleteRequest = (id: number) => {
    setPendingDeleteIds(prev => new Set(prev).add(id));
    let remaining = 5;

    const { update, dismiss } = toast({
      title: "Request deleted",
      description: `You have ${remaining} seconds to undo this action.`,
      action: (
        <ToastAction altText="Undo" onClick={() => {
          clearInterval(interval);
          timeouts.current.delete(id);
          setPendingDeleteIds(prev => {
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
        timeouts.current.delete(id);
        deleteReq.mutate(id);
        dismiss();
      }
    }, 1000);

    timeouts.current.set(id, interval);
  };

  return (
    <Layout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><HelpCircle className="w-6 h-6 text-blue-500" />Live Help Board</h1>
          <p className="text-muted-foreground mt-1">{openCount} open request{openCount !== 1 ? "s" : ""} — fulfill requests and earn Credits</p>
        </div>
        {user && <PostDialog onSuccess={() => {}} />}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="relative flex-1 group flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input 
              placeholder="Search requests..." 
              className="pl-10 h-11 rounded-2xl border-primary/10 group-focus-within:border-primary/30 transition-custom shadow-sm group-hover:shadow-md" 
              value={searchInputValue} 
              onChange={e => {
                setSearchInputValue(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
            />
            
            {/* Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-2 z-50 bg-background border border-border/50 rounded-2xl shadow-2xl py-2 overflow-hidden animate-in fade-in zoom-in duration-200">
                {suggestions.map(r => (
                  <button
                    key={r.id}
                    onClick={() => {
                      setSearchInputValue(r.title);
                      setSearchQuery(r.title);
                      setShowSuggestions(false);
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-primary/5 flex items-center justify-between transition-colors group/item border-b border-border/10 last:border-0"
                  >
                    <div className="flex-1 min-w-0 pr-4">
                      <div className="text-sm font-bold tracking-tight truncate">{r.title}</div>
                      <div className="text-[10px] text-muted-foreground uppercase font-black tracking-widest opacity-60">{r.category}</div>
                    </div>
                    <Badge variant="outline" className="text-[9px] h-5 rounded-lg border-primary/20 text-primary shrink-0">Suggestion</Badge>
                  </button>
                ))}
              </div>
            )}
          </div>
          <Button onClick={() => handleSearch()} className="h-11 px-5 rounded-2xl shadow-md hover:shadow-lg transition-all shrink-0">
            <Search className="w-4 h-4 mr-2" /> Search
          </Button>
        </div>
        <Select value={filterCat} onValueChange={setFilterCat}>
          <SelectTrigger className="w-48 h-11 rounded-2xl border-primary/10 transition-custom shadow-sm hover:shadow-md"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent className="rounded-2xl shadow-xl border-primary/10">
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-32 bg-secondary/30 rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Example Template */}
          <Accordion type="single" collapsible className="mb-6">
            <AccordionItem value="template" className="border-none">
              <AccordionTrigger className="glass-card h-12 px-6 rounded-2xl border border-dashed border-primary/20 hover:bg-primary/5 transition-custom text-muted-foreground hover:no-underline">
                 <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest">
                   <Zap className="w-4 h-4" /> View Template Request
                 </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4 pb-0">
                <Card className="glass-card border-dashed border-primary/20 bg-primary/5 shadow-none select-none relative overflow-hidden rounded-2xl">
                  <div className="absolute top-0 right-0 p-4 opacity-5">
                     <HelpCircle className="w-24 h-24" />
                  </div>
                  <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                      <div className="flex-1 min-w-0 flex flex-col justify-center relative z-10">
                        <div className="flex flex-wrap items-center gap-3 mb-3">
                          <StatusBadge status="open" />
                          <Badge variant="secondary" className="text-[10px] font-black uppercase tracking-tighter bg-primary/10 text-primary border-none">Programming</Badge>
                          <div className="flex items-center gap-1.5 text-accent text-xs font-black uppercase tracking-wider">
                            <Coins className="w-3.5 h-3.5" />
                            1.0 credit reward
                          </div>
                        </div>
                        <h3 className="font-bold text-xl mb-2 text-muted-foreground/80 tracking-tight">[Template] Need help with React Hooks</h3>
                        <p className="text-sm text-muted-foreground/70 leading-relaxed line-clamp-2">This is an example of how a help request looks. It shows the category, reward, and description of the problem you need help with.</p>
                        <div className="flex items-center gap-4 mt-4 text-xs font-semibold text-muted-foreground/60">
                          <span className="flex items-center gap-1.5"><div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-[10px]">AK</div> Arjun Kumar</span>
                          <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />just now</span>
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0 items-center relative z-10">
                        <Button size="lg" disabled variant="secondary" className="cursor-not-allowed hidden sm:flex font-bold shadow-sm">
                          Help (+1.0 credits)
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <div className="space-y-8">
            {/* My Authored Requests Accordion */}
            {authoredRequests.length > 0 && (
              <Accordion type="single" collapsible className="w-full" value={expandedAccordion} onValueChange={setExpandedAccordion}>
                <AccordionItem value="my-requests" className="border-none">
                  <AccordionTrigger className="glass-card h-14 px-6 rounded-2xl border border-primary/20 hover:bg-primary/5 transition-custom text-primary hover:no-underline shadow-sm">
                    <div className="flex items-center gap-3 text-sm font-bold uppercase tracking-widest">
                      <User className="w-5 h-5" />
                      My Requests ({authoredRequests.length})
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-4 pb-2">
                    <div className="flex flex-col gap-4">
                      {/* Active requests sub-accordion */}
                      {authoredRequests.filter((r: any) => r.status !== "resolved").length > 0 && (
                        <Accordion type="single" collapsible className="w-full" value={expandedMyOpen} onValueChange={setExpandedMyOpen}>
                          <AccordionItem value="my-open-reqs" className="border-none">
                            <AccordionTrigger className="glass-card h-12 px-6 rounded-2xl border border-emerald-500/20 hover:bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 hover:no-underline transition-custom">
                              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest">
                                <Zap className="w-4 h-4" />
                                Active ({authoredRequests.filter((r: any) => r.status !== "resolved").length})
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="pt-4 pb-0 space-y-4">
                              {authoredRequests.filter((r: any) => r.status !== "resolved").map((req: any) => (
                                <HelpRequestCard key={req.id} req={req} user={user} accept={accept} resolve={resolve} onCancel={handleCancelRequest} deleteReq={handleDeleteRequest} setLocation={setLocation} isDeleting={pendingDeleteIds.has(req.id)} isCanceling={pendingCancelIds.has(req.id)} />
                              ))}
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      )}

                      {/* Resolved requests sub-accordion */}
                      {authoredRequests.filter((r: any) => r.status === "resolved").length > 0 && (
                        <Accordion type="single" collapsible className="w-full" value={expandedMyResolved} onValueChange={setExpandedMyResolved}>
                          <AccordionItem value="my-resolved-reqs" className="border-none">
                            <AccordionTrigger className="glass-card h-12 px-6 rounded-2xl border border-zinc-500/20 hover:bg-zinc-500/5 text-zinc-500 hover:no-underline transition-custom">
                              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest">
                                <CheckCircle2 className="w-4 h-4" />
                                Resolved ({authoredRequests.filter((r: any) => r.status === "resolved").length})
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="pt-4 pb-0 space-y-4 opacity-80">
                              {authoredRequests.filter((r: any) => r.status === "resolved").map((req: any) => (
                                <HelpRequestCard key={req.id} req={req} user={user} accept={accept} resolve={resolve} onCancel={handleCancelRequest} deleteReq={handleDeleteRequest} setLocation={setLocation} isDeleting={pendingDeleteIds.has(req.id)} isCanceling={pendingCancelIds.has(req.id)} />
                              ))}
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            )}

            {/* Helping Others Accordion */}
            {helpingRequests.length > 0 && (
              <Accordion type="single" collapsible className="w-full" value={expandedAccordion} onValueChange={setExpandedAccordion}>
                <AccordionItem value="helping-others" className="border-none">
                  <AccordionTrigger className="glass-card h-14 px-6 rounded-2xl border border-blue-500/20 hover:bg-blue-500/5 transition-custom text-blue-600 dark:text-blue-400 hover:no-underline shadow-sm">
                    <div className="flex items-center gap-3 text-sm font-bold uppercase tracking-widest">
                      <Zap className="w-5 h-5" />
                      Helping Others ({helpingRequests.length})
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-4 pb-2">
                    <div className="flex flex-col gap-4">
                      {/* Active helping requests sub-accordion */}
                      {helpingRequests.filter((r: any) => r.status !== "resolved").length > 0 && (
                        <Accordion type="single" collapsible className="w-full" value={expandedHelpingOpen} onValueChange={setExpandedHelpingOpen}>
                          <AccordionItem value="helping-open-reqs" className="border-none">
                            <AccordionTrigger className="glass-card h-12 px-6 rounded-2xl border border-emerald-500/20 hover:bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 hover:no-underline transition-custom">
                              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest">
                                <Zap className="w-4 h-4" />
                                Currently Helping ({helpingRequests.filter((r: any) => r.status !== "resolved").length})
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="pt-4 pb-0 space-y-4">
                              {helpingRequests.filter((r: any) => r.status !== "resolved").map((req: any) => (
                                <HelpRequestCard key={req.id} req={req} user={user} accept={accept} resolve={resolve} onCancel={handleCancelRequest} deleteReq={handleDeleteRequest} setLocation={setLocation} isDeleting={pendingDeleteIds.has(req.id)} isCanceling={pendingCancelIds.has(req.id)} />
                              ))}
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      )}

                      {/* Resolved helping requests sub-accordion */}
                      {helpingRequests.filter((r: any) => r.status === "resolved").length > 0 && (
                        <Accordion type="single" collapsible className="w-full" value={expandedHelpingResolved} onValueChange={setExpandedHelpingResolved}>
                          <AccordionItem value="helping-resolved-reqs" className="border-none">
                            <AccordionTrigger className="glass-card h-12 px-6 rounded-2xl border border-zinc-500/20 hover:bg-zinc-500/5 text-zinc-500 hover:no-underline transition-custom">
                              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest">
                                <CheckCircle2 className="w-4 h-4" />
                                Fulfilled ({helpingRequests.filter((r: any) => r.status === "resolved").length})
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="pt-4 pb-0 space-y-4 opacity-80">
                              {helpingRequests.filter((r: any) => r.status === "resolved").map((req: any) => (
                                <HelpRequestCard key={req.id} req={req} user={user} accept={accept} resolve={resolve} onCancel={handleCancelRequest} deleteReq={handleDeleteRequest} setLocation={setLocation} isDeleting={pendingDeleteIds.has(req.id)} isCanceling={pendingCancelIds.has(req.id)} />
                              ))}
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            )}

            {/* Other Active Requests */}
            {expandedAccordion !== "my-requests" && expandedAccordion !== "helping-others" && (
              <div className="space-y-4">
                {otherActiveRequests.length === 0 && authoredRequests.length === 0 && helpingRequests.length === 0 && !pendingDeleteIds.size && (
                <div className="text-center py-20 text-muted-foreground">
                  <HelpCircle className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p className="font-medium">No requests found</p>
                  <p className="text-sm mt-1">Be the first to ask for help!</p>
                </div>
              )}
              
              {otherActiveRequests.length === 0 && (authoredRequests.length > 0 || helpingRequests.length > 0) && (
                <div className="text-center py-10 text-muted-foreground italic">
                  No other active requests on the board right now.
                </div>
              )}

              {otherActiveRequests
                .map(r => {
                  const userSkills = user?.skillsArray?.map((s: string) => s.toLowerCase()) || [];
                  const text = `${r.title} ${r.description} ${r.category}`.toLowerCase();
                  const matches = userSkills.filter(skill => text.includes(skill));
                  return { ...r, matchScore: matches.length };
                })
                .sort((a, b) => {
                  if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
                  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                })
                .map((req: any) => (
                  <HelpRequestCard key={req.id} req={req} user={user} accept={accept} resolve={resolve} onCancel={handleCancelRequest} deleteReq={handleDeleteRequest} setLocation={setLocation} isDeleting={pendingDeleteIds.has(req.id)} isCanceling={pendingCancelIds.has(req.id)} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
}

function HelpRequestCard({ req, user, accept, resolve, onCancel, deleteReq, setLocation, isDeleting, isCanceling }: any) {
  if (isDeleting || isCanceling) return null;
  return (
    <Card id={`help-request-${req.id}`} key={req.id} className={`glass-card transition-all duration-500 hover:shadow-xl hover:-translate-y-1 relative overflow-hidden group ${req.status === "resolved" ? "opacity-60" : ""}`}>
       <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
          <HelpCircle className="w-20 h-20" />
       </div>
      <CardContent className="p-6 relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-start gap-5">
          <div className="flex-1 min-w-0">
            <div className="flex-wrap items-center gap-3 mb-3 hidden sm:flex">
              <StatusBadge status={req.status} />
              <Badge variant="secondary" className="text-[10px] font-black uppercase tracking-tighter bg-primary/10 text-primary border-none">{req.category}</Badge>
              <div className="flex items-center gap-1.5 text-accent text-xs font-black uppercase tracking-wider font-extrabold shadow-sm px-2 py-0.5 rounded-lg bg-accent/5">
                <Coins className="w-3.5 h-3.5" />
                {req.reward} reward
              </div>
            </div>
            {req.matchScore > 0 && (
              <div className="flex items-center gap-1 text-[10px] font-black text-amber-500 uppercase tracking-tighter animate-pulse mb-1.5">
                <Zap className="w-3 h-3 fill-amber-500" /> Highly Recommended for You
              </div>
            )}
            <h3 className="font-bold text-xl mb-2 tracking-tight group-hover:text-primary transition-colors">{req.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">{req.description}</p>
            <div className="flex flex-wrap items-center gap-5 mt-5 text-[11px] font-bold text-muted-foreground tracking-wide">
              <Link href={`/users/${req.author?.username}`} onClick={(e) => e.stopPropagation()} className="flex items-center gap-2 hover:text-primary transition-colors">
                <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-[10px] shadow-inner">{req.author?.name?.slice(0, 2).toUpperCase()}</div>
                {req.author?.name}
              </Link>
              <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 opacity-50" />{req.createdAt ? formatDistanceToNow(new Date(req.createdAt), { addSuffix: true }) : "recently"}</span>
              {req.helper && <span className="flex items-center gap-1.5 text-primary bg-primary/5 px-2 py-0.5 rounded-full"><Zap className="w-3.5 h-3.5" />Being helped by {req.helper.name}</span>}
            </div>
          </div>
          <div className="flex gap-2 shrink-0 self-center">
            {/* Open request: Anyone else can accept */}
            {user && req.status === "open" && req.authorId !== user.id && (
              <Button size="lg" title={`Help and earn ${req.reward} credits`} className="transition-custom shadow-md hover:shadow-lg hover:-translate-y-0.5 font-bold" onClick={() => accept.mutate({ id: req.id, authorId: req.authorId })} disabled={accept.isPending}>
                Help (+{req.reward} credits)
              </Button>
            )}
            
            {/* In Progress: Author view */}
            {user && req.status === "in_progress" && req.authorId === user.id && (
              <div className="flex flex-col gap-2">
                <Button size="sm" variant="outline" title="Chat with Helper" className="gap-2 font-bold" onClick={() => setLocation(`/chat?userId=${req.helperId}`)}>
                  <MessageCircle className="w-4 h-4" />Chat with Helper
                </Button>
                <div className="flex gap-2">
                   <Button size="sm" variant="outline" title="Cancel Helper" className="flex-1 gap-2 text-muted-foreground hover:bg-secondary/50 font-bold" onClick={() => onCancel(req.id)}>
                    <XCircle className="w-4 h-4" />Cancel
                  </Button>
                  <Button size="sm" title="Mark as Resolved" onClick={() => resolve.mutate(req.id)} disabled={resolve.isPending} className="flex-1 gap-2 transition-custom font-bold shadow-sm">
                    <CheckCircle2 className="w-4 h-4" />Resolve
                  </Button>
                </div>
              </div>
            )}

            {/* Author actions (Edit & Delete) - visible for open and resolved requests */}
            {user && (req.status === "open" || req.status === "resolved") && req.authorId === user.id && (
              <div className="flex items-center gap-2 self-center">
                {req.status === "open" && <HelpEditDialog req={req} />}
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                  onClick={() => deleteReq(req.id)}
                  disabled={deleteReq.isPending}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            )}

            {/* In Progress: Helper view */}
            {user && req.status === "in_progress" && req.helperId === user.id && (
              <div className="flex flex-col gap-2">
                <Button size="sm" title="Chat with Author" className="gap-2 font-bold" onClick={() => setLocation(`/chat?userId=${req.authorId}`)}>
                  <MessageCircle className="w-4 h-4" />Chat with Author
                </Button>
                <Button size="sm" variant="outline" title="Stop Helping" className="gap-2 text-destructive hover:bg-destructive/10 border-destructive/20 font-bold" onClick={() => onCancel(req.id)}>
                  <XCircle className="w-4 h-4" />Stop Helping
                </Button>
                <Badge variant="outline" className="text-[10px] justify-center opacity-70">Waiting for Author</Badge>
              </div>
            )}

            {/* Resolved */}
            {req.status === "resolved" && (
              <Badge variant="secondary" className="gap-2 py-1.5 px-3 rounded-xl border border-border shadow-inner font-bold"><CheckCircle2 className="w-4 h-4 text-accent" />Completed</Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

