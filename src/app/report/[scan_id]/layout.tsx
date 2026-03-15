import React from 'react';

export default function ReportLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-[#FDFCFB]">
            {children}
        </div>
    );
}
