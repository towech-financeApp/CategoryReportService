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
import { Requests } from './Models';

// Database
import dbCategories from './database/dbCategories';

export default class MessageProcessor {
  static process = async (message: AmqpMessage): Promise<AmqpMessage> => {
    // Destructures the message
    const { type, payload } = message;

    // Switches the message type to run the appropriate function
    switch (type) {
      case 'get-all':
        return await MessageProcessor.getAllCategories(payload);
      default:
        logger.debug(`Unsupported function type: ${type}`);
        return AmqpMessage.errorMessage(`Unsupported function type: ${type}`);
    }
  };

  private static getAllCategories = async (message: Requests.WorkerGetAllCategories): Promise<AmqpMessage> => {
    logger.http(`get all categories for user: ${message.user_id}`);

    try {
      const categories = await dbCategories.getAll(message.user_id);

      return new AmqpMessage(categories, 'get-all', 200);
    } catch (e) {
      return AmqpMessage.errorMessage(`Unexpected error`, 500, e);
    }
  };
}
