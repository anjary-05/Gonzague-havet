// Entrée SDK : deux Custom Elements partagent le même arbre d'objets React.
import { createElement } from "react";
import css from "./styles.css?inline";
import { defineReactTemplate } from "@onirtech/template-sdk/react";
import { Aurora } from "./app/Aurora.jsx";
import { PAGE_ELEMENT, WIDGET_ELEMENT } from "./app/config/Elements.js";

const options = { css };

function WidgetSurface() {
  return createElement(Aurora, { surfaceOverride: "widget" });
}

defineReactTemplate(PAGE_ELEMENT, Aurora, options);
defineReactTemplate(WIDGET_ELEMENT, WidgetSurface, options);
