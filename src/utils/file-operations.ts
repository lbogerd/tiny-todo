import * as fs from "fs";
import * as path from "path";

import { Todo } from "./todo";

export function parseFile(filePath: string): Todo[] {
  // read file
  const fileContent = fs.readFileSync(filePath, "utf-8");
  const lines = fileContent.split("\n").filter((line) => line.trim() !== "");

  const todos: Todo[] = [];
  const stack: Todo[] = [];

  lines.forEach((line) => {
    // count leading underscores to determine level/depth (up to 2 deep for a total of 3 levels)
    const level = line.startsWith("__") ? 2 : line.startsWith("_") ? 1 : 0;
    // chop off leading underscores
    const cleanLine = line.substring(level);
    // everything before the first | is the label, everything after is the description
    const [label, description] = cleanLine.split("|");
    // check if the line is completed by checking if it starts with "[x]"
    const completed = cleanLine.startsWith("[x]");

    const todo = new Todo(label.trim(), description?.trim(), completed, level);

    // if the stack is empty, add the todo to the list
    if (stack.length === 0) {
      todos.push(todo);
    } else {
      // if the level of the todo is greater than the level of the last todo in the stack, add it as a child
      if (level > stack[stack.length - 1].level) {
        stack[stack.length - 1].children.push(todo);
      } else {
        // if the level of the todo is less than or equal to the level of the last todo in the stack, pop the stack
        while (stack.length > 0 && level <= stack[stack.length - 1].level) {
          stack.pop();
        }
        // add the todo as a child of the last todo in the stack
        if (stack.length > 0) {
          stack[stack.length - 1].children.push(todo);
        } else {
          todos.push(todo);
        }
      }
    }
  });

  return todos;
}
