import { ResponseFormatJSONSchema } from "openai/resources/shared.mjs";



const schema: ResponseFormatJSONSchema.JSONSchema = {
  name: 'Quiz',
  strict: true,
  schema: {
    type: "object",
    properties: {
      title: {
        type: 'string',
        description: 'The title of the quiz',
      },
      description: {
        type: 'string',
        description: 'A description of the quiz',
      },
      previewTime: {
        type: 'integer',
        description: 'The default preview time for the quiz',
      },
      answerTime: {
        type: 'integer',
        description: 'The default answer time for the quiz',
      },
      maxPoints: {
        type: 'integer',
        description: 'Maximum points available per question',
      },
      questions: {
        type: 'array',
        description: 'List of questions in the quiz',
        items: {
          $ref: '#/definitions/Question',
        },
      },
    },
    required: ["title", "description", "previewTime","answerTime","maxPoints", "questions"],
    additionalProperties: false,
    definitions: {
      Answer: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'The unique identifier for the answer',
          },
          text: {
            type: 'string',
            description: 'Text of the answer',
          },
          message: {
            type: 'string',
            description:
              'Explanation message for the answer, indicating why it is correct or incorrect.',
          },
        },
        additionalProperties: false,
        required: ["id", "text", "message"]
      },
      Question: {
        type: 'object',
        properties: {
          text: {
            type: 'string',
            description: 'The text of the question',
          },
          previewTime: {
            type: 'integer',
            description:
              'Preview time for the question if it overrides the default',
          },
          answerTime: {
            type: 'integer',
            description:
              'Answer time for the question if it overrides the default',
          },
          maxPoints: {
            type: 'integer',
            description:
              'Maximum points for the question if it overrides the default',
          },
          correctAnswerId: {
            type: 'string',
            description: 'The id of the correct answer',
          },
          explanation: {
            type: 'string',
            description: 'Explanation of the answer',
          },
          answers: {
            type: 'array',
            description: 'List of possible answers for the question',
            items: {
              $ref: '#/definitions/Answer',
            },
          },
        },
        additionalProperties: false,
        required: ["text", "previewTime","answerTime","maxPoints","correctAnswerId","explanation","answers"]
      },
    },
  },
};

export default schema;
