'use client'

// Bad Practice (Props drilling)
function Grandparent() {
    return <Parent message="Hello from Grandparent" />
}

function Parent({ message }: {message: string}) {
    return <Child message={message} />
}

function Child({ message }: {message: string}) {
    return <h2>{message}</h2>
}

// Better: Use Context API 
import { createContext, useContext } from "react"

const MessageContext = createContext<string>("")

function Grandparent2() {
    return (
        <MessageContext.Provider value="Hello from Grandparent">
            <Parent2 />
        </MessageContext.Provider>
    )
}

function Parent2() {
    return <Child2 />
}

function Child2() {
    const message = useContext(MessageContext)
    return <h2>{message}</h2>
}

/**
 * 💡 No need to manually pass message at every level
 * 📌 Easier to manage shared data 
 */
