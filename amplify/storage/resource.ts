import { defineStorage } from '@aws-amplify/backend';
import { quizGenerator } from '../functions/quizGenerator/resource'

export const storage = defineStorage({
  name: 'knowledgeFiles',
  access: (allow) => ({
    'knowledge/*': [
      allow.authenticated.to(['read', 'write']),
      allow.resource(quizGenerator).to(['read', 'write', 'delete'])
    ],
  })
});
