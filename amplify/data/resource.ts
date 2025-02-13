import { type ClientSchema, a, defineData } from '@aws-amplify/backend';
import { quizGenerator } from '../functions/quizGenerator/resource';

const schema = a.schema({
  quizGenerator: a
    .mutation()
    .arguments({
      knowledge: a.string(),
      prompt: a.string().required(),
      numQuestions: a.integer().required(),
      quizId: a.string()
    })
    .returns(a.ref('Quiz'))
    .handler(a.handler.function(quizGenerator))
    .authorization((allow) => [allow.authenticated()]),

  Answer: a.customType({
    id: a.string().required(),
    text: a.string().required(),
    message: a.string().required(),
  })
  ,

  Question: a.customType({
    text: a.string().required(),
    previewTime: a.integer(),
    answerTime: a.integer(),
    maxPoints: a.integer(),
    correctAnswerId: a.string().required(),
    explanation: a.string().required(),
    answers: a.ref('Answer').array().required(),
  }),

  Quiz: a
    .model({
      title: a.string().required(),
      prompt: a.string(),
      id: a.id().required(),
      description: a.string().required(),
      previewTime: a.integer().required(),
      answerTime: a.integer().required(),
      maxPoints: a.integer().required(),
      questions: a.ref('Question').array().required(),
      knowledgeFileKey: a.string(),
      owner: a.string().required(),
    })
    .identifier(['id'])
    .authorization((allow) => [
      allow.owner(), 
      allow.publicApiKey().to(['read']),
    ]),

  CreationProgress: a
  .model({
    correlationId: a.string(),
    message: a.string(),
  }).authorization((allow) => [
    allow.owner(),
    allow.publicApiKey().to(['read']),
    allow.guest().to(['read'])
  ]),

  QuizAttempt: a
    .model({
      quizId: a.string(),
      userId: a.string(),
      score: a.integer(),
      totalPossible: a.integer(),
      answers: a.string().array(),
    })
    .authorization((allow) => [
      allow.owner(), 
      allow.publicApiKey().to(['create','update', 'read'])
    ]),
}).authorization((allow) => [allow.resource(quizGenerator).to(['query', 'mutate'])]);

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'apiKey',
    // API Key is used for a.allow.public() rules
    apiKeyAuthorizationMode: {
      expiresInDays: 30,
    },
  },
});
