import mongoose, { Schema, Document } from "mongoose";

export interface IMember extends Document {
  memberId: string;
  userId?: mongoose.Types.ObjectId;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  address: string;
  nationalId: string;
  photo?: string;
  dateJoined: Date;
  status: "active" | "inactive" | "suspended";
  savingsBalance: number;
  createdAt: Date;
  updatedAt: Date;
}

const MemberSchema = new Schema<IMember>(
  {
    memberId: {
      type: String,
      unique: true,
      // NOT required here — the pre-save hook sets it before validation runs.
      // Marking it required causes a ValidationError when Mongoose validates
      // before the async pre("save") hook has a chance to assign the value.
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      match: [/^\d{10,}$/, "Invalid phone number"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      lowercase: true,
      match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, "Invalid email"],
    },
    address: {
      type: String,
      required: [true, "Address is required"],
    },
    nationalId: {
      type: String,
      required: [true, "National ID is required"],
      unique: true,
    },
    photo: {
      type: String,
      default: null,
    },
    dateJoined: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "suspended"],
      default: "active",
    },
    savingsBalance: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true },
);

// Generate memberId before saving.
// Uses countDocuments() for the sequence number — safe for dev/low-concurrency.
MemberSchema.pre("save", async function () {
  if (!this.memberId) {
    const count = await mongoose.model("Member").countDocuments();
    this.memberId = `MEM-${String(count + 1).padStart(5, "0")}`;
  }
});

export default mongoose.models.Member ||
  mongoose.model<IMember>("Member", MemberSchema);
