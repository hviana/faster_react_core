import { hydrateRoot } from "react-dom/client";
import { createElement } from "react";
globalThis.startHydrate = (reactComponent, elSelector, props) => {
  hydrateRoot(
    document.querySelector(elSelector),
    createElement(
      components[reactComponent],
      props,
    ),
  );
  globalThis.starDevTools = () => {
    setInterval(async () => {
      const hasChange = await (await fetch("/has_change")).json();
      if (hasChange) {
        globalThis.location.reload();
      }
    }, 1000);
  };
};
