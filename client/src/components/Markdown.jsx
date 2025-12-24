import ReactMarkdown from 'react-markdown';
import './Markdown.css';

function Markdown({ children, className = '' }) {
  if (!children) return null;

  return (
    <div className={`markdown-content ${className}`}>
      <ReactMarkdown>{children}</ReactMarkdown>
    </div>
  );
}

export default Markdown;
