/** dbCategories.ts
 * Copyright (c) 2021, Towechlabs
 * All rights reserved.
 *
 * Schema that describes the User and functions that use it
 */

// Libraries
import mongoose from 'mongoose';

// Models
import { Objects } from '../Models';

const CategorySchema = new mongoose.Schema({
  parent_id: String,
  name: String,
  type: String,
  user_id: String,
  archived: Boolean,
  icon_id: Number,
});

const categoryCollection = mongoose.model<Objects.Category>('Categories', CategorySchema);

// Functions that communicate to the DB
export default class DbCategories {
  /** add
   * Adds a category to the DB
   *
   * @param {string} user_id
   * @param {string} name
   * @param {string} type
   * @param {number} icon_id
   * @param {string} parent_id
   *
   * @returns The inserted category
   */
  static add = async (
    user_id: string,
    name: string,
    type: string,
    icon_id: number,
    parent_id: string,
  ): Promise<Objects.Category> => {
    const response = new categoryCollection({
      user_id,
      name,
      type: type.toUpperCase().trim() === 'INCOME' ? 'Income' : 'Expense',
      icon_id: icon_id > 0 ? icon_id : 0,
      parent_id,
    }).save();

    return response;
  };

  /** getAll
   * Returns a list with all the categories for a user, includes the global ones
   *
   * @returns {{Category[]}} The categories from the DB
   */
  static getAll = async (id: string): Promise<Objects.Category[]> => {
    const response = await categoryCollection.find({ $or: [{ user_id: '-1' }, { user_id: id }] });

    return response as Objects.Category[];
  };

  /** getById
   * Returns a category from a given id
   *
   * @returns {Category} The categories from the DB
   */
  static getById = async (id: string): Promise<Objects.Category | null> => {
    const response = await categoryCollection.findById(id);

    return response;
  };
}
