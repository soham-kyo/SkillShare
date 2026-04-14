import Layout from "@/components/layout";
import { Button } from "@/components/ui/button";
import { useUser } from "@/hooks/use-auth";
import { Link } from "wouter";
import { Coins, TrendingUp, MessageCircle, Users, HelpCircle, ArrowRight, Loader2, BookOpen } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";

function QuickLink({ href, icon: Icon, label, desc }: { href: string; icon: any; label: string; desc: string }) {
  return (
    <Link href={href}>
      <Card className="glass-card h-full transition-custom hover:shadow-lg hover:-translate-y-1 cursor-pointer group border-primary/5 hover:border-primary/20 overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <CardContent className="p-5 flex items-center gap-4 relative z-10">
          <div className="p-3 rounded-2xl bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors shadow-inner">
            <Icon className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-base tracking-tight">{label}</div>
            <div className="text-xs text-muted-foreground leading-relaxed">{desc}</div>
          </div>
          <div className="w-8 h-8 rounded-full flex items-center justify-center bg-secondary/50 group-hover:bg-primary group-hover:text-primary-foreground transition-custom shadow-sm">
            <ArrowRight className="w-4 h-4" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function HomePage() {
  const { data: user } = useUser();
  const { data: transactions } = useQuery<any[]>({
    queryKey: ["/api/credits/transactions"],
    enabled: !!user
  });

  if (user) {
    const recentTxs = transactions?.slice(0, 4) ?? [];

    return (
      <Layout>
        {/* Welcome header */}
        <div className="mb-8 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-bold text-xl shadow-lg shadow-primary/20 shrink-0">
            {user.avatarInitials || user.name?.slice(0, 2).toUpperCase()}
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Hello, {user.name?.split(" ")[0]}!</h1>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="glass-card border-l-4 border-l-accent overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
               <Coins className="w-12 h-12" />
            </div>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Available Credits</span>
              </div>
              <div className="text-4xl font-black tracking-tighter text-accent">{(user.credits ?? 0).toFixed(1)}</div>
              <p className="text-xs text-muted-foreground mt-2 font-medium">Ready to be exchanged for help</p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Quick access */}
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Quick Access</h2>
            <div className="grid sm:grid-cols-3 gap-3">
              <QuickLink href="/help-board" icon={HelpCircle} label="Live Help Board" desc="Fulfill requests & earn credits" />
              <QuickLink href="/matchmaking" icon={Users} label="Project Matchmaking" desc="Connect for capstones & hackathons" />
              <QuickLink href="/chat" icon={MessageCircle} label="Real-Time Messaging" desc="Collaborate instantly" />
            </div>
          </div>

          {/* Recent Transactions */}
          <Card className="glass-card overflow-hidden shadow-lg border-primary/5">
            <CardHeader className="pb-4 bg-secondary/30 border-b border-border/40">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-2 uppercase tracking-widest text-muted-foreground">
                  <TrendingUp className="w-4 h-4 text-accent" /> Recent Activity
                </CardTitle>
                <Link href="/credits"><Button variant="ghost" size="sm" className="h-8 text-xs font-bold transition-custom hover:bg-primary/10 hover:text-primary">View More</Button></Link>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {!recentTxs.length ? (
                <div className="text-center py-6">
                   <div className="w-12 h-12 bg-secondary/50 rounded-full flex items-center justify-center mx-auto mb-2">
                      <Coins className="w-6 h-6 opacity-20" />
                   </div>
                   <p className="text-xs text-muted-foreground">No transactions yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentTxs.map((tx: any) => (
                    <div key={tx.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-secondary/40 transition-custom group">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${tx.type === "earned" ? "bg-accent/10 text-accent" : "bg-secondary text-foreground shadow-sm dark:bg-secondary/60"}`}>
                        <TrendingUp className={`w-4 h-4 ${tx.type !== "earned" ? "rotate-180" : ""}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold truncate leading-tight group-hover:text-foreground transition-colors">{tx.description}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">{format(new Date(tx.createdAt || new Date()), "MMM d, h:mm a")}</div>
                      </div>
                      <div className={`text-sm font-black ${tx.type === "earned" ? "text-accent" : "text-foreground"}`}>
                        {tx.type === "earned" ? "+" : "-"}{tx.amount.toFixed(1)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Hero */}
      <div className="text-center py-12 mb-10 overflow-hidden relative">
        {/* Centered Branding */}
        <div className="flex flex-col items-center justify-center gap-4 mb-12 animate-in fade-in slide-in-from-top-8 duration-1000">
           <div className="relative group">
             <div className="absolute -inset-4 bg-primary/20 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
             <img 
               src="/logo.png" 
               alt="SkillShare Logo" 
               className="w-24 h-24 sm:w-32 sm:h-32 object-contain relative z-10 transition-transform duration-500 group-hover:scale-110" 
             />
           </div>
        </div>

        <h1 className="text-5xl sm:text-7xl font-bold mb-6 leading-tight tracking-tighter transition-custom">
          Unlock your campus potential<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">with shared expertise.</span>
        </h1>
        <p className="text-muted-foreground text-lg sm:text-xl max-w-2xl mx-auto mb-8 leading-relaxed">
          Join a college-exclusive ecosystem where students exchange their expertise. Share what you know, build up your Credits, and team up with peers to get things done.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link href="/auth?tab=register">
            <Button size="lg" className="rounded-full px-8 shadow-lg hover:shadow-primary/20 transition-all">Register</Button>
          </Link>
          <Link href="/auth">
            <Button size="lg" variant="outline" className="rounded-full px-8">Log In</Button>
          </Link>
        </div>
        {/* Features bar */}
        <div className="grid sm:grid-cols-3 gap-6 mt-12 max-w-5xl mx-auto text-center relative z-10">
          {[
            { icon: HelpCircle, label: "Live Help Board", desc: "Stuck on an assignment? Post a reward or help a classmate out to earn Credits." },
            { icon: Users, label: "Project Matchmaking", desc: "Stop struggling to find a team. Connect with peers who have the exact skills you need." },
            { icon: MessageCircle, label: "Real-Time Collaboration", desc: "Drop the chaotic group chats. Jump into our Real-Time Messaging to get work done." },
          ].map(f => (
            <div key={f.label} className="glass-card flex flex-col items-center gap-4 p-6 rounded-2xl transition-custom hover:shadow-xl hover:-translate-y-1 group border-white/5">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors shadow-inner">
                <f.icon className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-bold mb-2 tracking-tight">{f.label}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed opacity-80 group-hover:opacity-100 transition-opacity">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
