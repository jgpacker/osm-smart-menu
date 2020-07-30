import { setOrderedSiteIds } from "../storage/config-handler";
import dragula from "dragula";

export const dragHandleClass = "drag-handle";
//TODO: Migrate to svelte-dnd-action after https://github.com/isaacHagoel/svelte-dnd-action/issues/86
export function setupDragAndDrop(d: Document): HTMLElement {
  const div: HTMLDivElement = d.querySelector("div") as HTMLDivElement;

  const dragAndDropHandler = dragula([div], {
    moves: (_el, _container, handle) =>
      Boolean(handle && handle.classList.contains(dragHandleClass)),
  });
  dragAndDropHandler.on("drop", updateSiteIdsOrder);

  async function updateSiteIdsOrder() {
    const orderedSitesWithId = [
      ...d.querySelectorAll("div input[type=checkbox]"),
    ].map((input: Element) => (input as HTMLInputElement).name);
    await setOrderedSiteIds(orderedSitesWithId);
  }

  return div;
}
