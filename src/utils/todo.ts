export class Todo {
  label: string;
  description?: string;
  completed: boolean;
  level: number;
  children: Todo[];

  constructor(
    label: string,
    description: string | undefined,
    completed: boolean,
    level: number
  ) {
    this.label = label;
    this.description = description;
    this.completed = completed;
    this.level = level;
    this.children = [];
  }
}
