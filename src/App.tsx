import { useEffect, useState } from 'react';
import type { Schema } from '../amplify/data/resource';
import { generateClient } from 'aws-amplify/data';
import { useAuthenticator } from '@aws-amplify/ui-react';

const client = generateClient<Schema>();

function App() {
  const { signOut } = useAuthenticator();
  const [quizzes, setQuizzes] = useState<Array<Schema['Quiz']['type']>>([]);

  const generateQuiz = async () => {
    
    const resp = await client.mutations.quizGenerator({
      description: "Write me a quiz about baseball",
      numQuestions: 5,
      knowledge: ""
    })
    console.log(resp)
  }

  useEffect(() => {
    client.models.Quiz.observeQuery().subscribe({
      next: (data) => setQuizzes([...data.items]),
    });
  }, []);

  return (
    <main>
      <h1>My quizzes</h1>
      <ul>
        {quizzes.map((quiz) => (
          <li key={quiz.id}>{quiz.description}</li>
        ))}
      </ul>
      <div>
        🥳 App successfully hosted. Try creating a new todo.
        <br />
        <a href="https://docs.amplify.aws/react/start/quickstart/#make-frontend-updates">
          Review next step of this tutorial.
        </a>
      </div>
      <button onClick={generateQuiz}>Make A Quiz</button>
      <button onClick={signOut}>Sign out</button>
    </main>
  );
}

export default App;
