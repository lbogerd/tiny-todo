import * as vscode from "vscode"
import * as fs from "fs"
import * as path from "path"

type TaskLevel = "task" | "subtask" | "subsubtask"

type TodoItem = {
	label: string
	completed: boolean
	level: TaskLevel
	description?: string
	subtasks: TodoItem[]
}

export class TodoProvider implements vscode.TreeDataProvider<TodoItem> {
	constructor(private workspaceRoot: string) {}
	// onDidChangeTreeData?:
	// 	| vscode.Event<void | TodoItem | TodoItem[] | null | undefined>
	// 	| undefined
	getTreeItem(element: TodoItem): vscode.TreeItem | Thenable<vscode.TreeItem> {
		return element
	}

	getChildren(
		element?: TodoItem | undefined
	): vscode.ProviderResult<TodoItem[]> {
		if (!this.workspaceRoot) {
			vscode.window.showInformationMessage("No dependency in empty workspace")
			return Promise.resolve([])
		}

		if (element) {
			return Promise.resolve(element.subtasks)
		} else {
			const todoFile = path.join(this.workspaceRoot, "todo.txt")
			if (fs.existsSync(todoFile)) {
				return Promise.resolve(this.parseFileToItems(todoFile))
			} else {
				return Promise.resolve([])
			}
		}
	}
	// getParent?(element: TodoItem): vscode.ProviderResult<TodoItem> {
	// 	throw new Error("Method not implemented.")
	// }
	// resolveTreeItem?(
	// 	item: vscode.TreeItem,
	// 	element: TodoItem,
	// 	token: vscode.CancellationToken
	// ): vscode.ProviderResult<vscode.TreeItem> {
	// 	throw new Error("Method not implemented.")
	// }

	// expected file format:
	// [ ] task 1 | the description for task 1
	// _[ ] subtask 1 <intentionally left blank>
	// __[x] subsubtask 1 | the last description

	private parseFileToItems(filePath: fs.PathLike): TodoItem[] {
		const lines = fs.readFileSync(filePath, "utf-8").split("\n")
		const items: TodoItem[] = []

		for (const line of lines) {
			// skip empty lines
			if (line.trim().length === 0) {
				continue
			}

			// determine and set task level
			const levelAsNumber = line.match(/_/g)?.length ?? 0
			let level: TaskLevel = "task"
			switch (levelAsNumber) {
				case 0:
					level = "task"
					break
				case 1:
					level = "subtask"
					break
				case 2:
					level = "subsubtask"
					break
				default:
					throw new Error("Invalid level")
			}

			// determine and set completion status
			const completed = line
				// chop off the level (e.g. "__")
				.substring(levelAsNumber)
				.toLowerCase()
				.startsWith("[x]")

			// determine and set label
			const label = line
				// chop off the level and completion status (e.g. "__[x] ")
				.substring(levelAsNumber + 4)
				.split("|")[0]
				.trim()

			// check if there is a description, and if so, set it
			let description: string | undefined
			if (line.includes("|")) {
				description = line.split("|")[1].trim()
			}

			// add item to items
			// TODO: refactor this to be more DRY
			switch (level) {
				case "task":
					items.push({
						label,
						completed,
						level,
						description,
						subtasks: [],
					})
					break
				case "subtask":
					items[items.length - 1].subtasks.push({
						label,
						completed,
						level,
						description,
						subtasks: [],
					})
					break
				case "subsubtask":
					items[items.length - 1].subtasks[
						items[items.length - 1].subtasks.length - 1
					].subtasks.push({
						label,
						completed,
						level,
						description,
						subtasks: [],
					})
					break
			}
		}

		return items
	}
}
