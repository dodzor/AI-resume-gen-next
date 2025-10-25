'use-client'

// Proptypes

// npm i --save-dev @types/prop-types
import PropTypes from 'prop-types'

function User({ name, age, email }: {name: string, age: number, email: string}) {
    return <div>{name}, {age}, {email}</div>
}

// Note: Proptypes are a legacy feature from before Typescript
// With Typescript, you get type checking at compile time, making Proptypes redundant
User.propTypes = {
    name: PropTypes.string.isRequired,
    age: PropTypes.number,
    email: PropTypes.string.isRequired
}

// Typescript
interface UserProps {
    name: string
    age?: number
    email: string
}

const User: React.FC<UserProps> = ({ name, age = 0, email }) => {
    return <div>{name}, {age}, {email}</div>
}

/**
 * ⚛️ PropTypes for runtime checking, TypeScript for compile-time
 * 💡 TypeScript provides better IDE support and refactoring
 * 📌 Use discriminated unions for component variants
 * ⚠️ PropTypes only work in development mode
 * ⚡ Generic components provide type safety with flexibility
 */



