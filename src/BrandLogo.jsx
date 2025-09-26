// src/components/BrandLogo.jsx
import brand1080 from "./assets/brand-1080.webp";   // o .webp
// Opcional: versiones más livianas

/**
 * variant: "hero" | "compact"
 * className: tailwind extra opcional
 */
export default function BrandLogo({ variant = "compact", className = "" }) {
  const isHero = variant === "hero";

  // Tamaños por variante (ajustá a gusto)
  const sizeClasses = isHero
    ? "w-40 h-40 md:w-56 md:h-56"    // grande en menú principal
    : "w-10 h-10 md:w-12 md:h-12";   // chico en pantallas internas

  return (
    <picture>
      {/* Si tenés webp/avif, descomentalas y agregalas */}
      {/* <source srcSet={brand512} type="image/webp" /> */}
      <img
        src={brand1080}
        sizes={isHero ? "(min-width: 768px) 224px, 160px" : "(min-width: 768px) 48px, 40px"}
        alt="Logotipo de la app"
        width={isHero ? 224 : 48}     // ayuda a evitar CLS
        height={isHero ? 224 : 48}
        className={`aspect-square object-contain ${sizeClasses} ${className}`}
        loading={isHero ? "eager" : "lazy"}
        decoding="async"
      />
    </picture>
  );
}
