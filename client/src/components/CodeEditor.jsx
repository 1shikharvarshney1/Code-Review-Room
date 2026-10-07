import { forwardRef, useImperativeHandle, useRef, useEffect, useState } from 'react';
import Editor from '@monaco-editor/react';
import { MonacoBinding } from 'y-monaco';

const CodeEditor = forwardRef(({ ytext, awareness, language, comments }, ref) => {
  const editorRef = useRef(null);
  const bindingRef = useRef(null);
  const decorationsCollectionRef = useRef(null);
  const [styleElement, setStyleElement] = useState(null);

  useImperativeHandle(ref, () => ({
    revealLine: (line) => {
      if (editorRef.current) {
        editorRef.current.revealLineInCenter(line);
        editorRef.current.setPosition({ lineNumber: line, column: 1 });
        editorRef.current.focus();
      }
    }
  }));

  useEffect(() => {
    // Create a style element for remote cursors
    const el = document.createElement('style');
    document.head.appendChild(el);
    setStyleElement(el);
    return () => {
      document.head.removeChild(el);
    };
  }, []);

  useEffect(() => {
    if (!awareness || !styleElement) return;

    const updateStyles = () => {
      const states = awareness.getStates();
      let css = '';
      
      states.forEach((state, clientID) => {
        if (state.user && state.user.color) {
          const color = state.user.color;
          const name = state.user.name || 'Anonymous';
          
          css += `
            .yRemoteSelection-${clientID} {
              background-color: ${color}40;
            }
            .yRemoteSelectionHead-${clientID} {
              position: absolute;
              border-left: 2px solid ${color};
              border-top: 2px solid ${color};
              border-bottom: 2px solid ${color};
              height: 100%;
              box-sizing: border-box;
              z-index: 10;
            }
            .yRemoteSelectionHead-${clientID}::after {
              position: absolute;
              content: '${name}';
              top: -16px;
              left: -2px;
              background-color: ${color};
              color: white;
              font-size: 10px;
              padding: 0 4px;
              border-radius: 2px;
              white-space: nowrap;
              pointer-events: none;
              user-select: none;
              z-index: 11;
            }
          `;
        }
      });
      
      styleElement.textContent = css;
    };

    awareness.on('change', updateStyles);
    updateStyles();

    return () => {
      awareness.off('change', updateStyles);
    };
  }, [awareness, styleElement]);

  useEffect(() => {
    if (!editorRef.current || !decorationsCollectionRef.current) return;

    const decorations = comments
      .filter(c => c.status !== 'dismissed')
      .map(c => {
        const severityClass = `ai-comment-line-${c.severity}`;
        const marginClass = `ai-comment-margin-${c.severity}`;
        
        return {
          range: {
            startLineNumber: c.line,
            startColumn: 1,
            endLineNumber: c.endLine,
            endColumn: 1
          },
          options: {
            isWholeLine: true,
            className: severityClass,
            glyphMarginClassName: marginClass,
            hoverMessage: { value: `**[${c.severity.toUpperCase()}] ${c.category}**\n\n${c.message}` }
          }
        };
      });

    decorationsCollectionRef.current.set(decorations);
  }, [comments]);

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    decorationsCollectionRef.current = editor.createDecorationsCollection();

    if (ytext && awareness) {
      bindingRef.current = new MonacoBinding(
        ytext,
        editor.getModel(),
        new Set([editor]),
        awareness
      );
    }
  };

  useEffect(() => {
    return () => {
      if (bindingRef.current) {
        bindingRef.current.destroy();
      }
    };
  }, []);

  if (!ytext) {
    return <div className="loading-screen">Loading editor...</div>;
  }

  return (
    <Editor
      height="100%"
      language={language === 'cpp' ? 'cpp' : language}
      theme="vs-dark"
      options={{
        minimap: { enabled: false },
        automaticLayout: true,
        glyphMargin: true,
        wordWrap: 'on',
        padding: { top: 16 },
        scrollBeyondLastLine: false,
      }}
      onMount={handleEditorDidMount}
    />
  );
});

CodeEditor.displayName = 'CodeEditor';

export default CodeEditor;
