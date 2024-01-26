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

export class TodoTreeItem extends vscode.TreeItem {
	constructor(
		public readonly todoItem: TodoItem,
		public readonly collapsibleState: vscode.TreeItemCollapsibleState
	) {
		super(todoItem.label, collapsibleState)

		this.tooltip = todoItem.description ?? ""
		this.description = todoItem.description ?? ""
		this.checkboxState = todoItem.completed
			? vscode.TreeItemCheckboxState.Checked
			: vscode.TreeItemCheckboxState.Unchecked
	}

	contextValue = "todoItem"
}

export class TodoProvider implements vscode.TreeDataProvider<TodoTreeItem> {
	private _onDidChangeTreeData: vscode.EventEmitter<
		TodoTreeItem | undefined | void
	> = new vscode.EventEmitter<TodoTreeItem | undefined | void>()
	readonly onDidChangeTreeData: vscode.Event<TodoTreeItem | undefined | void> =
		this._onDidChangeTreeData.event

	constructor(private workspaceRoot: string) {}

	refresh(): void {
		this._onDidChangeTreeData.fire()
	}

	getTreeItem(element: TodoTreeItem): vscode.TreeItem {
		return element
	}

	getChildren(element?: TodoTreeItem): Thenable<TodoTreeItem[]> {
		// TODO: is this needed if we generate the file on activation?
		if (!this.workspaceRoot) {
			vscode.window.showInformationMessage("No todo.txt found")
			return Promise.resolve([])
		}

		if (element) {
			return Promise.resolve(
				element.todoItem.subtasks.map(
					(subtask) =>
						new TodoTreeItem(
							subtask,
							subtask.subtasks.length > 0
								? vscode.TreeItemCollapsibleState.Expanded
								: vscode.TreeItemCollapsibleState.None
						)
				)
			)
		} else {
			return Promise.resolve(
				this.parseFileToItems(path.join(this.workspaceRoot, "todo.txt")).map(
					(todoItem) =>
						new TodoTreeItem(todoItem, vscode.TreeItemCollapsibleState.Expanded)
				)
			)
		}
	}

	// getChildren(
	// 	element?: TodoItem | undefined
	// ): vscode.ProviderResult<TodoItem[]> {
	// 	if (element) {
	// 		return Promise.resolve(element.subtasks)
	// 	} else {
	// 		const todoFile = path.join(this.workspaceRoot, "todo.txt")
	// 		if (fs.existsSync(todoFile)) {
	// 			const todosParsedFromFile = this.parseFileToItems(todoFile)

	// 			// // convert the parsed items into a tree to be displayed
	// 			// // making sure to include subtasks and subsubtasks as children
	// 			// // of their parent tasks
	// 			// const tree: TodoItem[] = []
	// 			// for (const todo of todosParsedFromFile) {
	// 			// 	if (todo.level === "task") {
	// 			// 		tree.push(todo)
	// 			// 	} else if (todo.level === "subtask") {
	// 			// 		tree[tree.length - 1].subtasks.push(todo)
	// 			// 	} else if (todo.level === "subsubtask") {
	// 			// 		tree[tree.length - 1].subtasks[
	// 			// 			tree[tree.length - 1].subtasks.length - 1
	// 			// 		].subtasks.push(todo)
	// 			// 	}
	// 			// }
	// 			// temp test tree
	// 			const tree = {
	// 				"main task": {
	// 					"subtask 1": {
	// 						"subsubtask 1": {},
	// 						"subsubtask 2": {},
	// 					},
	// 				},
	// 			}

	// 			// @ts-ignore
	// 			return Promise.resolve(tree)
	// 		} else {
	// 			return Promise.resolve([])
	// 		}
	// 	}
	// }

	private parseFileToItems(filePath: fs.PathLike): TodoItem[] {
		// expected file format:
		// [ ] task 1 | the description for task 1
		// _[ ] subtask 1 <intentionally left blank>
		// __[x] subsubtask 1 | the last description

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
