/** validator.ts
 * Copyright (c) 2021, Jose Tow
 * All rights reserved.
 *
 * Contains functions that validate data
 */
// Databse
import DbCategories from '../database/dbCategories';
import categoryCollection from '../database/dbCategories';
import { Objects } from '../Models';

export default class Validator {
  /** categoryOwnership
   *  Checks if the user is the owner of a category
   *
   * @param {string} userId
   * @param {string} categoryId
   *
   * @returns Valid: Boolean that confirms validity
   * @returns errors: Object with all the errors
   */
  static categoryOwnership = async (
    userId: string,
    categoryId: string,
    allowGlobal = false,
  ): Promise<{ valid: boolean; errors: any; category: Objects.Category | null }> => {
    // Creates an object that will hold all the errors
    const errors: any = {};

    const category = await DbCategories.getById(categoryId);

    if (!userId || category === null || !(category.user_id === userId || (category.user_id === '-1' && allowGlobal))) {
      errors.category = 'User does not own this category';
    }

    return {
      errors,
      valid: Object.keys(errors).length < 1,
      category,
    };
  };

  /** setIconId
   * Rather than checking that the icon id is valid, as it is managed by the frontend rather than the db, it just ensures that it is a positive integer
   *
   * @param {number} icon_id
   *
   * @returns corrected icon_id
   */
  static setIconId = (icon_id: number): number => {
    let ico = icon_id || '';
    ico = parseInt(ico.toString(), 10);
    if (isNaN(ico) || ico < 0) ico = 0;
    return ico;
  };

  /** validateParent
   * Checks if the parent category is valid
   *
   * @param {string} parent_id
   * @param {string} user_id
   *
   * @returns Valid: Boolean that confirms validity
   * @returns errors: Object with all the errors
   */
  static validateParent = async (parent_id: string, user_id: string): Promise<{ valid: boolean; errors: any }> => {
    // Creates an object that will gold all the errors
    const errors: any = {};

    // Only checks if a parent_id was given
    if (parent_id !== '-1') {
      // Fetches the parent id
      const parentCat = await categoryCollection.getById(parent_id);

      if (parentCat === null) {
        errors.parent_id = `Parent category doesn't exist`;
      } else {
        /** Verifies that the parent category complies with these conditions
         * - its user_id is either -1 or the given user_id
         * - it doesn't have a parent category
         */
        if (parentCat.parent_id !== `-1`) {
          errors.parent_id = `Categories only support one level of nesting`;
        }

        if (parentCat.user_id !== '-1' || parentCat.user_id !== user_id) {
          errors.parent_id = `User does not own parent category`;
        }
      }
    }

    return {
      errors,
      valid: Object.keys(errors).length < 1,
    };
  };

  /** validateName
   * Checks if a given string can be used as a category name
   *
   * @param {string} name
   *
   * @returns Valid: Boolean that confirms validity
   * @returns errors: Object with all the errors
   * @returns formatted: Formatted name
   */
  static validateName = async (name: string): Promise<{ valid: boolean; errors: any; formatted: string }> => {
    // Creates an object that will hold all the errors
    const errors: any = {};
    const cleanedName = name.trim();

    // Checks if the category name is not emptu
    if (!cleanedName || cleanedName === '') {
      errors.name = `Category name can't be empty`;
    }

    return {
      errors,
      valid: Object.keys(errors).length < 1,
      formatted: cleanedName,
    };
  };
}
