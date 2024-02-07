import * as vscode from "vscode"
import { TodoProvider } from "../providers/TodoProvider"
import * as fs from "fs"
import path from "path"

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
