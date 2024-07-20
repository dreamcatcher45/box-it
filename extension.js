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
                        const boxFilePath = path.join(rootPath, 'Box.txt');
    
                        let content = '';
                        let existingContent = '';
                        if (fs.existsSync(boxFilePath)) {
                            existingContent = fs.readFileSync(boxFilePath, 'utf8');
                        } else {
                            const config = vscode.workspace.getConfiguration('box-it');
                            const structureEnabled = config.get('folderStructure', 'On');
                            if (structureEnabled === 'On') {
                                content = getFolderStructure(rootPath) + '\n\n';
                            }
                        }
    
                        const relativePath = path.relative(rootPath, document.uri.fsPath);
                        const config = vscode.workspace.getConfiguration('box-it');
                        const groupSections = config.get('GroupSections', 'Off');
    
                        // Check if a section for this file already exists
                        const pathMarker = `\n\n//${relativePath}\n\n`;
                        const index = existingContent.indexOf(`//${relativePath}`);
    
                        if (groupSections === 'On' && index !== -1) {
                            // Append to existing section
                            const start = index + `//${relativePath}`.length;
                            const nextSectionIndex = existingContent.indexOf('//', start);
                            if (nextSectionIndex !== -1) {
                                // Append text at the end of the current section
                                content = existingContent.substring(0, nextSectionIndex) + '\n' + text + '\n' + existingContent.substring(nextSectionIndex);
                            } else {
                                // Append text at the end of the file
                                content = existingContent.substring(0, start) + existingContent.substring(start) + '\n' + text + '\n';
                            }
                        } else {
                            // Create new section
                            content += existingContent + (existingContent ? '\n\n' : '') + `//${relativePath}\n\n${text}\n\n`;
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
    
    

    let throwTheBoxCommand = vscode.commands.registerCommand('box-it.throwTheBox', function () {
        try {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (workspaceFolders) {
                const rootPath = workspaceFolders[0].uri.fsPath;
                const boxFilePath = path.join(rootPath, 'Box.txt');
                
                if (fs.existsSync(boxFilePath)) {
                    fs.unlinkSync(boxFilePath);
                    vscode.window.showInformationMessage('Successfully Threw the Box');
                } else {
                    vscode.window.showWarningMessage('Box.txt does not exist');
                }
            } else {
                vscode.window.showWarningMessage('No workspace folder open');
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Error in throwTheBox: ${error.message}`);
            console.error(error);
        }
    });

    context.subscriptions.push(addToBoxCommand, throwTheBoxCommand);
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