export const formatZar = (value: number) => new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", maximumFractionDigits: 0 }).format(value);
export const formatCompactCount = (value: number) => value > 0 ? new Intl.NumberFormat("en", { notation:"compact", maximumFractionDigits:1 }).format(value) : "";
export const cn = (...values: Array<string | false | null | undefined>) => values.filter(Boolean).join(" ");
export const isVisibleFigure = (figure:Figure) => !["MERGED","REJECTED"].includes(figure.moderationStatus||"");
import type { Figure } from "@/types";
