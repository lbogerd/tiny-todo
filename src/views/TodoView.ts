import * as vscode from "vscode"
import {
	TodoItem,
	TodoItemLevel,
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
			"tinyTodo.add",
			async (item: TodoTreeItem) => {
				let newTodo: TodoItem | undefined = undefined

				const label = await vscode.window.showInputBox({
					prompt: "Enter the task name",
					placeHolder: "add feature x",
				})

				const description = await vscode.window.showInputBox({
					prompt: "Enter the task description",
					placeHolder: "so users can do y",
				})

				if (label) {
					newTodo = {
						lineNumber:
							item.todoItem.lineNumber !== undefined
								? item.todoItem.lineNumber + 1
								: undefined,
						completed: false,
						label: label,
						description: description,
						level:
							item.todoItem.level === 0 || item.todoItem.level === 1
								? ((item.todoItem.level + 1) as TodoItemLevel)
								: 0,
						subtasks: [],
					}
				}

				if (newTodo) {
					this._todoProvider?.add(newTodo)
				}
			}
		)

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
