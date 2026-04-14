import Layout from "@/components/layout";
import { useUser } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { MessageCircle, Send, Search, Trash2, Undo2, User } from "lucide-react";
import { ToastAction } from "@/components/ui/toast";
import { format } from "date-fns";
import { useLocation, Link } from "wouter";

export default function ChatPage() {
  const { data: user, isLoading: userLoading } = useUser();
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [messageText, setMessageText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInputValue, setSearchInputValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<Set<number>>(new Set());
  const timeouts = useRef<Map<number, NodeJS.Timeout>>(new Map());


  useEffect(() => {
    // Handle direct chat from other pages (help board, matchmaking)
    const params = new URLSearchParams(window.location.search);
    const userIdParam = params.get("userId");
    if (userIdParam) {
      setSelectedUserId(Number(userIdParam));
    }
  }, [user, userLoading, setLocation, window.location.search]);

  // Commit pending deletions on unmount
  useEffect(() => {
    return () => {
      timeouts.current.forEach((timeout, id) => {
        clearTimeout(timeout);
        deleteMessage.mutate(id);
      });
    };
  }, []);


  const { data: conversations } = useQuery<any[]>({
    queryKey: ["/api/chat/conversations"],
    refetchInterval: 4000,
  });

  const { data: messages, isLoading: msgsLoading } = useQuery<any[]>({
    queryKey: ["/api/chat", selectedUserId],
    queryFn: async () => {
      if (!selectedUserId) return [];
      const res = await fetch(`/api/chat/${selectedUserId}`);
      return res.json();
    },
    enabled: !!selectedUserId,
    refetchInterval: 3000,
  });

  // Invalidate unread counts when messages change (they were marked read by backend)
  useEffect(() => {
    if (messages && messages.length > 0) {
      qc.invalidateQueries({ queryKey: ["/api/notifications/unread-counts"] });
    }
  }, [messages, qc]);

  const { data: allUsers } = useQuery<any[]>({ queryKey: ["/api/users"] });

  const send = useMutation({
    mutationFn: (content: string) => apiRequest("POST", `/api/chat/${selectedUserId}`, { content }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/chat", selectedUserId] });
      qc.invalidateQueries({ queryKey: ["/api/chat/conversations"] });
      setMessageText("");
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Error", description: e.message }),
  });

  const deleteMessage = useMutation({
    mutationFn: (msgId: number) => apiRequest("DELETE", `/api/chat/messages/${msgId}`),
    onSuccess: (_, msgId) => {
      // Optimistically update the UI by removing the message from the cache
      qc.setQueryData(["/api/chat", selectedUserId], (old: any[] | undefined) => {
        return old?.filter(m => m.id !== msgId);
      });
      qc.invalidateQueries({ queryKey: ["/api/chat", selectedUserId] });
      qc.invalidateQueries({ queryKey: ["/api/chat/conversations"] });
      toast({ title: "Message deleted" });
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Error", description: e.message }),
  });

  const handleDeleteMessage = (id: number) => {
    setPendingDeleteIds(prev => new Set(prev).add(id));
    
    const timeout = setTimeout(() => {
      timeouts.current.delete(id);
      deleteMessage.mutate(id);
    }, 5000);

    timeouts.current.set(id, timeout);

    toast({
      title: "Message deleted",
      description: "You have 5 seconds to undo this action.",
      action: (
        <ToastAction altText="Undo" onClick={() => {
          clearTimeout(timeout);
          timeouts.current.delete(id);
          setPendingDeleteIds(prev => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
        }}>
          Undo
        </ToastAction>
      ),
    });
  };




  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);


  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !selectedUserId) return;
    send.mutate(messageText.trim());
  };

  const selectedUser = conversations?.find(c => c.user.id === selectedUserId)?.user
    ?? allUsers?.find(u => u.id === selectedUserId);

  const searchableUsers = (allUsers ?? []).filter(u =>
    u.id !== user.id &&
    (!searchQuery || u.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.username.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredConversations = (conversations ?? []).filter(c =>
    !searchQuery || 
    c.user.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.user.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const suggestions = (allUsers ?? []).filter(u =>
    u.id !== user.id &&
    searchInputValue &&
    (u.name.toLowerCase().includes(searchInputValue.toLowerCase()) || u.username.toLowerCase().includes(searchInputValue.toLowerCase()))
  ).slice(0, 5);

  const conversationUserIds = new Set((conversations ?? []).map((c: any) => c.user.id));
  const newUsers = searchQuery
    ? searchableUsers.filter(u => !conversationUserIds.has(u.id))
    : [];

  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    setSearchQuery(searchInputValue);
    setShowSuggestions(false);
  };

  return (
    <Layout>
      <div className="mb-4">
        <h1 className="text-2xl font-bold flex items-center gap-2"><MessageCircle className="w-6 h-6 text-indigo-500" />Chat</h1>
        <p className="text-muted-foreground mt-1">Message peers to coordinate sessions or share code snippets</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-4" style={{ height: "calc(100vh - 240px)", minHeight: "400px" }}>
        {/* Sidebar */}
        <Card className="glass-card flex flex-col overflow-hidden border-primary/5 shadow-xl">
          <div className="p-4 bg-secondary/30 border-b border-border/40 space-y-4 relative">
            <form onSubmit={handleSearch} className="relative group flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input
                  placeholder="Search users..."
                  className="pl-10 h-10 rounded-xl bg-background border-primary/5 group-focus-within:border-primary/20 transition-custom shadow-sm"
                  value={searchInputValue}
                  onChange={e => {
                    setSearchInputValue(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                />
              </div>
              <Button type="submit" size="sm" title="Search Users" className="h-10 w-10 px-0 rounded-xl shadow-md hover:shadow-lg transition-all shrink-0">
                <Search className="w-4 h-4" />
              </Button>
            </form>

            {/* Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute left-4 right-4 top-full mt-1 z-50 bg-background border border-border/50 rounded-xl shadow-2xl py-2 overflow-hidden animate-in fade-in zoom-in duration-200">
                {suggestions.map(u => (
                  <button
                    key={u.id}
                    onClick={() => {
                      setSearchInputValue(u.name);
                      setSearchQuery(u.name);
                      setShowSuggestions(false);
                      setSelectedUserId(u.id);
                    }}
                    className="w-full px-4 py-2.5 text-left hover:bg-primary/5 flex items-center gap-3 transition-colors group/item"
                  >
                    <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold group-hover/item:bg-primary group-hover/item:text-white transition-colors">
                      {u.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-sm font-bold tracking-tight">{u.name}</div>
                      <div className="text-[10px] text-muted-foreground">@{u.username}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {/* Existing conversations */}
            {filteredConversations.map((conv: any) => (
              <button
                key={conv.user.id}
                onClick={() => setSelectedUserId(conv.user.id)}
                className={`w-full p-4 flex items-center gap-4 text-left transition-custom border-b border-border/20 group relative overflow-hidden ${selectedUserId === conv.user.id ? "bg-primary/5 border-l-4 border-l-primary" : "hover:bg-secondary/40"}`}
              >
                <Link href={`/users/${conv.user.username}`} onClick={(e) => e.stopPropagation()}>
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 shadow-sm transition-custom relative hover:scale-105 ${selectedUserId === conv.user.id ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary group-hover:bg-primary/20"}`}>
                    {conv.user.name?.slice(0, 2).toUpperCase()}
                  </div>
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <div className="text-sm font-bold tracking-tight">
                      {conv.user.name}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {conv.lastMessage && <div className="text-[10px] text-muted-foreground font-medium">{format(new Date(conv.lastMessage.createdAt), "h:mm a")}</div>}
                      {conv.unreadCount > 0 && (
                        <div className="min-w-[18px] h-[18px] px-1.5 rounded-full bg-red-500 flex items-center justify-center text-[10px] font-black text-white shadow-[0_2px_8px_rgba(239,68,68,0.4)] animate-in zoom-in duration-300">
                          {conv.unreadCount}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className={`text-xs truncate leading-relaxed transition-all duration-300 ${conv.unreadCount > 0 ? "font-extrabold text-foreground opacity-100 scale-[1.02] origin-left" : "text-muted-foreground opacity-70 group-hover:opacity-100"}`}>
                    {conv.lastMessage?.content || "Tap to chat"}
                  </div>
                </div>
              </button>
            ))}
            {/* Search results — new conversations */}
            {newUsers.map((u: any) => (
              <button
                key={u.id}
                onClick={() => setSelectedUserId(u.id)}
                className={`w-full p-4 flex items-center gap-4 text-left transition-custom border-b border-border/20 group relative overflow-hidden ${selectedUserId === u.id ? "bg-primary/5 border-l-4 border-l-primary" : "hover:bg-secondary/40"}`}
              >
                <Link href={`/users/${u.username}`} onClick={(e) => e.stopPropagation()}>
                  <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center text-muted-foreground font-bold text-sm shrink-0 border border-border/20 group-hover:bg-primary/10 group-hover:text-primary group-hover:border-primary/20 transition-custom relative hover:scale-105">
                    {u.name?.slice(0, 2).toUpperCase()}
                  </div>
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold tracking-tight">{u.name}</div>
                  <div className="text-[10px] text-muted-foreground font-medium opacity-60">@{u.username}</div>
                </div>
              </button>
            ))}
            {!filteredConversations.length && !newUsers.length && (
              <div className="p-10 text-center flex flex-col items-center">
                <div className="w-16 h-16 bg-secondary/50 rounded-full flex items-center justify-center mb-4">
                   <MessageCircle className="w-8 h-8 opacity-20" />
                </div>
                <p className="text-sm font-bold">{searchQuery ? "No users found" : "No active chats"}</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed px-4">
                  {searchQuery ? `No students matched "${searchQuery}"` : "Find your peers via search to start coordinating sessions."}
                </p>
              </div>
            )}
          </div>
        </Card>        {/* Main chat area */}
        <Card className="lg:col-span-2 glass-card flex flex-col overflow-hidden border-primary/5 shadow-2xl relative">
          {!selectedUserId ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-4 bg-gradient-to-b from-secondary/10 to-transparent">
              <div className="w-20 h-20 bg-primary/5 rounded-full flex items-center justify-center animate-pulse">
                 <MessageCircle className="w-10 h-10 text-primary/40" />
              </div>
              <div className="text-center px-6">
                <p className="font-bold text-foreground tracking-tight text-lg">Your messages will appear here</p>
                <p className="text-sm mt-1 max-w-xs leading-relaxed">Select a conversation from the sidebar or search for a student to collaborate.</p>
              </div>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className="p-4 glass-nav border-b border-border/40 flex items-center justify-between sticky top-0 z-20">
                <div className="flex items-center gap-4">
                  <Link href={`/users/${selectedUser?.username}`}>
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white font-bold shadow-md hover:scale-105 transition-transform cursor-pointer">
                      {selectedUser?.name?.slice(0, 2).toUpperCase()}
                    </div>
                  </Link>
                  <div>
                    <Link href={`/users/${selectedUser?.username}`}>
                      <div className="font-bold text-base tracking-tight leading-tight hover:text-primary transition-colors cursor-pointer">{selectedUser?.name}</div>
                    </Link>
                    <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">@{selectedUser?.username}</div>
                  </div>
                </div>
                <Link href={`/users/${selectedUser?.username}`}>
                  <Button variant="outline" size="sm" className="gap-2 rounded-xl font-bold border-primary/20 hover:bg-primary/5 shadow-sm">
                    <User className="w-4 h-4 text-primary" />
                    <span className="hidden sm:inline">View Profile</span>
                  </Button>
                </Link>
              </div>
 
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-secondary/5">
                {msgsLoading ? (
                  <div className="flex justify-center py-12">
                    <div className="w-8 h-8 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                  </div>
                ) : !messages?.length ? (
                  <div className="text-center py-12">
                     <div className="bg-secondary/40 px-6 py-2 rounded-full inline-block text-[11px] font-bold text-muted-foreground uppercase tracking-widest border border-border/50 shadow-sm">
                       Start of conversation
                     </div>
                  </div>
                ) : (
                  messages.map((msg: any) => {
                    const isMe = msg.senderId === user.id;
                    return (
                      <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"} group`}>
                        <div className={`max-w-[80%] flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                          {pendingDeleteIds.has(msg.id) ? null : (
                            <div className={`relative px-4 py-3 shadow-md transition-custom group-hover:shadow-lg ${isMe
                              ? "bg-primary text-primary-foreground rounded-3xl rounded-br-none font-medium"
                              : "glass-card bg-background/80 text-foreground rounded-3xl rounded-bl-none font-medium border-border/30 border"}`}
                            >
                              <p className="text-sm leading-relaxed">{msg.content}</p>
                              {isMe && (
                                <button
                                  onClick={() => handleDeleteMessage(msg.id)}
                                  className="absolute -left-8 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                  title="Delete message"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          )}
                          {!pendingDeleteIds.has(msg.id) && (
                            <span className={`text-[10px] font-bold mt-1.5 opacity-0 group-hover:opacity-60 transition-opacity tracking-tight px-1 ${isMe ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                              {msg.createdAt ? format(new Date(msg.createdAt), "h:mm a") : ""}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>
 
              {/* Input */}
              <div className="p-4 bg-background/50 backdrop-blur-md border-t border-border/40 relative z-20">
                <form onSubmit={handleSend} className="flex gap-3">
                  <Input
                    value={messageText}
                    onChange={e => setMessageText(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-1 h-12 rounded-2xl border-primary/10 bg-background/50 focus:border-primary/30 transition-custom shadow-sm text-sm"
                    autoFocus
                  />
                  <Button type="submit" size="icon" title="Send Message" className="w-12 h-12 rounded-2xl transition-custom shadow-lg hover:shadow-primary/20 hover:-translate-y-0.5" disabled={!messageText.trim() || send.isPending}>
                    {send.isPending ? <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent animate-spin rounded-full" /> : <Send className="w-5 h-5" />}
                  </Button>
                </form>
              </div>
            </>
          )}
        </Card>
      </div>
    </Layout>
  );
}
