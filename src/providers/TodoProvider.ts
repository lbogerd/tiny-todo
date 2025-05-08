import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";

export type TodoItem = {
	lineNumber?: number;
	label: string;
	completed: boolean;
	level: 0 | 1 | 2;
	description?: string;
	subtasks: TodoItem[];
};

export function stringifyItem(item: TodoItem): string {
	let line = "";
	for (let i = 0; i < item.level; i++) {
		line += "-";
	}

	line += item.completed ? "[x] " : "[ ] ";
	line += item.label;

	if (item.description) {
		line += ` | ${item.description}`;
	}

	return line;
}

export class TodoTreeItem extends vscode.TreeItem {
	constructor(
		public readonly todoItem: TodoItem,
		public readonly collapsibleState: vscode.TreeItemCollapsibleState
	) {
		super(todoItem.label, collapsibleState);

		this.tooltip = todoItem.description;
		this.description = todoItem.description;
		this.checkboxState = todoItem.completed
			? vscode.TreeItemCheckboxState.Checked
			: vscode.TreeItemCheckboxState.Unchecked;
		this.contextValue = `todoItem`;
		this.command = {
			command: "tinyTodo.itemClicked",
			title: "Item Clicked",
			arguments: [this.todoItem],
		};
	}
}

export class TodoProvider implements vscode.TreeDataProvider<TodoTreeItem> {
	private _onDidChangeTreeData: vscode.EventEmitter<
		TodoTreeItem | undefined | void
	> = new vscode.EventEmitter<TodoTreeItem | undefined | void>();
	readonly onDidChangeTreeData: vscode.Event<TodoTreeItem | undefined | void> =
		this._onDidChangeTreeData.event;

	refresh(): void {
		this._onDidChangeTreeData.fire();
	}

	getTreeItem(element: TodoTreeItem): vscode.TreeItem {
		return element;
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
			);
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
			);
		}
	}

	public async toggleCheckboxState(
		item: TodoItem,
		checked: vscode.TreeItemCheckboxState
	): Promise<void> {
		const filePath =
			vscode.workspace.workspaceFolders &&
			vscode.workspace.workspaceFolders.length > 0
				? path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, "todo.txt")
				: "";

		const items = this.parseFileToItems(filePath);
		// find item to toggle in tasks, subtasks, and subsubtasks
		let itemToToggle: TodoItem | undefined;
		items.forEach((task) => {
			if (task.lineNumber === item.lineNumber) {
				itemToToggle = task;
			}

			task.subtasks.forEach((subtask) => {
				if (subtask.lineNumber === item.lineNumber) {
					itemToToggle = subtask;
				}

				subtask.subtasks.forEach((subsubtask) => {
					if (subsubtask.lineNumber === item.lineNumber) {
						itemToToggle = subsubtask;
					}
				});
			});
		});

		if (itemToToggle) {
			itemToToggle.completed = checked === vscode.TreeItemCheckboxState.Checked;
		}

		const lines: string[] = [];

		items.forEach((item) => {
			lines.push(stringifyItem(item));

			item.subtasks.forEach((subtask) => {
				lines.push(stringifyItem(subtask));

				subtask.subtasks.forEach((subsubtask) => {
					lines.push(stringifyItem(subsubtask));
				});
			});
		});

		fs.writeFileSync(filePath, lines.join("\n"));

		this.refresh();
	}

	private parseFileToItems(filePath: fs.PathLike): TodoItem[] {
		// expected file format:
		// [ ] task 1 | the description for task 1
		// - [ ] subtask 1 <intentionally left blank>
		// -- [x] subsubtask 1 | the last description

		const lines = fs.readFileSync(filePath, "utf-8").split("\n");
		const items: TodoItem[] = [];

		let i = 0;
		for (const line of lines) {
			// skip empty lines
			if (line.trim().length === 0) {
				continue;
			}

			// determine and set task level based on number of dashes at the start of the line
			// const level = line.match(/-/g)?.length ?? 0;
			const level = line.startsWith("--") ? 2 : line.startsWith("-") ? 1 : 0;
			const lineWithoutLevel = line.slice(level).trim();

			// determine and set completion status
			const completed = lineWithoutLevel.startsWith("[x]");
			const lineWithoutCompletion = lineWithoutLevel.slice(3);

			// determine and set label
			const label = lineWithoutCompletion.split("|")[0].trim();

			// check if there is a description, and if so, set it
			let description: string | undefined;
			if (line.includes("|")) {
				description = line.split("|")[1].trim();
			}

			const item: TodoItem = {
				lineNumber: i,
				label,
				completed,
				level,
				description,
				subtasks: [],
			};

			// add item to items
			switch (level) {
				case 0:
					items.push(item);
					break;
				case 1:
					items[items.length - 1].subtasks.push(item);
					break;
				case 2:
					items[items.length - 1].subtasks[
						items[items.length - 1].subtasks.length - 1
					].subtasks.push(item);
					break;
			}

			i++;
		}

		return items;
	}
}
