import i18next from "i18next";
import FrontExporter from "../../front_exporter.ts";
import React, { useEffect, useState } from "react";

let detectedLang = "en";

//@ts-ignore
if (typeof document !== "undefined") {
  //@ts-ignore
  detectedLang = navigator.language || navigator.userLanguage;
}

let initialized: any = undefined;

let t: any = undefined;

const useTranslation = (options: any = {}): any => {
  if (options.lng) {
    if (!Array.isArray(options.lng)) {
      options.lng = [options.lng];
    }
  } else {
    options.lng = [detectedLang];
  }
  if (options.ns) {
    if (!Array.isArray(options.ns)) {
      options.ns = [options.ns];
    }
  } else {
    options.ns = ["translation"];
  }
  //@ts-ignore
  if (typeof document === "undefined") {
    if (!initialized) {
      initialized = true;
      i18next.init({
        ...{
          resources: FrontExporter.translations,
          interpolation: { escapeValue: false },
        },
        ...options,
      });
    }
    if (!t) {
      t = (props: any) => <>{i18next.t(props["text"], props)}</>;
    }
    return t;
  } else {
    let awaitInit = new Promise((resolve, reject) => {
      resolve(true);
    });
    let awaitResources = new Promise((resolve, reject) => {
      resolve(true);
    });
    if (!initialized) {
      initialized = true;
      awaitInit = new Promise((resolve, reject) => {
        i18next.init({
          ...{
            partialBundledLanguages: true,
            ns: [],
            resources: {},
            interpolation: { escapeValue: false },
          },
          ...options,
        }, (err: any, t: any) => {
          resolve(true);
        });
      });
    }
    let needsResouce = false;
    awaitResources = new Promise((resolve, reject) => {
      for (let i = 0; i < options.lng.length; i++) {
        for (let j = 0; j < options.ns.length; j++) {
          const lng = options.lng[i];
          const ns = options.ns[j];
          if (!i18next.hasResourceBundle(lng, ns)) {
            needsResouce = true;
            try {
              fetch(
                `/static/translations/${encodeURIComponent(lng)}/${
                  encodeURIComponent(ns)
                }.json`,
              ).then((response) => response.json()).then((json) => {
                i18next.addResourceBundle(lng, ns, json);
                if (
                  (i == options.lng.length - 1) && (j == options.ns.length - 1)
                ) {
                  resolve(true);
                }
              });
            } catch (e) {
              console.log(e);
            }
          }
        }
      }
    });
    if (needsResouce || !t) {
      t = (props: any) => {
        const [conditionMet, setConditionMet] = useState(false);
        useEffect(async () => {
          await awaitInit;
          await awaitResources;
          setConditionMet(true);
        }, []);
        return (
          <>{conditionMet ? i18next.t(props["text"], props) : props["text"]}</>
        );
      };
    }
    return t;
  }
};

export { detectedLang, useTranslation };
