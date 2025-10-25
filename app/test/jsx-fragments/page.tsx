import { Fragment } from 'react'

// Long syntax with fragment
function LongForm() {
    return (
        <Fragment>
            <h1>title</h1>
            <p>paragraph</p>
        </Fragment>    
    )
}

// Short syntax
function ShortSyntax() {
    return (
        <>
            <h1>Title</h1>
            <p>Paragraph</p>
        </>
    )
}

// Only Fragments can have key props
function ListItems({ items }: { items: {id: number, term: string, definition: string}[] }) {
    return (
        <>
            {items.map(item => (
                <Fragment key={item.id}>
                    <dt>{item.term}</dt>
                    <dd>{item.definition}</dd>
                </Fragment>
            ))}
        </>
    )
}

function App() {
    return (
        <ListItems items={[
            {id: 1, term: 'React', definition: 'A library for web and native user interfaces'},
            {id: 2, term: 'Vue', definition: 'A progressive framework for building user interfaces'},
            {id: 3, term: 'Angular', definition: 'A full-stack framework for building web applications'},
        ]} />
    )
}

export default App;

/*
💡 Fragments avoid extra wrapper divs
📌 Use <> </> shorthand in most cases
⚡ Only Fragment accepts key prop
*/
