// Défilement horizontal d'un carrousel natif à la molette (souris desktop).
// Le drag tactile, le trackpad (deltaX) et le clavier (Tab → focus) restent
// gérés nativement par `overflow-x: auto` ; on ajoute uniquement la molette.
//
// L'écouteur doit être NON PASSIF pour pouvoir `preventDefault` : sans cela la
// molette verticale ferait défiler la page en même temps que le carrousel.
export function horizontalWheelRef() {
  let node = null;
  let listener = null;

  const onWheel = (event) => {
    if (!node || node.scrollWidth <= node.clientWidth) return;
    // deltaX dominant (trackpad horizontal, Shift+molette) : déjà natif.
    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
    event.preventDefault();
    // Normalisation : `lines` (Firefox) → pixels, `pages` → largeur visible.
    const factor = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? node.clientWidth : 1;
    node.scrollLeft += event.deltaY * factor;
  };

  // Callback de ref React : appelé avec l'élément (montage) puis null (démontage).
  return (element) => {
    if (node && listener) node.removeEventListener("wheel", listener);
    node = element;
    listener = element ? onWheel : null;
    if (element) element.addEventListener("wheel", onWheel, { passive: false });
  };
}
