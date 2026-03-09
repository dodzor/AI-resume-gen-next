'use client'

import { useState } from 'react'

function Preferences() {
    const [subscribe, setSubscribe] = useState(false)
    const [frequency, setFrequency] = useState('weekly')

    return (
        <div>
            <label>
                <input 
                    type="checkbox"
                    checked={subscribe}
                    onChange={e => setSubscribe(e.target.checked)}
                />
                Subscribe to newsletter
            </label>

            <div>
                <label>
                    <input
                        type="radio"
                        value="daily"
                        checked={frequency === 'daily'}
                        onChange={e => setFrequency(e.target.value)}
                    />
                    Daily
                </label>
                <label>
                    <input
                        type="radio"
                        value="weekly"
                        checked={frequency === 'weekly'}
                        onChange={e => setFrequency(e.target.value)}
                    />
                    Weekly
                </label>
            </div>
        </div>
    )
}

function App() {
    return (
        <Preferences />
    )
}

export default App

/*
💡 Checkboxes use checked prop and e.target.value
📌 Radio buttons share same state variable
*/
