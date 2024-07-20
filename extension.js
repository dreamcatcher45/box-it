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
                        if (!fs.existsSync(boxFilePath)) {
                            // If Box.txt doesn't exist, create it with the folder structure
                            const config = vscode.workspace.getConfiguration('box-it');
                            if (config.get('includeFolderStructure', true)) {
                                content = getFolderStructure(rootPath) + '\n\n';
                            }
                        } else {
                            // If Box.txt exists, read its content
                            content = fs.readFileSync(boxFilePath, 'utf8') + '\n\n';
                        }
                        
                        // Append the new content
                        const relativePath = path.relative(rootPath, document.uri.fsPath);
                        content += `//${relativePath}\n${text}\n`;
                        
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
        const ignoreList = ['.git', 'node_modules', '.vscode'];
        const config = vscode.workspace.getConfiguration('box-it');
        const maxDepth = config.get('maxFolderDepth', 3);
        const maxFilesPerFolder = config.get('maxFilesPerFolder', 5);
        
        function buildStructure(dir, prefix = '', depth = 0) {
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
            
            let fileCount = 0;
            let dirCount = 0;
            
            files.forEach((file, index) => {
                if (ignoreList.includes(file)) return;
                
                const filePath = path.join(dir, file);
                const stats = fs.statSync(filePath);
                const isDirectory = stats.isDirectory();
                const isLast = index === files.length - 1;
                
                if (depth > 0 && depth >= maxDepth - 1) {
                    if (isDirectory) {
                        dirCount++;
                        const icon = '📁';
                        result += `${prefix}${isLast ? '└── ' : '├── '}${icon} ${file}\n`;
                        result += `${prefix}${isLast ? '    ' : '│   '}└── ...\n`;
                    } else {
                        fileCount++;
                        if (fileCount <= maxFilesPerFolder) {
                            const icon = '📄';
                            result += `${prefix}${isLast ? '└── ' : '├── '}${icon} ${file}\n`;
                        } else if (fileCount === maxFilesPerFolder + 1) {
                            result += `${prefix}└── ...\n`;
                        }
                    }
                } else {
                    const icon = isDirectory ? '📁' : '📄';
                    result += `${prefix}${isLast ? '└── ' : '├── '}${icon} ${file}\n`;
                    
                    if (isDirectory) {
                        result += buildStructure(filePath, prefix + (isLast ? '    ' : '│   '), depth + 1);
                    }
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