/** validator.ts
 * Copyright (c) 2021, Jose Tow
 * All rights reserved.
 *
 * Contains functions that validate data
 */
// Databse
import categoryCollection from '../database/dbCategories';

export default class Validator {
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
   * @param {string} walletName
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
