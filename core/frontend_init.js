import { hydrateRoot } from "react-dom/client";
import { createElement } from "react";
globalThis.startHydrate = (reactComponent, elSelector, props) => {
  hydrateRoot(
    document.querySelector(elSelector),
    createElement(
      components[reactComponent],
      props,
    ),
    {
      onRecoverableError: (error, errInfo) => {
        return; //supress hydration errors
      },
    },
  );
};
globalThis.starDevTools = () => {
  let restart = false;
  const refresh = async () => {
    try {
      const hasChange = await (await fetch("/has_change")).json();
      if (hasChange || restart) {
        restart = false;
        globalThis.location.reload();
      }
    } catch (e) {
      restart = true;
      console.error(
        "These request errors are because you are in developer mode and there is no connection with the server.",
      );
      console.log(e);
    }
  };
  const refreshJob = () => {
    setTimeout(async () => {
      await refresh();
      refreshJob();
    }, 1000);
  };
  refreshJob();
};
