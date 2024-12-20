import { createElement } from "react";
import { createRoot } from "react-dom/client";
import type { JSONValue } from "@helpers/types.ts";
interface Route {
  headers?: Record<string, string>;
  content?:
    | Record<any, any>
    | (() => Record<any, any> | Promise<Record<any, any>>);
  path: string;
  startLoad?: () => void | Promise<void>;
  endLoad?: () => void | Promise<void>;
  onError?: (e: Error) => void | Promise<void>;
  disableSSR?: boolean;
  elSelector?: string;
  method?: string;
}
const executePostInnerHTMLScriptsTags = (el: any) => {
  Array.from(el.querySelectorAll("script"))
    .forEach((oldScriptEl: any) => {
      //@ts-ignore
      const newScriptEl = document.createElement("script");
      Array.from(oldScriptEl.attributes).forEach((attr) => {
        //@ts-ignore
        newScriptEl.setAttribute(attr.name, attr.value);
      });
      //@ts-ignore
      const scriptText = document.createTextNode(oldScriptEl.innerHTML);
      newScriptEl.appendChild(scriptText);
      oldScriptEl.parentNode.replaceChild(newScriptEl, oldScriptEl);
    });
};
const componentRoute = async (params: Route) => {
  if (!params.elSelector) {
    throw new Error(
      `The ${params.path} component route needs a DOM element selector like #myID, .myCLass, #myID .Myclass, etc.`,
    );
  }
  if (params.startLoad) {
    await params.startLoad();
  }
  let data: Record<any, any> = {};
  try {
    if (typeof params.content === "function") {
      data = await params.content();
    } else {
      data = params.content as any;
    }
    const headers = new Headers();
    if (params.headers) {
      if (Object.keys(params.headers).length > 0) {
        for (const hName in params.headers) {
          headers.append(hName, params.headers[hName]);
        }
      }
    }
    //@ts-ignore
    const el = document.querySelector(params.elSelector);
    if (!el) {
      throw new Error(
        `The selector ${params.elSelector} on route ${params.path} did not find any elements. Examples of selectors: #myID, .myCLass, #myID .Myclass, etc.`,
      );
    }
    if (params.disableSSR) {
      const componentPath = params.path.slice("/components/".length);
      //@ts-ignore
      if (!(componentPath in globalThis.frontMap)) {
        throw new Error(`Component ${params.path} was not found.`);
      }
      const component = createElement( //@ts-ignore
        globalThis.frontMap[componentPath],
        data || {},
      );
      //@ts-ignore
      const compomentWrapper = document.createElement("div");
      compomentWrapper.setAttribute(
        "class",
        `react-component react-component-${componentPath.replaceAll("/", "-")}`,
      );
      el.replaceChildren();
      el.appendChild(compomentWrapper);
      const root = createRoot(compomentWrapper);
      root.render(component);
    } else {
      let fetchParams: any = {};
      if (!params.content) {
        fetchParams = {
          method: "GET",
          headers: headers,
        };
      } else {
        fetchParams = {
          method: "POST",
          headers: headers,
          body: JSON.stringify(data),
        };
        headers.append("Content-Type", "application/json");
      }
      const res = await fetch(params.path, fetchParams);
      const text = await res.text();
      el.innerHTML = text;
      executePostInnerHTMLScriptsTags(el);
    }

    if (params.endLoad) {
      await params.endLoad();
    }
  } catch (e) {
    try {
      if (params.onError) {
        try {
          await params.onError(e as Error);
        } catch (e) {
          console.log(e);
        }
      }
      if (params.endLoad) {
        await params.endLoad();
      }
    } catch (e) {
      console.log(e);
    }
    console.log(e);
  }
};
const pageRoute = async (params: Route) => {
  if (params.startLoad) {
    await params.startLoad();
  }
  if (params.headers) {
    if (Object.keys(params.headers).length > 0) {
      const url = new URL(globalThis.location.origin + params.path);
      for (const hName in params.headers) {
        url.searchParams.append(hName, params.headers[hName]);
      }
      params.path = url.toString();
    }
  }
  if (!params.content) {
    globalThis.location.href = params.path;
  } else {
    let data: Record<any, any> = {};
    try {
      if (typeof params.content === "function") {
        data = await params.content();
      } else {
        data = params.content;
      }
      //@ts-ignore
      const form = document.createElement("form");
      form.setAttribute("action", params.path);
      form.setAttribute("method", "post");
      form.style.display = "none";
      //@ts-ignore
      const input = document.createElement("input");
      input.type = "text";
      input.name = "faster_react_route_helper";
      input.value = JSON.stringify(data);
      form.appendChild(input);
      //@ts-ignore
      document.body.appendChild(form);
      form.submit();
      form.remove();
      if (params.endLoad) {
        await params.endLoad();
      }
    } catch (e) {
      try {
        if (params.onError) {
          try {
            await params.onError(e as Error);
          } catch (e) {
            console.log(e);
          }
        }
        if (params.endLoad) {
          await params.endLoad();
        }
      } catch (e) {
        console.log(e);
      }
      console.log(e);
    }
  }
};
const getJSON = async (params: Route): Promise<JSONValue | undefined> => {
  //@ts-ignore
  if (typeof document === "undefined") {
    return undefined;
  }
  if (params.startLoad) {
    await params.startLoad();
  }
  let data: Record<any, any> = {};
  try {
    if (typeof params.content === "function") {
      data = await params.content();
    } else {
      data = params.content as any;
    }
    const headers = new Headers();
    if (params.headers) {
      if (Object.keys(params.headers).length > 0) {
        for (const hName in params.headers) {
          headers.append(hName, params.headers[hName]);
        }
      }
    }
    let fetchParams: any = {};
    if (!params.content) {
      fetchParams = {
        method: "GET",
        headers: headers,
      };
    } else {
      fetchParams = {
        method: "POST",
        headers: headers,
        body: JSON.stringify(data),
      };
      headers.append("Content-Type", "application/json");
    }
    if (params.method) {
      fetchParams.method = params.method.toUpperCase();
    }
    const res = await fetch(params.path, fetchParams);
    const json = await res.json();
    if (params.endLoad) {
      await params.endLoad();
    }
    return json;
  } catch (e) {
    try {
      if (params.onError) {
        try {
          await params.onError(e as Error);
        } catch (e) {
          console.log(e);
        }
      }
      if (params.endLoad) {
        await params.endLoad();
      }
    } catch (e) {
      console.log(e);
    }
    console.log(e);
  }
};
const route = (params: Route): () => undefined | Promise<void> => {
  //@ts-ignore
  if (typeof document === "undefined") {
    return () => undefined;
  }
  if (!params.path.startsWith("/")) {
    params.path = "/" + params.path;
  }
  if (params.path.startsWith("/components")) {
    return () => componentRoute(params);
  } else {
    return () => pageRoute(params);
  }
};
export { getJSON, type Route, route };
