/** dbCategories.ts
 * Copyright (c) 2021, Towechlabs
 * All rights reserved.
 *
 * Schema that describes the User and functions that use it
 */
import mongoose from 'mongoose';
import { Category } from '../Models';

const CategorySchema = new mongoose.Schema({
  parent_id: String,
  name: String,
  type: String,
  user_id: String,
});

const categoryCollection = mongoose.model('Categories', CategorySchema);

// Functions that communicate to the DB
export default class dbCategories {
  /** getAll
   * Returns a list with all the categories for a user, includes the global ones
   *
   * @returns {{Category[]}} The categories from the DB
   */
  static getAll = async (id: string): Promise<Category[]> => {
    const response = await categoryCollection.find({ $or: [{ user_id: '-1' }, { user_id: id }] });

    return response as Category[];
  };
}
