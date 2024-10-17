import { renderToReadableStream } from "react-dom/server";

export async function getComponentStream(
  props: Record<any, any>,
  Componentsx: any,
) {
  const id = "c" + crypto.randomUUID(); //fix document.querySelector with "c" +
  return await renderToReadableStream(
    <div id={id} className={`react-component ${Componentsx.name}`}>
      <Componentsx {...props} />
      <script>
        {`startHydrate(\`${Componentsx.name}\`, \`#${id}\`, JSON.parse(decodeURIComponent(\`${
          encodeURIComponent(JSON.stringify(props))
        }\`)));`}
      </script>
    </div>,
  );
}
