import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// 只读 Markdown 渲染（对话气泡 / 沟通全文抽屉共用；GFM 表格支持）
export function MarkdownContent({ text }: { text: string }) {
  return (
    <div
      className="leading-relaxed
        [&>*:first-child]:mt-0 [&>*:last-child]:mb-0
        [&_h1]:text-base [&_h1]:font-medium [&_h1]:mt-4 [&_h1]:mb-2
        [&_h2]:text-sm [&_h2]:font-medium [&_h2]:mt-4 [&_h2]:mb-1.5
        [&_h3]:text-sm [&_h3]:font-medium [&_h3]:mt-3 [&_h3]:mb-1
        [&_p]:my-2 [&_ul]:my-2 [&_ul]:pl-5 [&_ul]:list-disc [&_ol]:my-2 [&_ol]:pl-5 [&_ol]:list-decimal
        [&_li]:my-0.5 [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground
        [&_code]:font-mono [&_code]:text-xs [&_code]:bg-[#030213]/5 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded
        [&_pre]:bg-[#f6f7f9] [&_pre]:border [&_pre]:border-border [&_pre]:rounded-lg [&_pre]:p-3 [&_pre]:overflow-x-auto [&_pre]:my-2 [&_pre_code]:bg-transparent [&_pre_code]:p-0
        [&_table]:text-xs [&_table]:my-2 [&_table]:block [&_table]:overflow-x-auto [&_th]:border [&_th]:border-border [&_th]:px-2 [&_th]:py-1 [&_th]:bg-[#f6f7f9] [&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1
        [&_a]:underline [&_hr]:my-4 [&_hr]:border-border"
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
    </div>
  );
}
