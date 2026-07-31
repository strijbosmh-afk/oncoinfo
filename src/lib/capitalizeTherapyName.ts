export function capitalizeTherapyName(name: string) {
  return name.replace(
    /(^|(?:\s[—–-]\s)|[+/]\s*)(\p{Ll})/gu,
    (_match, prefix: string, letter: string) => `${prefix}${letter.toLocaleUpperCase()}`,
  );
}
