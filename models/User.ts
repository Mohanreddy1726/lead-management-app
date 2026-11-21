// models/User.ts
import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string; // optional for Google OAuth users
  role: "admin" | "manager" | "telecaller" | "viewer";
  avatar?: string;
  roleSelected?: boolean;
  phone?: string;
  branch?: string;
  team?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema<IUser> = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: false },
    role: {
      type: String,
      enum: ["admin", "manager", "telecaller", "viewer"],
      default: "viewer",
    },
    avatar: { type: String },
    roleSelected: { type: Boolean, default: false },
    phone: { type: String, default: "" },
    branch: { type: String, default: "mbbs" },
    team: { type: String, default: "Hyderabad Team" },
  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
