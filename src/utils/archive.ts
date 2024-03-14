import * as fs from "fs"
import path from "path"
import * as vscode from "vscode"

export const getArchiveFilePath = () => {
	const archivePath = path.join(
		vscode.workspace.workspaceFolders![0].uri.fsPath,
		"done.txt"
	)
	const exists = fs.existsSync(archivePath)

	if (!exists) {
		fs.writeFileSync(archivePath, "")
	}

	return archivePath
}

/**
 * Adds lines to the archive file.
 * @param lines - An array of strings representing the lines to be added.
 * @param timestamp - Optional boolean flag indicating whether to add a timestamp to each line.
 * @returns The updated archive content.
 */
export const addLinesToArchive = (lines: string[], timestamp?: boolean) => {
	const archivePath = getArchiveFilePath()

	const archive = fs.readFileSync(archivePath, "utf-8")

	const existingLines = archive.split("\n")

	let newLines = lines
	if (timestamp) {
		const now = new Date()
		const timestamp = `# ${now.toISOString()}`
		newLines = [timestamp, ...lines]
	}

	const updatedArchive = [...existingLines, ...newLines].join("\n")

	fs.writeFileSync(archivePath, updatedArchive)

	return updatedArchive
}

/**
 * Removes lines from the active file based on the provided line numbers.
 * @param lineNumbers An array of line numbers to be removed.
 * @returns An array of lines after the removal.
 */
export const removeLinesFromActiveFile = (lineNumbers: number[]) => {
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

	return newLines
}
