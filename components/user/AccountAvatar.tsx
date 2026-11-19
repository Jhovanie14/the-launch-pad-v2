import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

/** The signed-in customer's avatar on a navy bar (dashboard and public). */
export function AccountAvatar({ src, initial }: { src?: string | null; initial: string }) {
  return (
    <Avatar className="size-9 ring-2 ring-white/25">
      {src && <AvatarImage src={src} alt="" />}
      <AvatarFallback className="bg-dusk font-bold text-on-night">{initial}</AvatarFallback>
    </Avatar>
  );
}
