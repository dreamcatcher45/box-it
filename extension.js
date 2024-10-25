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

                    // logging
                    console.log('Saving analytics:', {
                        date: new Date().toISOString(),
                        originalTokens: minifyResult.originalTokens,
                        minifiedTokens: minifyResult.minifiedTokens
                    });

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
                'Box It - Minification Analytics',
                vscode.ViewColumn.One,
                {
                    enableScripts: true
                }
            );
    
            // Get analytics data
            const analytics = context.globalState.get('minificationAnalytics', []);
            
            // Create HTML content
            const htmlPath = path.join(context.extensionPath, 'analytics.html');
            let htmlContent = fs.readFileSync(htmlPath, 'utf8');
            
            // Replace placeholder with actual data
            // Note the added JSON.stringify to properly format the data
            htmlContent = htmlContent.replace(
                '/*ANALYTICS_DATA*/', 
                JSON.stringify(analytics, null, 2)
            );
            
            panel.webview.html = htmlContent;
    
            // Add error handling for empty data
            if (!analytics || analytics.length === 0) {
                vscode.window.showInformationMessage('No analytics data available yet. Try minifying some text first!');
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Error showing analytics: ${error.message}`);
            console.error(error);
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