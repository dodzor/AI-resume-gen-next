import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
    try {
        // 1. Authenticate user
        const authResult = await requireAuth();
        if ('error' in authResult) {
            return authResult.error;
        }
        const { userId } = authResult;

        const { searchParams } = new URL(request.url)
        const query = searchParams.get('q')

        if (!query) {
            return NextResponse.json(
                {
                    error: 'Missing query parameter',
                    message: 'The "q" parameter is required'
                },
                { status: 400 }
            )
        }

        // Simulate a search operation
        const results = await simulateSearch(query)
        return NextResponse.json(results)
    } catch (error) {
        console.error('Error in search API:', error)
        return NextResponse.json(
            {
                error: 'Internal Server Error',
                message: 'An unexpected error occurred'
            },
            { status: 500 }
        )
    }
}

async function simulateSearch(query: string) {
    // Simulate a search operation
    return new Promise((resolve) => {
        setTimeout(() => {
            const data = [
                { id: 1, title: 'Apricot' },
                { id: 2, title: 'Peach' },
                { id: 3, title: 'Plum' },
            ]
            const found = data.filter((item: any) => item.title.toLowerCase().includes(query.toLowerCase()))
            resolve(
                found.length > 0 ? found : [
                    { id: 0, title: 'No results found for ' + query }
                ]
            )
        }, 1000)
    })
}
