import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useUser } from "@/hooks/use-auth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { GraduationCap, Briefcase, Plus, X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

// Common pre-defined skills for users to pick

const PREDEFINED_SKILLS = [
  "JavaScript", "TypeScript", "React", "Node.js", "Python", 
  "UI/UX Design", "Machine Learning", "Data Analysis", 
  "C++", "Java", "Mobile App Dev", "Marketing", 
  "Content Writing", "Video Editing", "Figma", "Project Management"
];

export function OnboardingModal() {
  const { data: user } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [collegeName, setCollegeName] = useState("");
  const [branch, setBranch] = useState("");
  const [collegeId, setCollegeId] = useState(user?.collegeId === "N/A" ? "" : (user?.collegeId || ""));
  const [skills, setSkills] = useState<string[]>(user?.skillsArray || []);
  const [customSkill, setCustomSkill] = useState("");

  const updateProfile = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PATCH", `/api/users/${user?.id}`, data);
      return res.json();
    },
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(["/api/auth/me"], updatedUser);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({
        title: "Welcome aboard! 🎉",
        description: "Your profile has been successfully set up.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Configuration Error",
        description: err.message || "Failed to save details. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Do not abruptly unmount so Radix Dialog can clean up its body locks
  const showModal = !!user && !user.hasCompletedOnboarding;

  const handleAddSkill = (skill: string) => {
    if (!skills.includes(skill)) {
      setSkills([...skills, skill]);
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills(skills.filter(s => s !== skillToRemove));
  };

  const handleAddCustomSkill = (e: React.KeyboardEvent | React.MouseEvent) => {
    if (e.type === 'keydown' && (e as React.KeyboardEvent).key !== 'Enter') return;
    
    e.preventDefault();
    if (customSkill.trim() && !skills.includes(customSkill.trim())) {
      handleAddSkill(customSkill.trim());
      setCustomSkill("");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!collegeName.trim()) {
      toast({ title: "Validation Error", description: "College Name is mandatory.", variant: "destructive" });
      return;
    }
    if (!collegeId.trim()) {
      toast({ title: "Validation Error", description: "College ID is mandatory.", variant: "destructive" });
      return;
    }

    if (skills.length === 0) {
      toast({ title: "Validation Error", description: "Please add at least one skill.", variant: "destructive" });
      return;
    }

    updateProfile.mutate({
      collegeName: collegeName.trim(),
      branch: branch.trim(),
      collegeId: collegeId.trim(),
      skillsArray: skills,
      hasCompletedOnboarding: true
    });
  };

  return (
    <Dialog open={showModal} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-xl p-0 overflow-hidden border-primary/20 bg-background/95 backdrop-blur-xl shadow-2xl [&>button]:hidden">
        <ScrollArea className="max-h-[95vh] w-full">
          {/* [&>button]:hidden removes the default close 'X' button since this is mandatory */}

        <div className="bg-gradient-to-br from-primary/20 via-primary/5 to-transparent p-6 text-center border-b border-border/50">
          <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner">
             <GraduationCap className="w-8 h-8 text-primary" />
          </div>
          <DialogTitle className="text-2xl font-black mb-2 tracking-tight">Welcome to SkillShare!</DialogTitle>
          <DialogDescription className="text-muted-foreground font-medium">
            Let's get your profile set up so you can start collaborating.
          </DialogDescription>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-muted-foreground">
                  Full College Name <span className="text-destructive">*</span>
                </Label>
                <Input 
                  placeholder="e.g. Indian Institute of Technology" 
                  value={collegeName}
                  onChange={(e) => setCollegeName(e.target.value)}
                  className="bg-secondary/50 border-transparent focus:bg-background focus:border-primary/50 transition-all rounded-xl h-12"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-muted-foreground">
                  College ID <span className="text-destructive">*</span>
                </Label>
                <Input 
                  placeholder="e.g. Enrollment or Roll No" 
                  value={collegeId}
                  onChange={(e) => setCollegeId(e.target.value)}
                  className="bg-secondary/50 border-transparent focus:bg-background focus:border-primary/50 transition-all rounded-xl h-12"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-muted-foreground">
                Branch (Optional)
              </Label>
              <Input 
                placeholder="e.g. Computer Science and Engineering" 
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                className="bg-secondary/50 border-transparent focus:bg-background focus:border-primary/50 transition-all rounded-xl h-12"
              />
            </div>

            <div className="space-y-3 pt-2">
              <Label className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-muted-foreground">
                <Briefcase className="w-3.5 h-3.5" /> Your Skills <span className="text-destructive">*</span>
              </Label>
              
              <div className="flex flex-wrap gap-2 mb-3">
                {skills.map(skill => (
                  <Badge key={skill} variant="secondary" className="px-3 py-1.5 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors flex items-center gap-1.5 text-xs font-bold shadow-sm">
                    {skill}
                    <X className="w-3 h-3 cursor-pointer hover:scale-125 transition-transform" onClick={() => handleRemoveSkill(skill)} />
                  </Badge>
                ))}
                {skills.length === 0 && <span className="text-xs text-muted-foreground italic py-1">No skills added yet.</span>}
              </div>

              <div className="flex gap-2">
                <Input 
                  placeholder="Type a custom skill..." 
                  value={customSkill}
                  onChange={(e) => setCustomSkill(e.target.value)}
                  onKeyDown={handleAddCustomSkill}
                  className="bg-secondary/50 border-transparent focus:bg-background focus:border-primary/50 transition-all rounded-xl h-11 flex-1"
                />
                <Button type="button" onClick={handleAddCustomSkill} variant="secondary" className="h-11 rounded-xl px-4 shrink-0 font-bold hover:bg-primary hover:text-primary-foreground transition-all">
                  <Plus className="w-4 h-4 mr-1" /> Add
                </Button>
              </div>

              <div className="mt-4 p-4 bg-secondary/30 rounded-2xl border border-primary/5">
                <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3 px-1">Suggested Skills</div>
                <div className="flex flex-wrap gap-2">
                  {PREDEFINED_SKILLS.filter(s => !skills.includes(s)).map(skill => (
                    <Badge 
                      key={skill} 
                      variant="outline" 
                      className="cursor-pointer hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all rounded-lg select-none px-2.5 py-1 text-xs border-primary/20"
                      onClick={() => handleAddSkill(skill)}
                    >
                      <Plus className="w-3 h-3 mr-1 opacity-50" /> {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-border/50">
            <Button 
              type="submit" 
              className="w-full h-12 rounded-xl text-base font-bold shadow-lg hover:shadow-primary/25 transition-all" 
              disabled={updateProfile.isPending || skills.length === 0}
            >
              {updateProfile.isPending ? "Saving Profile..." : "Complete Setup"}
            </Button>
            {skills.length === 0 && (
              <p className="text-center text-[10px] font-bold text-destructive mt-2 animate-pulse">
                Please add at least one skill to continue
              </p>
            )}
            <p className="text-center text-[11px] font-medium text-muted-foreground mt-3">
              You won't be able to access the platform until these details are provided.
            </p>
          </div>
        </form>
        </ScrollArea>
      </DialogContent>

    </Dialog>
  );
}
