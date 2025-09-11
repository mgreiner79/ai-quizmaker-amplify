// src/lib/amplifyClient.ts
import outputs from '../../amplify_outputs.json';
import type { Schema } from '../../amplify/data/resource';
import { generateClient } from 'aws-amplify/data';
import { Amplify } from 'aws-amplify';

Amplify.configure(outputs);
const client = generateClient<Schema>();

export default client;
