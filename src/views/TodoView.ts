import * as vscode from "vscode"
import { TodoProvider, TodoTreeItem } from "../providers/TodoProvider"

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
			const test = e.items.map((item) => {
				return {
					lineNumber: item[0].todoItem.lineNumber,
					isSelected: item[1],
				}
			})
			console.log(test)
		})

		context.subscriptions.push(view)

		vscode.commands.registerCommand("tinyTodo.refresh", async () => {
			this._todoProvider?.refresh()
		})
	}
}
