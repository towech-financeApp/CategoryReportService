/** messageProcessor.ts
 * Copyright (c) 2022, Toweclabs
 * All rights reserved.
 *
 * Class that handles all the valid types of message the service can receive
 */

// Libraries
import { AmqpMessage } from 'tow96-amqpwrapper';
import logger from 'tow96-logger';

// Models
import { Objects, Requests } from './Models';

// Utils
import Validator from './utils/validator';

// Database
import DbCategories from './database/dbCategories';

export default class MessageProcessor {
  static process = async (message: AmqpMessage): Promise<AmqpMessage> => {
    // Destructures the message
    const { type, payload } = message;

    // Switches the message type to run the appropriate function
    switch (type) {
      case 'add':
        return await MessageProcessor.add(payload);
      case 'get-all':
        return await MessageProcessor.getAll(payload);
      case 'get-Category':
        return await MessageProcessor.getById(payload);
      case 'edit-Category':
        return await MessageProcessor.edit(payload);
      case 'delete-Category':
        return await MessageProcessor.delete(payload);
      case 'delete-User':
        return await MessageProcessor.deleteUser(payload);
      default:
        logger.debug(`Unsupported function type: ${type}`);
        return AmqpMessage.errorMessage(`Unsupported function type: ${type}`);
    }
  };

  /** add
   * Adds a category to the database
   * @param {Objects.Category} message
   *
   * @returns The new category
   */
  private static add = async (message: Objects.Category): Promise<AmqpMessage<Objects.Category>> => {
    logger.http(`Adding category for user: ${message.user_id}`);

    try {
      let errors = {};

      // Validation ---------------------------------------------------------

      // Validates the category parentage
      const parentValidation = await Validator.validateParent(message.parent_id, message.user_id);
      if (!parentValidation.valid) errors = { ...errors, ...parentValidation.errors };

      // Validates the category ownership
      const nameValidation = await Validator.validateName(message.name);
      if (!nameValidation.valid) errors = { ...errors, ...nameValidation.errors };

      // ---------------------------------------------------------------------

      // Sends an error response if there are any
      if (Object.keys(errors).length > 0) return AmqpMessage.errorMessage(`Invalid fields`, 422, errors);

      // Adds the category
      const newCat = await DbCategories.add(
        message.user_id,
        nameValidation.formatted,
        message.type,
        message.icon_id,
        message.parent_id,
      );

      return new AmqpMessage(newCat, 'add', 200);
    } catch (e) {
      return AmqpMessage.errorMessage(`Unexpected error`, 500, e);
    }
  };

  /** delete
   * Deletes a category from the database
   * @param {Objects.Category} message
   *
   * @returns The deleted category
   */
  static delete = async (message: Objects.Category): Promise<AmqpMessage<Objects.Category>> => {
    try {
      // Verifies that the request user_id owns the category
      const validCategory = await Validator.categoryOwnership(message.user_id, message._id);
      if (!validCategory.valid || validCategory.category === null)
        return AmqpMessage.errorMessage('Authentication Error', 403, validCategory.errors);

      // If the category is not archived, it gets archived instead of removed
      if (!validCategory.category.archived) {
        logger.http(`Archiving category ${message._id}`);
        const archivedCat = await DbCategories.update(message._id, { archived: true } as Objects.Category);
        return new AmqpMessage(archivedCat, 'archived-Category', 200);
      } else {
        logger.http(`Deleting category ${message._id}`);
        const deletedCategory = await DbCategories.delete(validCategory.category);
        return new AmqpMessage(deletedCategory, 'delete-Category', 200);
      }
    } catch (e) {
      return AmqpMessage.errorMessage(`Unexpected error`, 500, e);
    }
  };

  /** deleteUser
   * Deletes all categories belonging to a user
   * @param {Objects.User.BaseUser} user
   *
   * @returns The deleted category
   */
  static deleteUser = async (message: Objects.User.BaseUser): Promise<AmqpMessage<null>> => {
    try {
      logger.http(`Deleting all categories for user: ${message._id}`);

      await DbCategories.deleteUser(message._id);

      return new AmqpMessage(null, 'delete-User', 200);
    } catch (e) {
      return AmqpMessage.errorMessage(`Unexpected error`, 500, e);
    }
  };

