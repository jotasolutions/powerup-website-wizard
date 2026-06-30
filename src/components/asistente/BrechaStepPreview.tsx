import type { PlaceProfile } from "@/lib/place-profile.types";
import { resolvePlaceGapMessage } from "@/lib/place-gap";
import { resolvePowerUpUpgradeMessage } from "@/lib/place-gap.messages";
import { detectPowerUpFromProfile } from "@/lib/powerup-customer";
import { ChatBubble } from "./ChatBubble";
import { formatBotText } from "./formatBotText";
import { cn } from "@/lib/utils";

type Props = {
  profile: PlaceProfile;
  /** Si no se pasa, se infiere del perfil (carta PowerUp). */
  powerupCustomer?: "yes" | "no";
  className?: string;
};

export function resolveBrechaMessage(
  profile: PlaceProfile,
  powerupCustomer?: "yes" | "no",
): string {
  const isPowerUp =
    powerupCustomer === "yes" || detectPowerUpFromProfile(profile).status === "yes";
  if (isPowerUp) return resolvePowerUpUpgradeMessage();
  return resolvePlaceGapMessage(profile);
}

export function BrechaStepPreview({ profile, powerupCustomer, className }: Props) {
  const message = resolveBrechaMessage(profile, powerupCustomer);

  return (
    <div className={cn(className)}>
      <ChatBubble role="bot">{formatBotText(message)}</ChatBubble>
    </div>
  );
}
