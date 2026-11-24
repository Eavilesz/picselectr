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
  const line = "h-px w-8 bg-brand-orange sm:w-11";
  return (
    <Tag
      className={`flex items-center gap-4.5 text-[11px] font-normal uppercase tracking-[0.36em] ${
        dark ? "text-brand-blue-soft" : "text-brand-blue-deep"
      } ${centered ? "justify-center" : ""} ${className}`}
    >
      <span aria-hidden className={line} />
      {children}
      {centered && <span aria-hidden className={line} />}
    </Tag>
  );
}
