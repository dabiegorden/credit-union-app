import mongoose, { Schema, Document } from "mongoose";
import bcrypt from "bcryptjs";

export type StaffRole =
  | "teller_1"
  | "teller_2"
  | "loan_manager"
  | "operation_manager"
  | "manager"
  | "susu_collector";

export const STAFF_ROLES: StaffRole[] = [
  "teller_1",
  "teller_2",
  "loan_manager",
  "operation_manager",
  "manager",
  "susu_collector",
];

export const STAFF_ROLE_LABELS: Record<StaffRole, string> = {
  teller_1: "Teller 1",
  teller_2: "Teller 2",
  loan_manager: "Loan Manager",
  operation_manager: "Operation Manager",
  manager: "Manager",
  susu_collector: "Susu Collector",
};

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: "admin" | "staff" | "client";
  // Job title / position for staff accounts (Teller 1, Loan Manager, etc.)
  staffRole?: StaffRole;
  isApproved: boolean;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(password: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, "Invalid email"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false,
    },
    role: {
      type: String,
      enum: ["admin", "staff", "client"],
      default: "staff",
    },
    // Position/title for staff. Not enforced at the schema level so that
    // updating unrelated fields (e.g. approving an older staff account that
    // predates this field) never fails validation. The create UI still
    // requires a position to be chosen.
    staffRole: {
      type: String,
      enum: [
        "teller_1",
        "teller_2",
        "loan_manager",
        "operation_manager",
        "manager",
        "susu_collector",
      ],
    },
    // Staff/admin accounts must be approved by an admin before they can log in.
    // Existing admin accounts created before this field was added are treated as approved.
    isApproved: {
      type: Boolean,
      default: function (this: { role?: string }) {
        return this.role === "admin";
      },
    },
  },
  { timestamps: true },
);

// Hash password before saving
UserSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 10);
});

// Method to compare passwords
UserSchema.methods.comparePassword = async function (
  password: string,
): Promise<boolean> {
  return bcrypt.compare(password, this.password);
};

export default mongoose.models.User ||
  mongoose.model<IUser>("User", UserSchema);
