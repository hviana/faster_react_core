/*
Created by: Henrique Emanoel Viana
Githu: https://github.com/hviana
Page: https://sites.google.com/view/henriqueviana
cel: +55 (41) 99999-4664
*/
import {
  type Context,
  type NextFunc,
  type RouteFn,
  Server,
  serveStatic,
} from "faster";
import { BackendComponent } from "./helpers/backend/types.ts";
import { walk } from "walk";
import * as path from "path";
import { getStream } from "./core/page.tsx";
import { getComponentStream } from "./core/component.tsx";
import { denoPlugins } from "esbuild-deno-loader";
import FrameworkErrorPage from "./core/error_page.tsx";
import * as b64 from "b64";
import { DenoKvFs } from "deno_kv_fs";

interface ErrorProps {
  dev: boolean;
  msg: string;
  stack: string;
}

function windowsPathFixer(): any {
  return {
    name: "fix-windows",
    setup(build: any) {
      if (Deno.build.os === "windows") {
        build.onResolve({ filter: /\.*/ }, (args: any) => {
          if (args.path.startsWith("\\")) {
            const normalized = path.resolve(args.path);
            return {
              path: normalized,
            };
          }
        });
      }
    },
  };
}

class Builder {
  //@ts-ignore
  server: Server = new Server();
  options: any;
  denoJson: any;
  path: string;
  denoJsonPath: string;
  encoder = new TextEncoder();
  decoder = new TextDecoder();
  backendComponents: { [key: string]: BackendComponent } = {};
  frontendComponents: { [key: string]: Function } = {};
  registeredRoutes: { [key: string]: Function } = {};
  cache: { [key: string]: Uint8Array } = {};
  esbuild: any = null;
  isServerless: boolean = false;
  isInDenoDeploy: boolean = false;
  importFromRoot: Function;
  //@ts-ignore
  constructor(options: any, denoJson: any, importFromRoot) {
    this.importFromRoot = importFromRoot;
    this.options = options;
    this.denoJson = denoJson;
    this.path = Deno.cwd();
    this.denoJsonPath = path.join(this.path, "deno.json");
    this.init();
  }
  async initKvFromUrl() {
    if (this.options.framework.kv["DENO_KV_ACCESS_TOKEN"]) {
      Deno.env.set(
        "DENO_KV_ACCESS_TOKEN",
        this.options.framework.kv["DENO_KV_ACCESS_TOKEN"],
      );
    }
    const kv = await Deno.openKv(this.options.framework.kv.pathOrUrl);
    Server.setKv(kv);
  }
  async init() {
    this.isInDenoDeploy = Deno.env.get("DENO_DEPLOYMENT_ID") !== undefined;
    this.isServerless = this.isInDenoDeploy ||
      this.options.framework.serverless;
    if (this.isServerless) { //is in deno deploy
      this.esbuild = await import("esbuild-portable");
      await this.esbuild.initialize({ worker: false });
      if (this.options.framework.kv.pathOrUrl) {
        await this.initKvFromUrl();
      } else {
        if (this.isInDenoDeploy) {
          const kv = await Deno.openKv();
          Server.setKv(kv);
        }
      }
    } else {
      this.esbuild = await import("esbuild");
      await this.esbuild.initialize({});
      if (this.options.framework.kv.pathOrUrl) {
        await this.initKvFromUrl();
      } else {
        const kv = await Deno.openKv();
        Server.setKv(kv);
      }
    }
    await this.initBuilds();
    await this.registerBackendComponents();
    await this.initRoutes();
    this.startServer();
    this.watchHRM();
  }
  async initRoutes() {
    try {
      this.registerCoreRoutes();
      await this.registerCustomRouters();
    } catch (e) {
      console.error("Error registering routes");
      console.log(e);
    }
  }
  async initBuilds() {
    await this.buildfrontendComponents();
    await this.buildCSS();
  }
  getFixedPath(frameworkFile: string) {
    return frameworkFile.replaceAll(path.SEPARATOR, "/"); //stardardize paths
  }
  frontendComponentFile(urlParam: string) {
    return `app/frontend/components/${urlParam}.tsx`;
  }
  backendComponentFile(urlParam: string) {
    return `app/backend/components/${urlParam}.ts`;
  }
  async middlewareHandler(
    fns: RouteFn[],
    fnIndex: number,
    ctx: Context,
  ): Promise<void> {
    if (fns[fnIndex] !== undefined) {
      await fns[fnIndex](
        ctx,
        async () => await this.middlewareHandler(fns, fnIndex + 1, ctx),
      );
    }
  }
  async getPageOrComponentStream(
    ctx: Context,
    urlParam: string,
    method: "get" | "post",
    type: "page" | "component",
  ) {
    try {
      const pageOrComponentFile = this.frontendComponentFile(urlParam);
      if (!(pageOrComponentFile in this.frontendComponents)) {
        ctx.res.status = 404;
        return;
      }
      const backendFile = this.backendComponentFile(urlParam);
      if (this.backendComponents[backendFile]) {
        if (this.backendComponents[backendFile].before) {
          if (this.backendComponents[backendFile].before.length > 0) {
            await this.middlewareHandler(
              this.backendComponents[backendFile].before,
              0,
              ctx,
            );
            if (!ctx.extra.finishedFasterReactPageMiddlewares) {
              return;
            }
          }
        }
      }
      let props: any = {};
      if (method == "get") {
        props = this.getGETProps(ctx);
      } else if (method == "post") {
        props = await this.getPOSTProps(ctx);
      }
      if (this.backendComponents[backendFile]) {
        if (this.backendComponents[backendFile].after) {
          await this.backendComponents[backendFile].after(props);
        }
      }
      if (type == "page") {
        return await getStream(
          props,
          this.options.framework,
          this
            .frontendComponents[pageOrComponentFile],
        );
      } else if (type == "component") {
        return await getComponentStream(
          props,
          this
            .frontendComponents[pageOrComponentFile],
        );
      }
    } catch (e) {
      return await this.getErrorPage(e, type);
    }
  }
  async getErrorPage(e: any, type: "page" | "component") {
    const errorProps: ErrorProps = {
      dev: this.options.framework.dev,
      msg: (e.message || JSON.stringify(e)),
      stack: e.stack,
    };
    if (type == "page") {
      return await getStream(
        errorProps,
        this.options.framework,
        FrameworkErrorPage,
      );
    } else if (type == "component") {
      return await getComponentStream(
        errorProps,
        FrameworkErrorPage,
      );
    }
  }
  startServer() {
    this.server.listen(this.options.serverOptions);
    if (this.options.framework.dev) {
      this.server.acceptOrRejectSocketConn = async (ctx: Context) => {
        return JSON.stringify(ctx.info.remoteAddr); //return ID
      };
    }
  }
  watchHRM() {
    addEventListener("hmr", async (e) => {
      //@ts-ignore
      const path = e.detail.path;
      if (
        path.includes("/backend/api")
      ) {
        await this.registerCustomRouters();
      }
      if (
        path.includes("/backend/components")
      ) {
        await this.registerBackendComponents();
      }
      if (
        path.includes("/frontend/css")
      ) {
        await this.buildCSS();
      }
      if (
        path.includes("/frontend/components") ||
        path.includes("/frontend/files")
      ) {
        await this.buildfrontendComponents();
      }
      this.refresh();
    });
  }
  getGETProps(ctx: Context): Record<any, any> {
    return Object.fromEntries(ctx.url.searchParams);
  }
  async getPOSTProps(ctx: Context): Promise<Record<any, any>> {
    let data: any = {};
    try {
      if (ctx.req.headers.get("Content-Type") == "application/json") {
        data = await ctx.req.json();
      } else {
        const formData = await ctx.req.formData();
        if (formData.has("faster_react_route_helper")) {
          data = JSON.parse(
            formData.get("faster_react_route_helper") as string,
          );
        } else {
          data = Object.fromEntries(
            Array.from(formData.keys()).map(
              (key) => [
                key,
                formData.getAll(key).length > 1
                  ? formData.getAll(key)
                  : formData.get(key),
              ],
            ),
          );
        }
      }
    } catch (e) {
      console.log(e);
    }
    return {
      ...Object.fromEntries(ctx.url.searchParams),
      ...data,
    };
  }
  registerCoreRoutes() {
    this.server.get(
      "/",
      async (ctx: Context, next: NextFunc) => {
        ctx.res.headers.append("Content-Type", "text/html; charset=utf-8");
        ctx.res.body = await this.getPageOrComponentStream(
          ctx,
          "index",
          "get",
          "page",
        );
        await next();
      },
    );
    this.server.get(
      "/pages/*",
      async (ctx: Context, next: NextFunc) => {
        ctx.res.headers.append("Content-Type", "text/html; charset=utf-8");
        ctx.res.body = await this.getPageOrComponentStream(
          ctx,
          ctx.params.wild,
          "get",
          "page",
        );
        await next();
      },
    );
    this.server.get(
      "/components/*",
      async (ctx: Context, next: NextFunc) => {
        ctx.res.headers.append("Content-Type", "text/html; charset=utf-8");
        ctx.res.body = await this.getPageOrComponentStream(
          ctx,
          ctx.params.wild,
          "get",
          "component",
        );
        await next();
      },
    );
    this.server.post(
      "/",
      async (ctx: Context, next: NextFunc) => {
        ctx.res.headers.append("Content-Type", "text/html; charset=utf-8");
        ctx.res.body = await this.getPageOrComponentStream(
          ctx,
          "index",
          "post",
          "page",
        );
        await next();
      },
    );
    this.server.post(
      "/pages/*",
      async (ctx: Context, next: NextFunc) => {
        ctx.res.headers.append("Content-Type", "text/html; charset=utf-8");
        ctx.res.body = await this.getPageOrComponentStream(
          ctx,
          ctx.params.wild,
          "post",
          "page",
        );
        await next();
      },
    );
    this.server.post(
      "/components/*",
      async (ctx: Context, next: NextFunc) => {
        ctx.res.headers.append("Content-Type", "text/html; charset=utf-8");
        ctx.res.body = await this.getPageOrComponentStream(
          ctx,
          ctx.params.wild,
          "post",
          "component",
        );
        await next();
      },
    );
    this.server.get(
      "/app.css",
      async (ctx: Context, next: NextFunc) => {
        ctx.res.headers.append("Content-Type", "text/css; charset=utf-8");
        ctx.res.body = this.cache["app.css"];
        await next();
      },
    );
    this.server.get(
      "/app.js",
      async (ctx: Context, next: NextFunc) => {
        ctx.res.headers.append(
          "Content-Type",
          "text/javascript; charset=utf-8",
        );
        ctx.res.body = this.cache["app.js"];
        await next();
      },
    );
    this.server.get(
      "/static/*",
      serveStatic("app/static"),
    );
  }

