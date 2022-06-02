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
      default:
        logger.debug(`Unsupported function type: ${type}`);
        return AmqpMessage.errorMessage(`Unsupported function type: ${type}`);
    }
  };

  /** getAll
   * Adds a wallet to the database
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
}
