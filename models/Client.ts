import mongoose, { Schema, Document } from "mongoose";
import bcrypt from "bcryptjs";

export interface IClient extends Document {
  clientId: string; // auto: CLT-00001
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  nationalId: string;
  dateOfBirth?: Date;
  photo?: string;
  occupation?: string;
  // Ghana card verification & self-registration artefacts
  ghanaCardFront?: string; // uploaded image URL / data URI
  ghanaCardBack?: string;
  signature?: string; // signature image captured at registration
  verificationStatus: "pending" | "verified" | "rejected";
  selfRegistered: boolean;
  status: "active" | "inactive" | "suspended";
  savingsBalance: number; // denormalized total across all accounts
  // Login credentials (client portal)
  password: string;
  lastLogin?: Date;
  // Metadata
  openedBy?: mongoose.Types.ObjectId; // staff/admin who registered them (absent for self-registration)
  createdAt: Date;
  updatedAt: Date;
  comparePassword(password: string): Promise<boolean>;
}

const ClientSchema = new Schema<IClient>(
  {
    clientId: { type: String, unique: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, "Invalid email"],
    },
    phone: { type: String, required: true },
    address: { type: String, required: true },
    nationalId: { type: String, required: true, unique: true },
    dateOfBirth: { type: Date },
    photo: { type: String, default: null },
    occupation: { type: String, trim: true },
    ghanaCardFront: { type: String, default: null },
    ghanaCardBack: { type: String, default: null },
    signature: { type: String, default: null },
    verificationStatus: {
      type: String,
      enum: ["pending", "verified", "rejected"],
      default: "verified",
    },
    selfRegistered: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["active", "inactive", "suspended"],
      default: "active",
    },
    savingsBalance: { type: Number, default: 0, min: 0 },
    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false,
    },
    lastLogin: { type: Date },
    openedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      // Not required: clients who self-register have no staff opener until verified
    },
  },
  { timestamps: true },
);

ClientSchema.pre("save", async function () {
  if (!this.clientId) {
    const last = await mongoose
      .model<IClient>("Client")
      .findOne({}, { clientId: 1 })
      .sort({ clientId: -1 })
      .lean<Pick<IClient, "clientId"> | null>();

    let nextNumber = 1;
    if (last?.clientId) {
      const match = last.clientId.match(/^CLT-(\d+)$/);
      if (match) nextNumber = parseInt(match[1], 10) + 1;
    }

    this.clientId = `CLT-${String(nextNumber).padStart(5, "0")}`;
  }

  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 10);
  }
});

ClientSchema.methods.comparePassword = async function (password: string) {
  return bcrypt.compare(password, this.password);
};

ClientSchema.index({ status: 1 });

export default mongoose.models.Client ||
  mongoose.model<IClient>("Client", ClientSchema);
