'use client'

// Simple function component
function Welcome() {
    return <h1>Hello, World!</h1>
}
  
// Arrow function syntax
const Welcome2 = () => {
    return <h1>Hello, World 2!</h1>
}
  
// Using the component
function App() {
    return (
        <div>
            <Welcome />
            <Welcome2 />
        </div>
    )
}

export default App;