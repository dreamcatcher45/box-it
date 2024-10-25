// extension.js
const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const { encoding_for_model } = require("tiktoken");


const commentsData = {
    "comments": {
        "SingleLineComment": [
            {
                "extensions": ".c, .cpp, .java, .js, .cs, .php, .go, .swift, .kt, .rs, .vb, .ts, .m",
                "symbol": "//"
            },
            {
                "extensions": ".py, .rb, .pl, .r, .sb",
                "symbol": "#"
            },
            {
                "extensions": ".bas, .vbs, .dart",
                "symbol": "'"
            }
        ],
        "MultiLineComment": [
            {
                "extensions": ".c, .cpp, .java, .js, .cs, .php, .go, .swift, .kt, .rs, .sql, .ts",
                "symbol": "/* ... */"
            },
            {
                "extensions": ".html, .css",
                "symbol": "<!-- ... -->"
            },
            {
                "extensions": ".py",
                "symbol": "''' ... '''"
            }
        ]
    }
};

function countTokens(text) {
    const gpt4Enc = encoding_for_model("gpt-4-0125-preview");
    const encoded = gpt4Enc.encode(text);
    const tokenCount = encoded.length;
    gpt4Enc.free();
    return tokenCount;
}

function getCommentSymbols(filePath) {
    const extension = path.extname(filePath).toLowerCase();
    const symbols = { single: [], multi: [] };
    
    commentsData.comments.SingleLineComment.forEach(item => {
        const extensions = item.extensions.toLowerCase().split(',').map(ext => ext.trim());
        if (extensions.includes(extension)) {
            symbols.single.push(item.symbol);
        }
    });

    commentsData.comments.MultiLineComment.forEach(item => {
        const extensions = item.extensions.toLowerCase().split(',').map(ext => ext.trim());
        if (extensions.includes(extension)) {
            const [start, end] = item.symbol.split('...');
            symbols.multi.push({
                start: start.trim(),
                end: end.trim()
            });
        }
    });

    return symbols;
}

function removeComments(text, filePath) {
    const symbols = getCommentSymbols(filePath);
    let processedText = text;

    // Remove multi-line comments first
    symbols.multi.forEach(({start, end}) => {
        const escStart = start.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const escEnd = end.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escStart + '[\\s\\S]*?' + escEnd, 'g');
        processedText = processedText.replace(regex, '');
    });

    // Remove single-line comments
    symbols.single.forEach(symbol => {
        const escSymbol = symbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escSymbol + '.*?(?:\r\n|\r|\n|$)', 'g');
        processedText = processedText.replace(regex, '\n');
    });

    // Clean up any extra blank lines
    processedText = processedText.replace(/\n\s*\n\s*\n/g, '\n\n');
    
    return processedText;
}

function minifyText(text, filePath, removeCommentsFlag) {
    const originalTokens = countTokens(text);
    
    let processedText = text;
    if (removeCommentsFlag) {
        processedText = removeComments(processedText, filePath);
    }
    processedText = processedText.replace(/\s+/g, ' ').trim();
    
    const minifiedTokens = countTokens(processedText);
    
    return {
        text: processedText,
        originalTokens,
        minifiedTokens
    };
}

