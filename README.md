# 📦 Box It

Box It is a Visual Studio Code extension that simplifies code sharing with AI models while respecting your privacy. It allows you to selectively add code snippets to a single file, optionally including folder structure information, making it easy to provide context to AI models without sharing your entire codebase.

Box It's minification process optimizes code through intelligent whitespace removal, comment stripping, and path handling, reducing token counts while preserving functionality - making your AI model interactions more cost-effective by reducing the number of tokens processed per request. The process is complemented by a robust analytics dashboard that tracks optimization metrics, helping developers save money and stay within token limits while maintaining code quality.

## ✨ Features

- **📝 Add to Box**: Select code and add it to a centralized file (default: `box.txt`)
- **⚡ Minification**: Optimize your code snippets with whitespace removal and comment stripping
- **📊 Token Analytics**: Track and visualize your token usage and optimization metrics
- **📁 Folder Structure**: Optionally include your project's folder structure in the box file
- **🔒 Privacy Control**: Choose what to share by selecting specific code snippets
- **🔗 Grouping**: Group code snippets from the same file under a single directory path section
- **⚙️ Customizable**: Configure ignored folders, detailed folders, and more through VSCode settings
- **🗑️ Throw the Box**: Easily delete the box file when you're done

## 🚀 Usage

1. Select the code you want to add to the box
2. Right-click and choose one of the following options from the context menu:
   - "Add to box": Add the selected code to your box file
   - "Copy minified": Copy a minified version of the selected code to your clipboard
3. To view minification analytics, use the command "Show Minified Analytics"
4. To delete the box file, right-click in the editor (without selection) and choose "Throw the box"

## 🎥 Demo

<div style="display: flex; justify-content: space-between; margin: 20px 0;">
  <div style="flex: 1;">
    <img src="https://raw.githubusercontent.com/dreamcatcher45/box-it/master/demo.gif" alt="Box It Demo" width="100%"/>
  </div>
  <div style="flex: 1;">
    <img src="https://raw.githubusercontent.com/dreamcatcher45/box-it/refs/heads/master/analytics.png" alt="Analytics Dashboard" width="100%"/>
  </div>
</div>

## ⚙️ Extension Settings

This extension contributes the following settings:

* `box-it.folderStructure`: Enable or disable folder structure in Box.txt (default: "On")
* `box-it.ignoreFolders`: Comma-separated list of folders to ignore in the folder structure (default: ".git,node_modules,.vscode")
* `box-it.detailedFolders`: Comma-separated list of folders to show in detail, including subfolders (default: "")
* `box-it.GroupSections`: Group code snippets from the same file under a single directory path section (default: "On")
* `box-it.filename`: The filename for saving the text file (default: "box")
* `box-it.minify`: Enable minified format with [path:] syntax and removed whitespace (default: "Off")
* `box-it.removeComments`: Remove comments when minifying or adding to box (default: "Off")
* `box-it.showSizeDifference`: Show token count difference in notifications (default: "On")

## 🔧 Minification Features

The extension includes several optimization features to help reduce token usage:

- **Whitespace Optimization**: Removes unnecessary whitespace while preserving code functionality
- **Comment Removal**: Optional removal of single-line and multi-line comments
- **Token Analytics**: Track the effectiveness of minification with detailed statistics
- **Smart Path Handling**: Compact file path representation in minified mode

## 📊 Analytics Dashboard

The extension provides a comprehensive analytics dashboard that shows:

- Total number of minifications performed
- Total original and minified token counts
- Total tokens saved through minification
- Average reduction percentage
- Detailed history of all minification operations
- Per-operation metrics and timestamps

## ⚠️ Important Warnings

- **Use at Your Own Risk**: The minification and comment removal features modify your code. While efforts are made to preserve functionality, there's no guarantee that the modified code will work exactly as the original.
- **Token Counting**: Token counts are approximations based on the GPT-4 tokenizer and may not match exactly with different AI models or API implementations.
- **Data Safety**: Always review the content of your box file before sharing it with AI models or others. The extension may inadvertently include sensitive information from comments or strings.
- **Backup Recommended**: Keep a backup of your original code. Don't rely on minified versions for source control or deployment.
- **Performance Impact**: The analytics feature stores data locally. Consider clearing analytics data periodically if storage becomes a concern.
- **Comment Removal**: The comment removal feature might affect code that relies on comments (like configuration files or documentation generators). Test thoroughly before using in production code.

## 🐛 Known Issues

No known issues at this time. If you encounter any problems, please report them on our GitHub repository.

## 📝 Release Notes

See the [CHANGELOG.md](CHANGELOG.md) file for details on each release.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This extension is licensed under the [MIT License](LICENSE).

## ❤️ Support

If you find this extension helpful, please consider:
- Star the repository
- Report issues or suggest improvements
- Share it with your colleagues