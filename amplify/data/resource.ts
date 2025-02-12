import { type ClientSchema, a, defineData } from '@aws-amplify/backend';
import { quizGenerator } from '../functions/quizGenerator/resource';

const schema = a.schema({
  quizGenerator: a
    .mutation()
    .arguments({
      knowledge: a.string(),
      description: a.string().required(),
      numQuestions: a.integer().required(),
      quizId: a.string()
    })
    .returns(a.ref('Quiz'))
    .handler(a.handler.function(quizGenerator))
    .authorization((allow) => [allow.authenticated()]),

  Answer: a.customType({
    id: a.string(),
    text: a.string(),
    message: a.string(),
  })
  ,

  Question: a.customType({
    text: a.string(),
    previewTime: a.integer(),
    answerTime: a.integer(),
    maxPoints: a.integer(),
    correctAnswerId: a.string(),
    explanation: a.string(),
    answers: a.ref('Answer').array(),
  }),

  Quiz: a
    .model({
      title: a.string().required(),
      id: a.id().required(),
      description: a.string(),
      previewTime: a.integer(),
      answerTime: a.integer(),
      maxPoints: a.integer(),
      questions: a.ref('Question').array(),
      knowledgeFileKey: a.string(),
      owner: a.string(),
    })
    .identifier(['id'])
    .authorization((allow) => [
      allow.owner(), 
      allow.publicApiKey().to(['read'])
    ]),

  CreationProgress: a
  .model({
    correlationId: a.string(),
    message: a.string(),
  }).authorization((allow) => [
    allow.owner(),
    allow.publicApiKey().to(['read'])
  ]),

  QuizAttempt: a
    .model({
      quizId: a.string(),
      userId: a.string(),
      score: a.integer(),
      totalPossible: a.integer(),
      answers: a.string().array(),
    })
    .authorization((allow) => [allow.owner()]),
}).authorization((allow) => [allow.resource(quizGenerator).to(['query', 'mutate'])]);

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
    // API Key is used for a.allow.public() rules
    apiKeyAuthorizationMode: {
      expiresInDays: 30,
    },
  },
});
