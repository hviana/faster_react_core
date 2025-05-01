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
  // Optional debounce delay in milliseconds
  useDebounce?: number;
}

const executePostInnerHTMLScriptsTags = (el: any) => {
  Array.from(el.querySelectorAll("script")).forEach((oldScriptEl: any) => {
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
        `The selector ${params.elSelector} on route ${params.path} did not find any elements. Examples: #myID, .myCLass, #myID .Myclass, etc.`,
      );
    }
    if (params.disableSSR) {
      const resolvedUrl = new URL(params.path, globalThis.location.origin);
      const componentPath = resolvedUrl.pathname.slice("/components/".length);
      const queryParams = Object.fromEntries(resolvedUrl.searchParams);
      data = {...(data || {}), ...queryParams};
      //@ts-ignore
      if (!(componentPath in globalThis.frontMap)) {
        throw new Error(`Component ${params.path} was not found.`);
      }
      const component = createElement(
        //@ts-ignore
        globalThis.frontMap[componentPath],
        data,
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
        } catch (err) {
          console.log(err);
        }
      }
      if (params.endLoad) {
        await params.endLoad();
      }
    } catch (err) {
      console.log(err);
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
          } catch (err) {
            console.log(err);
          }
        }
        if (params.endLoad) {
          await params.endLoad();
        }
      } catch (err) {
        console.log(err);
      }
      console.log(e);
    }
  }
};

// Internal getJSON logic (without debounce)
const _getJSONInternal = async (
  params: Route,
): Promise<JSONValue | undefined> => {
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
      for (const hName in params.headers) {
        headers.append(hName, params.headers[hName]);
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
        await params.onError(e as Error);
      }
      if (params.endLoad) {
        await params.endLoad();
      }
    } catch (err) {
      console.log(err);
    }
    console.log(e);
    throw e;
  }
};

// Global Map for debouncing getJSON calls (keyed by canonical pathname)
const getJSONDebounceMap = new Map<
  string,
  {
    timer: ReturnType<typeof setTimeout>;
    promise: Promise<JSONValue | undefined>;
    resolve: (value: JSONValue | undefined) => void;
    reject: (error: any) => void;
  }
>();

const getJSON = async (params: Route): Promise<JSONValue | undefined> => {
  //@ts-ignore
  if (typeof document === "undefined") {
    return undefined;
  }
  if (params.useDebounce) {
    const resolvedUrl = new URL(params.path, globalThis.location.origin);
    const key = `getJSON:${resolvedUrl.pathname}`;
    const existing = getJSONDebounceMap.get(key);
    if (existing) {
      clearTimeout(existing.timer);
      existing.timer = setTimeout(async () => {
        try {
          const result = await _getJSONInternal(params);
          existing.resolve(result);
        } catch (error) {
          existing.reject(error);
        } finally {
          getJSONDebounceMap.delete(key);
        }
      }, params.useDebounce);
      return existing.promise;
    } else {
      let resolveFunction: (value: JSONValue | undefined) => void;
      let rejectFunction: (error: any) => void;
      const deferredPromise = new Promise<JSONValue | undefined>(
        (resolve, reject) => {
          resolveFunction = resolve;
          rejectFunction = reject;
        },
      );
      const timer = setTimeout(async () => {
        try {
          const result = await _getJSONInternal(params);
          resolveFunction(result);
        } catch (error) {
          rejectFunction(error);
        } finally {
          getJSONDebounceMap.delete(key);
        }
      }, params.useDebounce);
      getJSONDebounceMap.set(key, {
        timer,
        promise: deferredPromise,
        resolve: resolveFunction!,
        reject: rejectFunction!,
      });
      return deferredPromise;
    }
  } else {
    return _getJSONInternal(params);
  }
};

// Global Map for debouncing route calls (keyed by canonical pathname)
const routeDebounceMap = new Map<
  string,
  {
    timer: ReturnType<typeof setTimeout>;
    promise: Promise<void>;
    resolve: () => void;
    reject: (error: any) => void;
  }
>();

const route = (params: Route): () => undefined | Promise<void> => {
  //@ts-ignore
  if (typeof document === "undefined") {
    return () => undefined;
  }
  // Ensure the path starts with "/"
  if (!params.path.startsWith("/")) {
    params.path = "/" + params.path;
  }
  // Use URL to get a canonical pathname key for both page and component routes.
  const resolvedUrl = new URL(params.path, globalThis.location.origin);
  const key = `route:${resolvedUrl.pathname}`;

  const executeFn = params.path.startsWith("/components")
    ? () => componentRoute(params)
    : () => pageRoute(params);

  if (params.useDebounce) {
    return () => {
      const existing = routeDebounceMap.get(key);
      if (existing) {
        clearTimeout(existing.timer);
        existing.timer = setTimeout(async () => {
          try {
            await executeFn();
            existing.resolve();
          } catch (err) {
            existing.reject(err);
          } finally {
            routeDebounceMap.delete(key);
          }
        }, params.useDebounce);
        return existing.promise;
      } else {
        let resolveFunction: () => void;
        let rejectFunction: (error: any) => void;
        const deferredPromise = new Promise<void>((resolve, reject) => {
          resolveFunction = resolve;
          rejectFunction = reject;
        });
        const timer = setTimeout(async () => {
          try {
            await executeFn();
            resolveFunction();
          } catch (err) {
            rejectFunction(err);
          } finally {
            routeDebounceMap.delete(key);
          }
        }, params.useDebounce);
        routeDebounceMap.set(key, {
          timer,
          promise: deferredPromise,
          resolve: resolveFunction!,
          reject: rejectFunction!,
        });
        return deferredPromise;
      }
    };
  } else {
    return executeFn;
  }
};

export { getJSON, type Route, route };
