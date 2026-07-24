import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

// File path for persistence in the server working directory
const DB_FILE = path.join(process.cwd(), 'db-persist.json');

// In-memory collections to act as our local database fallback
const collections: Record<string, any[]> = {
  User: [],
  Product: [],
  Order: [],
};

// Load collections from file on startup
const loadFromFile = () => {
  try {
    if (fs.existsSync(DB_FILE)) {
      const fileData = fs.readFileSync(DB_FILE, 'utf8');
      const parsed = JSON.parse(fileData);
      collections.User = parsed.User || [];
      collections.Product = parsed.Product || [];
      collections.Order = parsed.Order || [];
      console.log(`[DB Mock] Loaded ${collections.User.length} Users, ${collections.Product.length} Products, ${collections.Order.length} Orders from ${DB_FILE}`);
    }
  } catch (error) {
    console.error('[DB Mock Error] Failed to read persisted DB file:', error);
  }
};

// Save collections to file on changes
const saveToFile = () => {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(collections, null, 2), 'utf8');
  } catch (error) {
    console.error('[DB Mock Error] Failed to write persisted DB file:', error);
  }
};

// Load existing data immediately
loadFromFile();

// Helper to populate fields (e.g. populating product details inside orders)
const populateItem = (item: any, field: string) => {
  if (!item) return item;
  if (field === 'productId' && item.productId) {
    const prodId = item.productId.toString();
    const product = collections.Product.find((p) => p._id.toString() === prodId);
    return { ...item, productId: product ? attachMethods('Product', product) : item.productId };
  }
  return item;
};

// Attach helper methods (e.g. comparePassword, toObject, save) to objects
const attachMethods = (modelName: string, item: any) => {
  if (!item) return item;
  
  const obj = { ...item };

  // Attach Mongoose comparePassword method for User instances
  if (modelName === 'User' && !obj.comparePassword) {
    obj.comparePassword = async function (password: string) {
      return bcrypt.compare(password, this.password);
    };
  }

  // Attach helper methods for compatibility
  obj.toObject = () => obj;
  obj.save = async () => {
    // Save changes back to collection and file
    const idx = collections[modelName].findIndex((x) => x._id.toString() === obj._id.toString());
    if (idx !== -1) {
      collections[modelName][idx] = { ...obj };
      saveToFile();
    }
    return obj;
  };

  return obj;
};

// Helper to build chainable query thenables (implements select, sort, populate)
const createQueryChain = (execute: () => any) => {
  let populateField: string | null = null;

  const chain = {
    then: (onfulfilled?: any, onrejected?: any) => {
      try {
        let res = execute();
        if (populateField) {
          if (Array.isArray(res)) {
            res = res.map((item) => populateItem(item, populateField!));
          } else {
            res = populateItem(res, populateField);
          }
        }
        return Promise.resolve(res).then(onfulfilled, onrejected);
      } catch (err) {
        return Promise.reject(err).catch(onrejected);
      }
    },
    catch: (onrejected?: any) => {
      try {
        const res = execute();
        return Promise.resolve(res).catch(onrejected);
      } catch (err) {
        return Promise.reject(err).catch(onrejected);
      }
    },
    sort: function (_arg: any) {
      return this;
    },
    select: function (_arg: any) {
      return this;
    },
    populate: function (field: string) {
      populateField = field;
      return this;
    },
  };
  return chain as any;
};

// Mock Model Class
class MockModel {
  private modelName: string;

  constructor(modelName: string) {
    this.modelName = modelName;
  }

  get collection() {
    return collections[this.modelName] || [];
  }

  async create(payload: any): Promise<any> {
    const _id = new mongoose.Types.ObjectId();
    const data = { ...payload, _id, createdAt: new Date(), updatedAt: new Date() };

    // Simulate password hashing for User
    if (this.modelName === 'User' && data.password) {
      const salt = await bcrypt.genSalt(10);
      data.password = await bcrypt.hash(data.password, salt);
    }

    this.collection.push(data);
    saveToFile(); // Persist changes

    console.log(`[DB Mock] Created item in ${this.modelName}`);
    return attachMethods(this.modelName, data);
  }

  find(query: any = {}) {
    return createQueryChain(() => {
      let results = [...this.collection];
      
      // Basic filtering (e.g. { sellerId } or { buyerId })
      if (query.sellerId) {
        results = results.filter((p) => p.sellerId?.toString() === query.sellerId.toString());
      }
      if (query.buyerId) {
        results = results.filter((o) => o.buyerId?.toString() === query.buyerId.toString());
      }
      
      // Attach Mongoose methods to results
      return results.map((item) => attachMethods(this.modelName, item));
    });
  }

  findOne(query: any = {}) {
    return createQueryChain(() => {
      const results = [...this.collection];
      let found = null;

      if (query.email) {
        found = results.find((u) => u.email === query.email.toLowerCase());
      } else {
        found = results[0] || null;
      }

      if (found) {
        return attachMethods(this.modelName, found);
      }
      return null;
    });
  }

  findById(id: any) {
    return createQueryChain(() => {
      const found = this.collection.find((item) => item._id.toString() === id?.toString());
      if (found) {
        return attachMethods(this.modelName, found);
      }
      return null;
    });
  }

  async findByIdAndUpdate(id: any, update: any): Promise<any> {
    const idx = this.collection.findIndex((item) => item._id.toString() === id?.toString());
    if (idx === -1) return null;

    const current = this.collection[idx];
    const updated = { ...current, ...update, updatedAt: new Date() };

    this.collection[idx] = updated;
    saveToFile(); // Persist changes

    console.log(`[DB Mock] Updated ${this.modelName} id ${id}`);
    return attachMethods(this.modelName, updated);
  }

  async findByIdAndDelete(id: any): Promise<any> {
    const idx = this.collection.findIndex((item) => item._id.toString() === id?.toString());
    if (idx === -1) return null;
    const deleted = this.collection.splice(idx, 1)[0];
    saveToFile(); // Persist changes

    console.log(`[DB Mock] Deleted ${this.modelName} id ${id}`);
    return attachMethods(this.modelName, deleted);
  }
}

// Override mongoose.model resolver so it yields our MockModel class instances
const modelCache: Record<string, MockModel> = {};

mongoose.model = ((name: string, _schema?: any) => {
  if (!modelCache[name]) {
    modelCache[name] = new MockModel(name);
  }
  return modelCache[name];
}) as any;

// Mock the Mongoose connect caller to skip real connection loops
export const connectDB = async (): Promise<void> => {
  console.log('--------------------------------------------------');
  console.log('MongoDB: Starting in persistent local Mock Mode.');
  console.log(`File: ${DB_FILE}`);
  console.log('--------------------------------------------------');
};
