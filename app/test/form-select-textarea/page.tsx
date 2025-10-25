
'use client'

import { useState } from 'react'

function Survey() {
    const [country, setCountry] = useState('us')
    const [comments, setComments] = useState('')

    return (
        <div>
            <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
            >
                <option value='us'>United States</option>
                <option value='uk'>United Kingdom</option>
                <option value='us'>Canada</option>
            </select>

            <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Your comments.."
            />
        </div>
    )
}

function App() {
    return (
        <Survey />
    )
}

export default App

/*
💡 Select uses value prop, not selected attribute 
   - you only need to track one value instead of managing which child has selected
📌 Textarea uses value, not children 
   - in React all form inputs work the same way - you set/read their value via the value prop
⚡ Same pattern as input elements 
*/
