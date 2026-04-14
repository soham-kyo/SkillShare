import { Link } from "wouter";
import { type Skill, type User } from "@shared/schema";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowRight, Code, Music, Languages, Calculator, Palette } from "lucide-react";
import { getUserInitials } from "@/lib/utils";


interface SkillCardProps {
  skill: Skill & { user: User };
}

const CATEGORY_ICONS: Record<string, any> = {
  "Programming": Code,
  "Music": Music,
  "Languages": Languages,
  "Mathematics": Calculator,
  "Design": Palette,
};

export function SkillCard({ skill }: SkillCardProps) {
  const Icon = CATEGORY_ICONS[skill.category] || Code;

  return (
    <Card className="group hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 border-border/50 hover:border-primary/20 overflow-hidden flex flex-col h-full">
      <CardHeader className="p-0">
        <div className="h-24 bg-gradient-to-r from-primary/5 to-primary/10 flex items-center justify-center">
          <Icon className="w-10 h-10 text-primary/40 group-hover:scale-110 transition-transform duration-300" />
        </div>
      </CardHeader>
      <CardContent className="p-6 flex-1">
        <div className="flex items-start justify-between mb-4">
          <Badge variant="secondary" className="font-medium">
            {skill.category}
          </Badge>
        </div>
        
        <CardTitle className="mb-2 font-display text-xl group-hover:text-primary transition-colors">
          {skill.title}
        </CardTitle>
        <p className="text-muted-foreground line-clamp-3 text-sm leading-relaxed">
          {skill.description}
        </p>
      </CardContent>
      
      <CardFooter className="p-6 pt-0 border-t border-border/50 bg-secondary/10 mt-auto flex items-center justify-between">
        <div className="flex items-center gap-2 mt-4">
          <Avatar className="w-8 h-8 border border-background">
            <AvatarFallback className="bg-primary/10 text-primary text-xs">
              {getUserInitials(skill.user)}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="text-xs font-medium text-foreground">{skill.user.name}</span>
            <span className="text-[10px] text-muted-foreground">Tutor</span>
          </div>
        </div>
        
        <Link href={`/skills/${skill.id}`} className="mt-4">
          <div className="p-2 rounded-full hover:bg-primary/10 text-primary transition-colors">
            <ArrowRight className="w-5 h-5" />
          </div>
        </Link>
      </CardFooter>
    </Card>
  );
}
