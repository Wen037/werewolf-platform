import { cn } from "../../lib/utils";

export const BackgroundBeams = ({ className }: { className?: string }) => {
  return (
    <div className={cn("absolute inset-0 h-full w-full bg-neutral-950", className)}>
      <div className="absolute h-full w-full bg-[radial-gradient(#3a3a3a_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)]" />
    </div>
  );
};