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
import { Category } from '../Models/objects';

const CategorySchema = new mongoose.Schema({
  archived: Boolean,
  icon_id: Number,
  parent_id: String,
  name: String,
  type: String,
  user_id: String,
});

const TransactionSchema = new mongoose.Schema({
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Categories' },
});

const categoryCollection = mongoose.model<Objects.Category>('Categories', CategorySchema);
const transactionCollection = mongoose.model<Objects.Transaction>('Transactions', TransactionSchema);

// Functions that communicate to the DB
export default class DbCategories {
  private static otherCategoryId_In = process.env.OTHER_CATEGORYID || '';
  private static otherCategoryId_Out = process.env.OTHER_CATEGORYID_OUT || '';

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

  /** delete
   * Deletes a category and reassigns all the transactions that used it
   *
   * @param {string} categoryId
   *
   * @returns The deleted transaction as confirmation
   */
  static delete = async (category: Objects.Category): Promise<Objects.Category> => {
    // Convert transactions that used it into 'Other'
    const transactions = await transactionCollection.find({ category: category._id });
    transactions.forEach((t) => {
      transactionCollection.findByIdAndUpdate(t._id, {
        category: category.type === 'Expense' ? this.otherCategoryId_Out : this.otherCategoryId_In,
      });
    });

    // Gets all the child categories
    const children = await categoryCollection.find({ parent_id: category._id });

    // Recursively deletes all child categories
    children.forEach(async (cat) => {
      await this.delete(cat);
    });

    // Deletes the category
    const deletedCategory = await categoryCollection.findByIdAndDelete(category._id);

    return deletedCategory as Objects.Category;
  };

  /** deleteUser
   * Deletes all the categories of a user
   *
   * @param {string} id
   *
   * @returns The deleted transaction as confirmation
   */
  static deleteUser = async (id: string): Promise<void> => {
    await categoryCollection.deleteMany({ user_id: id });
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

  /** update
   * Updates the contents of the given category.
   *
   * IMPORTANT: THE "TYPE" ATTRIBUTE CAN'T BE UPDATED, IT GETS DELETED BEFORE CHANGES ARE APPLIED
   * @param {string} categoryId Id of the category
   * @param {Objects.Category} content new content
   *
   * @returns The updated wallet
   */
  static update = async (categoryId: string, content: Objects.Category): Promise<Objects.Category> => {
    const cleanedCategory: any = content;
    cleanedCategory.type = undefined;

    const response = await categoryCollection.findByIdAndUpdate(
      categoryId,
      {
        $set: { ...cleanedCategory },
      },
      { new: true },
    );

    return response as Category;
  };
}
