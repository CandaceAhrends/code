import { z } from "zod";

const messageSchema = z
  .string()
  .min(1, "Msg is required")
  .max(25, "Msg cannot be longer than 50 characters")
  .regex(/^[a-zA-Z0-9 ,'"-]*[.!?]$/g, {
    message:
      "String must contain only alphabetic characters and must end in a period or a question mark.",
  });

export const validateMessageRequest = (req, res, next) => {
  const { message } = req.body;
  const result = messageSchema.safeParse(message);

  if (!result.success) {
    return res.status(400).json({ errors: result.error.errors });
  }

  next();
};
