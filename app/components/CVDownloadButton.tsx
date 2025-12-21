'use client';

import { PDFDownloadLink } from '@react-pdf/renderer';
import CVDocument from './CVDocument';
import { Download } from 'lucide-react';
import { useEffect, useState } from 'react';

const CVDownloadButton = () => {
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    if (!isClient) {
        return <div className="text-sm font-medium text-gray-400">Loading CV...</div>;
    }

    return (
        <PDFDownloadLink
            document={<CVDocument />}
            fileName="Junhoo_Lee_CV.pdf"
            className="text-sm font-medium text-stone-600 hover:text-stone-900 flex items-center gap-1 transition-colors px-3 py-1.5 rounded-md border border-stone-200 hover:border-stone-400 bg-white"
        >
            {/* @ts-ignore -- react-pdf types are sometimes incompatible with latest React types */}
            {({ blob, url, loading, error }) =>
                loading ? "Generating..." : (
                    <>
                        <Download size={14} /> Download CV
                    </>
                )
            }
        </PDFDownloadLink>
    );
};

export default CVDownloadButton;
