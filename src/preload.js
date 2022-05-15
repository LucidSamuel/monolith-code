const { contextBridge, ipcRenderer, webFrame } = require("electron");
const { requireLazy, StandaloneEvent } = require('./common');

let path = requireLazy(() => require('path'));
let fsp = requireLazy(() => require('fs').promises);
let treeKill = requireLazy(() => require('tree-kill'));
let childProcess = requireLazy(() => require('child_process'));

let marked = null;

function requireMarked() {
    if (marked === null) {
        marked = require('marked');
        const hljs = require('highlight.js');
        const katex = require('katex');

        const renderer = new marked.Renderer();
        let originParagraph = renderer.paragraph.bind(renderer)
        renderer.paragraph = (text) => {
            const blockRegex = /\$\$[^\$]*\$\$/g
            const inlineRegex = /\$[^\$]*\$/g
            let blockExprArray = text.match(blockRegex)
            let inlineExprArray = text.match(inlineRegex)
            for (let i in blockExprArray) {
                const expr = blockExprArray[i]
                const result = renderMathsExpression(expr)
                text = text.replace(expr, result)
            }
            for (let i in inlineExprArray) {
                const expr = inlineExprArray[i]
                const result = renderMathsExpression(expr)
                text = text.replace(expr, result)
            }
            return originParagraph(text)
        }
        function renderMathsExpression(expr) {
            if (expr[0] === '$' && expr[expr.length - 1] === '$') {
                let displayStyle = false
                expr = expr.substr(1, expr.length - 2)
                if (expr[0] === '$' && expr[expr.length - 1] === '$') {
                    displayStyle = true
                    expr = expr.substr(1, expr.length - 2)
                }
                let html = null
                try {
                    html = katex.renderToString(expr)
                } catch (e) {
                    console.error(e)
                }
                return html
            } else {
                return null
            }
        }


        marked.setOptions({
            renderer: renderer,
            highlight: (code, lang) => {
                const validLanguage = hljs.getLanguage(lang) ? lang : 'plaintext';
                return hljs.highlight(code, { language: validLanguage }).value;
            },
        });
    }

    return marked;
}


function spawnProcess(command, args, cwd) {
    let event = new StandaloneEvent();

    let runningProcess = childProcess.get().spawn(command, args, {
        encoding: 'utf8',
        shell: true,
        cwd
    });

    runningProcess.on('error', (err) => {
        event.dispatch("error", err);
    });

    runningProcess.stdout.setEncoding('utf8');
    runningProcess.stdout.on('data', (data) => {
        event.dispatch("stdout", data.toString());
    });

    runningProcess.stderr.setEncoding('utf8');
    runningProcess.stderr.on('data', (data) => {
        event.dispatch("stderr", data.toString());
    });

    runningProcess.on('close', (code) => {
        event.dispatch("close", code);
    });

    event.registerHandler("stdin", (data) => {
        runningProcess.stdin.write(data);
    });

    event.registerHandler("kill", () => {
        return new Promise(resolve => treeKill.get()(runningProcess.pid, 'SIGKILL', resolve))
    });

    return event;
}




webFrame.setVisualZoomLevelLimits(1, 3);


const API = {

    // Getter
    getInitialSettings: () => ipcRenderer.invoke("initial-settings"),

    // Window API
    minimize: () => ipcRenderer.send("minimize"),
    maximize: () => ipcRenderer.send("maximize"),
    unmaximize: () => ipcRenderer.send("unmaximize"),
    toggleMaxUnmax: () => ipcRenderer.send("toggle-max-unmax"),
    close: () => ipcRenderer.send("close"),
    togglePin: () => ipcRenderer.invoke("toggle-pin"),
    newWindow: (filePaths) => ipcRenderer.send("new-window", filePaths),

    // Features API
    showOpenDialog: () => ipcRenderer.invoke("show-open-dialog"),
    showSaveDialog: (options) => ipcRenderer.invoke("show-save-dialog", options),

    storeSetting: (key, value) => ipcRenderer.send('store-setting', key, value),

    readFile: (filePath) => fsp.get().readFile(filePath, { encoding: 'utf-8' }),
    writeFile: (filePath, content) => fsp.get().writeFile(filePath, content),

    path: path.get(),
    spawnProcess: (command, args, cwd) => spawnProcess(command, args, cwd),
    markedParse: (...args) => requireMarked().parse(...args),
    openDevTool: (targetId, devtoolsId) => ipcRenderer.send('open-devtools', targetId, devtoolsId),


    // Handler
    updateMaxUnmax: (callback) => ipcRenderer.on('update-max-unmax', callback),
    canClose: (callback) => ipcRenderer.on('can-close', callback),
    print: (callback) => ipcRenderer.on('print', callback),

};

contextBridge.exposeInMainWorld("api", API);