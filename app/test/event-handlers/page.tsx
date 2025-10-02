'use client'

// Click event
function Button() {
    const handleClick = () => {
        alert('Clicked! ')
    }

    return <button onClick={handleClick}>Click me</button>
}

// Event with parameters
function Item({ id, name, onDelete }: { id: number, name: string, onDelete: (itemId: number) => void}) {
    return (
        <div>
            <span>{name}</span>
            <button onClick={() => onDelete(id)}>Delete</button>
        </div>
    )
}


function App() {
    const handleDelete = (itemId: number) => {
        console.log('Deleting:', itemId)
    }

    return (
        <>
        <Button />
        <Item id={1} name="Task" onDelete={handleDelete} />
        </>
    )
}

export default App;
