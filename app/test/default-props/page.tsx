'use client'

// Default props with destructuring
function Button({ 
    text, 
    color = 'blue',
    size = 'medium' 
  }: { text: string, color?: string, size?: string }) {
    return (
      <button className={'btn-' + size} style={{ color }}>
        {text}
      </button>
    )
  }
  
// Some props use defaults, some don't
function App() {
  return (
    <div>
    <Button text="Click me" />
    <Button text="Submit" color="green" size="large" />
    </div>
  )
}

export default App;
