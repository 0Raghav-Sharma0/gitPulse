import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { auth } from "@/lib/auth";
import { isAdminUser } from "@/lib/admin-auth";

export async function POST(request: Request): Promise<NextResponse> {
  const session = await auth();
  
  // Security check: Only admins can upload blog images
  if (!isAdminUser(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const filename = searchParams.get('filename');

  if (!filename) {
    return NextResponse.json({ error: "Filename is required" }, { status: 400 });
  }

  if (!request.body) {
    return NextResponse.json({ error: "No file content provided" }, { status: 400 });
  }

  try {
    const blob = await put(filename, request.body, {
      access: 'public',
    });

    return NextResponse.json(blob);
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
