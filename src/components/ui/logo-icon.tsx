/* eslint-disable @next/next/no-img-element */
export function LogoIcon({ className, size = 20 }: { className?: string; size?: number }) {
  return (
    <img
      src="/tierra.png"
      alt="Credi-Terreno"
      width={size}
      height={size}
      className={className}
    />
  );
}
