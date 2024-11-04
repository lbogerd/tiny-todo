// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { TodoTreeDataProvider } from "./providers/todo-tree-data-provider";
import { Todo } from "./utils/todo";

export function activate(context: vscode.ExtensionContext) {
  // Determine the todo.txt file path
  const todoFilePath = determineTodoFilePath();

  const todoProvider = new TodoTreeDataProvider(todoFilePath);
  vscode.window.registerTreeDataProvider("tinyTodoView", todoProvider);

  vscode.commands.registerCommand("tinyTodo.completeTodo", (task: Todo) => {
    // Implement logic to toggle todo completion
    // Then refresh the tree view
    todoProvider.refresh();
  });

  vscode.commands.registerCommand(
    "tinyTodo.addTodo",
    async (parentTodo?: Todo) => {
      const label = await vscode.window.showInputBox({ prompt: "Task Label" });
      if (label) {
        // Implement logic to add todo
        // Then refresh the tree view
        todoProvider.refresh();
      }
    }
  );

  vscode.commands.registerCommand("tinyTodo.archiveTodos", () => {
    // Implement logic to move completed todos to done.txt
    // Then refresh the tree view
    todoProvider.refresh();
  });
}

function determineTodoFilePath(): string {
  // Implement logic to find or prompt for todo.txt
  // For simplicity, we'll assume it's in the workspace root
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (workspaceFolders) {
    return vscode.Uri.joinPath(workspaceFolders[0].uri, "todo.txt").fsPath;
  } else {
    vscode.window.showErrorMessage("No workspace folder found");
    throw new Error("No workspace folder found");
  }
}
