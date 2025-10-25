'use client'

import { useState } from 'react';
 
function Form() {
    const [name, setName] = useState('')

    return (
        <div>
            <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter name"
            />
            <p>Hello {name}</p>
        </div>
    )
}

export default Form

/*
🟢 Essential - React controlls the input value
💡 Value comes from state, onChange updates state
📌 Single form of truth for form data
*/
