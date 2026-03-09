'use-client'

// Proptypes (Legacy - requires: npm i prop-types @types/prop-types)
// Note: Proptypes are a legacy feature from before Typescript
// With Typescript, you get type checking at compile time, making Proptypes redundant

// Example of PropTypes usage (commented out - would require prop-types package):
// import PropTypes from 'prop-types'
// function UserLegacy({ name, age, email }: {name: string, age: number, email: string}) {
//     return <div>{name}, {age}, {email}</div>
// }
// UserLegacy.propTypes = {
//     name: PropTypes.string.isRequired,
//     age: PropTypes.number,
//     email: PropTypes.string.isRequired
// }

// Typescript (Modern approach - recommended)
interface UserProps {
    name: string
    age?: number
    email: string
}

const User: React.FC<UserProps> = ({ name, age = 0, email }) => {
    return <div>{name}, {age}, {email}</div>
}

export default function Page() {
    return (
        <div>
            <h2>TypeScript Example (Recommended)</h2>
            <User name="Jane" age={25} email="jane@example.com" />
            <User name="John" email="john@example.com" />
        </div>
    )
}

/**
 * ⚛️ PropTypes for runtime checking, TypeScript for compile-time
 * 💡 TypeScript provides better IDE support and refactoring
 * 📌 Use discriminated unions for component variants
 * ⚠️ PropTypes only work in development mode
 * ⚡ Generic components provide type safety with flexibility
 */



