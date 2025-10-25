function NotifyUser({ user, count} : { user: {name: string}, count: number }) {
    return (
        <div>
            { /* Ternary operator */ }
            {user ? (
                <h1>Welcome, {user.name}</h1>
            ) : (
                <h1>Please sign in</h1>
            )}

            { /* Logical && operator */ }
            {count > 0 && (
                <p>You have {count} new messages</p>
            )}

            {/* Logical || for defaults */}
            {<p>Name: {user?.name || 'Guest'}</p>}

            {/* Prevent rendering with null */}
            {count === 0 ? null : <span>({count})</span>}
        </div>
    )
}

export default NotifyUser

/*
🟢 Essential - && shows element if condition is true
💡 Ternary (? :) for if-else rendering
⚠️ Remember: 0 and empty string render, null/undefined don't
*/
