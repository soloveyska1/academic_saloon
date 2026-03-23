import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

/** Format a numeric value as Russian rubles: "1 234 ₽" */
export function formatMoney(value: number): string {
    return `${Math.max(0, Math.round(value || 0)).toLocaleString('ru-RU')} ₽`
}

/** Russian pluralization for common patterns (1 день, 2 дня, 5 дней) */
export function pluralize(n: number, one: string, few: string, many: string): string {
    const abs = Math.abs(n) % 100
    const lastDigit = abs % 10
    if (abs >= 11 && abs <= 19) return many
    if (lastDigit === 1) return one
    if (lastDigit >= 2 && lastDigit <= 4) return few
    return many
}
