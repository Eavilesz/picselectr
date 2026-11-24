// Small tracked label with hairlines, as in the studio's Instagram posts
export default function Eyebrow({
  children,
  centered = false,
  dark = false,
  as: Tag = "p",
  className = "",
}: {
  children: React.ReactNode;
  centered?: boolean;
  dark?: boolean;
  as?: "p" | "h1";
  className?: string;
}) {
  const line = `h-px w-8 sm:w-11 ${dark ? "bg-gold-soft" : "bg-gold"}`;
  return (
    <Tag
      className={`flex items-center gap-4.5 text-[11px] font-normal uppercase tracking-[0.36em] ${
        dark ? "text-gold-soft" : "text-gold-deep"
      } ${centered ? "justify-center" : ""} ${className}`}
    >
      <span aria-hidden className={line} />
      {children}
      {centered && <span aria-hidden className={line} />}
    </Tag>
  );
}
