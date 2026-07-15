'use client';

import { useEffect } from 'react';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error('Papers Page Error:', error);
    }, [error]);

    return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
            <h2 className="text-xl font-bold text-red-600">Something went wrong!</h2>
            <p className="text-gray-600 max-w-md text-center p-4 bg-gray-50 rounded border">
                {error.message || "An unexpected error occurred."}
            </p>
            {error.digest && <p className="text-xs text-gray-400">Digest: {error.digest}</p>}
            <button
                onClick={() => reset()}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
                Try again
            </button>
        </div>
    );
}
