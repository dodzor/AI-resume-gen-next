'use client'

// Component with props
function Greeting({ name, age }: { name: string, age: number }) {
    return (
      <div>
        <h1>Hello, {name}!</h1>
        <p>Age: {age}</p>
      </div>
    )
  }

// Using with props
function App() {
    return (
        <div>
        <Greeting name="Alice" age={25} />
        <Greeting name="Bob" age={30} />
        </div>
    )
}

export default App;
