import { countries, getEmojiFlag } from "countries-list";

export const COUNTRIES = Object.entries(countries).map(([code, data]) => ({
    name: data.name,
    code: code,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    emoji: getEmojiFlag(code as any)
})).sort((a, b) => a.name.localeCompare(b.name));
