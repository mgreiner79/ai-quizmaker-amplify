import { defineStorage } from '@aws-amplify/backend';
import { quizGenerator } from '../functions/quizGenerator/resource';

export const storage = defineStorage({
  name: 'knowledgeFiles',
  access: (allow) => ({
    'knowledge/{entity_id}/*': [
      allow.entity('identity').to(['read', 'write', 'delete']),
      allow.authenticated.to(['write', 'read']),
      allow.resource(quizGenerator).to(['read', 'write', 'delete']),
    ],
  }),
});
