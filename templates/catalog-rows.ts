import { catalogPosition, designs, FORMATS, isOnSale, PRICES, type Format } from "./registry";

/** Строка таблицы public.templates, полностью выведенная из кода (реестр + витрина templates/catalog.ts) */
export type TemplateRow = {
  id: string;
  number: number;
  occasion: string;
  format: Format;
  with_photo: boolean;
  price: number;
  cover_url: string;
  is_active: boolean;
  sort: number;
};

/**
 * Все дизайны реестра для `npm run db:seed-templates`.
 * is_active = дизайн в продаже (витрина), price = цена формата, sort = место в каталоге (не в продаже — 1000+номер).
 */
export function templateRows(): TemplateRow[] {
  const rows = designs.map((d) => ({
    id: d.id,
    number: d.number,
    occasion: d.occasion,
    format: d.format,
    with_photo: d.withPhoto,
    price: PRICES[d.format],
    cover_url: d.cover,
    is_active: isOnSale(d.id),
    sort: catalogPosition(d),
  }));
  if (rows.some((r) => !FORMATS.includes(r.format) || !Number.isInteger(r.price))) {
    throw new Error("Unknown catalog format or price");
  }
  return rows;
}
