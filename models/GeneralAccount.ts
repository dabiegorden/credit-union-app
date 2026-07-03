import mongoose, { Schema, Document } from "mongoose";

/**
 * The credit union's single pooled account. Every client deposit increases
 * this balance and every withdrawal decreases it — the money physically sits
 * in the union's general account while individual client balances are tracked
 * separately. There is exactly one document (a singleton) identified by
 * `key: "MAIN"`.
 */
export interface IGeneralAccount extends Document {
  key: string;
  balance: number;
  totalDeposits: number;
  totalWithdrawals: number;
  createdAt: Date;
  updatedAt: Date;
}

const GeneralAccountSchema = new Schema<IGeneralAccount>(
  {
    key: { type: String, unique: true, default: "MAIN" },
    balance: { type: Number, default: 0 },
    totalDeposits: { type: Number, default: 0 },
    totalWithdrawals: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export default mongoose.models.GeneralAccount ||
  mongoose.model<IGeneralAccount>("GeneralAccount", GeneralAccountSchema);
