import type { CSSProperties } from "react";
import type { EventConfig } from "../shared/types";

export function formatEventDate(config: EventConfig, withWeekday = true): string {
  const date = new Date(config.eventDate);
  if (isNaN(date.getTime())) return config.eventDate;
  return date.toLocaleDateString("pt-BR", {
    ...(withWeekday ? { weekday: "long" } : {}),
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Variáveis CSS do tema escolhido no painel. */
export function themeVars(config: EventConfig): CSSProperties {
  return {
    "--primary": config.primaryColor,
    "--secondary": config.secondaryColor,
    "--card": config.cardColor,
    "--page": config.pageColor,
    "--radius-lg": `${config.cornerRadius}px`,
    "--radius-md": `${Math.round(config.cornerRadius * 0.65)}px`,
    "--shadow": `${config.shadowStrength}px`,
  } as CSSProperties;
}
