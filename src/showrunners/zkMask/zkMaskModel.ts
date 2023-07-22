import { model, Schema, Document } from 'mongoose';

export interface IZkMaskData {
  latestBlockNumber: number;
}

const ZkMaskSchema = new Schema<IZkMaskData>({
  _id: {
    type: String,
  },
  latestBlockNumber: {
    type: Number,
  }
});

export const ZkMaskModel = model<IZkMaskData>('ZkMaskDB', ZkMaskSchema);