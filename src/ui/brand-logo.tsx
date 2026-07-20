import Image from "next/image";

type BrandLogoProps = {
  className?: string;
  decorative?: boolean;
  priority?: boolean;
  variant?: "wordmark" | "mark" | "responsive";
};

export function BrandLogo({
  className = "",
  decorative = false,
  priority = false,
  variant = "wordmark",
}: BrandLogoProps) {
  const alt = decorative ? "" : "ScopeForge";

  if (variant === "mark") {
    return (
      <span className={`brand-logo brand-logo--mark ${className}`.trim()}>
        <Image
          src="/brand/scopeforge-mark.svg"
          alt={alt}
          width={128}
          height={128}
          unoptimized
          priority={priority}
        />
      </span>
    );
  }

  return (
    <span
      className={`brand-logo ${variant === "responsive" ? "brand-logo--responsive" : "brand-logo--wordmark"} ${className}`.trim()}
    >
      <Image
        className="brand-logo-wordmark"
        src="/brand/scopeforge-logo.svg"
        alt={alt}
        width={700}
        height={140}
        unoptimized
        priority={priority}
      />
      {variant === "responsive" && (
        <Image
          className="brand-logo-mark"
          src="/brand/scopeforge-mark.svg"
          alt=""
          width={128}
          height={128}
          unoptimized
          priority={priority}
        />
      )}
    </span>
  );
}
