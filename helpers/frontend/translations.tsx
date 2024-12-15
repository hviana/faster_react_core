import i18next from "i18next";
import HttpBackend, { HttpBackendOptions } from "i18next-http-backend";
import FrontExporter from "../../front_exporter.ts";
import React, { useEffect, useState } from "react";

let detectedLang = "en";

//@ts-ignore
if (typeof document !== "undefined") {
  //@ts-ignore
  detectedLang = navigator.language || navigator.userLanguage;
}

const instances: any = {};

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
  const langsKey = options.lng.join("||");
  const nsKey = options.ns.join("||");
  if (instances[langsKey]) {
    if (instances[langsKey][nsKey]) {
      return instances[langsKey][nsKey];
    }
  }
  const instance: any = i18next.createInstance();
  if (!instances[langsKey]) {
    instances[langsKey] = {};
  }
  //@ts-ignore
  if (typeof document === "undefined") {
    instance.init({
      ...{
        resources: FrontExporter.translations,
        interpolation: { escapeValue: false },
      },
      ...options,
    });
    instances[langsKey][nsKey] = (props: any) => (
      <>{instance.t(props["text"], props)}</>
    );
  } else {
    const awaitInit = new Promise((resolve, reject) => {
      instance.use(HttpBackend).init({
        ...{
          fallbackLng: "en",
          interpolation: { escapeValue: false },
          backend: {
            loadPath: `/static/translations/{{lng}}/{{ns}}.json`,
            addPath: `/static/translations/{{lng}}/{{ns}}.json`,
          },
        },
        ...options,
      }, (err: any, t: any) => {
        resolve(true);
      });
    });
    instances[langsKey][nsKey] = (props: any) => {
      const [conditionMet, setConditionMet] = useState(false);
      useEffect(async () => {
        await awaitInit;
        setConditionMet(true);
      }, []);
      return (
        <>{conditionMet ? instance.t(props["text"], props) : props["text"]}</>
      );
    };
  }
  return instances[langsKey][nsKey];
};

export { detectedLang, useTranslation };
