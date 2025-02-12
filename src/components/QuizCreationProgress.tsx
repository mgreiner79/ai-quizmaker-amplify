import React, { useEffect, useState } from 'react';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';

const client = generateClient<Schema>();

interface QuizProgressEvent {
  id: string;
  correlationId: string;
  message: string;
  createdAt: string;
}

interface QuizProgressProps {
  quizId: string;
}

const QuizProgress: React.FC<QuizProgressProps> = ({ quizId }) => {
  const [progressMessage, setProgressMessage] = useState<string>("");

  useEffect(() => {
    // Subscribe to new progress events for this quizId
    const sub = client.models.CreationProgress.onCreate({
      filter: {
        correlationId: { eq: quizId },
      },
    }).subscribe({
      next: (event) => {
        // The event payload may be found on event.data (depending on your SDK version)
        const newMessage = (event as QuizProgressEvent).message;
        setProgressMessage(newMessage);
      },
      error: (error) => console.warn('Subscription error:', error),
    });
    return () => sub.unsubscribe();
  }, [quizId]);

  return (
    <div>
        <p>{progressMessage}</p>
    </div>
  );
};

export default QuizProgress;
