// app/api/auth/signup/route.ts
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import User from "@/models/User";
import { dbConnect } from "@/lib/mongoose";

const VALID_ROLES = ["admin", "manager", "telecaller"];

export async function POST(request: Request) {
  try {
    await dbConnect();
    const { name, email, password, role } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Missing email or password" }, { status: 400 });
    }

    // Validate role if provided, otherwise default to telecaller
    const selectedRole = role && VALID_ROLES.includes(role.toLowerCase())
      ? role.toLowerCase()
      : "telecaller";

    // Check if user already exists
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 400 });
    }

    // Hash password
    const hashed = await bcrypt.hash(password, 10);

    const user = await User.create({
      name: name?.trim() || "User",
      email: email.toLowerCase(),
      password: hashed,
      role: selectedRole,
      roleSelected: true,
    });

    return NextResponse.json({ ok: true, userId: user._id }, { status: 201 });
  } catch (error: any) {
    console.error("Signup error:", error);
    return NextResponse.json({ error: "Internal server error during registration." }, { status: 500 });
  }
}
