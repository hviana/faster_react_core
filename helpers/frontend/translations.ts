import i18next from "i18next";
import FrontExporter from "../../front_exporter.ts";
let detectedLang = "en";

//@ts-ignore
if (typeof document !== "undefined") {
  //@ts-ignore
  detectedLang = navigator.language || navigator.userLanguage;
}

let initialized: boolean = false;

const useTranslation = (options: any = {}): any => {
  options.ns = ["translation"];
  if (!initialized) {
    initialized = true;
    i18next.init({
      ...{
        lng: detectedLang,
        fallbackLng: "en",
        //@ts-ignore
        resources: (typeof document === "undefined")
          ? FrontExporter.translations
          //@ts-ignore
          : globalThis.translations,
        interpolation: { escapeValue: false },
      },
      ...options,
    });
  }
  return i18next.t;
};

export { detectedLang, useTranslation };
