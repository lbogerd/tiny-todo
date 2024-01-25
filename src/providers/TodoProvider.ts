import * as vscode from "vscode"
import * as fs from "fs"
import * as path from "path"

type TodoItem = {
	label: string
	completed?: boolean
	description?: string
	subtasks?: TodoItem[]
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
		throw new Error("Method not implemented.")
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

	private getTodoItemFromLine(line: string): TodoItem | undefined {
		// tasks will be stored in a simple text file
		// example format:
		// [ ] task 1
		// - [ ] subtask 1 | subtask description
		// -- [x] subsubtask 1
		// the parsed object will be:
		// {
		// 	label: "task 1",
		// 	completed: false,
		// 	description: undefined,
		// 	subtasks: [
		// 		{
		// 			label: "subtask 1",
		// 			completed: false,
		// 			description: "subtask description",
		// 			subtasks: [
		// 				{
		// 					label: "subsubtask 1",
		// 					completed: true
		// 					description: undefined,
		// 					subtasks: undefined,
		// 				}
		// 			],
		// 		},
		// 	],
		// }
		if (!line) {
			return undefined
		}

		// check if line follows the format
		if (!line.startsWith("-") && !line.startsWith("[ ]")) {
			return undefined
		}

		// get the indentation level
		let indentationLevel = 0
		if (line.startsWith("[")) {
			indentationLevel = 0
		} else if (line.startsWith("--")) {
			indentationLevel = 2
		} else if (line.startsWith("-")) {
			indentationLevel = 1
		} else {
			return undefined
		}

		// get the label
		const label = line.substring(4).split("|")[0].trim()

		// get the description if it exists
		let description = line.split("|")[1]

		// get the completed status
		let completed = line.toLocaleLowerCase().includes("[x]")
	}
	private getTodoItemsFromFile(filePath: string): TodoItem[] {
		if (!fs.existsSync(filePath)) {
			// create file because it doesn't exist
			fs.writeFileSync(filePath, "")
		}

		const fileContent = fs.readFileSync(filePath, "utf8")
		const lines = fileContent.split("\n")
		const todoItems: TodoItem[] = []

		for (const line of lines) {
			const todoItem = this.getTodoItemFromLine(line)
			if (todoItem) {
				todoItems.push(todoItem)
			}
		}

		return todoItems
	}
}
