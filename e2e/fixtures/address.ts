export const ownAddress = (): string => `2001:db8:${crypto.randomUUID().slice(0, 4)}::`
