// amplify/storage/resource.ts

import { defineStorage } from '@aws-amplify/backend';

export const storage = defineStorage({
  name: 'knowledgeFiles',
  access: (allow) => ({
    'knowledge/{entity_id}/*': [
      allow.entity('identity').to(['read', 'write', 'delete']),
      allow.authenticated.to(['write', 'read']),
    ],
  }),
});
