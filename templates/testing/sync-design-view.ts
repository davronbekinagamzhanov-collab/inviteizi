/**
 * Для тестов, которые рендерят страницу приглашения через renderToStaticMarkup: next/dynamic там
 * не дожидается загрузки, поэтому подменяем DesignView синхронным с заранее загруженными модулями.
 * Использование: vi.mock("@/templates/design-loaders", () => import("@/templates/testing/sync-design-view").then((m) => m.syncDesignViews()));
 */
import { createElement, type ComponentType } from "react";
import type { TemplateProps } from "../themes/types";
import { DESIGN_MODULES, LEGACY_MODULES } from "../design-modules";

export async function syncDesignViews() {
  const load = async (table: typeof DESIGN_MODULES) =>
    new Map<string, ComponentType<TemplateProps>>(
      await Promise.all(Object.entries(table).map(async ([id, l]) => [id, (await l()).default] as const)),
    );
  const [views, legacy] = await Promise.all([load(DESIGN_MODULES), load(LEGACY_MODULES)]);
  function DesignView({ id, legacy: old = false, ...props }: TemplateProps & { id: string; legacy?: boolean }) {
    const View = (old ? legacy.get(id) : undefined) ?? views.get(id)!;
    return createElement(View, props);
  }
  return { DesignView };
}
