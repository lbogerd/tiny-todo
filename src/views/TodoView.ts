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

		vscode.commands.registerCommand(
			"tinyTodo.addTodo",
			(item?: TodoTreeItem) => {
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

						vscode.window
							.showInputBox({
								prompt: "Enter an optional comment",
								placeHolder: "Optional: describe your todo in more detail",
							})
							.then((commentText) => {
								let newTodoEntry = `[ ] ${newTodoText.trim()}`;

								if (commentText && commentText.trim() !== "") {
									newTodoEntry += ` | ${commentText.trim()}`;
								}

								try {
									if (item && item.todoItem.lineNumber !== undefined) {
										const { lineNumber, level, subtasks } = item.todoItem;

										// insert the new todo as a subtask of the item
										newTodoEntry = `${"-".repeat(
											// max level is 2
											Math.min(level + 1, 2)
										)}${newTodoEntry.trim()}`;

										const lineToInsertAfter = subtasks.length
											? lineNumber + 1 + subtasks.length
											: lineNumber + 1;

										const fileContent = fs.readFileSync(todoFilePath, "utf-8");
										const lines = fileContent.split("\n");

										// Line numbers are 1-based, array indices are 0-based
										lines.splice(lineToInsertAfter, 0, newTodoEntry);

										fs.writeFileSync(todoFilePath, lines.join("\n"));
									} else {
										// Append to the end of the file if no item or item has no line number
										fs.appendFileSync(todoFilePath, `\n${newTodoEntry}`);
									}

									this._todoProvider?.refresh();
								} catch (err) {
									vscode.window.showErrorMessage(
										"Failed to add new todo: " + (err as Error).message
									);
								}
							});
					});
			}
		);

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
