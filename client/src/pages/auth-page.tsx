import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api, insertUserSchema } from "@shared/routes";
import { useLogin, useRegister, useUser } from "@/hooks/use-auth";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { BookOpen, Loader2, Check, X, Eye, EyeOff } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export default function AuthPage() {
  const [_, setLocation] = useLocation();
  const { data: user, isLoading: isLoadingUser } = useUser();
  const loginMutation = useLogin();
  const registerMutation = useRegister();
  
  // URL param handling for tab selection
  const searchParams = new URLSearchParams(window.location.search);
  const initialTab = searchParams.get("tab") === "register" ? "register" : "login";
  const [activeTab, setActiveTab] = useState<"login" | "register">(initialTab);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);

  // Redirect if logged in
  useEffect(() => {
    if (user) setLocation("/");
  }, [user, setLocation]);

  const loginForm = useForm({
    resolver: zodResolver(z.object({
      username: z.string().min(1, "Username is required"),
      password: z.string().min(1, "Password is required"),
    })),
    defaultValues: { username: "", password: "" },
  });

  const registerForm = useForm({
    resolver: zodResolver(insertUserSchema),
    mode: "onChange",
    defaultValues: {
      username: "",
      password: "",
      name: "",
      email: "",
      collegeId: "N/A",
    },
  });

  // Unique check debouncing
  const watchedUsername = registerForm.watch("username");
  const watchedEmail = registerForm.watch("email");
  const watchedPassword = registerForm.watch("password") || "";

  const passwordRequirements = [
    { label: "At least 8 characters", check: watchedPassword.length >= 8 },
    { label: "One uppercase letter", check: /[A-Z]/.test(watchedPassword) },
    { label: "One lowercase letter", check: /[a-z]/.test(watchedPassword) },
    { label: "One number", check: /[0-9]/.test(watchedPassword) },
    { label: "One special character", check: /[^a-zA-Z0-9]/.test(watchedPassword) },
  ];

  useEffect(() => {
    if (watchedUsername.length < 3) return;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/auth/check-availability?type=username&value=${watchedUsername}`);
        const data = await res.json();
        if (!data.available) {
          registerForm.setError("username", { message: "Username already taken" });
        }
      } catch (e) {}
    }, 400);
    return () => clearTimeout(timer);
  }, [watchedUsername, registerForm]);

  useEffect(() => {
    if (!watchedEmail || !watchedEmail.includes("@")) return;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/auth/check-availability?type=email&value=${watchedEmail}`);
        const data = await res.json();
        if (!data.available) {
          registerForm.setError("email", { message: "Email already registered" });
        }
      } catch (e) {}
    }, 400);
    return () => clearTimeout(timer);
  }, [watchedEmail, registerForm]);

  if (isLoadingUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 relative">
      <div className="absolute top-4 right-4 z-50">
        <ThemeToggle />
      </div>
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex flex-col justify-center p-12 bg-primary text-primary-foreground relative overflow-hidden">
        <div className="absolute inset-0 bg-primary/5"></div>
        <div className="relative z-10 max-w-lg">
          <div className="flex items-center gap-4 mb-8">
            <div className="bg-white p-2 rounded-xl">
              <img src="/logo.png" alt="SkillShare Logo" className="w-12 h-12 object-contain" />
            </div>
            <span className="text-3xl font-display font-black tracking-tight">SkillShare</span>
          </div>
          <h1 className="text-5xl font-display font-bold mb-6">
            Unlock your campus potential<br />with shared expertise.
          </h1>
          <p className="text-xl text-primary-foreground/80 leading-relaxed">
            Join our college-exclusive platform where students help students. 
            Exchange expertise, earn Credits, and build amazing projects together.
          </p>
        </div>
      </div>

      {/* Right Panel - Auth Forms */}
      <div className="flex flex-col p-8 md:p-12 bg-background lg:min-h-screen overflow-y-auto">
        <div className="w-full max-w-md space-y-12 mx-auto my-auto">
          <div className="lg:hidden flex justify-center mb-8">
            <div className="flex items-center gap-2 text-primary">
              <img src="/logo.png" alt="SkillShare Logo" className="w-10 h-10 object-contain rounded-md" />
              <span className="text-2xl font-display font-black tracking-tight">SkillShare</span>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-10">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <Card className="border-none shadow-none">
                <CardHeader className="px-0 pb-8">
                  <CardTitle className="text-3xl font-bold tracking-tight">Welcome back</CardTitle>
                  <CardDescription className="text-base mt-2">Enter your credentials to access your account</CardDescription>
                </CardHeader>
                <CardContent className="px-0">
                  <Form {...loginForm}>
                    <form onSubmit={loginForm.handleSubmit((d) => loginMutation.mutate(d))} className="space-y-6">
                      <FormField
                        control={loginForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username or Email</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Enter username or email" 
                                {...field} 
                                onChange={(e) => field.onChange(e.target.value.toLowerCase())}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={loginForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input 
                                  type={showLoginPassword ? "text" : "password"} 
                                  placeholder="••••••••" 
                                  {...field} 
                                  className="pr-10"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  title={showLoginPassword ? "Hide password" : "Show password"}
                                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-muted-foreground/50 hover:text-primary transition-colors"
                                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                                >
                                  {showLoginPassword ? (
                                    <EyeOff className="h-4 w-4" />
                                  ) : (
                                    <Eye className="h-4 w-4" />
                                  )}
                                  <span className="sr-only">
                                    {showLoginPassword ? "Hide password" : "Show password"}
                                  </span>
                                </Button>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button 
                        type="submit" 
                        className="w-full" 
                        disabled={loginMutation.isPending}
                      >
                        {loginMutation.isPending ? "Logging in..." : "Login"}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="register">
              <Card className="border-none shadow-none">
                <CardHeader className="px-0 pb-8">
                  <CardTitle className="text-3xl font-bold tracking-tight">Create an account</CardTitle>
                </CardHeader>
                <CardContent className="px-0">
                  <Form {...registerForm}>
                    <form onSubmit={registerForm.handleSubmit((d) => registerMutation.mutate(d, { onSuccess: () => setActiveTab("login") }))} className="space-y-6">
                      <FormField
                        control={registerForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Name <span className="text-destructive">*</span></FormLabel>
                            <FormControl>
                               <Input placeholder="Sandesh Patil" required {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={registerForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username <span className="text-destructive">*</span></FormLabel>
                            <FormControl>
                               <Input 
                                 placeholder="sandeshpatil" 
                                 required 
                                 {...field} 
                                 onChange={(e) => field.onChange(e.target.value.toLowerCase())}
                               />
                            </FormControl>
                            <p className="text-[0.8rem] text-muted-foreground mt-1">
                              Unique alphanumeric username (3-20 chars).
                            </p>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={registerForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email <span className="text-destructive">*</span></FormLabel>
                            <FormControl>
                              <Input 
                                type="email" 
                                placeholder="email@example.com" 
                                required 
                                {...field} 
                                onChange={(e) => field.onChange(e.target.value.toLowerCase())}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />


                      <FormField
                        control={registerForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password <span className="text-destructive">*</span></FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input 
                                  type={showRegisterPassword ? "text" : "password"} 
                                  placeholder="••••••••" 
                                  required 
                                  {...field} 
                                  className="pr-10"
                                  onFocus={() => setPasswordFocused(true)}
                                  onBlur={() => setPasswordFocused(false)}
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  title={showRegisterPassword ? "Hide password" : "Show password"}
                                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-muted-foreground/50 hover:text-primary transition-colors"
                                  onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                                >
                                  {showRegisterPassword ? (
                                    <EyeOff className="h-4 w-4" />
                                  ) : (
                                    <Eye className="h-4 w-4" />
                                  )}
                                  <span className="sr-only">
                                    {showRegisterPassword ? "Hide password" : "Show password"}
                                  </span>
                                </Button>
                              </div>
                            </FormControl>
                             {passwordFocused && (
                               <div className="space-y-1.5 mt-2 animate-in fade-in slide-in-from-top-1 duration-200">
                                 {passwordRequirements.map((req, i) => (
                                   <div key={i} className="flex items-center gap-2 text-xs">
                                     {req.check ? (
                                       <Check className="w-3.5 h-3.5 text-green-500 shrink-0" />
                                     ) : (
                                       <X className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
                                     )}
                                     <span className={req.check ? "text-green-600 font-medium" : "text-muted-foreground"}>
                                       {req.label}
                                     </span>
                                   </div>
                                 ))}
                               </div>
                             )}
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button 
                        type="submit" 
                        className="w-full h-12 text-base font-bold mt-4"
                        disabled={registerMutation.isPending}
                      >
                        {registerMutation.isPending ? "Creating Account..." : "Register"}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
