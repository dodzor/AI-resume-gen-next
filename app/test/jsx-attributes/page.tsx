'use client'

function Form() {
    return (
      <div>
        {/* className instead of class */}
        <div className="container">
          
          {/* htmlFor instead of for */}
          <label htmlFor="name">Name:</label>
          <input id="name" type="text" />
          
          {/* camelCase attributes */}
          <input 
            tabIndex={0}
            placeholder="Enter text"
          />
          
          {/* Event handlers are camelCase */}
          <button onClick={() => alert('Hi!')}>
            Click Me
          </button>
        </div>
      </div>
    )
  }

export default Form;