function activate(context) {

    // globalState = context.globalState;
    let addToBoxCommand = vscode.commands.registerCommand('box-it.addToBox', function () {
        try {
            const editor = vscode.window.activeTextEditor;
            if (editor) {
                const document = editor.document;
                const filePath = document.uri.fsPath;
                const selection = editor.selection;
                const text = document.getText(selection);

                if (text) {
                    const workspaceFolders = vscode.workspace.workspaceFolders;
                    if (workspaceFolders) {
                        const rootPath = workspaceFolders[0].uri.fsPath;
                        const config = vscode.workspace.getConfiguration('box-it');
                        const filename = config.get('filename', 'box');
                        const boxFilePath = path.join(rootPath, `${filename}.txt`);
                        const minifyEnabled = config.get('minify', 'Off');
                        const removeCommentsEnabled = config.get('removeComments', 'Off');
                        const showSizeDiff = config.get('showSizeDifference', 'On');

                        let content = '';
                        let existingContent = '';
                        if (fs.existsSync(boxFilePath)) {
                            existingContent = fs.readFileSync(boxFilePath, 'utf8');
                        } else if (minifyEnabled === 'Off') {
                            const structureEnabled = config.get('folderStructure', 'On');
                            if (structureEnabled === 'On') {
                                content = getFolderStructure(rootPath) + '\n\n';
                            }
                        }

                        const relativePath = path.relative(rootPath, filePath);
                        const groupSections = config.get('GroupSections', 'Off');
                        const pathMarker = minifyEnabled === 'On' ? 
                            `[path:${relativePath}]` : 
                            `//${relativePath}`;

                        let minifyResult = minifyEnabled === 'On' ? 
                            minifyText(text, filePath, removeCommentsEnabled === 'On') : 
                            { text: removeCommentsEnabled === 'On' ? removeComments(text, filePath) : text };

                        const processedText = minifyResult.text;

                        // Handle content with sections
                        const index = existingContent.indexOf(pathMarker);
                        if (groupSections === 'On' && index !== -1) {
                            const start = index + pathMarker.length;
                            const nextSectionIndex = minifyEnabled === 'On' ? 
                                existingContent.indexOf('[path:', start) : 
                                existingContent.indexOf('//', start);

                            if (nextSectionIndex !== -1) {
                                content = existingContent.substring(0, nextSectionIndex) + 
                                    (minifyEnabled === 'On' ? '' : existingContent.substring(start, nextSectionIndex) + '\n') + 
                                    processedText + 
                                    (minifyEnabled === 'On' ? ' ' : '\n') + 
                                    existingContent.substring(nextSectionIndex);
                            } else {
                                content = existingContent.substring(0, start) + 
                                    (minifyEnabled === 'On' ? '' : existingContent.substring(start) + '\n') + 
                                    processedText + 
                                    (minifyEnabled === 'On' ? ' ' : '\n');
                            }
                        } else {
                            content += existingContent + 
                                (existingContent ? (minifyEnabled === 'On' ? ' ' : '\n\n') : '') + 
                                pathMarker + 
                                (minifyEnabled === 'On' ? ' ' : '\n\n') + 
                                processedText + 
                                (minifyEnabled === 'On' ? ' ' : '\n\n');
                        }

                        fs.writeFileSync(boxFilePath, content);
                        
                        // Save analytics if minification was performed
                        if (minifyEnabled === 'On' && minifyResult.originalTokens) {
                            const currentAnalytics = context.globalState.get('minificationAnalytics', []);
                            currentAnalytics.push({
                                date: new Date().toISOString(),
                                originalTokens: minifyResult.originalTokens,
                                minifiedTokens: minifyResult.minifiedTokens
                            });
                            context.globalState.update('minificationAnalytics', currentAnalytics);
                        }

                        // Show size difference if enabled
                        if (showSizeDiff === 'On' && minifyEnabled === 'On') {
                            vscode.window.showInformationMessage(
                                `Successfully Added to Box (minified from ${minifyResult.originalTokens} to ${minifyResult.minifiedTokens} tokens)`
                            );
                        } else {
                            vscode.window.showInformationMessage('Successfully Added to Box');
                        }
                    }
                } else {
                    vscode.window.showWarningMessage('No text selected to add to Box');
                }
            } else {
                vscode.window.showWarningMessage('No active text editor');
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Error in addToBox: ${error.message}`);
            console.error(error);
        }
    });

    let copyMinifiedCommand = vscode.commands.registerCommand('box-it.copyMinified', function () {
        try {
            const editor = vscode.window.activeTextEditor;
            if (editor) {
                const document = editor.document;
                const filePath = document.uri.fsPath;
                const selection = editor.selection;
                const text = document.getText(selection);
                const config = vscode.workspace.getConfiguration('box-it');
                const removeCommentsEnabled = config.get('removeComments', 'Off');
                const showSizeDiff = config.get('showSizeDifference', 'On');

                if (text) {
                    const minifyResult = minifyText(text, filePath, removeCommentsEnabled === 'On');
                    vscode.env.clipboard.writeText(minifyResult.text);
                    
                    // Save analytics
                    const currentAnalytics = context.globalState.get('minificationAnalytics', []);
                    currentAnalytics.push({
                        date: new Date().toISOString(),
                        originalTokens: minifyResult.originalTokens,
                        minifiedTokens: minifyResult.minifiedTokens
                    });
                    context.globalState.update('minificationAnalytics', currentAnalytics);


                    // Show size difference if enabled
                    if (showSizeDiff === 'On') {
                        vscode.window.showInformationMessage(
                            `Minified text copied to clipboard (minified from ${minifyResult.originalTokens} to ${minifyResult.minifiedTokens} tokens)`
                        );
                    } else {
                        vscode.window.showInformationMessage('Minified text copied to clipboard');
                    }
                } else {
                    vscode.window.showWarningMessage('No text selected to minify');
                }
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Error in copyMinified: ${error.message}`);
            console.error(error);
        }
    });

    let showAnalyticsCommand = vscode.commands.registerCommand('box-it.showMinifiedAnalytics', function () {
        try {
            const panel = vscode.window.createWebviewPanel(
                'boxItAnalytics',
                'Box It - Analytics',
                vscode.ViewColumn.One,
                {
                    enableScripts: true
                }
            );
    
            // Get analytics data
            const analytics = context.globalState.get('minificationAnalytics', []);
    
            // Create the HTML content directly instead of reading from file
            const htmlContent = `
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Box It - Analytics</title>
                    <style>
                        body {
                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
                            margin: 20px;
                            padding: 0;
                            background-color: var(--vscode-editor-background);
                            color: var(--vscode-editor-foreground);
                        }
    
                        .dashboard {
                            display: grid;
                            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                            gap: 20px;
                            margin-bottom: 30px;
                        }
    
                        .metric-card {
                            background-color: var(--vscode-editor-selectionBackground);
                            border-radius: 8px;
                            padding: 20px;
                            text-align: center;
                        }
    
                        .metric-value {
                            font-size: 24px;
                            font-weight: bold;
                            margin: 10px 0;
                        }
    
                        .metric-label {
                            font-size: 14px;
                            opacity: 0.8;
                        }
    
                        table {
                            width: 100%;
                            border-collapse: collapse;
                            margin-top: 20px;
                            background-color: var(--vscode-editor-selectionBackground);
                            border-radius: 8px;
                            overflow: hidden;
                        }
    
                        th, td {
                            padding: 12px;
                            text-align: left;
                            border-bottom: 1px solid var(--vscode-editor-lineHighlightBackground);
                        }
    
                        th {
                            background-color: var(--vscode-editor-selectionHighlightBackground);
                            font-weight: bold;
                        }
    
                        tr:hover {
                            background-color: var(--vscode-editor-hoverHighlightBackground);
                        }
    
                        .savings-positive {
                            color: #4caf50;
                        }
    
                        h1 {
                            margin-bottom: 30px;
                            color: var(--vscode-editor-foreground);
                        }
    
                        .table-container {
                            overflow-x: auto;
                        }
                    </style>
                </head>
                <body>
                    <h1>Box It - Analytics</h1>
                    
                    <div class="dashboard">
                        <div class="metric-card">
                            <div class="metric-label">Total Minifications</div>
                            <div class="metric-value" id="totalEntries">0</div>
                        </div>
                        <div class="metric-card">
                            <div class="metric-label">Total Original Tokens</div>
                            <div class="metric-value" id="totalOriginal">0</div>
                        </div>
                        <div class="metric-card">
                            <div class="metric-label">Total Minified Tokens</div>
                            <div class="metric-value" id="totalMinified">0</div>
                        </div>
                        <div class="metric-card">
                            <div class="metric-label">Total Tokens Saved</div>
                            <div class="metric-value savings-positive" id="totalSaved">0</div>
                        </div>
                        <div class="metric-card">
                            <div class="metric-label">Average Reduction</div>
                            <div class="metric-value savings-positive" id="avgReduction">0%</div>
                        </div>
                    </div>
    
                    <div class="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>No.</th>
                                    <th>Date & Time</th>
                                    <th>Original Tokens</th>
                                    <th>Minified Tokens</th>
                                    <th>Tokens Saved</th>
                                    <th>Reduction %</th>
                                </tr>
                            </thead>
                            <tbody id="analyticsTable">
                            </tbody>
                        </table>
                    </div>
    
                    <script>
                        // Format number to K or M
                        function formatNumber(num) {
                            if (num >= 1000000) {
                                return (num / 1000000).toFixed(1) + 'M';
                            } else if (num >= 1000) {
                                return (num / 1000).toFixed(1) + 'K';
                            }
                            return num.toString();
                        }
    
                        // Analytics data injected by extension
                        const analyticsData = ${JSON.stringify(analytics)};
    
                        if (!analyticsData || analyticsData.length === 0) {
                            document.querySelector('.dashboard').innerHTML = '<div class="metric-card"><div class="metric-label">No data available</div><div class="metric-value">Try minifying some text first!</div></div>';
                            document.querySelector('.table-container').style.display = 'none';
                        }
    
                        function formatDate(dateString) {
                            return new Date(dateString).toLocaleString();
                        }
    
                        function updateDashboard() {
                            const totalEntries = analyticsData.length;
                            const totalOriginal = analyticsData.reduce((sum, entry) => sum + entry.originalTokens, 0);
                            const totalMinified = analyticsData.reduce((sum, entry) => sum + entry.minifiedTokens, 0);
                            const totalSaved = totalOriginal - totalMinified;
                            const avgReduction = totalOriginal ? ((totalSaved / totalOriginal) * 100).toFixed(1) : '0';
    
                            document.getElementById('totalEntries').textContent = totalEntries;
                            document.getElementById('totalOriginal').textContent = formatNumber(totalOriginal);
                            document.getElementById('totalMinified').textContent = formatNumber(totalMinified);
                            document.getElementById('totalSaved').textContent = formatNumber(totalSaved);
                            document.getElementById('avgReduction').textContent = \`\${avgReduction}%\`;
                        }
    
                        function populateTable() {
                            const tbody = document.getElementById('analyticsTable');
                            tbody.innerHTML = '';
    
                            analyticsData.forEach((data, index) => {
                                const tokensSaved = data.originalTokens - data.minifiedTokens;
                                const reductionPercent = ((tokensSaved / data.originalTokens) * 100).toFixed(1);
    
                                const row = document.createElement('tr');
                                row.innerHTML = \`
                                    <td>\${index + 1}</td>
                                    <td>\${formatDate(data.date)}</td>
                                    <td>\${formatNumber(data.originalTokens)}</td>
                                    <td>\${formatNumber(data.minifiedTokens)}</td>
                                    <td class="savings-positive">\${formatNumber(tokensSaved)}</td>
                                    <td class="savings-positive">\${reductionPercent}%</td>
                                \`;
                                tbody.appendChild(row);
                            });
                        }
    
                        updateDashboard();
                        populateTable();
                    </script>
                </body>
                </html>
            `;
    
            // Set the webview's HTML content
            panel.webview.html = htmlContent;
            
            // Add message listener for debugging
            panel.webview.onDidReceiveMessage(
                message => {
                    console.log('Received message from webview:', message);
                },
                undefined,
                context.subscriptions
            );
    
        } catch (error) {
            vscode.window.showErrorMessage(`Error showing analytics: ${error.message}`);
            console.error('Error in showAnalyticsCommand:', error);
        }
    });

    let throwTheBoxCommand = vscode.commands.registerCommand('box-it.throwTheBox', function () {
        try {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (workspaceFolders) {
                const rootPath = workspaceFolders[0].uri.fsPath;
                const config = vscode.workspace.getConfiguration('box-it');
                const filename = config.get('filename', 'box');
                const boxFilePath = path.join(rootPath, `${filename}.txt`);

                if (fs.existsSync(boxFilePath)) {
                    fs.unlinkSync(boxFilePath);
                    vscode.window.showInformationMessage('Successfully Threw the Box');
                } else {
                    vscode.window.showWarningMessage(`${filename}.txt does not exist`);
                }
            } else {
                vscode.window.showWarningMessage('No workspace folder open');
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Error in throwTheBox: ${error.message}`);
            console.error(error);
        }
    });

    context.subscriptions.push(addToBoxCommand, throwTheBoxCommand, copyMinifiedCommand, showAnalyticsCommand);

}

function getFolderStructure(rootPath) {
    try {
        const config = vscode.workspace.getConfiguration('box-it');
        const ignoreFolders = config.get('ignoreFolders', '').split(',').map(f => f.trim());
        const detailedFolders = config.get('detailedFolders', '').split(',').map(f => f.trim());

        function buildStructure(dir, isDetailed = false, prefix = '') {
            let result = '';
            const files = fs.readdirSync(dir).sort((a, b) => {
                const aPath = path.join(dir, a);
                const bPath = path.join(dir, b);
                const aIsDirectory = fs.statSync(aPath).isDirectory();
                const bIsDirectory = fs.statSync(bPath).isDirectory();
                if (aIsDirectory && !bIsDirectory) return -1;
                if (!aIsDirectory && bIsDirectory) return 1;
                return a.localeCompare(b);
            });

            files.forEach((file, index) => {
                if (ignoreFolders.includes(file)) return;

                const filePath = path.join(dir, file);
                const stats = fs.statSync(filePath);
                const isDirectory = stats.isDirectory();
                const isLast = index === files.length - 1;

                const icon = isDirectory ? '📁' : '📄';
                result += `${prefix}${isLast ? '└── ' : '├── '}${icon} ${file}\n`;

                if (isDirectory && (isDetailed || detailedFolders.includes(file))) {
                    result += buildStructure(filePath, true, prefix + (isLast ? '    ' : '│   '));
                }
            });

            return result;
        }

        const projectName = path.basename(rootPath);
        return `📁 ${projectName}/\n` + buildStructure(rootPath);
    } catch (error) {
        vscode.window.showErrorMessage(`Error in getFolderStructure: ${error.message}`);
        console.error(error);
        return "Error generating folder structure";
    }
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
}