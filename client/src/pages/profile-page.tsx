import Layout from "@/components/layout";
import { useUser, useLogout } from "@/hooks/use-auth";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { updateProfileSchema, changePasswordSchema } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { AlertCircle, User, Loader2, Save, Key, Check, X, Eye, EyeOff, Plus } from "lucide-react";
import { getUserInitials } from "@/lib/utils";


export default function ProfilePage() {
  const { data: user, isLoading: userLoading } = useUser();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [location, setLocation] = useLocation();
  const { mutate: logout } = useLogout();


  const form = useForm({
    resolver: zodResolver(updateProfileSchema),
    mode: "onChange",
    defaultValues: {
      username: (user as any)?.username || "",
      name: (user as any)?.name || "",
      email: (user as any)?.email || "",
      collegeId: (user as any)?.collegeId || "",
      collegeName: (user as any)?.collegeName || "",
      branch: (user as any)?.branch || "",
      skillsArray: (user as any)?.skillsArray || [],
      bio: (user as any)?.bio || "",
      avatarInitials: (user as any)?.avatarInitials || "",
    }
  });

  // Live uniqueness checks
  const watchedUsername = form.watch("username");
  const watchedEmail = form.watch("email");

  // Update form when user data arrives
  useEffect(() => {
    if (user) {
      form.reset({
        username: user.username || "",
        name: user.name || "",
        email: user.email || "",
        collegeId: user.collegeId || "",
        collegeName: user.collegeName || "",
        branch: user.branch || "",
        skillsArray: user.skillsArray || [],
        bio: user.bio || "",
        avatarInitials: user.avatarInitials || "",
      });
    }
  }, [user, form]);

  useEffect(() => {
    if (watchedUsername.length < 3 || watchedUsername === user?.username) return;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/auth/check-availability?type=username&value=${watchedUsername}`);
        const data = await res.json();
        if (!data.available) {
          form.setError("username", { message: "Username already taken" });
        }
      } catch (e) {}
    }, 400);
    return () => clearTimeout(timer);
  }, [watchedUsername, form, user?.username]);

  useEffect(() => {
    if (!watchedEmail || !watchedEmail.includes("@") || watchedEmail === user?.email) return;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/auth/check-availability?type=email&value=${watchedEmail}`);
        const data = await res.json();
        if (!data.available) {
          form.setError("email", { message: "Email already registered" });
        }
      } catch (e) {}
    }, 400);
    return () => clearTimeout(timer);
  }, [watchedEmail, form, user?.email]);

  const updateProfile = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PATCH", `/api/users/${user.id}`, data);
      return res.json();
    },
    onSuccess: (updatedUser) => {
      qc.setQueryData(["/api/user"], updatedUser);
      qc.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({ title: "Profile updated successfully!" });
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Error", description: e.message })
  });

  const [deletePassword, setDeletePassword] = useState(""); // Added deletePassword state

  const deleteAccount = useMutation({
    mutationFn: () => apiRequest("POST", `/api/users/${user?.id}/delete`, { password: deletePassword }), // Changed from DELETE to POST /delete
    onSuccess: () => {
      qc.clear();
      toast({ title: "Your account deleted successfully" });
      setLocation("/");
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Deletion Blocked", description: e.message })
  });

  const { data: helpRequests } = useQuery<any[]>({ queryKey: ["/api/help-requests"] });
  const { data: projectPosts } = useQuery<any[]>({ queryKey: ["/api/projects"] });

  const activeHelp = helpRequests?.filter(r => r.authorId === user?.id && (r.status === "open" || r.status === "in_progress"));
  const activeProjects = projectPosts?.filter(p => p.authorId === user?.id && p.status === "open");
  const hasActiveContent = (activeHelp?.length ?? 0) > 0 || (activeProjects?.length ?? 0) > 0;
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  
  const [customSkill, setCustomSkill] = useState("");

  const passwordForm = useForm({
    resolver: zodResolver(changePasswordSchema),
    mode: "onChange",
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    }
  });

  const watchedNewPassword = passwordForm.watch("newPassword") || "";
  const passwordRequirements = [
    { label: "At least 8 characters", check: watchedNewPassword.length >= 8 },
    { label: "One uppercase letter", check: /[A-Z]/.test(watchedNewPassword) },
    { label: "One lowercase letter", check: /[a-z]/.test(watchedNewPassword) },
    { label: "One number", check: /[0-9]/.test(watchedNewPassword) },
    { label: "One special character", check: /[^a-zA-Z0-9]/.test(watchedNewPassword) },
  ];

  const changePassword = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/auth/change-password", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Password updated successfully!" });
      passwordForm.reset();
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Error changing password", description: e.message })
  });


  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 mb-2">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <User className="w-6 h-6 text-primary" /> Profile Settings
            </h1>
            <p className="text-muted-foreground mt-1">Manage your account details and profile visibility</p>
          </div>
          <Link href={`/users/${user?.username}`}>
            <Button variant="outline" className="gap-2 rounded-xl font-bold border-primary/20 hover:bg-primary/5 shadow-sm h-11 px-5">
              <Eye className="w-4 h-4 text-primary" /> View Public Profile
            </Button>
          </Link>
        </div>

        {/* Profile Image Preview */}
        <div className="flex items-center gap-5 p-6 glass-card rounded-2xl relative overflow-hidden group">
          {/* Subtle gradient background for the header card */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent opacity-50 pointer-events-none" />
          
          <div className="w-24 h-24 rounded-full flex items-center justify-center font-bold text-3xl bg-secondary text-foreground overflow-hidden shadow-inner relative z-10 border-4 border-background text-primary">
            {getUserInitials({ name: form.watch("name"), avatarInitials: form.watch("avatarInitials") })}
          </div>
          <div className="relative z-10">
            <h3 className="font-bold text-2xl tracking-tight">{form.watch("name") || "Your Name"}</h3>
            <p className="text-primary font-medium">@{user.username}</p>
          </div>
        </div>

        <Card className="glass-card shadow-lg border-primary/10 overflow-hidden">
          <CardHeader className="bg-secondary/30 border-b border-border/40 pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="w-5 h-5 text-primary" /> Edit Details
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(data => updateProfile.mutate(data))} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="username" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Your username" 
                          {...field} 
                          onChange={(e) => field.onChange(e.target.value.toLowerCase())}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Display Name <span className="text-destructive">*</span></FormLabel>
                      <FormControl><Input placeholder="Your display name" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input 
                          type="email" 
                          placeholder="email@example.com" 
                          {...field} 
                          onChange={(e) => field.onChange(e.target.value.toLowerCase())}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="collegeId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>College ID <span className="text-destructive">*</span></FormLabel>
                      <FormControl><Input placeholder="Enrollment number / Roll number" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="avatarInitials" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Avatar Initials</FormLabel>
                      <FormControl><Input placeholder="e.g. JD" maxLength={2} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="collegeName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>College Name <span className="text-destructive">*</span></FormLabel>
                      <FormControl><Input placeholder="Your college name" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="branch" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Branch</FormLabel>
                      <FormControl><Input placeholder="e.g. Computer Science" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="skillsArray" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Skills <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <div className="space-y-3">
                        <div className="flex flex-wrap gap-2">
                          {(field.value || []).map((skill: string) => (
                            <Badge key={skill} variant="secondary" className="px-3 py-1.5 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors flex items-center gap-1.5 text-xs font-bold shadow-sm">
                              {skill}
                              <X className="w-3 h-3 cursor-pointer hover:scale-125 transition-transform" onClick={() => {
                                const newSkills = (field.value || []).filter((s: string) => s !== skill);
                                field.onChange(newSkills);
                              }} />
                            </Badge>
                          ))}
                          {(field.value || []).length === 0 && <span className="text-xs text-muted-foreground italic py-1">No skills added yet.</span>}
                        </div>
                        <div className="flex gap-2">
                          <Input 
                            placeholder="Type a custom skill and click Add..." 
                            value={customSkill}
                            onChange={(e) => setCustomSkill(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                if (customSkill.trim() && !(field.value || []).includes(customSkill.trim())) {
                                  field.onChange([...(field.value || []), customSkill.trim()]);
                                  setCustomSkill("");
                                }
                              }
                            }}
                            className="bg-secondary/50 border-transparent focus:bg-background focus:border-primary/50 transition-all rounded-xl h-11 flex-1"
                          />
                          <Button 
                            type="button" 
                            variant="secondary" 
                            className="h-11 rounded-xl px-4 shrink-0 font-bold hover:bg-primary hover:text-primary-foreground transition-all"
                            onClick={() => {
                              if (customSkill.trim() && !(field.value || []).includes(customSkill.trim())) {
                                field.onChange([...(field.value || []), customSkill.trim()]);
                                setCustomSkill("");
                              }
                            }}
                          >
                            <Plus className="w-4 h-4 mr-1" /> Add 
                          </Button>
                        </div>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="bio" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bio</FormLabel>
                    <FormControl><Textarea placeholder="Tell peers a bit about yourself and what you're learning..." rows={4} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="pt-4 flex justify-end">
                  <Button type="submit" disabled={updateProfile.isPending || !form.formState.isValid} className="transition-custom shadow-md hover:shadow-lg">
                    {updateProfile.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Save Changes
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card className="glass-card shadow-lg border-primary/10 overflow-hidden">
          <CardHeader className="bg-secondary/30 border-b border-border/40 pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Key className="w-5 h-5 text-primary" /> Change Password
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <Form {...passwordForm}>
              <form onSubmit={passwordForm.handleSubmit(data => changePassword.mutate(data))} className="space-y-4">
                <FormField control={passwordForm.control} name="currentPassword" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input 
                          type={showCurrentPassword ? "text" : "password"} 
                          placeholder="••••••••" 
                          {...field} 
                          className="pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          title={showCurrentPassword ? "Hide password" : "Show password"}
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-muted-foreground/50 hover:text-primary transition-colors"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        >
                          {showCurrentPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={passwordForm.control} name="newPassword" render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input 
                          type={showNewPassword ? "text" : "password"} 
                          placeholder="••••••••" 
                          {...field} 
                          className="pr-10"
                          onFocus={() => setPasswordFocused(true)}
                          onBlur={() => setPasswordFocused(false)}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          title={showNewPassword ? "Hide password" : "Show password"}
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-muted-foreground/50 hover:text-primary transition-colors"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                        >
                          {showNewPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
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
                )} />

                <FormField control={passwordForm.control} name="confirmPassword" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm New Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input 
                          type={showConfirmPassword ? "text" : "password"} 
                          placeholder="••••••••" 
                          {...field} 
                          className="pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          title={showConfirmPassword ? "Hide password" : "Show password"}
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-muted-foreground/50 hover:text-primary transition-colors"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="pt-4 flex justify-end">
                  <Button type="submit" disabled={changePassword.isPending} className="transition-custom shadow-md hover:shadow-lg">
                    {changePassword.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Update Password
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="glass-card border-red-500/20 dark:border-red-500/10 shadow-lg overflow-hidden mt-8">
          <CardHeader className="bg-red-50/50 dark:bg-red-950/20 border-b border-red-500/10 pb-4">
            <CardTitle className="text-base text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" /> Danger Zone
            </CardTitle>
            <CardDescription className="text-red-600/80 dark:text-red-400/80">
              Irreversible and destructive actions for your account.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between p-4 bg-red-50 dark:bg-red-950/10 rounded-xl border border-red-100 dark:border-red-900/20 shadow-sm">
              <div>
                <h4 className="font-semibold text-sm">Delete Account</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Permanently delete your account, skills, and transaction history. This action cannot be undone.
                </p>
              </div>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="whitespace-nowrap shrink-0 transition-custom shadow-sm hover:shadow-md">
                    Delete Account
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription asChild>
                      <div className="space-y-4">
                        <p>
                          This action cannot be undone. This will permanently delete your account
                          along with all associated data including transactions, posts, and credits.
                        </p>
                        
                        {hasActiveContent && (
                          <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded-xl text-amber-800 dark:text-amber-300 text-xs space-y-2">
                            <div className="flex items-center gap-2 font-bold">
                              <AlertCircle className="w-4 h-4" /> 
                              ACTION REQUIRED
                            </div>
                            <p>You have active content that must be resolved or deleted before you can close your account:</p>
                            <ul className="list-disc list-inside space-y-1">
                              {activeHelp && activeHelp.length > 0 && <li>{activeHelp.length} active help request(s)</li>}
                              {activeProjects && activeProjects.length > 0 && <li>{activeProjects.length} recruiting project(s)</li>}
                            </ul>
                          </div>
                        )}

                        {!hasActiveContent && (
                          <div className="mt-4">
                             <Label htmlFor="delete-password" className="text-foreground font-semibold">Confirm Password <span className="text-destructive">*</span></Label>
                             <div className="relative mt-2">
                               <Input 
                                 id="delete-password"
                                 type={showDeletePassword ? "text" : "password"} 
                                 placeholder="Enter your current password" 
                                 className="pr-10"
                                 value={deletePassword}
                                 onChange={(e) => setDeletePassword(e.target.value)}
                               />
                               <Button
                                 type="button"
                                 variant="ghost"
                                 size="sm"
                                 title={showDeletePassword ? "Hide password" : "Show password"}
                                 className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-muted-foreground/50 hover:text-primary transition-colors"
                                 onClick={() => setShowDeletePassword(!showDeletePassword)}
                               >
                                 {showDeletePassword ? (
                                   <EyeOff className="h-4 w-4" />
                                 ) : (
                                   <Eye className="h-4 w-4" />
                                 )}
                               </Button>
                             </div>
                          </div>
                        )}
                      </div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setDeletePassword("")}>Cancel</AlertDialogCancel>
                    {!hasActiveContent ? (
                      <AlertDialogAction 
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={(e) => {
                          if (!deletePassword) {
                            e.preventDefault();
                            toast({ variant: "destructive", title: "Password required to delete account" });
                            return;
                          }
                          deleteAccount.mutate();
                        }}
                        disabled={deleteAccount.isPending || !deletePassword}
                      >
                        {deleteAccount.isPending ? "Deleting..." : "Permanently Delete Account"}
                      </AlertDialogAction>
                    ) : (
                      <Button variant="outline" disabled className="opacity-50">
                        Deletion Blocked
                      </Button>
                    )}
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>

      </div>
    </Layout>
  );
}
