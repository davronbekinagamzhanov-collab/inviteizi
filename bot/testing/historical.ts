import { afterEach, beforeEach, vi } from "vitest";
import * as registry from "@/templates/registry";

/**
 * Каталог до чистки 03.11.2026 (принятые + скрытые). Для тестов, которые проверяют путь заказа
 * на дизайны, скрытые теперь из каталога: их старые заказы, правки и оплата должны работать.
 */
export function useHistoricalCatalog() {
  beforeEach(() => {
    vi.spyOn(registry, "activeDesigns").mockImplementation(() =>
      registry.everAccepted().sort((a, b) => registry.catalogPosition(a) - registry.catalogPosition(b)),
    );
    vi.spyOn(registry, "isOnSale").mockImplementation((id) => registry.everAccepted().some((d) => d.id === id));
  });
  afterEach(() => vi.restoreAllMocks());
}
