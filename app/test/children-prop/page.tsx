'use client'

// component with children
function Card({ children, title }: { title: string, children: React.ReactNode }) {
    return (
      <div className="card">
        <h2>{title}</h2>
        <div className="content">
          {children}
        </div>
      </div>
    )
  }
  
// Pass content as children
function App() {
    return (
        <Card title="User Info">
        <p>Name: John Doe</p>
        <p>Email: john@example.com</p>
        <button>Edit</button>
        </Card>
    )
}

export default App;
