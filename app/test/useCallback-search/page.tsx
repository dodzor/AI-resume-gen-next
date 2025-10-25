'use client'

import { useState, useEffect, useCallback, memo } from 'react'

function SearchPage() {
    const [query, setQuery] = useState('')
    const [results, setResults] = useState([])

    // ✅ useCallback prevents SearchResults from re-rendering on every keystroke
    const handleSearch = useCallback(async (searchTerm: string) => {
        const response = await fetch(`/api/search?q=${encodeURIComponent(searchTerm)}`)
        if (!response.ok) {
            // Avoid attempting to parse HTML error pages as JSON
            const errorText = await response.text()
            console.error('Search request failed:', response.status, errorText)
            return
        }
        const data = await response.json()
        setResults(data)
        console.log(data)
    }, []) // No dependencies - function never changes

    // Debounced search effect 
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (query.trim()) {
                handleSearch(query)
            }
        }, 500) // 500ms delay

        return () => clearTimeout(timeoutId)
    }, [query, handleSearch])

    return (
        <div>
            <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search.."
                className="border px-3 py-2 rounded w-full"
            />

            {/* SearchResults only re-renders when results change, not on every keystroke */}
            <SearchResults results={results} onSearch={handleSearch} />
        </div>
    )
}

const SearchResults = memo(({ results, onSearch }: any) => {
    console.log('SearchResults rendered')

    return (
        <div>
            {results.map((result: any) => (
                <div key={result.id}>
                    <h3>{result.title}</h3>
                    <button onClick={() => onSearch(result.title)}>
                        Search similar
                    </button>
                </div>
            ))}
        </div>
    )
})

export default SearchPage