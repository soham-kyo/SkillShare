import { Link, useLocation } from "wouter";
import { useUser, useLogout, useHeartbeat } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen, LayoutDashboard, LogOut, Coins,
  Menu, HelpCircle, Users, MessageCircle, Wallet,
  ChevronRight, User
} from "lucide-react";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { getUserInitials } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { OnboardingModal } from "@/components/onboarding-modal";


export default function Layout({ children }: { children: React.ReactNode }) {
  const { data: user } = useUser();
  const { mutate: logout } = useLogout();
  const [location] = useLocation();
  useHeartbeat();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const { data: unreadCounts } = useQuery<{ helpBoard: number; matchmaking: number; chat: number }>({
    queryKey: ["/api/notifications/unread-counts"],
    enabled: !!user,
    refetchInterval: 10000, // Poll every 10 seconds
  });

  const NavLink = ({ href, icon: Icon, children, badge, showDot }: any) => {
    const isActive = location === href || (href !== "/" && location.startsWith(href));
    return (
      <Link href={href} title={String(children)} className={`
        flex items-center gap-4 px-4 py-3 rounded-full text-base font-medium transition-custom w-full relative
        ${isActive
          ? "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary font-bold"
          : "text-muted-foreground hover:text-foreground hover:bg-secondary/60 dark:hover:bg-secondary/40"}
      `}>
        <div className="relative">
          <Icon className={`w-6 h-6 shrink-0 ${isActive ? "text-primary" : ""}`} />
          {showDot && (
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 border-2 border-background rounded-full" />
          )}
        </div>
        <span className="hidden lg:block">{children}</span>
        {badge && <Badge variant="secondary" className="ml-auto text-xs px-1.5 py-0 bg-background/50 hidden lg:flex">{badge}</Badge>}
        {!isActive && showDot && <span className="lg:hidden absolute top-3 right-3 w-2 h-2 bg-red-500 rounded-full border border-background" />}
      </Link>
    );
  };

  const MobileNavLink = ({ href, icon: Icon, children, badge, showDot }: any) => {
    const isActive = location === href || (href !== "/" && location.startsWith(href));
    return (
      <Link href={href} onClick={() => setIsMobileOpen(false)} className={`
        flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-custom w-full relative
        ${isActive
          ? "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary font-bold"
          : "text-muted-foreground hover:text-foreground hover:bg-secondary/60 dark:hover:bg-secondary/40"}
      `}>
        <div className="relative">
          <Icon className={`w-5 h-5 shrink-0 ${isActive ? "text-primary" : ""}`} />
          {showDot && (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 border-2 border-background rounded-full" />
          )}
        </div>
        <span>{children}</span>
        {badge && <Badge variant="secondary" className="ml-auto text-xs px-1.5 py-0 bg-background/50">{badge}</Badge>}
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-background selection:bg-primary/20 flex">
      <OnboardingModal />
      {/* Desktop Left Sidebar (X-Style) */}
      {user && (
        <aside className="hidden sm:flex flex-col w-20 lg:w-72 fixed h-screen top-0 left-0 border-r border-border/40 bg-background z-40 animate-in slide-in-from-left duration-300">
        <div className="flex flex-col h-full p-3 lg:p-4">
          {user && (
            <Link href="/" className="flex items-center gap-3 font-bold text-2xl text-primary shrink-0 px-3 py-4 mb-2 lg:mb-4">
              <img src="/logo.png" alt="SkillShare Logo" className="w-8 h-8 lg:w-10 lg:h-10 object-contain rounded-sm" />
              <span className="hidden lg:block">SkillShare</span>
            </Link>
          )}

          <nav className="flex flex-col gap-2 flex-1 w-full mt-2">
            {user && (
              <>
                <NavLink href="/" icon={BookOpen}>Home</NavLink>
                <NavLink href="/help-board" icon={HelpCircle} showDot={unreadCounts?.helpBoard > 0}>Live Help</NavLink>
                <NavLink href="/matchmaking" icon={Users} showDot={unreadCounts?.matchmaking > 0}>Matchmaking</NavLink>
                <NavLink href="/chat" icon={MessageCircle} showDot={unreadCounts?.chat > 0}>Messages</NavLink>
                <NavLink href="/credits" icon={Coins}>Credits</NavLink>
              </>
            )}
          </nav>

          {/* User profile / Logout at the bottom */}
          {user && (
            <div className="mt-auto mb-4 w-full">
              <div className="flex items-center gap-3 p-3 rounded-full hover:bg-secondary/60 transition-custom cursor-pointer w-full group overflow-hidden">
                 <Link href="/profile" className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-foreground font-bold shrink-0 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                      {getUserInitials(user)}
                    </div>
                    <div className="hidden lg:flex flex-col flex-1 min-w-0">
                       <div className="text-sm font-bold truncate leading-tight group-hover:text-primary transition-colors">{user.name}</div>
                       <div className="text-xs text-muted-foreground truncate leading-tight">@{user.username}</div>
                    </div>
                 </Link>
                 <Button variant="ghost" size="icon" onClick={() => logout()} title="Logout" className="shrink-0 hidden lg:flex opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive relative z-20">
                   <LogOut className="w-4 h-4" />
                 </Button>
              </div>
              
              {/* Fallback logout for sm screen (icon only) */}
               <Button variant="ghost" size="icon" onClick={() => logout()} title="Logout" className="lg:hidden mx-auto mt-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive w-12 h-12 rounded-full">
                   <LogOut className="w-5 h-5" />
               </Button>
            </div>
          )}
        </div>
      </aside>
      )}

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col ${user ? "sm:ml-20 lg:ml-72" : ""} min-h-screen transition-all duration-300 relative`}>
        {/* Desktop Theme Toggle */}
        <div className="hidden sm:block absolute top-4 right-4 z-50">
          <ThemeToggle />
        </div>
        
        {/* Mobile Top Header */}
        <header className="sm:hidden sticky top-0 z-50 w-full glass-nav border-b border-border/40 h-16 flex items-center justify-between px-4">
          {user ? (
            <Link href="/" className="flex items-center gap-2 font-bold text-xl text-primary shrink-0">
              <img src="/logo.png" alt="SkillShare" className="w-8 h-8 object-contain rounded-sm" />
              <span>SkillShare</span>
            </Link>
          ) : <div className="w-8" />} {/* Spacer to maintain layout if logo hidden */}

          {/* Mobile hamburger & Toggle */}
          <div className="flex items-center gap-2 lg:hidden">
            <ThemeToggle />
            <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" title="Menu"><Menu className="w-5 h-5" /></Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0">
                <div className="p-4 border-b">
                  <div className="flex items-center gap-2 font-bold text-xl text-primary">
                    <img src="/logo.png" alt="SkillShare Logo" className="w-8 h-8 object-contain rounded-sm" />
                    SkillShare
                  </div>
                  {user && (
                    <Link href="/profile" onClick={() => setIsMobileOpen(false)} className="mt-3 flex items-center gap-3 p-2 rounded-xl hover:bg-secondary/60 transition-custom group">
                      <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-foreground font-bold text-sm group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                        {getUserInitials(user)}
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <div className="text-sm font-bold group-hover:text-primary transition-colors">{user.name}</div>
                        <div className="flex items-center gap-1 text-[10px] text-amber-600 font-bold uppercase tracking-wider">
                          <Coins className="w-3 h-3" />
                          {(user.credits ?? 0).toFixed(1)} Credits
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 ml-auto text-muted-foreground group-hover:text-primary transition-colors" />
                    </Link>
                  )}
                </div>
                <nav className="p-3 flex flex-col gap-1">
                  {user ? (
                    <>
                      <MobileNavLink href="/" icon={BookOpen}>Home</MobileNavLink>
                      <MobileNavLink href="/help-board" icon={HelpCircle} showDot={unreadCounts?.helpBoard > 0}>Live Help</MobileNavLink>
                      <MobileNavLink href="/matchmaking" icon={Users} showDot={unreadCounts?.matchmaking > 0}>Matchmaking</MobileNavLink>
                      <MobileNavLink href="/chat" icon={MessageCircle} showDot={unreadCounts?.chat > 0}>Messages</MobileNavLink>
                      <MobileNavLink href="/credits" icon={Coins}>Credits</MobileNavLink>
                      <div className="h-px bg-border my-2" />
                      <Button onClick={() => { logout(); setIsMobileOpen(false); }} variant="ghost" className="w-full justify-start gap-3 px-3 py-6 rounded-xl hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-custom text-base">
                        <LogOut className="w-5 h-5" />
                        Log out
                      </Button>
                    </>
                  ) : null}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </header>

        <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out border-x border-border/20 bg-background min-h-screen">
          {children}
        </main>
      </div>
    </div>
  );
}
