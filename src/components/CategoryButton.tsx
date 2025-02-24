
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CategoryButtonProps {
  name: string;
  icon: React.ReactNode;
  isSelected?: boolean;
  onClick?: () => void;
}

export function CategoryButton({ name, icon, isSelected, onClick }: CategoryButtonProps) {
  return (
    <Button
      variant="ghost"
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300",
        isSelected ? "bg-white/10 text-white" : "text-white/60 hover:text-white hover:bg-white/5"
      )}
      onClick={onClick}
    >
      {icon}
      <span>{name}</span>
    </Button>
  );
}