  /** edit
   * Changes the parameters of the given category
   * @param {Objects.Category} message
   *
   * @returns The edited category
   */
  static edit = async (message: Objects.Category): Promise<AmqpMessage<Objects.Category>> => {
    logger.http(`Edit cateogry: ${message._id}`);

    try {
      // Checks if the requester is the owner of the category
      const categoryValid = await Validator.categoryOwnership(message.user_id, message._id);
      if (!categoryValid.valid) return AmqpMessage.errorMessage('Authentication Error', 403, categoryValid.errors);
      if (categoryValid.category === null) return AmqpMessage.errorMessage('Category not found', 404);

      // The validation doesn't use the exact same code as the creation of a category
      // since the parameters are optional in this case
      let errors: any = {};
      const content: any = {};

      // Checks if the category is being archived or unarchived
      if (message.archived) {
        if (message.archived !== categoryValid.category.archived) {
          if (typeof message.archived !== 'boolean') {
            errors.archived = 'Archived must be boolean';
          }
          content.archived = message.archived;
        }
      }

      // Checks if the requested change of parent belongs to the user or is global
      if (message.parent_id) {
        // Verifies the ownership if the given category_id is different from the saved one
        if (message.parent_id !== categoryValid.category.parent_id) {
          if (message.parent_id !== '-1') {
            const parentValidation = await Validator.validateParent(message.parent_id, message.user_id);
            if (!parentValidation.valid) errors = { ...errors, ...parentValidation.errors };
          }
          content.parent_id = message.parent_id;
        }
      }

      // Checks if the icon_id is being changed
      if (message.icon_id) {
        if (message.icon_id !== categoryValid.category.icon_id) {
          content.icon_id = Validator.setIconId(message.icon_id);
        }
      }

      // Checks if the name changed
      if (message.name) {
        if (message.name !== categoryValid.category.name) {
          const nameValid = await Validator.validateName(message.name);
          if (!nameValid.valid) errors.name = nameValid.errors;
          content.name = nameValid.formatted;
        }
      }

      // If there is an error, throws it
      if (Object.keys(errors).length > 0) return AmqpMessage.errorMessage('Invalid Fields', 422, errors);

      // If there aren't any changes, returns a 304 code
      if (Object.keys(content).length < 1) return new AmqpMessage({} as Objects.Category, 'edit-Category', 204);

      // Updates the category
      const updatedCat = await DbCategories.update(categoryValid.category._id, content);

      return new AmqpMessage(updatedCat, 'edit-Category', 200);
    } catch (e) {
      return AmqpMessage.errorMessage(`Unexpected error`, 500, e);
    }
  };

  /** getAll
   * Gets all user categories
   * @param {Requests.WorkerGetAllCategories} message
   *
   * @returns An array containing all the categories
   */
  private static getAll = async (
    message: Requests.WorkerGetAllCategories,
  ): Promise<AmqpMessage<Objects.Category[]>> => {
    logger.http(`get all categories for user: ${message.user_id}`);

    try {
      const categories = await DbCategories.getAll(message.user_id);

      return new AmqpMessage(categories, 'get-all', 200);
    } catch (e) {
      return AmqpMessage.errorMessage(`Unexpected error`, 500, e);
    }
  };

  /** getById
   * gets the requested category
   * @param {Objects.Category} message
   *
   * @returns The category
   */
  static getById = async (message: Objects.Category): Promise<AmqpMessage<Objects.Category | null>> => {
    logger.http(`Get category: ${message._id}`);

    try {
      // Checks if the requester is the owner of the category
      const categoryValid = await Validator.categoryOwnership(message.user_id, message._id, true);
      if (!categoryValid.valid) return AmqpMessage.errorMessage('Authentication Error', 403, categoryValid.errors);

      return new AmqpMessage(categoryValid.category, 'get-Category', 200);
    } catch (e) {
      return AmqpMessage.errorMessage(`Unexpected error`, 500, e);
    }
  };
}
