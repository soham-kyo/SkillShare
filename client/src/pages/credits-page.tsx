import Layout from "@/components/layout";
import { useUser } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Coins, TrendingUp, TrendingDown, ArrowRight, HelpCircle, Users } from "lucide-react";
import { format } from "date-fns";
import { Link } from "wouter";
import { useLocation } from "wouter";

function TxIcon({ type }: { type: string }) {
  return (
    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm ${
      type === "earned" 
        ? "bg-accent/10 text-accent dark:bg-accent/20" 
        : "bg-secondary text-foreground dark:bg-secondary/60"
    }`}>
      {type === "earned" ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
    </div>
  );
}

export default function WalletPage() {
  const { data: user } = useUser();
  const [, navigate] = useLocation();

  const { data: txs, isLoading } = useQuery<any[]>({ queryKey: ["/api/credits/transactions"] });



  const totalEarned = txs?.filter(t => t.type === "earned").reduce((s, t) => s + t.amount, 0) ?? 0;
  const totalSpent = txs?.filter(t => t.type === "spent").reduce((s, t) => s + t.amount, 0) ?? 0;

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Coins className="w-6 h-6 text-amber-500" /> Credits</h1>
        <p className="text-muted-foreground mt-1">Track your Credit ledger — earn by fulfilling Requests, spend to learn.</p>
      </div>

      {/* Balance cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
        <Card className="bg-gradient-to-br from-primary to-purple-600 text-white border-none shadow-xl shadow-primary/20 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Coins className="w-20 h-20" />
          </div>
          <CardContent className="pt-6 pb-8 relative z-10">
            <div className="text-sm font-bold uppercase tracking-widest opacity-80">Current Balance</div>
            <div className="text-5xl font-black mt-2 tracking-tighter">{(user.credits ?? 0).toFixed(1)}</div>
            <div className="text-sm font-medium opacity-70 mt-1">Credits available</div>
          </CardContent>
        </Card>
        
        <Card className="glass-card border-l-4 border-l-accent shadow-lg group">
          <CardContent className="pt-6 pb-6">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-2">Total Earned</div>
            <div className="text-4xl font-black text-accent tracking-tighter transition-custom group-hover:translate-x-1 duration-500">+{totalEarned.toFixed(1)}</div>
            <div className="text-xs font-semibold text-muted-foreground mt-2">from {txs?.filter(t => t.type === "earned").length ?? 0} transactions</div>
          </CardContent>
        </Card>
        
        <Card className="glass-card border-l-4 border-l-foreground shadow-lg group">
          <CardContent className="pt-6 pb-6">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-2">Total Spent</div>
            <div className="text-4xl font-black text-foreground tracking-tighter transition-custom group-hover:translate-x-1 duration-500">-{totalSpent.toFixed(1)}</div>
            <div className="text-xs font-semibold text-muted-foreground mt-2">from {txs?.filter(t => t.type === "spent").length ?? 0} sessions</div>
          </CardContent>
        </Card>
      </div>




      {/* Transaction Ledger */}
      <Card className="glass-card overflow-hidden shadow-xl border-primary/5">
        <CardHeader className="bg-secondary/30 border-b border-border/40 pb-4">
          <div className="flex items-center justify-between">
             <div>
              <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Ledger History</CardTitle>
              <CardDescription className="text-[10px] font-medium mt-1">Real-time Credit audit trail</CardDescription>
             </div>
             <Coins className="w-5 h-5 opacity-20" />
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full rounded-2xl" />)}
            </div>
          ) : !txs?.length ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-secondary/50 rounded-full flex items-center justify-center mx-auto mb-4">
                 <Coins className="w-8 h-8 opacity-20" />
              </div>
              <p className="font-bold text-foreground">No transaction history</p>
              <p className="text-xs text-muted-foreground mt-1">Start your SkillShare journey today!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {txs.map((tx: any) => (
                <div key={tx.id} className="flex items-center gap-4 p-3 rounded-2xl hover:bg-secondary/40 transition-custom group">
                  <TxIcon type={tx.type} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold truncate leading-tight group-hover:text-foreground transition-colors">{tx.description}</div>
                    <div className="text-[10px] text-muted-foreground font-medium mt-1 flex items-center gap-2">
                       {tx.relatedUser && <span className="bg-secondary px-2 py-0.5 rounded-full">with {tx.relatedUser.name}</span>}
                       {tx.createdAt && <span>{format(new Date(tx.createdAt), "MMM d, yyyy · h:mm a")}</span>}
                    </div>
                  </div>
                  <div className={`text-base font-black tracking-tight ${tx.type === "earned" ? "text-accent" : "text-foreground"}`}>
                    {tx.type === "earned" ? "+" : "-"}{tx.amount.toFixed(1)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </Layout>
  );
}
