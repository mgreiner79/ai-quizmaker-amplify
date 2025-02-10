import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { storage } from './storage/resource';
import { quizGenerator } from './functions/quizGenerator/resource';
import { SecretsStack } from './backend/custom/secrets/resource'

const backend = defineBackend({
  auth,
  data,
  quizGenerator,
  storage,
});

const stack = backend.createStack("CustomStack")

new SecretsStack(stack, "SecretsStack")
