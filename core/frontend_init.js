import { hydrateRoot } from "react-dom/client";
import { createElement } from "react";
globalThis.startHydrate = function (reactComponent, elSelector, props) {
  hydrateRoot(
    document.querySelector(elSelector),
    createElement(
      components[reactComponent],
      props,
    ),
  );
  globalThis.starDevTools = function () {
    let socket, reconnectionTimerId;
    const requestUrl = globalThis.location.href.replace("http", "ws");
    function refresh() {
      clearTimeout(reconnectionTimerId);
      reconnectionTimerId = setTimeout(() => {
        if (socket) {
          socket.close();
        }
        globalThis.location.reload();
      }, 1000);
    }
    function connect(forceRefresh) {
      if (socket) {
        socket.close();
      }
      socket = new WebSocket(requestUrl);
      socket.addEventListener("open", (event) => {
        if (forceRefresh) {
          refresh();
        }
      });
      socket.addEventListener("message", (event) => {
        if (event.data === "refresh") {
          refresh();
        }
      });
      socket.addEventListener("close", () => {
        clearTimeout(reconnectionTimerId);
        reconnectionTimerId = setTimeout(() => {
          connect(true);
        }, 1000);
      });
    }
    connect();
  };
};
