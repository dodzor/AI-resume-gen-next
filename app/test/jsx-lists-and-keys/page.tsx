function TodoList() {
    const todos = [
        { id: 1, text: 'Learn React' },
        { id: 2, text: 'Build an app' },
        { id: 3, text: 'Deploy it' }
    ];

    return (
        <ul>
            {todos.map(todo => (
                <li key={todo.id}>
                    {todo.text}
                </li>
            ))}
        </ul>
    )
}

export default TodoList;

/*
* 🟢 Essential - always include key prop in lists
* 💡 Keys help React track changes efficiently
* ⚠️ Keys must be unique among siblings
*/
