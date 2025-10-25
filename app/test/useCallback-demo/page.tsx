'use client'

import { useState, useCallback, memo } from 'react'

// ❌ WITHOUT useCallback - Child re-renders unnecessarily
function ParentBad() {
    const [count, setCount] = useState(0)
    const [otherState, setOtherState] = useState(0)

    // This function is recreated on EVERY render
    const handleClick = () => {
        console.log('Button clicked! (Bad)')
    }

    return (
        <div className="border-2 border-red-500 p-6 rounded-lg mb-8">
            <h2 className="text-xl font-bold text-red-600 mb-4">❌ WITHOUT useCallback</h2>
            <div className="space-y-2 mb-4">
                <p className="font-semibold">Count: {count}</p>
                <p className="font-semibold">Other State: {otherState}</p>
            </div>
            <div className="space-x-2 mb-4">
                <button 
                    onClick={() => setCount(count + 1)}
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                    Increment Count
                </button>
                <button 
                    onClick={() => setOtherState(otherState + 1)}
                    className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
                >
                    Change Other State
                </button>
            </div>
            
            {/* ExpensiveChild re-renders even when otherState changes */}
            <ExpensiveChild onClick={handleClick} label="Bad" />
            <p className="text-sm text-gray-600 mt-2">
                👆 Check console - this child re-renders on EVERY parent state change
            </p>
        </div>
    )
}

// ✅ WITH useCallback - Child only re-renders when necessary
function ParentGood() {
    const [count, setCount] = useState(0)
    const [otherState, setOtherState] = useState(0)

    // Function reference stays the same across renders
    const handleClick = useCallback(() => {
        console.log('Button clicked! (Good)')
    }, []) // Empty deps = never recreated

    return (
        <div className="border-2 border-green-500 p-6 rounded-lg">
            <h2 className="text-xl font-bold text-green-600 mb-4">✅ WITH useCallback</h2>
            <div className="space-y-2 mb-4">
                <p className="font-semibold">Count: {count}</p>
                <p className="font-semibold">Other State: {otherState}</p>
            </div>
            <div className="space-x-2 mb-4">
                <button 
                    onClick={() => setCount(count + 1)}
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                    Increment Count
                </button>
                <button 
                    onClick={() => setOtherState(otherState + 1)}
                    className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
                >
                    Change Other State
                </button>
            </div>
            
            {/* ExpensiveChild only re-renders when handleClick changes (never) */}
            <ExpensiveChild onClick={handleClick} label="Good" />
            <p className="text-sm text-gray-600 mt-2">
                👆 Check console - this child only re-renders when its props actually change
            </p>
        </div>
    )
}

// Memoized child component - only re-renders when props change
const ExpensiveChild = memo(({ onClick, label }: { onClick: () => void, label: string }) => {
    console.log(`🔄 ExpensiveChild (${label}) rendered at ${new Date().toLocaleTimeString()}`)
    
    // Simulate expensive calculation
    const expensiveCalculation = () => {
        let result = 0
        for (let i = 0; i < 10000000; i++) {
            result += i
        }
        return result
    }

    const calcResult = expensiveCalculation()

    return (
        <div className="bg-gray-100 border border-gray-300 p-4 rounded">
            <p className="text-sm font-semibold mb-2">Expensive Child Component ({label})</p>
            <p className="text-xs text-gray-600 mb-2">
                Calculation result: {calcResult.toLocaleString()}
            </p>
            <button 
                onClick={onClick}
                className="bg-indigo-500 text-white px-3 py-1 rounded text-sm hover:bg-indigo-600"
            >
                Click Me
            </button>
        </div>
    )
})

ExpensiveChild.displayName = 'ExpensiveChild'

// Main component
export default function UseCallbackDemo() {
    return (
        <div className="max-w-4xl mx-auto p-8">
            <h1 className="text-3xl font-bold mb-2">useCallback Demo</h1>
            <p className="text-gray-600 mb-8">
                Open your browser console and click the buttons to see the difference!
            </p>
            
            <ParentBad />
            <ParentGood />

            <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-bold text-lg mb-2">📚 Key Observations:</h3>
                <ul className="space-y-2 text-sm">
                    <li>
                        <strong>Without useCallback:</strong> Clicking "Change Other State" 
                        causes ExpensiveChild to re-render (check console)
                    </li>
                    <li>
                        <strong>With useCallback:</strong> Clicking "Change Other State" 
                        does NOT cause ExpensiveChild to re-render
                    </li>
                    <li>
                        <strong>Why?</strong> The function reference stays stable with useCallback, 
                        so memo() knows the props haven't changed
                    </li>
                    <li>
                        <strong>Performance:</strong> Prevents expensive re-calculations in child components
                    </li>
                </ul>
            </div>

            <div className="mt-4 p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h3 className="font-bold text-lg mb-2">⚠️ When to Use useCallback:</h3>
                <ul className="space-y-2 text-sm">
                    <li>✅ Passing callbacks to memo()-wrapped components</li>
                    <li>✅ Child component is expensive to render</li>
                    <li>✅ Using function as dependency in useEffect/useMemo</li>
                    <li>❌ Passing to native DOM elements (form, button, div)</li>
                    <li>❌ Function depends on frequently changing values</li>
                    <li>❌ Premature optimization without measuring</li>
                </ul>
            </div>
        </div>
    )
}

/**
 * 🎯 Summary:
 * - useCallback memoizes function references
 * - Combine with memo() to prevent unnecessary child re-renders
 * - Only use when you have measurable performance issues
 * - Don't use for native DOM elements or simple components
 */

