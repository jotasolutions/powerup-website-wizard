type Props = {
  options: { label: string; onClick: () => void }[];
};

export function ChoiceRow({ options }: Props) {
  return (
    <div className="flex w-full flex-col gap-2">
      {options.map((o) => (
        <button
          key={o.label}
          type="button"
          onClick={o.onClick}
          className="w-full rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium shadow-card transition hover:border-primary/30 hover:bg-accent active:scale-[0.98]"
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
