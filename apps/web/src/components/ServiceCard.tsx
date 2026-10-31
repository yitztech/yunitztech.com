import React from "react";
import { Card } from "./ui/card";
import { cn } from "../lib/utils";

export type ServiceCategory =
  | "landing"
  | "ecommerce"
  | "bookings"
  | "apps"
  | "marketing"
  | "custom";

export interface ServiceMeta {
  category: ServiceCategory;
  image: string;
  tone: "rose" | "lilac" | "pink";
}

const categoryMetas: Record<ServiceCategory, { image: string; tone: "rose" | "lilac" | "pink" }> = {
  landing: {
    image: "/images/mock/service-landing.jpg",
    tone: "rose",
  },
  ecommerce: {
    image: "/images/mock/service-ecommerce.jpg",
    tone: "lilac",
  },
  bookings: {
    image: "/images/mock/service-bookings.jpg",
    tone: "pink",
  },
  apps: {
    image: "/images/mock/service-apps.jpg",
    tone: "rose",
  },
  marketing: {
    image: "/images/mock/service-marketing.jpg",
    tone: "lilac",
  },
  custom: {
    image: "/images/mock/service-custom.jpg",
    tone: "pink",
  },
};

const fallbackOrder: ServiceCategory[] = [
  "landing",
  "ecommerce",
  "bookings",
  "apps",
  "marketing",
  "custom",
];

export function resolveServiceMeta(title: string, index: number): ServiceMeta {
  const norm = (title || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  let category: ServiceCategory;

  if (/(landing|pagina.*venta|page.*vente|landingpage)/.test(norm)) {
    category = "landing";
  } else if (/(tienda|store|boutique|shop|loja|comercio|ecommerce|e-commerce)/.test(norm)) {
    category = "ecommerce";
  } else if (/(reserva|booking|agend|cita|termin|buchung)/.test(norm)) {
    category = "bookings";
  } else if (/(app|movil|mobil|desktop|escritorio|bureau|aplicativ)/.test(norm)) {
    category = "apps";
  } else if (/(correo|mail|diffusion|email|boletin|newsletter)/.test(norm)) {
    category = "marketing";
  } else if (/(herramienta|tool|outil|werkzeug|ferramenta|medida|custom|automat)/.test(norm)) {
    category = "custom";
  } else {
    category = fallbackOrder[Math.abs(index) % fallbackOrder.length];
  }

  const meta = categoryMetas[category];
  return {
    category,
    image: meta.image,
    tone: meta.tone,
  };
}

function ServiceIcon({ category }: { category: ServiceCategory }) {
  switch (category) {
    case "landing":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-5" aria-hidden="true">
          <rect width="20" height="14" x="2" y="3" rx="2" />
          <line x1="8" x2="16" y1="21" y2="21" />
          <line x1="12" x2="12" y1="17" y2="21" />
        </svg>
      );
    case "ecommerce":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-5" aria-hidden="true">
          <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
          <path d="M3 6h18" />
          <path d="M16 10a4 4 0 0 1-8 0" />
        </svg>
      );
    case "bookings":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-5" aria-hidden="true">
          <path d="M8 2v4" />
          <path d="M16 2v4" />
          <rect width="18" height="18" x="3" y="4" rx="2" />
          <path d="M3 10h18" />
          <path d="m9 16 2 2 4-4" />
        </svg>
      );
    case "apps":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-5" aria-hidden="true">
          <rect width="14" height="20" x="5" y="2" rx="2" ry="2" />
          <path d="M12 18h.01" />
        </svg>
      );
    case "marketing":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-5" aria-hidden="true">
          <rect width="20" height="16" x="2" y="4" rx="2" />
          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
        </svg>
      );
    case "custom":
    default:
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-5" aria-hidden="true">
          <polyline points="16 18 22 12 16 6" />
          <polyline points="8 6 2 12 8 18" />
        </svg>
      );
  }
}

const toneStyles: Record<"rose" | "lilac" | "pink", string> = {
  rose: "bg-[#fbe5e5] text-[#9c244b]",
  lilac: "bg-[#edeafb] text-[#5b4bc4]",
  pink: "bg-[#fbe4ef] text-[#9a2860]",
};

interface Props {
  title: string;
  description: string;
  index?: number;
  image?: string;
  linkLabel: string;
  ariaLabel: string;
}

export default function ServiceCard({
  title,
  description,
  index = 0,
  image,
  linkLabel,
  ariaLabel,
}: Props) {
  const meta = resolveServiceMeta(title, index);
  const resolvedImage = image || meta.image;

  return (
    <Card
      className={cn(
        "group h-full flex-col gap-0 overflow-hidden rounded-2xl border border-white/70 bg-white p-2.5 shadow-[0_14px_45px_-38px_rgba(48,32,99,0.35)] transition-all duration-300 hover:-translate-y-1 hover:shadow-card sm:flex-row"
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col p-4 sm:p-5">
        <span
          aria-hidden="true"
          className={cn(
            "grid size-11 shrink-0 place-items-center rounded-xl",
            toneStyles[meta.tone]
          )}
        >
          <ServiceIcon category={meta.category} />
        </span>

        <h3 className="mt-4 font-display text-[1.1rem] leading-tight font-bold tracking-[-0.015em] text-ink">
          {title}
        </h3>

        <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">
          {description}
        </p>

        <a
          href="#contacto"
          aria-label={ariaLabel}
          className="group/link mt-auto inline-flex items-center gap-1.5 pt-5 text-[13px] font-bold text-ink transition-colors hover:text-plum"
        >
          <span>{linkLabel}</span>
          <span
            aria-hidden="true"
            className="transition-transform duration-300 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5"
          >
            ↗
          </span>
        </a>
      </div>

      <div className="relative h-44 w-full shrink-0 overflow-hidden rounded-xl sm:h-auto sm:w-[42%]">
        <img
          src={resolvedImage}
          alt=""
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-plum/15 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        />
      </div>
    </Card>
  );
}
