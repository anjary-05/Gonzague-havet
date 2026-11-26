// Polymorphisme des surfaces page / widget (ADR-0040).
class Surface {
  constructor(name) {
    this.name = name === "widget" ? "widget" : "page";
  }
}

class PageSurface extends Surface {
  constructor() {
    super("page");
  }
}

class WidgetSurface extends Surface {
  constructor() {
    super("widget");
  }
}

export function createSurface(name) {
  return name === "widget" ? new WidgetSurface() : new PageSurface();
}
