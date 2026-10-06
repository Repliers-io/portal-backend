import Joi from 'joi';
/** What an instance may override. Anything absent falls back to the shared schema. */
type ContactOverrides = {
   contactSchema?: Joi.ObjectSchema;
   requestInfoSchema?: Joi.ObjectSchema;
};
export const overrides = (version?: string): ContactOverrides => {
   switch (version) {
      default:
         return {};
   }
};