import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { dbConnect } from "@/lib/mongoose";
import User from "@/models/User";
import Lead from "@/models/Lead";
import type { TeamMember, Branch } from "@/data/types";

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const branch = req.nextUrl.searchParams.get("branch") as Branch | null;

    const filter: Record<string, any> = {
      role: { $in: ["manager", "telecaller"] },
    };
    if (branch && (branch === "mbbs" || branch === "masters")) {
      filter.branch = branch;
    }

    const users = await User.find(filter).sort({ createdAt: -1 }).lean();

    const teamMembers: TeamMember[] = users.map((u: any, idx: number) => {
      const isManager = u.role === "manager";
      const initials = (u.name || "Member")
        .trim()
        .split(/\s+/)
        .map((n: string) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();

      return {
        id: String(u._id),
        name: u.name,
        email: u.email,
        phone: u.phone || "+91 90000 00000",
        role: isManager ? "Manager" : "Telecaller",
        branch: (u.branch as Branch) || "mbbs",
        team: u.team || (u.branch === "masters" ? "Masters Global Team" : "Hyderabad Team"),
        avatarInitials: initials,
        presence: "Active",
        currentActivity: isManager ? "Supervising team operations" : "Ready for calling",
        assigned: 0,
        callsToday: 0,
        followUps: 0,
        interested: 0,
        applications: 0,
        admissions: 0,
        revenue: 0,
        joinDate: u.createdAt ? new Date(u.createdAt).toISOString().slice(0, 10) : "2026-10-21",
        targets: [
          { label: isManager ? "Team Calls" : "Calls", done: 0, target: isManager ? 500 : 250 },
          { label: "Qualified leads", done: 0, target: isManager ? 180 : 80 },
          { label: "Applications", done: 0, target: isManager ? 50 : 25 },
          { label: "Admissions", done: 0, target: isManager ? 18 : 8 },
        ],
      };
    });

    return NextResponse.json({
      success: true,
      teamMembers,
    });
  } catch (error: any) {
    console.error("[Team GET API] Error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to fetch team members" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const body = await req.json();
    const { name, email, password, role, phone, branch, team, targets } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, error: "Full name is required." }, { status: 400 });
    }
    if (!email || !email.trim()) {
      return NextResponse.json({ success: false, error: "Email address is required." }, { status: 400 });
    }
    if (!password || password.trim().length < 6) {
      return NextResponse.json(
        { success: false, error: "Password is required and must be at least 6 characters." },
        { status: 400 }
      );
    }

    const normalizedRole = (role || "telecaller").toLowerCase();
    if (!["manager", "telecaller"].includes(normalizedRole)) {
      return NextResponse.json(
        { success: false, error: "Role must be either 'Manager' or 'Telecaller'." },
        { status: 400 }
      );
    }

    const normalizedBranch: Branch = branch === "masters" ? "masters" : "mbbs";
    const normalizedTeam = team || (normalizedBranch === "masters" ? "Masters Global Team" : "Hyderabad Team");

    // Hash the password securely
    const hashedPassword = await bcrypt.hash(password.trim(), 10);

    // Upsert user in MongoDB Atlas
    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    let user;

    if (existing) {
      existing.name = name.trim();
      existing.password = hashedPassword;
      existing.role = normalizedRole;
      existing.roleSelected = true;
      existing.phone = phone ? phone.trim() : existing.phone || "";
      existing.branch = normalizedBranch;
      existing.team = normalizedTeam;
      await existing.save();
      user = existing;
    } else {
      user = await User.create({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        role: normalizedRole,
        roleSelected: true,
        phone: phone ? phone.trim() : "",
        branch: normalizedBranch,
        team: normalizedTeam,
      });
    }

    const isManager = normalizedRole === "manager";
    const initials = name
      .trim()
      .split(/\s+/)
      .map((n: string) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

    const createdMember: TeamMember = {
      id: String(user._id),
      name: user.name,
      email: user.email,
      phone: user.phone || phone || "+91 90000 00000",
      role: isManager ? "Manager" : "Telecaller",
      branch: normalizedBranch,
      team: normalizedTeam,
      avatarInitials: initials,
      presence: "Active",
      currentActivity: isManager ? "Supervising team operations" : "Ready for calling",
      assigned: 0,
      callsToday: 0,
      followUps: 0,
      interested: 0,
      applications: 0,
      admissions: 0,
      revenue: 0,
      joinDate: new Date().toISOString().slice(0, 10),
      targets: targets || [
        { label: isManager ? "Team Calls" : "Calls", done: 0, target: isManager ? 500 : 250 },
        { label: "Qualified leads", done: 0, target: isManager ? 180 : 80 },
        { label: "Applications", done: 0, target: isManager ? 50 : 25 },
        { label: "Admissions", done: 0, target: isManager ? 18 : 8 },
      ],
    };

    return NextResponse.json({
      success: true,
      member: createdMember,
      message: `Account created for ${name} (${isManager ? "Manager" : "Telecaller"}). They can now log in using ${email} and the password provided.`,
    });
  } catch (error: any) {
    console.error("[Team POST API] Error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to create team member account." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    let id = searchParams.get("id");
    if (!id) {
      const body = await req.json().catch(() => ({}));
      id = body.id;
    }

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Team member ID is required." },
        { status: 400 }
      );
    }

    // 1. Find user by ObjectId or email
    let user = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      user = await User.findById(id);
    }
    if (!user) {
      user = await User.findOne({
        $or: [{ email: id.toLowerCase().trim() }, { _id: id }],
      });
    }

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Team member not found in database." },
        { status: 404 }
      );
    }

    // 2. Protect administrator accounts from deletion
    if (user.role === "admin") {
      return NextResponse.json(
        { success: false, error: "Administrator accounts cannot be deleted." },
        { status: 403 }
      );
    }

    const userName = user.name;
    const userId = user._id.toString();
    const userEmail = user.email;

    // 3. Delete user document from User collection
    await User.findByIdAndDelete(userId);

    // 4. Safely unassign all leads assigned to this member back to null (Yet to Assign)
    await Lead.updateMany(
      {
        $or: [
          { assignedTo: userName },
          { assignedTo: userId },
          { assignedTo: userEmail },
        ],
      },
      { $set: { assignedTo: null } }
    );

    return NextResponse.json({
      success: true,
      id: userId,
      name: userName,
      message: `Team member "${userName}" was successfully deleted. Any assigned leads have been reset to "Yet to Assign".`,
    });
  } catch (error: any) {
    console.error("[Team DELETE API] Error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to delete team member." },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await dbConnect();
    const body = await req.json();
    const { id, password, newPassword } = body;
    const finalPassword = (newPassword || password)?.trim();

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Team member ID is required." },
        { status: 400 }
      );
    }

    if (!finalPassword || finalPassword.length < 6) {
      return NextResponse.json(
        { success: false, error: "New password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    // 1. Find user by ObjectId or email
    let user = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      user = await User.findById(id);
    }
    if (!user) {
      user = await User.findOne({
        $or: [{ email: id.toLowerCase().trim() }, { _id: id }],
      });
    }

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Team member not found in database." },
        { status: 404 }
      );
    }

    // 2. Hash new password securely
    const hashedPassword = await bcrypt.hash(finalPassword, 10);
    user.password = hashedPassword;
    await user.save();

    return NextResponse.json({
      success: true,
      message: `Password for ${user.name} (${user.email}) has been successfully updated.`,
    });
  } catch (error: any) {
    console.error("[Team PATCH API] Error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to update team member password." },
      { status: 500 }
    );
  }
}
