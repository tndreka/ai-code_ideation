import React, { useEffect, useState, useRef } from 'react';
import mermaid from 'mermaid';
import CodeBlock from './CodeBlock'; // For displaying raw Mermaid code

interface MermaidDiagramProps {
  mermaidCode: string;
  title: string;
  diagramId: string; // Unique ID for this diagram instance
}

const MermaidDiagram: React.FC<MermaidDiagramProps> = ({ mermaidCode, title, diagramId }) => {
  const [svgDiagram, setSvgDiagram] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showRawCode, setShowRawCode] = useState(false);
  const mermaidContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let tempDiv: HTMLDivElement | null = null; // Keep track of tempDiv for cleanup
    const renderMermaid = async () => {
      setError(null);
      setSvgDiagram(null);
      if (!mermaidCode.trim()) {
        setError("No diagram code provided.");
        return;
      }
      try {
        const uniqueRenderId = `mermaid-render-${diagramId}-${Date.now()}`;

        tempDiv = document.createElement('div');
        tempDiv.id = uniqueRenderId;
        tempDiv.style.display = 'none'; 
        document.body.appendChild(tempDiv);
        
        const { svg } = await mermaid.render(uniqueRenderId, mermaidCode.trim());
        setSvgDiagram(svg);

      } catch (e: any) {
        console.error(`Mermaid rendering error for ID ${diagramId}:`, e);
        setError(e.message || "Failed to render diagram. The syntax might be invalid.");
        setSvgDiagram(null);
      } finally {
        // Conditional cleanup
        if (tempDiv && tempDiv.parentNode === document.body) {
          document.body.removeChild(tempDiv);
        }
        tempDiv = null; // Clear reference
      }
    };

    renderMermaid();
    
    // Cleanup function for useEffect
    return () => {
        if (tempDiv && tempDiv.parentNode === document.body) {
            document.body.removeChild(tempDiv);
        }
        tempDiv = null;
    };

  }, [mermaidCode, diagramId]);

  return (
    <div className="my-6 p-4 border border-teal-800 rounded-lg bg-slate-800/50 shadow-lg">
      <div className="flex justify-between items-center mb-3">
        <h5 className="text-lg font-semibold text-teal-300">{title || "AI-Generated Diagram"}</h5>
        <button
          onClick={() => setShowRawCode(!showRawCode)}
          className="px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-700/50 hover:bg-slate-600/50 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 transition-colors"
          aria-expanded={showRawCode}
          aria-controls={`mermaid-raw-code-${diagramId}`}
        >
          {showRawCode ? 'Hide' : 'Show'} Code
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-700/20 border border-red-600/50 text-red-200 rounded-md mb-3">
          <p className="font-semibold">Diagram Error:</p>
          <p className="text-sm">{error}</p>
          <p className="text-xs mt-1">Displaying raw Mermaid code instead.</p>
        </div>
      )}

      {(svgDiagram && !error) && (
        <div 
          ref={mermaidContainerRef}
          className="mermaid-diagram-container bg-slate-900/30 flex justify-center items-center p-2" // Tailwind classes from index.html for consistency + centering
          dangerouslySetInnerHTML={{ __html: svgDiagram }}
          role="img"
          aria-label={title || "Diagram"}
        />
      )}
      
      {(error || showRawCode) && (
         <div id={`mermaid-raw-code-${diagramId}`} style={{ display: (error || showRawCode) ? 'block' : 'none' }}>
            <CodeBlock language="mermaid" code={mermaidCode} />
        </div>
      )}
    </div>
  );
};

export default MermaidDiagram;