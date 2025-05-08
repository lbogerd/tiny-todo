import * as vscode from "vscode";
import { MarkdownTodoProvider } from "../providers/MarkdownTodoProvider";

export class TodoView {
  private treeView: vscode.TreeView<any>;
  private provider: MarkdownTodoProvider;

  constructor(context: vscode.ExtensionContext) {
    this.provider = new MarkdownTodoProvider();

    this.treeView = vscode.window.createTreeView("markdownTodoView", {
      treeDataProvider: this.provider,
      showCollapseAll: true,
    });

    context.subscriptions.push(this.treeView);

    context.subscriptions.push(
      vscode.commands.registerCommand("markdownTodo.toggle", (item) => {
        this.provider.toggleTodo(item);
      })
    );
  }
}
