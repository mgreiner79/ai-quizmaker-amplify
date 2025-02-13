// src/amplifyClient.ts
import type { Schema } from '../amplify/data/resource';
import { generateClient } from 'aws-amplify/data';

const client = generateClient<Schema>();

export default client;
