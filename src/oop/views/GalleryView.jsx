import { SectionNode } from "../core/ComponentNode.js";
import { toOpenableUrl } from "../../utils/format.js";

export class GalleryView extends SectionNode {
  constructor(contract = {}) {
    super({ ...contract, id: contract.id ?? "section-gallery", type: "gallery", name: contract.name ?? "Galerie de médias" });
  }

  renderElement() {
    const { resources = {}, actions = {} } = this.props;
    const photos = Array.isArray(resources.media?.photos) ? resources.media.photos : [];
    const liens = Array.isArray(resources.media?.liens) ? resources.media.liens : [];
    const ouvrir = (url) => {
      const openUrl = toOpenableUrl(url);
      if (openUrl !== "" && typeof actions?.openMedia === "function") actions.openMedia(openUrl);
    };
    return (
      <div className="gallery" aria-label="Médias du chatbot" data-onir-region="galerie">
        {photos.map((photo) => (
          <button className="gallery-item" type="button" key={photo.id} onClick={() => ouvrir(photo.url)}>
            <img src={photo.url} alt={photo.libelle || ""} />
          </button>
        ))}
        {liens.map((lien) => (
          <button className="gallery-link" type="button" key={lien.id} onClick={() => ouvrir(lien.url)}>
            {lien.libelle || "Lien"}
          </button>
        ))}
      </div>
    );
  }
}
