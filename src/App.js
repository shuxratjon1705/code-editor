// App.jsx - React komponenti
import React, { useState, useEffect, useRef } from 'react';
import './App.css';

const App = () => {
  const [htmlCode, setHtmlCode] = useState(`<!DOCTYPE html>
<html>
<head>
    <title>React Editor</title>
</head>
<body>
    <div class="container">
        <h1>Salom React!</h1>
        <p>Bu React orqali yaratilgan editor</p>
        <button onclick="showMessage()">Bos meni</button>
        <div id="output"></div>
    </div>
</body>
</html>`);

  const [cssCode, setCssCode] = useState(`* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    background: linear-gradient(135deg, #667eea, #764ba2);
    min-height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
    font-family: Arial, sans-serif;
}

.container {
    background: white;
    padding: 2rem;
    border-radius: 10px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.2);
    text-align: center;
    max-width: 400px;
}

h1 {
    color: #333;
    margin-bottom: 1rem;
}

p {
    color: #666;
    margin-bottom: 1.5rem;
}

button {
    background: #667eea;
    color: white;
    border: none;
    padding: 10px 25px;
    border-radius: 5px;
    cursor: pointer;
    font-size: 1rem;
    transition: 0.3s;
}

button:hover {
    background: #764ba2;
    transform: translateY(-2px);
}

#output {
    margin-top: 1.5rem;
    padding: 1rem;
    background: #f5f5f5;
    border-radius: 5px;
    font-size: 1.2rem;
}`);

  const [jsCode, setJsCode] = useState(`function showMessage() {
    const now = new Date();
    const output = document.getElementById('output');
    output.innerHTML = \`Vaqt: \${now.toLocaleTimeString()}\`;
    console.log('Button clicked at:', now.toLocaleTimeString());
}

// Auto update
setInterval(() => {
    const output = document.getElementById('output');
    if (output && output.innerHTML.includes('Vaqt:')) {
        const now = new Date();
        output.innerHTML = \`Vaqt: \${now.toLocaleTimeString()}\`;
    }
}, 1000);`);

  const [activeTab, setActiveTab] = useState('html');
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [liveTime, setLiveTime] = useState(new Date());
  const iframeRef = useRef(null);
  const fileInputRef = useRef(null);

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => {
      setLiveTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-run on code change
  useEffect(() => {
    const timer = setTimeout(() => {
      runCode();
    }, 1000);
    return () => clearTimeout(timer);
  }, [htmlCode, cssCode, jsCode]);

  // Notification system
  const addNotification = (message, type = 'info') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 3000);
  };

  // Run code function
  const runCode = () => {
    setIsRunning(true);
    
    try {
      const fullCode = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>${cssCode}</style>
        </head>
        <body>
          ${htmlCode}
          <script>
            // Console override
            const originalLog = console.log;
            const originalError = console.error;
            
            console.log = function(...args) {
              originalLog.apply(console, args);
              window.parent.postMessage({ 
                type: 'console', 
                method: 'log', 
                args: args.map(arg => String(arg)) 
              }, '*');
            };
            
            console.error = function(...args) {
              originalError.apply(console, args);
              window.parent.postMessage({ 
                type: 'console', 
                method: 'error', 
                args: args.map(arg => String(arg)) 
              }, '*');
            };
            
            // Error handler
            window.onerror = function(msg, url, line) {
              console.error('Error:', msg, 'at line', line);
              return false;
            };
            
            // Execute user JS
            try {
              ${jsCode}
            } catch (error) {
              console.error('JavaScript Error:', error.message);
              document.body.innerHTML += \`
                <div style="position:fixed; bottom:10px; right:10px; background:#f48771; color:#1e1e1e; padding:10px; border-radius:4px; z-index:9999;">
                  Error: \${error.message}
                </div>
              \`;
            }
            
            // DOM ready
            document.addEventListener('DOMContentLoaded', () => {
              console.log('Document ready ✅');
            });
          <\/script>
        </body>
        </html>
      `;

      if (iframeRef.current) {
        iframeRef.current.srcdoc = fullCode;
        addNotification('Code executed successfully', 'success');
      }
    } catch (error) {
      addNotification(`Error: ${error.message}`, 'error');
    } finally {
      setIsRunning(false);
    }
  };

  // Save to localStorage
  const saveCode = () => {
    const data = {
      html: htmlCode,
      css: cssCode,
      js: jsCode,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem('react-editor-data', JSON.stringify(data));
    addNotification('Code saved to localStorage', 'success');
  };

  // Load from localStorage
  const loadCode = () => {
    const saved = localStorage.getItem('react-editor-data');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setHtmlCode(data.html);
        setCssCode(data.css);
        setJsCode(data.js);
        addNotification('Code loaded from localStorage', 'success');
      } catch (e) {
        addNotification('Failed to load saved code', 'error');
      }
    }
  };

  // Export code
  const exportCode = () => {
    const data = { html: htmlCode, css: cssCode, js: jsCode };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'react-editor-code.json';
    a.click();
    URL.revokeObjectURL(url);
    addNotification('Code exported', 'success');
  };

  // Import code
  const importCode = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          setHtmlCode(data.html || '');
          setCssCode(data.css || '');
          setJsCode(data.js || '');
          addNotification('Code imported', 'success');
        } catch (e) {
          addNotification('Invalid file format', 'error');
        }
      };
      reader.readAsText(file);
    }
  };

  // Format code
  const formatCode = () => {
    // Simple formatter - just adds indentation
    const format = (code) => {
      let formatted = '';
      let indent = 0;
      code.split('\n').forEach(line => {
        line = line.trim();
        if (line.includes('}') || line.includes('</')) {
          indent = Math.max(0, indent - 1);
        }
        formatted += '  '.repeat(indent) + line + '\n';
        if (line.includes('{') || (line.includes('<') && !line.includes('</'))) {
          indent++;
        }
      });
      return formatted;
    };

    if (activeTab === 'html') setHtmlCode(format(htmlCode));
    else if (activeTab === 'css') setCssCode(format(cssCode));
    else setJsCode(format(jsCode));
    
    addNotification('Code formatted', 'success');
  };

  // Reset code
  const resetCode = () => {
    if (window.confirm('Are you sure you want to reset all code?')) {
      setHtmlCode('');
      setCssCode('');
      setJsCode('');
      addNotification('Code reset', 'info');
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        runCode();
      }
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        saveCode();
      }
      if (e.ctrlKey && e.shiftKey && e.key === 'F') {
        e.preventDefault();
        formatCode();
      }
      if (e.altKey && e.key === '1') setActiveTab('html');
      if (e.altKey && e.key === '2') setActiveTab('css');
      if (e.altKey && e.key === '3') setActiveTab('js');
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, htmlCode, cssCode, jsCode]);

  // Load saved code on mount
  useEffect(() => {
    loadCode();
  }, []);

  return (
    <div className="app-container">
      {/* Header */}
      <header className="header">
        <div className="header-left">
          <div className="logo">
            <i className="fas fa-code"></i>
            <span>React Code Editor</span>
          </div>
          <div className="tabs">
            <button 
              className={`tab ${activeTab === 'html' ? 'active' : ''}`}
              onClick={() => setActiveTab('html')}
            >
              <i className="fab fa-html5"></i> HTML
            </button>
            <button 
              className={`tab ${activeTab === 'css' ? 'active' : ''}`}
              onClick={() => setActiveTab('css')}
            >
              <i className="fab fa-css3-alt"></i> CSS
            </button>
            <button 
              className={`tab ${activeTab === 'js' ? 'active' : ''}`}
              onClick={() => setActiveTab('js')}
            >
              <i className="fab fa-js"></i> JavaScript
            </button>
          </div>
        </div>
        <div className="header-right">
          <button className="btn" onClick={resetCode}>
            <i className="fas fa-undo"></i> Reset
          </button>
          <button className="btn" onClick={formatCode}>
            <i className="fas fa-align-left"></i> Format
          </button>
          <button className="btn" onClick={saveCode}>
            <i className="fas fa-save"></i> Save
          </button>
          <button className="btn" onClick={exportCode}>
            <i className="fas fa-download"></i> Export
          </button>
          <button className="btn" onClick={() => fileInputRef.current.click()}>
            <i className="fas fa-upload"></i> Import
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            style={{ display: 'none' }} 
            accept=".json"
            onChange={importCode}
          />
          <button className="btn btn-run" onClick={runCode} disabled={isRunning}>
            <i className={`fas ${isRunning ? 'fa-spinner fa-pulse' : 'fa-play'}`}></i>
            {isRunning ? ' Running...' : ' Run (Ctrl+Enter)'}
          </button>
        </div>
      </header>

      {/* Editor Area */}
      <div className="editor-area">
        {/* Line Numbers */}
        <div className="line-numbers">
          {Array.from({ length: 30 }, (_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>

        {/* Code Editors */}
        <div className="editors">
          {activeTab === 'html' && (
            <textarea
              className="code-editor html"
              value={htmlCode}
              onChange={(e) => setHtmlCode(e.target.value)}
              spellCheck="false"
              placeholder="Write HTML here..."
            />
          )}
          
          {activeTab === 'css' && (
            <textarea
              className="code-editor css"
              value={cssCode}
              onChange={(e) => setCssCode(e.target.value)}
              spellCheck="false"
              placeholder="Write CSS here..."
            />
          )}
          
          {activeTab === 'js' && (
            <textarea
              className="code-editor js"
              value={jsCode}
              onChange={(e) => setJsCode(e.target.value)}
              spellCheck="false"
              placeholder="Write JavaScript here..."
            />
          )}
        </div>
      </div>

      {/* Output Area */}
      <div className="output-area">
        <div className="output-header">
          <div className="output-tabs">
            <button className="output-tab active">Result</button>
            <button className="output-tab" onClick={() => addNotification('Console opened (F12)', 'info')}>
              Console
            </button>
          </div>
          <div className="output-status">
            <i className={`fas ${isRunning ? 'fa-spinner fa-pulse' : 'fa-check-circle'}`}></i>
            {isRunning ? ' Running...' : ' Ready'}
          </div>
        </div>
        <iframe
          ref={iframeRef}
          className="output-frame"
          title="output"
          sandbox="allow-forms allow-modals allow-pointer-lock allow-popups allow-same-origin allow-scripts allow-top-navigation"
        />
      </div>

      {/* Status Bar */}
      <div className="status-bar">
        <div className="status-left">
          <span className="status-item">
            <i className="fas fa-check-circle"></i> Ready
          </span>
          <span className="status-item">
            <i className="fas fa-code-branch"></i> main
          </span>
          <span className="status-item">
            <i className="fas fa-error"></i> 0 errors
          </span>
        </div>
        <div className="status-right">
          <span className="status-item">
            <i className="fas fa-indent"></i> Spaces: 2
          </span>
          <span className="status-item">
            <i className="fas fa-clock"></i> {liveTime.toLocaleTimeString()}
          </span>
          <span className="status-item">
            <i className="fas fa-file"></i> {activeTab.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Notifications */}
      <div className="notifications">
        {notifications.map(notif => (
          <div key={notif.id} className={`notification ${notif.type}`}>
            <i className={`fas fa-${
              notif.type === 'success' ? 'check-circle' : 
              notif.type === 'error' ? 'exclamation-circle' : 'info-circle'
            }`}></i>
            <span>{notif.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default App;