  async registerCustomRouters() {
    const loaded = new Set(Object.keys(this.registeredRoutes));
    const existing = new Set();
    for await (
      const dirEntry of walk("app/backend/api", {
        exts: ["ts"],
      })
    ) {
      const fixedPath = this.getFixedPath(dirEntry.path);
      existing.add(fixedPath);
      try {
        if (!(fixedPath in this.registeredRoutes)) {
          this.registeredRoutes[fixedPath] =
            (await this.importFromRoot(fixedPath)).default;
          await this.registeredRoutes[fixedPath](this.server);
        }
      } catch (e) {
        console.error(`Error load ${fixedPath}`);
        console.log(e);
      }
    }
    for (const path of loaded) {
      if (!existing.has(path)) {
        delete this.registeredRoutes[path];
      }
    }
    console.log("Registered routes");
  }
  async registerBackendComponents() {
    try {
      const files: any[] = [];
      for await (
        const dirEntry of walk("app/backend/components", {
          exts: ["ts"],
        })
      ) {
        files.push(dirEntry.path);
      }
      const loaded = new Set(Object.keys(this.backendComponents));
      const existing = new Set();
      for (const f of files) {
        const fixedPath = this.getFixedPath(f);
        existing.add(fixedPath);
        try {
          if (!(fixedPath in this.backendComponents)) {
            this.backendComponents[fixedPath] = (await this.importFromRoot(
              fixedPath,
            )).default;
            if (this.backendComponents[fixedPath].before) {
              if (this.backendComponents[fixedPath].before.length > 0) {
                this.backendComponents[fixedPath].before.push(
                  async (ctx: Context, next: NextFunc) => {
                    ctx.extra.finishedFasterReactPageMiddlewares = true;
                  },
                );
              }
            }
          }
        } catch (e) {
          console.error(`Error load ${fixedPath}`);
          console.log(e);
        }
      }
      for (const path of loaded) {
        if (!existing.has(path)) {
          delete this.backendComponents[path];
        }
      }
      console.log("Registered app/backend/components functions");
    } catch (e) {
      console.error("Error registered app/backend/components functions");
      console.log(e);
    }
  }
  async getBuildVersion(files: any[]) {
    let version = "";
    for (const f of files) {
      const mtime = (await Deno.stat(f)).mtime;
      let time: number = Date.now();
      if (mtime) {
        time = mtime.getTime();
      }
      version += `${f}${time}`;
    }
    version += this.options.framework.dev.toString();
    return version;
  }
  async buildfrontendComponents() {
    try {
      const files: any[] = [];
      const scriptFiles: any[] = [];
      for await (
        const dirEntry of walk("app/frontend/components", {
          exts: ["tsx"],
        })
      ) {
        files.push(dirEntry.path);
      }
      for await (
        const dirEntry of walk("app/frontend/files", {
          exts: ["ts", "js"],
        })
      ) {
        scriptFiles.push(dirEntry.path);
      }
      let allImports = "const components = {};\n";
      allImports += "globalThis.frontMap = {};\n";
      const componentsNames: any[] = [];
      const loaded = new Set(Object.keys(this.frontendComponents));
      const existing = new Set();
      for (const f of files) {
        const fixedPath = this.getFixedPath(f);
        existing.add(fixedPath);
        try {
          if (!(fixedPath in this.frontendComponents)) {
            this.frontendComponents[fixedPath] = (await this.importFromRoot(
              fixedPath,
            )).default;
          }
          componentsNames.push(this.frontendComponents[fixedPath].name);
          allImports += `import ${
            this.frontendComponents[fixedPath].name
          } from "${path.toFileUrl(path.join(this.path, f))}";\n`;
          allImports += `components['${
            this.frontendComponents[fixedPath].name
          }'] = ${this.frontendComponents[fixedPath].name};\n`;
          allImports += `globalThis.frontMap['${fixedPath}'] = ${
            this.frontendComponents[fixedPath].name
          };\n`;
        } catch (e) {
          console.error(`Error load ${fixedPath}`);
          console.log(e);
        }
      }
      for (const path of loaded) {
        if (!existing.has(path)) {
          delete this.frontendComponents[path];
        }
      }
      let needsCompile = true;
      let version = "";
      if (Server.kvFs) {
        version = await this.getBuildVersion([...files, ...scriptFiles]);
        const versionFile = await Server.kvFs.read({
          path: ["build", "js_version"],
        });
        const jsFile = await Server.kvFs.read({ path: ["build", "app.js"] });
        if (versionFile && jsFile) {
          const existingVersion = this.decoder.decode( //@ts-ignore
            await DenoKvFs.readStream(versionFile.content),
          );
          if (existingVersion == version) {
            needsCompile = false;
          }
        }
        if (!needsCompile) {
          this.cache["app.js"] = await DenoKvFs.readStream( //@ts-ignore
            jsFile.content,
          );
          console.log("Loaded frontend resources");
          return;
        }
      }
      let dataURL = "data:application/typescript;base64,";
      dataURL += b64.encodeBase64(
        allImports +
          await (await fetch(new URL("core/frontend_init.js", import.meta.url)))
            .text(),
      );
      const res = await this.esbuild.build({
        plugins: [
          windowsPathFixer(),
          ...denoPlugins({
            configPath: this.denoJsonPath,
          }),
        ],
        entryPoints: [dataURL],
        jsxDev: this.options.framework.dev,
        bundle: true,
        treeShaking: true,
        minify: this.options.framework.dev ? false : true,
        absWorkingDir: this.path,
        jsx: "automatic",
        platform: "browser",
        charset: "utf8",
        write: false,
      });
      await this.esbuild.stop();
      const code = res.outputFiles[0].contents;
      if (Server.kvFs) {
        await Server.kvFs.save({ path: ["build", "app.js"], content: code });
        await Server.kvFs.save({
          path: ["build", "js_version"],
          content: this.encoder.encode(version),
        });
      }
      this.cache["app.js"] = code;
      console.log("Built frontend resources");
    } catch (e) {
      console.error("Error building frontend resources");
      console.log(e);
    }
  }
  async buildCSS() {
    try {
      const cssFiles: any[] = [];
      for await (
        const dirEntry of walk("app/frontend/css", { exts: ["css"] })
      ) {
        cssFiles.push(dirEntry.path);
      }
      let needsCompile = true;
      let version = "";
      if (Server.kvFs) {
        version = await this.getBuildVersion(cssFiles);
        const versionFile = await Server.kvFs.read({
          path: ["build", "css_version"],
        });
        const cssFile = await Server.kvFs.read({ path: ["build", "app.css"] });
        if (versionFile && cssFile) {
          const existingVersion = this.decoder.decode( //@ts-ignore
            await DenoKvFs.readStream(versionFile.content),
          );
          if (existingVersion == version) {
            needsCompile = false;
          }
        }
        if (!needsCompile) {
          this.cache["app.css"] = await DenoKvFs.readStream( //@ts-ignore
            cssFile.content,
          );
          console.log("Loaded frontend CSS files.");
          return;
        }
      }

      let allCss = "";
      for (const f of cssFiles) {
        allCss += `/* ${f} */\n`;
        allCss += await Deno.readTextFile(f);
      }
      if (this.options.framework.dev) {
        const encoded = this.encoder.encode(allCss);
        if (Server.kvFs) {
          await Server.kvFs.save({
            path: ["build", "app.css"],
            content: encoded,
          });
          await Server.kvFs.save({
            path: ["build", "css_version"],
            content: this.encoder.encode(version),
          });
        }
        this.cache["app.css"] = encoded;
      } else {
        const res = await this.esbuild.build({
          stdin: {
            contents: allCss,
            loader: "css",
          },
          bundle: true,
          treeShaking: true,
          minify: this.options.framework.dev ? false : true,
          absWorkingDir: this.path,
          platform: "browser",
          charset: "utf8",
          write: false,
        });
        await this.esbuild.stop();
        const code = res.outputFiles[0].contents;
        if (Server.kvFs) {
          await Server.kvFs.save({ path: ["build", "app.css"], content: code });
          await Server.kvFs.save({
            path: ["build", "css_version"],
            content: this.encoder.encode(version),
          });
        }
        this.cache["app.css"] = code;
      }
      console.log("Built frontend CSS files");
    } catch (e) {
      console.error("Error compiling frontend CSS files");
      console.log(e);
    }
  }

  refresh() {
    if (this.options.framework.dev) {
      for (const [soketId, socket] of this.server.openedSockets) {
        try {
          socket.send("refresh");
        } catch {
          //
        }
      }
    }
  }
}
export default Builder;
