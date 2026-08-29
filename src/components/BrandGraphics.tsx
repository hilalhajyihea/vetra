import Image from "next/image";

export function LogoMark({ className = "" }: { className?: string }) {
  return (
    <Image
      src="/images/vetra-logo.png"
      alt=""
      width={128}
      height={128}
      className={`rounded-full object-cover ring-1 ring-[rgba(196,163,90,0.5)] ${className}`}
    />
  );
}

type BrandMarkProps = {
  className?: string;
  tone?: "dark" | "light";
  label?: string;
};

export function BrandMark({ className = "" }: BrandMarkProps) {
  return (
    <div className={`inline-flex items-center ${className}`}>
      <LogoMark className="h-14 w-14 shrink-0 drop-shadow-lg sm:h-16 sm:w-16" />
      <span className="sr-only">Vetra</span>
    </div>
  );
}

export function CheckIcon() {
  return (
    <svg
      className="mt-0.5 h-4 w-4 shrink-0 text-[var(--hay)]"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden
    >
      <path
        d="M4.5 10.5 8 14l7.5-8"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function WhatsAppIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect width="24" height="24" rx="7" fill="#25D366" />
      <path
        d="M12.04 5.2c-3.55 0-6.43 2.86-6.43 6.39 0 1.13.3 2.23.87 3.2L5.6 17.9l3.2-0.84a6.4 6.4 0 0 0 3.04.73h.01c3.55 0 6.43-2.86 6.43-6.39 0-3.53-2.88-6.39-6.24-6.39Zm3.74 9.2c-.16.44-.91.81-1.26.86-.32.05-.73.07-1.18-.07-.27-.08-.62-.2-1.07-.39-1.87-.81-3.09-2.69-3.18-2.81-.09-.12-.76-1.01-.76-1.92 0-.92.48-1.36.65-1.54.16-.17.42-.25.66-.25.08 0 .15 0 .21.01.19.01.29.02.41.32.16.38.53 1.3.58 1.4.05.1.08.21.01.33-.06.13-.09.21-.18.32-.09.11-.19.25-.27.33-.09.09-.18.19-.08.36.1.17.46.75.98 1.21.67.6 1.24.79 1.42.88.18.09.28.07.38-.04.1-.11.46-.53.58-.71.12-.18.24-.15.41-.09.17.06 1.07.5 1.25.59.18.09.3.14.35.21.05.08.05.44-.11.88Z"
        fill="white"
      />
    </svg>
  );
}
