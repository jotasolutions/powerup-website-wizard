export type DomainAlternative = {
  domain: string;
  price: number;
};

export type DomainCheckResult =
  | { available: true; price: number }
  | { available: false; alternatives: DomainAlternative[] };
