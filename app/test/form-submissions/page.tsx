'use client'
import { useState } from 'react'

function LoginForm() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        console.log('Login:', email, password)
    }
    
    return (
        <form onSubmit={handleSubmit}>
            <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                // required
            />
            <input 
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                // required
            />
            <button type="submit">Login</button>
        </form>
    )
}

export default LoginForm

/*
⚠️ Always preventDefault() on form submit
💡 Form validates before onSumit() fires
📌 Botton type="submit" triggers form submission
*/
