import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getUserInitials(user?: { name?: string; avatarInitials?: string | null }) {
  if (!user) return "?";
  if (user.avatarInitials) return user.avatarInitials;
  if (!user.name) return "?";
  return user.name.slice(0, 2).toUpperCase();
}
