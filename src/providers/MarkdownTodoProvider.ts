import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";

type TodoItem = {
  level: 0 | 1 | 2 | 3; // hierarchy depth
  title: string; // task / heading text
  comment?: string; // optional "| ..." comment
  completed: boolean; // true if "[x]", false if "[ ]"
  children: TodoItem[]; // subtasks
};

export class MarkdownTodoProvider implements vscode.TreeDataProvider<TodoItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<
    TodoItem | undefined | void
  > = new vscode.EventEmitter<TodoItem | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<TodoItem | undefined | void> =
    this._onDidChangeTreeData.event;

  private todoFilePath: string | undefined;
  private items: TodoItem[] = [];
  private watcher: vscode.FileSystemWatcher | undefined;

  constructor() {
    this.init();
  }

  resolveTreeItem?(
    item: vscode.TreeItem,
    element: TodoItem,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.TreeItem> {
    throw new Error("Method not implemented.");
  }

  async init() {
    const files = await vscode.workspace.findFiles(
      "todo.{md,markdown,txt}",
      "**/node_modules/**",
      1
    );
    if (files.length > 0) {
      this.todoFilePath = files[0].fsPath;
      this.parseFile();
      this.setupWatcher();
    }
  }

  setupWatcher() {
    if (!this.todoFilePath) return;

    if (this.watcher) this.watcher.dispose();

    this.watcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(
        path.dirname(this.todoFilePath),
        path.basename(this.todoFilePath)
      )
    );

    this.watcher.onDidChange(() => this.parseFile());
    // Consider adding onDidCreate and onDidDelete if the todo file might be created/deleted during session
  }

  parseFile() {
    if (!this.todoFilePath) return;
    fs.readFile(this.todoFilePath, "utf8", (err, data) => {
      if (err) {
        this.items = []; // Clear items on error
        this._onDidChangeTreeData.fire();
        vscode.window.showErrorMessage(
          `Error reading todo file: ${err.message}`
        );
        return;
      }
      this.items = this.parseTodoMarkdown(data);
      this._onDidChangeTreeData.fire();
    });
  }

  // ---------- Parser ----------
  parseTodoMarkdown(md: string): TodoItem[] {
    const root: TodoItem[] = []; // top-level list
    const stack: TodoItem[] = []; // running parent stack

    md.split(/\r?\n/) // iterate line-by-line
      .map((l) => l.trimEnd()) // keep left whitespace (hyphens) but trim right
      .forEach((line) => {
        if (!line.trim()) return; // skip blank lines (allow lines with only whitespace for structure if needed by original, but new parser skips them)

        if (/^#{1,6}\s/.test(line)) {
          const [rawTitle, ...rawCommentParts] = line
            .replace(/^#+\s*/, "")
            .split(/\s*\|\s*/);
          const title = rawTitle.trim();
          const comment = rawCommentParts.join(" | ").trim() || undefined;

          const node: TodoItem = {
            level: 0,
            title,
            comment,
            completed: false, // Headings are not completable
            children: [],
          };

          root.push(node);

          stack.length = 0; // headings reset the stack
          stack.push(node);

          return;
        }

        /* ---- TASKS, SUBTASKS, SUB-SUBTASKS (-,--,---) ------------------- */
        // Regex adjusted for correct group names as per user's code
        const taskMatch =
          /^(?<dashes>-{1,3})\s*\[(?<done>[ xX])\]\s*(?<rest>.*)$/.exec(line);
        if (!taskMatch || !taskMatch.groups) return; // ignore anything that doesn't conform

        const { dashes, done, rest } = taskMatch.groups;
        const level = dashes.length as 1 | 2 | 3; // 1 = task, 2 = subtask, 3 = sub-subtask

        // split "title | comment" (first "|" wins)
        const [rawTitle, ...rawCommentParts] = rest.split(/\s*\|\s*/);
        const title = rawTitle.trim();
        const comment = rawCommentParts.join(" | ").trim() || undefined;

        const node: TodoItem = {
          level,
          title,
          comment,
          completed: /[xX]/.test(done),
          children: [],
        };

        while (stack.length && stack[stack.length - 1].level >= level) {
          // If current parent is a heading (level 0) and new item is level 1, allow direct attachment.
          // Otherwise, pop if parent level is same or greater.
          if (stack[stack.length - 1].level === 0 && level === 1) {
            break;
          }
          stack.pop();
        }
        const parent = stack[stack.length - 1];

        if (parent) {
          parent.children.push(node);
        } else {
          root.push(node); // malformed lines (e.g. subtask without parent task) fall back to root
        }

        // Keep the stack at the appropriate level for nesting
        // Pop items until we reach the correct parent level
        while (stack.length > level) {
          stack.pop();
        }
        // Ensure we're at the right level before adding the node
        if (stack.length === level) {
          // Replace the last item with the current node
          stack[stack.length - 1] = node;
        }

        stack.push(node); // This will add it to the end of the stack.
      });

    return root;
  }

  getTreeItem(element: TodoItem): vscode.TreeItem {
    const isHeading = element.level === 0;
    const treeItem = new vscode.TreeItem(
      element.title,
      element.children && element.children.length > 0
        ? vscode.TreeItemCollapsibleState.Expanded
        : vscode.TreeItemCollapsibleState.None
    );

    if (isHeading) {
      treeItem.contextValue = "heading";
      treeItem.iconPath = new vscode.ThemeIcon("symbol-namespace");
      treeItem.tooltip = element.comment ?? "";

      return treeItem;
    }

    // It's a todo item
    treeItem.contextValue = "todo";
    treeItem.checkboxState = element.completed
      ? vscode.TreeItemCheckboxState.Checked
      : vscode.TreeItemCheckboxState.Unchecked;
    treeItem.command = {
      command: "markdownTodo.toggle",
      title: "Toggle Todo",
      arguments: [element],
    };
    treeItem.tooltip = element.comment ?? "";

    return treeItem;
  }

  getChildren(element?: TodoItem): Thenable<TodoItem[]> {
    if (!this.todoFilePath) return Promise.resolve([]);
    if (!element) return Promise.resolve(this.items); // Root items
    return Promise.resolve(element.children); // Children of the given element
  }

  getParent(element: TodoItem): TodoItem | undefined {
    // Helper function to find parent recursively
    const findParentRecursive = (
      currentItems: TodoItem[],
      target: TodoItem,
      potentialParent?: TodoItem
    ): TodoItem | undefined => {
      for (const item of currentItems) {
        if (item === target) {
          // Should not happen if target is not a root item
          return potentialParent;
        }
        if (item.children) {
          if (item.children.includes(target)) {
            return item; // Found parent
          }
          const found = findParentRecursive(item.children, target, item);
          if (found) return found;
        }
      }
      return undefined;
    };

    // Search from the root items
    if (!this.items.includes(element)) {
      // element is not a root item
      for (const rootItem of this.items) {
        if (rootItem.children.includes(element)) return rootItem;
        const parent = findParentRecursive(
          rootItem.children,
          element,
          rootItem
        );
        if (parent) return parent;
      }
    }
    return undefined; // Element is a root item or not found (should not happen for valid element)
  }

  refresh() {
    this.parseFile();
  }

  private serializeTodoItemsToMarkdown(items: TodoItem[]): string {
    let md = "";
    const serialize = (item: TodoItem, currentIndent = "") => {
      if (item.level === 0) {
        // Heading
        // Ensure a blank line before a new heading unless it's the first item
        if (md.length > 0 && !md.endsWith("\n\n")) {
          if (!md.endsWith("\n")) md += "\n";
          md += "\n";
        }
        md += `# ${item.title}`;
        if (item.comment) {
          md += ` | ${item.comment}`;
        }
        md += "\n";
        item.children.forEach((child) => serialize(child, "")); // Reset indent for children of heading
      } else {
        // Task
        // Determine prefix based on level (1, 2, or 3 dashes)
        const prefix = "-".repeat(item.level);
        const checkbox = item.completed ? "[x]" : "[ ]";

        // For sub-items, the indentation comes from the existence of parent, not just dashes
        // The parser uses number of dashes for level, so we replicate that.
        md += `${prefix} ${checkbox} ${item.title}`;
        if (item.comment) {
          md += ` | ${item.comment}`;
        }
        md += "\n";
        item.children.forEach((child) =>
          serialize(child, currentIndent + "  ")
        ); // Add indent for sub-tasks visually if needed (parser handles by dashes)
      }
    };
    items.forEach((item) => serialize(item));
    // Ensure file ends with a newline character for POSIX compatibility
    if (md.length > 0 && !md.endsWith("\n")) {
      md += "\n";
    }
    return md;
  }

  async toggleTodo(itemToToggle: TodoItem) {
    if (!this.todoFilePath) return;

    // Find the item in the current tree and toggle its state
    let found = false;
    const toggleRecursively = (items: TodoItem[]) => {
      for (const item of items) {
        if (item === itemToToggle) {
          item.completed = !item.completed;
          found = true;
          return;
        }
        if (item.children) {
          toggleRecursively(item.children);
          if (found) return;
        }
      }
    };

    toggleRecursively(this.items);

    if (found) {
      // Re-serialize the entire todo list to markdown
      const newMarkdownContent = this.serializeTodoItemsToMarkdown(this.items);
      try {
        fs.writeFileSync(this.todoFilePath, newMarkdownContent, "utf8");
        // The file watcher will pick up the change and call parseFile(),
        // which will then call _onDidChangeTreeData.fire().
        // If watcher is unreliable or for immediate feedback, you might call this.parseFile() directly.
        // However, this could lead to double parsing if the watcher is also quick.
        // For robustness, let the watcher handle it.
        // this._onDidChangeTreeData.fire(); // Or this.parseFile();
      } catch (err: any) {}
    } else {
      vscode.window.showWarningMessage(
        "Could not find the todo item to toggle."
      );
    }
  }
}
