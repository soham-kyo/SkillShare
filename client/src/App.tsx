import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import NotFound from "@/pages/not-found";

import HomePage from "@/pages/home-page";
import AuthPage from "@/pages/auth-page";
import CreditsPage from "@/pages/credits-page";
import HelpBoardPage from "@/pages/help-board-page";
import MatchmakingPage from "@/pages/matchmaking-page";
import ChatPage from "@/pages/chat-page";
import ProfilePage from "@/pages/profile-page";
import PublicProfilePage from "@/pages/public-profile-page";

import { useUser } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

function ProtectedRoute({ path, component: Component }: { path: string; component: React.ComponentType<any> }) {
  const { data: user, isLoading } = useUser();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    // We use a simple window location change or a Redirect component if available
    // wouter doesn't have a built-in Redirect but we can use a custom one or just return null and useLocation
    return <RedirectToHome />;
  }

  return <Route path={path} component={Component} />;
}

function RedirectToHome() {
  const [, setLocation] = useLocation();
  useEffect(() => {
    setLocation("/");
  }, [setLocation]);
  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/auth" component={AuthPage} />
      
      <ProtectedRoute path="/credits" component={CreditsPage} />
      <ProtectedRoute path="/help-board" component={HelpBoardPage} />
      <ProtectedRoute path="/matchmaking" component={MatchmakingPage} />
      <ProtectedRoute path="/chat" component={ChatPage} />
      <ProtectedRoute path="/profile" component={ProfilePage} />

      <ProtectedRoute path="/users/:username" component={PublicProfilePage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
