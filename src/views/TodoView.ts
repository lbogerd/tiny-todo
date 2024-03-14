import * as vscode from "vscode"
import {
	TodoProvider,
	TodoTreeItem,
	stringifyItem,
} from "../providers/TodoProvider"
import * as fs from "fs"
import path from "path"
import { addLinesToArchive, removeLinesFromActiveFile } from "../utils/archive"

export class TodoView {
	private _todoProvider: TodoProvider | undefined = undefined
	readonly todoProvider: TodoProvider | undefined = this._todoProvider

	constructor(context: vscode.ExtensionContext) {
		const provider = new TodoProvider()
		this._todoProvider = provider

		const view = vscode.window.createTreeView("tinyTodoView", {
			treeDataProvider: this._todoProvider,
			showCollapseAll: true,
		})

		view.onDidChangeCheckboxState((e) => {
			e.items.forEach((item) => {
				this._todoProvider?.toggleCheckboxState(item[0].todoItem, item[1])
			})
		})

		context.subscriptions.push(view)

		vscode.commands.registerCommand("tinyTodo.refresh", async () => {
			this._todoProvider?.refresh()
		})

		vscode.commands.registerCommand(
			"tinyTodo.archive",
			(item: TodoTreeItem) => {
				// archive item and sub items and sub sub items
				const itemsToArchive = [
					item.todoItem,
					...item.todoItem.subtasks.flat(),
					...item.todoItem.subtasks.flatMap((subtask) => subtask.subtasks),
				]

				addLinesToArchive(
					itemsToArchive.map((item) => stringifyItem(item)),
					true
				)

				removeLinesFromActiveFile(
					itemsToArchive.map((item) => item.lineNumber!)
				)
			}
		)

		fs.watch(
			path.join(vscode.workspace.workspaceFolders![0].uri.fsPath, "todo.txt"),
			(eventType) => {
				if (eventType !== "change") {
					return
				}

				this._todoProvider?.refresh()
			}
		)
	}
}
