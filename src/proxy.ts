import NextAuth from "next-auth";
import authConfig from "@/lib/auth.config";
import { NextResponse } from 'next/server';

const { auth } = NextAuth(authConfig);

export const proxy = auth((req) => {
    const { nextUrl } = req;
    const isApiRoute = nextUrl.pathname.startsWith('/api');

    if (isApiRoute) {
        // Get the origin of the request
        const origin = req.headers.get('origin');

        // Define allowed origins
        const allowedOrigins = [
            'https://repomind.in',
            'https://repomind-ai.vercel.app',
            'http://localhost:3000',
            'http://localhost:3001',
        ];

        // Check if origin is allowed
        const isAllowedOrigin = origin && allowedOrigins.includes(origin);

        // Handle preflight requests
        if (req.method === 'OPTIONS') {
            return new NextResponse(null, {
                status: 200,
                headers: {
                    'Access-Control-Allow-Origin': isAllowedOrigin ? origin : (allowedOrigins[0] || '*'),
                    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                    'Access-Control-Max-Age': '86400',
                },
            });
        }

        // Handle actual requests
        const response = NextResponse.next();

        if (isAllowedOrigin) {
            response.headers.set('Access-Control-Allow-Origin', origin);
            response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        }

        return response;
    }

    // For non-API routes, NextAuth's auth wrapper already handles logic via callbacks in lib/auth.ts
    return NextResponse.next();
});

// Configure which routes use this middleware
export const config = {
    matcher: [
        "/api/:path*",
        "/dashboard/:path*",
        "/admin/:path*",
    ],
};
