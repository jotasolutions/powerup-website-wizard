import type { DomainPreferenceInsight } from "@/lib/analytics-domain-insight";
import type {
  DailyRegistrationPoint,
  DomainIntentMetrics,
  RegistrationScenarioRow,
  RegistrationsHeroData,
} from "@/lib/analytics-neon.server";

export type DomainPreferenceHeroData = {
  breakdown: { paid: number; free: number };
  activation: {
    paid: { chosen: number; activated: number; rate: number | null };
    free: { chosen: number; activated: number; rate: number | null };
  };
  downgrades: {
    total: number;
    namecheapDegraded: number;
    skipLink: number;
  };
  neonIntent: DomainIntentMetrics;
  insight: DomainPreferenceInsight;
  sampleN: number;
};

export type WhenTheyStartData = {
  total: number;
  byDayOfWeek: Array<{ day: number; label: string; count: number }>;
  byTimeSlot: Array<{ slot: string; label: string; count: number }>;
};

export type { RegistrationsHeroData, DailyRegistrationPoint, DomainIntentMetrics, RegistrationScenarioRow };
