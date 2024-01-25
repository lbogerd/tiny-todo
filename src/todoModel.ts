export type TodoItem = {
	label: string
	completed: boolean
}

export class TodoList {
	private items: TodoItem[] = []

	constructor() {
		// TODO: Load existing items from a file or other storage
	}

	getItems(): TodoItem[] {
		return this.items
	}

	addItem(label: string): void {
		this.items.push({ label, completed: false })
		// TODO: Save to a file or other storage
	}

	toggleItem(index: number): void {
		if (this.items[index]) {
			this.items[index].completed = !this.items[index].completed
			// TODO: Save to a file or other storage
		}
	}
}
