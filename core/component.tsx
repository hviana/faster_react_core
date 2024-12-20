import { renderToReadableStream } from "react-dom/server";

const getComponentStream = async (
  props: Record<any, any>,
  Componentsx: any,
  extra: Record<any, any>,
) => {
  const id = "c" + crypto.randomUUID(); //fix document.querySelector with "c" +
  return await renderToReadableStream(
    <div
      id={id}
      className={`react-component-wrapper ${extra.componentClass}`}
      suppressHydrationWarning
    >
      <Componentsx {...props} />
      <script>
        {`startHydrate(\`${Componentsx.name}\`, \`#${id}\`, JSON.parse(decodeURIComponent(\`${
          encodeURIComponent(JSON.stringify(props))
        }\`)));`}
      </script>
    </div>,
  );
};
export { getComponentStream };