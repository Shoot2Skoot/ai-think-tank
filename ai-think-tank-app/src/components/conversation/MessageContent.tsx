import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { cn } from '@/lib/utils'

interface MessageContentProps {
  content: string
  mentions?: string[]
  className?: string
}

export const MessageContent: React.FC<MessageContentProps> = ({
  content,
  mentions = [],
  className
}) => {
  // Highlight @mentions in the content
  const highlightMentions = (text: string) => {
    if (mentions.length === 0) return text

    let highlighted = text
    mentions.forEach(mention => {
      // Escape special regex characters in the mention name
      const escapedMention = mention.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      // Match @mention including full names with spaces
      const regex = new RegExp(`(@${escapedMention})(?![A-Za-z])`, 'gi')
      highlighted = highlighted.replace(regex, '**$1**')
    })
    return highlighted
  }

  const processedContent = highlightMentions(content)

  return (
    <div className={cn('prose prose-sm max-w-none text-gray-100 prose-p:text-gray-100', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Custom code block rendering with syntax highlighting
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '')
            const language = match ? match[1] : ''

            if (!inline && language) {
              return (
                <SyntaxHighlighter
                  style={vscDarkPlus}
                  language={language}
                  PreTag="div"
                  className="rounded-md text-xs"
                  showLineNumbers={true}
                  {...props}
                >
                  {String(children).replace(/\n$/, '')}
                </SyntaxHighlighter>
              )
            }

            return (
              <code
                className={cn(
                  'px-1 py-0.5 rounded bg-gray-100 text-red-600 text-xs',
                  className
                )}
                {...props}
              >
                {children}
              </code>
            )
          },
          // Custom paragraph rendering
          p({ children }) {
            return <p className="mb-2 last:mb-0">{children}</p>
          },
          // Custom link rendering
          a({ href, children }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline"
              >
                {children}
              </a>
            )
          },
          // Custom strong rendering for mentions
          strong({ children }) {
            const text = String(children)
            if (text.startsWith('@')) {
              return (
                <span className="font-semibold mention-highlight">
                  {children}
                </span>
              )
            }
            return <strong className="font-semibold">{children}</strong>
          },
          // Tables
          table({ children }) {
            return (
              <div className="overflow-x-auto my-4">
                <table className="min-w-full divide-y divide-gray-200">
                  {children}
                </table>
              </div>
            )
          },
          thead({ children }) {
            return <thead className="bg-gray-50">{children}</thead>
          },
          th({ children }) {
            return (
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {children}
              </th>
            )
          },
          td({ children }) {
            return (
              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                {children}
              </td>
            )
          },
          // Lists
          ul({ children }) {
            return <ul className="list-disc list-inside ml-2 mb-2">{children}</ul>
          },
          ol({ children }) {
            return <ol className="list-decimal list-inside ml-2 mb-2">{children}</ol>
          },
          li({ children }) {
            return <li className="mb-1">{children}</li>
          },
          // Blockquotes
          blockquote({ children }) {
            return (
              <blockquote className="border-l-4 border-gray-300 pl-4 py-2 italic text-gray-600 my-2">
                {children}
              </blockquote>
            )
          },
          // Horizontal rule
          hr() {
            return <hr className="my-4 border-gray-200" />
          },
          // Images
          img({ src, alt }) {
            return (
              <img
                src={src}
                alt={alt}
                className="max-w-full h-auto rounded-lg my-2"
              />
            )
          }
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  )
}