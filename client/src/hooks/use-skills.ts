import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type InsertSkill } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export function useSkills(filters?: { category?: string; search?: string }) {
  const queryKey = ["/api/skills", filters?.category, filters?.search];

  return useQuery<any[]>({
    queryKey,
    queryFn: async () => {
      const url = new URL("/api/skills", window.location.origin);
      if (filters?.category && filters.category !== "All") url.searchParams.append("category", filters.category);
      if (filters?.search) url.searchParams.append("search", filters.search);
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error("Failed to fetch skills");
      return res.json();
    },
  });
}

export function useSkill(id: number) {
  return useQuery<any>({
    queryKey: ["/api/skills", id],
    queryFn: async () => {
      const res = await fetch(`/api/skills/${id}`);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch skill");
      return res.json();
    },
    enabled: !!id,
  });
}

export function useCreateSkill() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: InsertSkill) => apiRequest("POST", "/api/skills", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/skills"] });
      toast({ title: "Skill created", description: "Your skill has been published to the marketplace." });
    },
    onError: () => {
      toast({ variant: "destructive", title: "Error", description: "Failed to create skill. Please try again." });
    },
  });
}
