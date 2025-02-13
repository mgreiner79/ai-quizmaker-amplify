import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { storage } from './storage/resource';
import { quizGenerator } from './functions/quizGenerator/resource';

const backend = defineBackend({
  auth,
  data,
  quizGenerator,
  storage,
});


backend.quizGenerator.addEnvironment("BUCKET_NAME", backend.storage.resources.bucket.bucketName)
backend.quizGenerator.addEnvironment("BUCKET_REGION", backend.storage.stack.region)
