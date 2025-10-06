function UserCard() {
    const name = 'Alice'
    const age = 25
    const isAdult = age >= 18
    const hobbies = ['Reading', 'Traveling', 'Cooking']

    return (
        <div>
            { /* Variables */}
            <h2>{age}</h2>

            {/* Math expressions*/ }
            <p>Age: {age + 1} next year</p>

            {/* Conditional expressions*/ }
            <p>Is adult: {isAdult ? 'Yes' : 'No'}</p>

            {/* Function calls */ }
            <p>UpperCase: {name.toUpperCase()}</p>

            {/* Array and object expressions */}
            <p>Hobbies string array: {hobbies.join(', ')}</p>
            <p>Hobbies JSON array: {JSON.stringify(hobbies)}</p>
        </div>
    )
}

export default UserCard;