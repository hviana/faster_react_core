import { renderToReadableStream } from "react-dom/server";
function Page({ frameworkProps, page }: any) {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" type="image/x-icon" href="/static/favicon.ico" />
        <title>{frameworkProps.title}</title>
      </head>
      <body>
        <script src="/app.js"></script>
        <link rel="stylesheet" href="/app.css"></link>
        {page}
      </body>
    </html>
  );
}

export async function getStream(
  props: Record<any, any>,
  frameworkProps: Record<any, any>,
  Pagetsx: any,
) {
  return await renderToReadableStream(
    <Page
      frameworkProps={frameworkProps}
      page={
        <div id="page" className={`react-page ${Pagetsx.name}`}>
          <Pagetsx {...props} />
          <script>
            {`document.addEventListener(\`DOMContentLoaded\`, function (event) {
              startHydrate(\`${Pagetsx.name}\`, \`#page\`, JSON.parse(decodeURIComponent(\`${
              encodeURIComponent(JSON.stringify(props))
            }\`)))});`}
          </script>
          {frameworkProps.dev
            ? (
              <script>
                {`document.addEventListener(\`DOMContentLoaded\`, function (event) {
                    starDevTools()
                });`}
              </script>
            )
            : <></>}
        </div>
      }
    />,
  );
}
