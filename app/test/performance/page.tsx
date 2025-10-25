'use client'

import { useState, useMemo, useCallback } from 'react'

function ExpensiveCalculation({ number }: { number: number }) {
    const squared = useMemo(() => {
        console.log("Calculating..")
        return number * number
    }, [number])

    return <h2>Squared: {squared}</h2>
}

function Button({ onClick } : {onClick: () => void}) {
    return <button onClick={onClick}>Click!</button>
}

function App() {
    const [count, setCount] = useState(0)

    const handler = useCallback(() => {
        setCount(prev => prev + 1)
    }, [])
    
    return (
        <div>
            <ExpensiveCalculation number={10} />
            <Button onClick={handler} />
            <p>{count}</p>
        </div>
    )
}

export default App;

/**
 * 💡 useMemo - prevents expensive calculations from running unnecessarily
 * 💡 useCallback - prevents function recreation on every callback
 */
