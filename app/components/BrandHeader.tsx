import Image from "next/image";
import Link from "next/link";

type Props = {
  title?: string;
  subtitle?: string;
  href?: string;
};

export function BrandHeader({
  title = "Sistema de Locação",
  subtitle = "Piscine Station Resort Brás",
  href = "/",
}: Props) {
  return (
    <header className="brandHeader">
      <div className="brandInner">
        <Link href={href} className="brandLogo" aria-label="Ir para o início">
          <Image
            src="/brand/logo.png"
            alt="Piscine Station Resort"
            width={220}
            height={64}
            priority
          />
        </Link>

        <div className="brandText">
          <div className="brandTitle">{title}</div>
          <div className="brandSubtitle">{subtitle}</div>
        </div>
      </div>
    </header>
  );
}
