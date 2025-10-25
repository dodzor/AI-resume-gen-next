function Comments() {
    return (
        <div>
            { /* Single line comment */ }
            <h1>Title</h1>

            {/* 
              Multi-line 
              comment
              */}
              <p>Comment</p>

              {/* Conditional comment 
              {false && <p>This won't render</p>}
              */}
        </div>
    )
}

// This is a regular comment
// Regular comments work outside of jsx

/*
💡 JSX comments must be inside {/* */ //}
/*
📌 Regular // comments work outside JSX
⚡ Comments don't appear in rendered HTML
*/
