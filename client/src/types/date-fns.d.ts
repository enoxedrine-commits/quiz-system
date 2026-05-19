declare module "date-fns" {
  export function format(
    date: Date | number | string,
    formatStr: string,
    options?: { locale?: unknown }
  ): string;
}

declare module "date-fns/locale" {
  export const zhCN: unknown;
}
