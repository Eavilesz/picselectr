// The STTORIA logo mark: three rectangles in orange, white and blue.
// The white one gets a hairline so it still reads on light backgrounds.
const sizes = {
  sm: "h-3.5 w-2.5 gap-1",
  lg: "h-5 w-3.5 gap-1.5",
};

export default function BrandMark({
  size = "sm",
  className = "",
}: {
  size?: keyof typeof sizes;
  className?: string;
}) {
  const [h, w, gap] = sizes[size].split(" ");
  return (
    <span aria-hidden className={`inline-flex ${gap} ${className}`}>
      <span className={`${h} ${w} bg-brand-orange`} />
      <span className={`${h} ${w} bg-white ring-1 ring-inset ring-line`} />
      <span className={`${h} ${w} bg-brand-blue`} />
    </span>
  );
}
