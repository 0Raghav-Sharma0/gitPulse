"use server";

import { savePost, deletePost as deletePostFromDb, type SavePostInput } from "@/lib/services/blog-service";
import { auth } from "@/lib/auth";
import { isAdminUser } from "@/lib/admin-auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function checkAdmin() {
  const session = await auth();
  if (!isAdminUser(session)) {
    throw new Error("Unauthorized");
  }
}

export async function savePostAction(data: SavePostInput) {
  await checkAdmin();

  const result = await savePost(data);

  revalidatePath("/admin/blog");
  return result;
}

export async function deletePostAction(id: string) {
  await checkAdmin();

  await deletePostFromDb(id);

  revalidatePath("/admin/blog");

  redirect("/admin/blog");
}
