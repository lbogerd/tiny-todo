import * as fs from "fs"
import path from "path"
import * as vscode from "vscode"

export const getArchiveFilePath = () => {
	const archivePath = path.join(
		vscode.workspace.workspaceFolders![0].uri.fsPath,
		"todo-archive.txt"
	)
	const exists = fs.existsSync(archivePath)

	if (!exists) {
		fs.writeFileSync(archivePath, "")
	}

	return archivePath
}
/**
 * Adds lines of text to the top of the archive file
 * and adds a timestamp to the top of the file
 * @param text The text to add to the archive
 */
export const addToArchive = (text: string) => {
	const archivePath = getArchiveFilePath()

	const archive = fs.readFileSync(archivePath, "utf-8")

	const lines = archive.split("\n")

	lines.unshift(`# ${new Date().toLocaleString()}`)
	lines.unshift(text)

	fs.writeFileSync(archivePath, lines.join("\n"))
}

export const removeFromActiveFile = (lineNumbers: number[]) => {
	const activeFilePath = path.join(
		vscode.workspace.workspaceFolders![0].uri.fsPath,
		"todo.txt"
	)

	const lines = fs.readFileSync(activeFilePath, "utf-8").split("\n")

	const newLines = lines.filter((_, index) => {
		const lineNumber = index
		return !lineNumbers.includes(lineNumber)
	})

	fs.writeFileSync(activeFilePath, newLines.join("\n"))
}
