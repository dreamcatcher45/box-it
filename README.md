# Box It

Box It is a Visual Studio Code extension that simplifies code sharing with AI models while respecting your privacy. It allows you to selectively add code snippets to a single file, optionally including folder structure information, making it easy to provide context to AI models without sharing your entire codebase.

## Features

- **Add to Box**: Select code and add it to a centralized file (default: `box.txt`).
- **Folder Structure**: Optionally include your project's folder structure in the box file.
- **Privacy Control**: Choose what to share by selecting specific code snippets.
- **Grouping**: Group code snippets from the same file under a single directory path section.
- **Customizable**: Configure ignored folders, detailed folders, and more through VSCode settings.
- **Throw the Box**: Easily delete the box file when you're done.

## Usage

1. Select the code you want to add to the box.
2. Right-click and choose "Add to box" from the context menu.
3. To delete the box file, right-click in the editor (without selection) and choose "Throw the box".

## Demo

Click [here](https://github.com/dreamcatcher45/box-it/blob/master/demo.gif) to see the demo video

## Extension Settings

This extension contributes the following settings:

* `box-it.folderStructure`: Enable or disable folder structure in Box.txt (default: "On").
* `box-it.ignoreFolders`: Comma-separated list of folders to ignore in the folder structure (default: ".git,node_modules,.vscode").
* `box-it.detailedFolders`: Comma-separated list of folders to show in detail, including subfolders (default: "").
* `box-it.GroupSections`: Group code snippets from the same file under a single directory path section (default: "On").
* `box-it.filename`: The filename for saving the text file (default: "box").

## Known Issues

No known issues at this time. If you encounter any problems, please report them on our GitHub repository.

## Release Notes

See the [CHANGELOG.md](CHANGELOG.md) file for details on each release.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This extension is licensed under the [MIT License](LICENSE).