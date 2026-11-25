import { componentRegistry } from "../core/ComponentRegistry.js";
import { ExperienceView } from "./ExperienceView.jsx";
import { PageView } from "./PageView.jsx";
import { LayoutView } from "./LayoutView.jsx";
import { WidgetView } from "./WidgetView.jsx";
import { HeaderView } from "./HeaderView.jsx";
import { IdentityView } from "./IdentityView.jsx";
import { NavView } from "./NavView.jsx";
import { ThreadView } from "./ThreadView.jsx";
import { MessageView } from "./MessageView.jsx";
import { TypingView } from "./TypingView.jsx";
import { FinalStateView } from "./FinalStateView.jsx";
import { InstructionItemView } from "./InstructionItemView.jsx";
import { InstructionCardView } from "./InstructionCardView.jsx";
import { ResourceGridView } from "./ResourceGridView.jsx";
import { DataTableView } from "./DataTableView.jsx";
import { ChartView } from "./ChartView.jsx";
import { ActionButtonsView } from "./ActionButtonsView.jsx";
import { ConfirmView } from "./ConfirmView.jsx";
import { GalleryView } from "./GalleryView.jsx";
import { ChipsView } from "./ChipsView.jsx";
import { TrayView } from "./TrayView.jsx";
import { ComposerView } from "./ComposerView.jsx";
import { FinishView } from "./FinishView.jsx";
import { LauncherView } from "./LauncherView.jsx";

// Un nouveau composant s'ajoute ici : le moteur récursif ne change jamais.
componentRegistry.registerAll({
  experience: ExperienceView,
  page: PageView,
  layout: LayoutView,
  widget: WidgetView,
  header: HeaderView,
  identity: IdentityView,
  "contact-nav": NavView,
  thread: ThreadView,
  message: MessageView,
  typing: TypingView,
  "final-state": FinalStateView,
  "instruction-item": InstructionItemView,
  "instruction-card": InstructionCardView,
  "resource-grid": ResourceGridView,
  "data-table": DataTableView,
  chart: ChartView,
  "action-buttons": ActionButtonsView,
  "instruction-confirm": ConfirmView,
  gallery: GalleryView,
  chips: ChipsView,
  "attachment-tray": TrayView,
  composer: ComposerView,
  finish: FinishView,
  launcher: LauncherView,
});

export { componentRegistry };
