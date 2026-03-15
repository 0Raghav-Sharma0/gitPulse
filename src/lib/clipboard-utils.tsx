import ReactDOMServer from "react-dom/server";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function renderMarkdownToHtml(markdown: string): string {
    return ReactDOMServer.renderToStaticMarkup(
        <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
                img: ({ src, alt, ...props }) => {
                    if (!src) return null;
                    // ReactDOMServer renders plain HTML, so next/image is not usable here.
                    // eslint-disable-next-line @next/next/no-img-element
                    return <img src={src} alt={alt || ""} {...props} />;
                },
            }}
        >
            {markdown}
        </ReactMarkdown>
    );
}
