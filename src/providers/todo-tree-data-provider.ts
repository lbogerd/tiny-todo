import * as vscode from "vscode";
import { Todo } from "../utils/todo";
import { parseFile } from "../utils/file-operations";

export class TodoTreeDataProvider implements vscode.TreeDataProvider<Todo> {
  private _onDidChangeTreeData = new vscode.EventEmitter<
    Todo | undefined | void
  >();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private tasks: Todo[] = [];
  private filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
    this.loadTodos();
  }

  refresh(): void {
    this.loadTodos();
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: Todo) {
    const treeItem = new vscode.TreeItem(
      element.label,
      element.children.length > 0
        ? vscode.TreeItemCollapsibleState.Collapsed
        : vscode.TreeItemCollapsibleState.None
    );

    treeItem.label = element.label;
    treeItem.tooltip = element.description;
    treeItem.contextValue = "todoItem";

    treeItem.iconPath = new vscode.ThemeIcon(
      element.completed ? "check" : "circle-outline"
    );

    return treeItem;
  }

  getChildren(element?: Todo): vscode.ProviderResult<Todo[]> {
    if (!element) {
      return Promise.resolve(this.tasks);
    }

    return Promise.resolve(element.children);
  }

  private loadTodos() {
    this.tasks = parseFile(this.filePath);
    this.refresh();
  }
}
