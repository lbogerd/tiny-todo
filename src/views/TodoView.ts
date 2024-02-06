import * as vscode from "vscode"
import { TodoProvider } from "../providers/TodoProvider"

export class TodoView {
	private _todoProvider: TodoProvider | undefined = undefined
	readonly todoProvider: TodoProvider | undefined = this._todoProvider

	constructor(context: vscode.ExtensionContext) {
		this._todoProvider = new TodoProvider()

		const view = vscode.window.createTreeView("tinyTodoView", {
			treeDataProvider: this._todoProvider,
			showCollapseAll: true,
		})

		context.subscriptions.push(view)

		vscode.commands.registerCommand("tinyTodo.refresh", async () => {
			this._todoProvider?.refresh()
		})
	}
}
