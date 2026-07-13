export type DomainInitialChoice = "free" | "paid";

export function deriveDomainDowngraded(params: {
  initial: DomainInitialChoice | null;
  domainIsCustom: boolean;
  hasExistingWebsite: boolean;
}): boolean {
  return (
    params.initial === "paid" && !params.domainIsCustom && !params.hasExistingWebsite
  );
}

/** Fija la intención solo en el primer clic de brecha. */
export function mergeDomainInitialChoice(
  current: DomainInitialChoice | null,
  choice: DomainInitialChoice,
): DomainInitialChoice {
  return current ?? choice;
}
