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

	refresh(): void {
		this._onDidChangeTreeData.fire()
	}

	getTreeItem(element: TodoTreeItem): vscode.TreeItem {
		return element
	}

	getChildren(element?: TodoTreeItem): Thenable<TodoTreeItem[]> {
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
				this.parseFileToItems(
					vscode.workspace.workspaceFolders &&
						vscode.workspace.workspaceFolders.length > 0
						? path.join(
								vscode.workspace.workspaceFolders[0].uri.fsPath,
								"todo.txt"
						  )
						: ""
				).map(
					(todoItem) =>
						new TodoTreeItem(
							todoItem,
							todoItem.subtasks.length > 0
								? vscode.TreeItemCollapsibleState.Expanded
								: vscode.TreeItemCollapsibleState.None
						)
				)
			)
		}
	}

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
			const levels: TaskLevel[] = ["task", "subtask", "subsubtask"]
			const levelAsNumber = line.match(/_/g)?.length ?? 0

			if (levelAsNumber > 2) {
				throw new Error("Invalid level")
			}

			let level: TaskLevel = levels[levelAsNumber]

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
