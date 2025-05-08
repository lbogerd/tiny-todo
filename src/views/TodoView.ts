import * as fs from "fs";
import path from "path";
import * as vscode from "vscode";
import {
	TodoProvider,
	TodoTreeItem,
	stringifyItem,
} from "../providers/TodoProvider";
import { addLinesToArchive, removeLinesFromActiveFile } from "../utils/archive";

export class TodoView {
	private _todoProvider: TodoProvider | undefined = undefined;
	readonly todoProvider: TodoProvider | undefined = this._todoProvider;

	constructor(context: vscode.ExtensionContext) {
		const provider = new TodoProvider();
		this._todoProvider = provider;

		const view = vscode.window.createTreeView("tinyTodoView", {
			treeDataProvider: this._todoProvider,
			showCollapseAll: true,
		});

		view.onDidChangeCheckboxState((e) => {
			e.items.forEach((item) => {
				this._todoProvider?.toggleCheckboxState(item[0].todoItem, item[1]);
			});
		});

		context.subscriptions.push(view);

		vscode.commands.registerCommand("tinyTodo.refresh", async () => {
			this._todoProvider?.refresh();
		});

		vscode.commands.registerCommand(
			"tinyTodo.archive",
			(item: TodoTreeItem) => {
				// archive item and sub items and sub sub items
				const itemsToArchive = [
					item.todoItem,
					...item.todoItem.subtasks.flat(),
					...item.todoItem.subtasks.flatMap((subtask) => subtask.subtasks),
				];

				addLinesToArchive(
					itemsToArchive.map((item) => stringifyItem(item)),
					true
				);

				removeLinesFromActiveFile(
					itemsToArchive.map((item) => item.lineNumber!)
				);
			}
		);

		vscode.commands.registerCommand("tinyTodo.addTodo", (level: number = 0) => {
			const todoFilePath = path.join(
				vscode.workspace.workspaceFolders![0].uri.fsPath,
				"todo.txt"
			);

			vscode.window
				.showInputBox({ prompt: "Enter a new todo item" })
				.then((newTodoText) => {
					if (newTodoText === undefined || newTodoText.trim() === "") {
						// User cancelled or entered empty string for todo
						return;
					}

					const todoBase = `${"-".repeat(level)}[ ] ${newTodoText.trim()}`;

					vscode.window
						.showInputBox({
							prompt: "Enter an optional comment",
							placeHolder: "Optional: describe your todo in more detail",
						})
						.then((commentText) => {
							let newTodoEntry = `\n${todoBase}`;

							if (commentText && commentText.trim() !== "") {
								newTodoEntry += ` | ${commentText.trim()}`;
							}

							try {
								fs.appendFileSync(todoFilePath, newTodoEntry);
								this._todoProvider?.refresh();
							} catch (err) {
								vscode.window.showErrorMessage(
									"Failed to add new todo: " + (err as Error).message
								);
							}
						});
				});
		});

		fs.watch(
			path.join(vscode.workspace.workspaceFolders![0].uri.fsPath, "todo.txt"),
			(eventType) => {
				if (eventType !== "change") {
					return;
				}

				this._todoProvider?.refresh();
			}
		);
	}
}
