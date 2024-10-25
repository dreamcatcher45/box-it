// extension.js
const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

function activate(context) {
    let addToBoxCommand = vscode.commands.registerCommand('box-it.addToBox', function () {
        try {
            const editor = vscode.window.activeTextEditor;
            if (editor) {
                const document = editor.document;
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

                        const relativePath = path.relative(rootPath, document.uri.fsPath);
                        const groupSections = config.get('GroupSections', 'Off');
                        const pathMarker = minifyEnabled === 'On' ? 
                            `[path:${relativePath}]` : 
                            `//${relativePath}`;

                        let processedText = minifyEnabled === 'On' ? 
                            text.replace(/\s+/g, ' ').trim() : 
                            text;

                        // Check if a section for this file already exists
                        const index = existingContent.indexOf(pathMarker);

                        if (groupSections === 'On' && index !== -1) {
                            // Append to existing section
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
                            // Create new section
                            content += existingContent + 
                                (existingContent ? (minifyEnabled === 'On' ? ' ' : '\n\n') : '') + 
                                pathMarker + 
                                (minifyEnabled === 'On' ? ' ' : '\n\n') + 
                                processedText + 
                                (minifyEnabled === 'On' ? ' ' : '\n\n');
                        }

                        fs.writeFileSync(boxFilePath, content);
                        vscode.window.showInformationMessage('Successfully Added to Box');
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
                const selection = editor.selection;
                const text = document.getText(selection);

                if (text) {
                    const minifiedText = text.replace(/\s+/g, ' ').trim();
                    vscode.env.clipboard.writeText(minifiedText);
                    vscode.window.showInformationMessage('Minified text copied to clipboard');
                } else {
                    vscode.window.showWarningMessage('No text selected to minify');
                }
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Error in copyMinified: ${error.message}`);
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

    context.subscriptions.push(addToBoxCommand, throwTheBoxCommand, copyMinifiedCommand);
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