import { catalogPart1 } from "./menu/catalog-1.js";
import { catalogPart2 } from "./menu/catalog-2.js";
import { catalogPart3 } from "./menu/catalog-3.js";
import { catalogPart4 } from "./menu/catalog-4.js";

let nextCatId = 0;
let nextItemId = 0;

function withIds(categories) {
  return categories.map((c) => ({
    id: ++nextCatId,
    name: c.name,
    items: c.items.map((it) => ({
      id: ++nextItemId,
      name: it.name,
      price: it.price,
      ...(it.info ? { info: it.info } : {})
    }))
  }));
}

export const MENU_CATEGORIES = withIds([
  ...catalogPart1,
  ...catalogPart2,
  ...catalogPart3,
  ...catalogPart4
]);
