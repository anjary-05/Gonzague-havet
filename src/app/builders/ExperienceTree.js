import { componentRegistry } from "../../oop/views/ViewRegistry.js";

const VERSION = "1.5.0";

// Fabrique générique : chaque nœud porte le contrat universel complet.
function node(type, id, props = {}, children = [], meta = {}) {
  return componentRegistry.create(type, {
    id,
    type,
    name: meta.name ?? id,
    version: VERSION,
    props,
    children,
    state: meta.state ?? {},
    events: meta.events ?? [],
    actions: meta.actions ?? (Array.isArray(props.actions) ? props.actions.map((a) => ({ id: a })) : []),
    styles: meta.styles ?? {},
    dependencies: meta.dependencies ?? [],
  });
}

// instruction.txt §3/§4 : assemblage récursif à partir du catalogue enregistré.
export function buildExperienceTree(model) {
  const {
    element, surface, dark, toggleTheme, tokenStyle, appRef, titre, params, consent, open, phase,
    statusFinalisee, typing, instructions, shownMessages, dataResult, pending,
    chips, menu, resources, actions, send, addFiles, removeAttachment,
    closeDiscussion, openDiscussion, submitIdentity, submitMessage,
    otpChallenge, otpEmail, otpError, requestOtp, verifyOtp, resendOtp, backToOtpEmail,
    threadRef, fileRef, audioRef, setDraft, draft, resolveResources,
    voirAvatar, avatarUrl, initiales, voirBadge, badge, voirMode, modesActifs,
    activeMode, lib, voirStatut, statut, libelleIdentite, libelleDemarrer,
    afficherNav, afficherSujets, afficherPJ, afficherMicro, afficherGalerie,
    canMedia, voirHorodatage, voirSources, voirBoutonsAccueil, voirFrappe,
    voirCartes, voirFin, libelleTerminer, texteFinalise, placeholder,
    accept, multiple, limiteTableau, canData, canModelForm, welcomeActions,
    voirMarkdown, voirMultimodal, voirContenuGenere,
  } = model;

  const experience = node("experience", "experience-expert-ia", {}, [], {
    dependencies: ["page", "layout", "widget"],
  });

  const page = node("page", "page-expert-ia", {
    surface, dark, element, tokenStyle, appRef,
  }, [], { dependencies: ["layout"] });
  experience.add(page);

  const layout = node("layout", "layout-expert-ia", {}, [], {
    dependencies: [open ? "widget" : "launcher"],
  });
  page.add(layout);

  if (!open) {
    layout.add(node("launcher", "section-launcher", {
      avatarUrl, initiales, openDiscussion,
    }, [], { actions: [{ id: "openWidget" }] }));
    return experience;
  }

  const widget = node("widget", "section-widget", {
    surface, titre,
    onPaste: (event) => {
      const files = event.clipboardData?.files;
      if (files && files.length) {
        event.preventDefault();
        void addFiles(files);
      }
    },
  }, [], {
    dependencies: [
      "header",
      phase === "identity" ? "identity" : phase === "otp" ? "otp" : "thread",
    ],
  });
  layout.add(widget);

  widget.add(node("header", "section-header", {
    voirAvatar, avatarUrl, initiales, titre, voirBadge, badge, voirMode,
    modesActifs, activeMode, lib, voirStatut, statut, closeDiscussion,
    dark, toggleTheme,
  }, [], { actions: [{ id: "closeWidget" }] }));

  if (phase === "identity") {
    widget.add(node("identity", "section-identity", {
      voirAvatar, avatarUrl, initiales, libelleIdentite, titre, consent,
      submitIdentity, submitting: model.submitting, libelleDemarrer,
    }, [], { state: { phase: "identity" }, actions: [{ id: "submitIdentity" }] }));
    return experience;
  }

  // Contrat hôte v1 : l'identification peut passer par un code à 6 chiffres.
  if (phase === "otp") {
    widget.add(node("otp", "section-otp", {
      voirAvatar, avatarUrl, initiales, titre, consent,
      challenge: otpChallenge, email: otpEmail, error: otpError,
      submitting: model.submitting,
      onRequest: requestOtp, onVerify: verifyOtp,
      onResend: resendOtp, onBack: backToOtpEmail,
    }, [], {
      state: { phase: "otp" },
      actions: [{ id: "requestOtp" }, { id: "verifyOtp" }],
    }));
    return experience;
  }

  if (afficherNav) {
    widget.add(node("contact-nav", "section-contact-nav", {
      params, actions,
    }, [], { actions: [{ id: "openMedia" }] }));
  }

  const thread = node("thread", "section-thread", { threadRef }, [], {
    state: { status: statusFinalisee ? "finalisee" : "en_cours", typing },
    dependencies: ["message", "typing", "final-state", "instruction-card"],
  });

  shownMessages.forEach((message, index) => {
    thread.add(node("message", `message-${message.id || `m-${index}`}`, {
      message,
      role: message.role === "user" ? "user" : "assistant",
      index, initiales, actions, voirHorodatage, voirSources,
      voirBoutonsAccueil, statusFinalisee, welcomeActions,
      voirMarkdown, voirMultimodal, voirContenuGenere,
    }, [], { actions: [{ id: "openMedia" }] }));
  });

  if (typing && voirFrappe) {
    thread.add(node("typing", "typing-indicator", {
      voirAvatar, avatarUrl, initiales,
    }));
  }

  if (statusFinalisee) {
    thread.add(node("final-state", "final-state", {
      voirAvatar, avatarUrl, initiales, texteFinalise,
    }));
  }

  if (voirCartes) {
    instructions.forEach(({ id, message, instruction }) => {
      const item = node("instruction-item", `instruction-item-${id}`, {}, [], {
        dependencies: ["instruction-card"],
      });
      item.add(node("instruction-card", `instruction-card-${id}`, {
        instruction,
        message,
        items: resolveResources(instruction, message),
        resolveResources,
        resources,
        actions,
        lib,
        canData,
        canModelForm,
        dataResult,
        limiteLignes: limiteTableau,
        confirme: model.confirmed.has(id),
        statusFinalisee,
        depth: 0,
        onConfirme: () => model.setConfirmed((precedent) => new Set(precedent).add(id)),
        onAnnule: () => model.setConfirmed((precedent) => {
          const suivant = new Set(precedent);
          suivant.delete(id);
          return suivant;
        }),
      }, [], { state: { confirmed: model.confirmed.has(id) }, actions: [{ id: instruction.action }] }));
      thread.add(item);
    });
  }

  widget.add(thread);

  if (afficherGalerie && canMedia) {
    widget.add(node("gallery", "section-gallery", { resources, actions }, [], {
      actions: [{ id: "openMedia" }],
    }));
  }

  widget.add(node("chips", "component-chips", {
    afficherSujets, menu, chips, actions, send,
  }, [], { actions: [{ id: "sendMessage" }, { id: "selectFallback" }] }));

  widget.add(node("attachment-tray", "component-attachment-tray", {
    pending, removeAttachment,
  }, [], { actions: [{ id: "removeAttachment" }] }));

  widget.add(node("composer", "section-composer", {
    fileRef, audioRef, multiple, accept, afficherPJ, afficherMicro, addFiles,
    placeholder, draft, setDraft, statusFinalisee, typing, pending, submitMessage,
  }, [], { state: { draft }, actions: [{ id: "sendMessage" }, { id: "attachFile" }] }));

  widget.add(node("finish", "component-finish", {
    show: shownMessages.length > 0 && !statusFinalisee && voirFin,
    libelleTerminer, actions,
  }, [], { actions: [{ id: "finish" }] }));

  return experience;
}
